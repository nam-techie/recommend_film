import 'server-only'

import { randomUUID } from 'crypto'
import { getDatabase } from 'firebase-admin/database'
import { getFirebaseAdminApp } from '@/lib/server/firebase-admin'
import { fetchMovieDetail, searchMovies } from '@/lib/api'
import type { ContentMovieSnapshot, FeaturedCollectionSummary, FeaturedCollectionVersion, FeaturedPlacement, PublicHomeContent } from '@/lib/content'
import { recordAuditEvent, validateAuditReason } from '@/lib/server/audit'

function cleanKey(value: string) { return value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) }
function cleanText(value: string, max = 160) { return value.trim().slice(0, max) }

export async function searchContentMovies(query: string) {
  const keyword = cleanText(query, 120)
  if (keyword.length < 2) return []
  const result = await searchMovies({ keyword, limit: 12, page: 1 })
  return (result.data?.items || []).slice(0, 12).map((movie: Record<string, unknown>) => ({
    slug: String(movie.slug || ''), title: String(movie.name || ''), originalTitle: String(movie.origin_name || ''),
    poster: String(movie.poster_url || ''), thumbnail: String(movie.thumb_url || ''), year: Number(movie.year) || null,
  }))
}

async function snapshotMovie(slug: string): Promise<ContentMovieSnapshot> {
  const detail = await fetchMovieDetail(slug)
  const movie = detail.movie
  return {
    slug: movie.slug, providerId: String((movie as unknown as { _id?: string })._id || '') || null,
    title: movie.name, originalTitle: movie.origin_name || '', poster: movie.poster_url || '', thumbnail: movie.thumb_url || '',
    genres: movie.category?.map((item) => item.name).filter(Boolean).slice(0, 8) || [],
    year: Number(movie.year) || null, episodeLabel: movie.episode_current || '', capturedAt: Date.now(),
  }
}

export async function listFeaturedContent() {
  const database = getDatabase(getFirebaseAdminApp())
  const [collections, versions] = await Promise.all([database.ref('content/featuredCollections').get(), database.ref('content/featuredVersions').get()])
  return { collections: Object.values((collections.val() || {}) as Record<string, FeaturedCollectionSummary>), versions: Object.values((versions.val() || {}) as Record<string, FeaturedCollectionVersion>) }
}

export async function createFeaturedDraft(actorUid: string, input: { collectionId?: string; title?: string; placement?: FeaturedPlacement; movieSlugs?: string[]; startsAt?: number | null; endsAt?: number | null; reason?: string; basedOnVersionId?: string | null }) {
  const reason = validateAuditReason(input.reason || '')
  const collectionId = cleanKey(input.collectionId || input.title || randomUUID())
  if (!collectionId) throw new Error('Collection ID không hợp lệ.')
  const title = cleanText(input.title || '', 120)
  if (title.length < 3) throw new Error('Tên collection cần ít nhất 3 ký tự.')
  const slugs = [...new Set((input.movieSlugs || []).map(cleanKey).filter(Boolean))].slice(0, 20)
  if (!slugs.length) throw new Error('Collection cần ít nhất một phim.')
  const movies = await Promise.all(slugs.map(snapshotMovie))
  const id = randomUUID()
  const version: FeaturedCollectionVersion = {
    id, collectionId, title, placement: input.placement === 'hero' ? 'hero' : 'featured_rail', status: 'draft', movies,
    startsAt: input.startsAt || null, endsAt: input.endsAt || null, createdAt: Date.now(), createdBy: actorUid,
    publishedAt: null, publishedBy: null, reason, basedOnVersionId: input.basedOnVersionId || null,
  }
  const database = getDatabase(getFirebaseAdminApp())
  const existing = (await database.ref(`content/featuredCollections/${collectionId}`).get()).val() as FeaturedCollectionSummary | null
  const summary: FeaturedCollectionSummary = { id: collectionId, title, placement: version.placement, draftVersionId: id, publishedVersionId: existing?.publishedVersionId || null, updatedAt: Date.now(), updatedBy: actorUid }
  await database.ref().update({ [`content/featuredVersions/${id}`]: version, [`content/featuredCollections/${collectionId}`]: summary })
  await recordAuditEvent({ actorUid, action: 'content_draft_created', targetId: collectionId, reason, status: 'succeeded', before: existing, after: summary, category: 'system' })
  return { collection: summary, version }
}

