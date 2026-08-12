import 'server-only'

import { getDatabase } from 'firebase-admin/database'
import { getFirebaseAdminApp } from '@/lib/server/firebase-admin'
import type { PublicProfile, SocialActivity, SocialReview } from '@/lib/account-types'
import type { CommunityFeedItem, CommunityFeedResponse, CommunityFeedTab, ModerationCase, ModerationStatus } from '@/lib/community'
import { recordAuditEvent, validateAuditReason } from '@/lib/server/audit'

function cleanText(value: string, max: number) { return value.trim().slice(0, max) }
function cleanKey(value: string) { return value.trim().replace(/[.#$\[\]/]/g, '-').slice(0, 160) }

export async function getCommunityFeed(uid: string, tab: CommunityFeedTab): Promise<CommunityFeedResponse> {
  const database = getDatabase(getFirebaseAdminApp())
  const [profilesSnapshot, reviewsSnapshot, activitiesSnapshot, followingSnapshot, statesSnapshot] = await Promise.all([
    database.ref('publicProfiles').get(), database.ref('reviews').get(), database.ref('activities').get(), database.ref(`following/${uid}`).get(), database.ref('community/contentStates').get(),
  ])
  const profiles = (profilesSnapshot.val() || {}) as Record<string, PublicProfile>
  const following = new Set(Object.keys(followingSnapshot.val() || {}))
  following.add(uid)
  const states = (statesSnapshot.val() || {}) as Record<string, CommunityContentState>
  const visibleAuthor = (authorUid: string) => profiles[authorUid]?.isPublic === true && profiles[authorUid]?.showActivity === true
  const items: CommunityFeedItem[] = []
  Object.values((reviewsSnapshot.val() || {}) as Record<string, Record<string, SocialReview>>).forEach((rows) => Object.values(rows).forEach((review) => {
    if (!visibleAuthor(review.authorUid) || states[`review:${review.id}`] === 'hidden' || states[`review:${review.id}`] === 'removed') return
    if (tab === 'following' && !following.has(review.authorUid)) return
    items.push({ id: `review:${review.id}`, kind: 'review', createdAt: review.updatedAt, review })
  }))
  Object.entries((activitiesSnapshot.val() || {}) as Record<string, Record<string, SocialActivity>>).forEach(([authorUid, rows]) => Object.values(rows).forEach((activity) => {
    if (!visibleAuthor(authorUid) || states[`activity:${activity.id}`] === 'hidden' || states[`activity:${activity.id}`] === 'removed') return
    if (tab === 'following' && !following.has(authorUid)) return
    items.push({ id: `activity:${activity.id}`, kind: 'activity', createdAt: activity.createdAt, activity })
  }))
  const viewer = profiles[uid]
  const favorite = new Set(viewer?.favoriteGenres || [])
  const tasteMatches = Object.values(profiles).filter((profile) => profile.uid !== uid && profile.isPublic && profile.allowTasteDiscovery)
    .map((profile) => ({ uid: profile.uid, username: profile.username, displayName: profile.displayName, ...(profile.avatar ? { avatar: profile.avatar } : {}), sharedGenres: (profile.favoriteGenres || []).filter((genre) => favorite.has(genre)) }))
    .filter((profile) => profile.sharedGenres.length > 0).sort((a, b) => b.sharedGenres.length - a.sharedGenres.length).slice(0, 8)
  return { generatedAt: Date.now(), tab, items: items.sort((a, b) => b.createdAt - a.createdAt).slice(0, 60), tasteMatches }
}

export async function createCommunityReport(uid: string, input: Partial<ModerationCase>) {
  const database = getDatabase(getFirebaseAdminApp())
  const targetType = ['profile', 'review', 'reply', 'activity'].includes(String(input.targetType)) ? input.targetType as ModerationCase['targetType'] : 'profile'
  const targetId = cleanKey(input.targetId || input.targetUid || '')
  if (!targetId) throw new Error('Thiếu đối tượng cần báo cáo.')
  const last = await database.ref(`community/reportRate/${uid}`).get()
  if (last.exists() && Date.now() - Number(last.val()) < 30_000) throw new Error('Vui lòng chờ trước khi gửi báo cáo tiếp theo.')
  const ref = database.ref('community/moderationCases').push()
  const now = Date.now()
  const report: ModerationCase = {
    id: ref.key!, reporterUid: uid, targetType, targetId, targetUid: input.targetUid ? cleanKey(input.targetUid) : undefined,
    movieSlug: input.movieSlug ? cleanKey(input.movieSlug) : undefined, reason: cleanText(input.reason || 'other', 80),
    details: cleanText(input.details || '', 500), status: 'open', createdAt: now, updatedAt: now,
  }
  await database.ref().update({ [`community/moderationCases/${report.id}`]: report, [`community/reportRate/${uid}`]: now })
  return report
}

async function enforceMutationRate(uid: string, action: string, intervalMs: number) {
  const ref = getDatabase(getFirebaseAdminApp()).ref(`community/mutationRate/${uid}/${action}`)
  const snapshot = await ref.get()
  if (snapshot.exists() && Date.now() - Number(snapshot.val()) < intervalMs) throw new Error('Bạn thao tác quá nhanh. Vui lòng thử lại sau.')
  await ref.set(Date.now())
}

async function requireCommunityProfile(uid: string) {
  const snapshot = await getDatabase(getFirebaseAdminApp()).ref(`publicProfiles/${uid}`).get()
  if (!snapshot.exists()) throw new Error('Hồ sơ cộng đồng chưa sẵn sàng.')
  return snapshot.val() as PublicProfile
}

export async function saveCommunityReview(uid: string, input: Partial<SocialReview>) {
  await enforceMutationRate(uid, 'review', 3_000)
  const profile = await requireCommunityProfile(uid)
  const movieSlug = cleanKey(input.movieSlug || '')
  const content = cleanText(input.content || '', 1200)
  const rating = Math.max(1, Math.min(10, Number(input.rating) || 0))
  if (!movieSlug || content.length < 3) throw new Error('Review cần phim, điểm và nội dung từ 3 ký tự.')
  const ref = getDatabase(getFirebaseAdminApp()).ref(`reviews/${movieSlug}/${uid}`)
  const previous = await ref.get()
  const now = Date.now()
  const review: SocialReview = {
    id: uid, movieSlug, movieTitle: cleanText(input.movieTitle || movieSlug, 180),
    ...(input.poster ? { poster: cleanText(input.poster, 500) } : {}),
    authorUid: uid, authorName: profile.displayName, authorUsername: profile.username,
    ...(profile.avatar ? { authorAvatar: profile.avatar } : {}),
    rating, content, spoiler: Boolean(input.spoiler), createdAt: previous.val()?.createdAt || now, updatedAt: now,
  }
  await ref.set(review)
  return review
}

export async function deleteCommunityReview(uid: string, movieSlug: string) {
  await getDatabase(getFirebaseAdminApp()).ref().update({ [`reviews/${cleanKey(movieSlug)}/${uid}`]: null, [`reviewLikes/${cleanKey(movieSlug)}/${uid}`]: null, [`reviewReplies/${cleanKey(movieSlug)}/${uid}`]: null })
  return { deleted: true }
}

export async function setCommunityReviewLike(uid: string, movieSlug: string, reviewAuthorUid: string, liked: boolean) {
  await enforceMutationRate(uid, 'like', 500)
  const database = getDatabase(getFirebaseAdminApp())
  const profile = await requireCommunityProfile(uid)
  const author = cleanKey(reviewAuthorUid)
  const slug = cleanKey(movieSlug)
  await database.ref(`reviewLikes/${slug}/${author}/${uid}`).set(liked || null)
  if (liked && uid !== author) {
    const notification = database.ref(`notifications/${author}`).push()
    await notification.set({ id: notification.key, type: 'review_like', actorUid: uid, actorName: profile.displayName, actorUsername: profile.username, actorAvatar: profile.avatar || null, movieSlug: slug, reviewId: author, read: false, createdAt: Date.now() })
  }
  return { liked }
}

export async function addCommunityReply(uid: string, movieSlug: string, reviewAuthorUid: string, contentValue: string) {
  await enforceMutationRate(uid, 'reply', 2_000)
  const content = cleanText(contentValue, 300)
  if (!content) throw new Error('Bình luận không được để trống.')
  const database = getDatabase(getFirebaseAdminApp())
  const profile = await requireCommunityProfile(uid)
  const author = cleanKey(reviewAuthorUid)
  const slug = cleanKey(movieSlug)
  const ref = database.ref(`reviewReplies/${slug}/${author}`).push()
  const reply = { id: ref.key!, authorUid: uid, authorName: profile.displayName, authorUsername: profile.username, ...(profile.avatar ? { authorAvatar: profile.avatar } : {}), content, createdAt: Date.now() }
  await ref.set(reply)
  if (uid !== author) {
    const notification = database.ref(`notifications/${author}`).push()
    await notification.set({ id: notification.key, type: 'review_reply', actorUid: uid, actorName: profile.displayName, actorUsername: profile.username, actorAvatar: profile.avatar || null, movieSlug: slug, reviewId: author, read: false, createdAt: Date.now() })
  }
  return reply
}

export async function setCommunityFollow(uid: string, targetUid: string, following: boolean) {
  await enforceMutationRate(uid, 'follow', 1_000)
  const target = cleanKey(targetUid)
  if (!target || target === uid) throw new Error('Đối tượng theo dõi không hợp lệ.')
  const database = getDatabase(getFirebaseAdminApp())
  const [profile, targetProfile, blockedByActor, blockedByTarget] = await Promise.all([
    requireCommunityProfile(uid), requireCommunityProfile(target), database.ref(`blocks/${uid}/${target}`).get(), database.ref(`blocks/${target}/${uid}`).get(),
  ])
  if (blockedByActor.exists() || blockedByTarget.exists()) throw new Error('Không thể theo dõi tài khoản đã chặn.')
  await database.ref().update({ [`following/${uid}/${target}`]: following || null, [`followers/${target}/${uid}`]: following || null })
  if (following) {
    const notification = database.ref(`notifications/${target}`).push()
    await notification.set({ id: notification.key, type: 'follow', actorUid: uid, actorName: profile.displayName, actorUsername: profile.username, actorAvatar: profile.avatar || null, read: false, createdAt: Date.now() })
  }
  return { following, target: { uid: targetProfile.uid, username: targetProfile.username, displayName: targetProfile.displayName } }
}

export async function deleteCommunityReply(uid: string, movieSlug: string, reviewAuthorUid: string, replyId: string) {
  const database = getDatabase(getFirebaseAdminApp())
  const path = `reviewReplies/${cleanKey(movieSlug)}/${cleanKey(reviewAuthorUid)}/${cleanKey(replyId)}`
  const snapshot = await database.ref(path).get()
  const reply = snapshot.val() as { authorUid?: string } | null
  if (!reply || (reply.authorUid !== uid && reviewAuthorUid !== uid)) throw new Error('Bạn không có quyền xóa bình luận này.')
  await database.ref(path).remove()
  return { deleted: true }
}

export async function listModerationCases(status?: ModerationStatus) {
  const snapshot = await getDatabase(getFirebaseAdminApp()).ref('community/moderationCases').get()
  return Object.values((snapshot.val() || {}) as Record<string, ModerationCase>).filter((item) => !status || item.status === status).sort((a, b) => b.createdAt - a.createdAt)
}

export async function moderateCommunityCase(actorUid: string, caseId: string, input: { status: ModerationStatus; action: 'hide' | 'restore' | 'remove' | 'dismiss'; reason: string }) {
  const database = getDatabase(getFirebaseAdminApp())
  const ref = database.ref(`community/moderationCases/${cleanKey(caseId)}`)
  const current = (await ref.get()).val() as ModerationCase | null
  if (!current) throw new Error('Không tìm thấy moderation case.')
  const reason = validateAuditReason(input.reason)
  const state = input.action === 'hide' ? 'hidden' : input.action === 'remove' ? 'removed' : 'published'
  const targetKey = `${current.targetType}:${current.targetId}`
  const updated: ModerationCase = { ...current, status: input.status, assignedTo: actorUid, resolution: reason, updatedAt: Date.now() }
  const updates: Record<string, unknown> = { [`community/moderationCases/${current.id}`]: updated }
  if (input.action !== 'dismiss') updates[`community/contentStates/${targetKey}`] = state
  await database.ref().update(updates)
  await recordAuditEvent({ actorUid, action: 'community_moderated', targetId: targetKey, reason, status: 'succeeded', before: current, after: updated, category: 'system' })
  return updated
}

type CommunityContentState = 'published' | 'hidden' | 'removed'