export async function publishFeaturedVersion(actorUid: string, collectionId: string, versionId: string, reason: string) {
  const database = getDatabase(getFirebaseAdminApp())
  const versionRef = database.ref(`content/featuredVersions/${versionId}`)
  const version = (await versionRef.get()).val() as FeaturedCollectionVersion | null
  if (!version || version.collectionId !== collectionId) throw new Error('Không tìm thấy version cần publish.')
  if (version.status !== 'draft' && version.status !== 'scheduled') throw new Error('Version không còn ở trạng thái có thể publish.')
  const now = Date.now()
  const status = version.startsAt && version.startsAt > now ? 'scheduled' : 'published'
  const published: FeaturedCollectionVersion = { ...version, status, publishedAt: status === 'published' ? now : null, publishedBy: actorUid, reason: validateAuditReason(reason) }
  const summaryRef = database.ref(`content/featuredCollections/${collectionId}`)
  const current = (await summaryRef.get()).val() as FeaturedCollectionSummary | null
  if (!current || current.draftVersionId !== versionId) throw new Error('Collection đã có draft mới hơn. Hãy tải lại trước khi publish.')
  const summary = { ...current, publishedVersionId: status === 'published' ? versionId : current.publishedVersionId, updatedAt: now, updatedBy: actorUid }
  const updates: Record<string, unknown> = { [`content/featuredVersions/${versionId}`]: published, [`content/featuredCollections/${collectionId}`]: summary }
  if (status === 'published' && current.publishedVersionId && current.publishedVersionId !== versionId) {
    const previousRef = database.ref(`content/featuredVersions/${current.publishedVersionId}`)
    const previous = (await previousRef.get()).val() as FeaturedCollectionVersion | null
    if (previous?.status === 'published') updates[`content/featuredVersions/${previous.id}`] = { ...previous, status: 'archived' }
  }
  await database.ref().update(updates)
  if (status === 'published') await rebuildPublicHomeProjection()
  await recordAuditEvent({ actorUid, action: 'content_published', targetId: collectionId, reason: published.reason, status: 'succeeded', before: current, after: summary, category: 'system' })
  return { collection: summary, version: published }
}

export async function createFeaturedRollbackDraft(actorUid: string, collectionId: string, sourceVersionId: string, reason: string) {
  const database = getDatabase(getFirebaseAdminApp())
  const [summarySnapshot, sourceSnapshot] = await Promise.all([
    database.ref(`content/featuredCollections/${cleanKey(collectionId)}`).get(),
    database.ref(`content/featuredVersions/${cleanKey(sourceVersionId)}`).get(),
  ])
  const summary = summarySnapshot.val() as FeaturedCollectionSummary | null
  const source = sourceSnapshot.val() as FeaturedCollectionVersion | null
  if (!summary || !source || source.collectionId !== summary.id) throw new Error('Không tìm thấy version để rollback.')
  const id = randomUUID()
  const now = Date.now()
  const rollback: FeaturedCollectionVersion = {
    ...source, id, status: 'draft', startsAt: null, endsAt: null, createdAt: now, createdBy: actorUid,
    publishedAt: null, publishedBy: null, reason: validateAuditReason(reason), basedOnVersionId: source.id,
  }
  const nextSummary: FeaturedCollectionSummary = { ...summary, title: rollback.title, placement: rollback.placement, draftVersionId: id, updatedAt: now, updatedBy: actorUid }
  await database.ref().update({ [`content/featuredVersions/${id}`]: rollback, [`content/featuredCollections/${summary.id}`]: nextSummary })
  await recordAuditEvent({ actorUid, action: 'content_rollback_draft_created', targetId: summary.id, reason: rollback.reason, status: 'succeeded', before: summary, after: nextSummary, category: 'system' })
  return { collection: nextSummary, version: rollback }
}

export async function unpublishFeaturedCollection(actorUid: string, collectionId: string, reason: string) {
  const database = getDatabase(getFirebaseAdminApp())
  const summaryRef = database.ref(`content/featuredCollections/${cleanKey(collectionId)}`)
  const summary = (await summaryRef.get()).val() as FeaturedCollectionSummary | null
  if (!summary?.publishedVersionId) throw new Error('Collection chưa có version đang publish.')
  const versionRef = database.ref(`content/featuredVersions/${summary.publishedVersionId}`)
  const version = (await versionRef.get()).val() as FeaturedCollectionVersion | null
  const auditReason = validateAuditReason(reason)
  const nextSummary: FeaturedCollectionSummary = { ...summary, publishedVersionId: null, updatedAt: Date.now(), updatedBy: actorUid }
  await database.ref().update({
    [`content/featuredCollections/${summary.id}`]: nextSummary,
    ...(version ? { [`content/featuredVersions/${version.id}`]: { ...version, status: 'archived' } } : {}),
  })
  await rebuildPublicHomeProjection()
  await recordAuditEvent({ actorUid, action: 'content_unpublished', targetId: summary.id, reason: auditReason, status: 'succeeded', before: summary, after: nextSummary, category: 'system' })
  return { collection: nextSummary }
}

export async function rebuildPublicHomeProjection() {
  const database = getDatabase(getFirebaseAdminApp())
  const [collectionSnapshot, versionSnapshot] = await Promise.all([database.ref('content/featuredCollections').get(), database.ref('content/featuredVersions').get()])
  const collections = Object.values((collectionSnapshot.val() || {}) as Record<string, FeaturedCollectionSummary>)
  const versions = (versionSnapshot.val() || {}) as Record<string, FeaturedCollectionVersion>
  const now = Date.now()
  const projection: PublicHomeContent = { generatedAt: now, collections: collections.flatMap((collection) => {
    const version = collection.publishedVersionId ? versions[collection.publishedVersionId] : null
    if (!version || version.status !== 'published' || (version.startsAt && version.startsAt > now) || (version.endsAt && version.endsAt <= now)) return []
    return [{ collectionId: version.collectionId, title: version.title, placement: version.placement, movies: version.movies, startsAt: version.startsAt, endsAt: version.endsAt, publishedAt: version.publishedAt }]
  }) }
  await database.ref('publicContent/home').set(projection)
  return projection
}

export async function publishDueFeaturedContent(now = Date.now()) {
  const database = getDatabase(getFirebaseAdminApp())
  const snapshot = await database.ref('content/featuredVersions').get()
  const scheduled = Object.values((snapshot.val() || {}) as Record<string, FeaturedCollectionVersion>)
    .filter((version) => version.status === 'scheduled' && Boolean(version.startsAt) && Number(version.startsAt) <= now)
    .sort((left, right) => Number(left.startsAt) - Number(right.startsAt))
  const published: string[] = []
  const skipped: string[] = []
  for (const version of scheduled) {
    try {
      await publishFeaturedVersion(version.publishedBy || 'system:content-scheduler', version.collectionId, version.id, version.reason || 'Lịch xuất bản tự động')
      published.push(version.id)
    } catch {
      skipped.push(version.id)
    }
  }
  if (scheduled.length) await rebuildPublicHomeProjection()
  return { published, skipped }
}

export async function getPublicHomeContent() {
  const snapshot = await getDatabase(getFirebaseAdminApp()).ref('publicContent/home').get()
  return snapshot.exists() ? snapshot.val() as PublicHomeContent : { generatedAt: Date.now(), collections: [] }
}
