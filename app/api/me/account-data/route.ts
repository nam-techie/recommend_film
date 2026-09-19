import { NextResponse } from 'next/server'
import { getDatabase } from 'firebase-admin/database'
import { requireUser, getFirebaseAdminApp } from '@/lib/server/firebase-admin'
import { apiError } from '@/lib/server/api-response'
import { anonymizeFeedbackForDeletedAccount } from '@/lib/server/feedback'
import { anonymizeGithubStarClaimsForDeletedAccount } from '@/lib/server/github-star'
import { deleteAllProfileMedia } from '@/lib/server/profile-media'

export const dynamic = 'force-dynamic'

export async function DELETE(request: Request) {
  try {
    const identity = await requireUser(request)
    const database = getDatabase(getFirebaseAdminApp())
    const [sessions, markers, profile, following, followers, friends, reviews, likes, replies, friendRequests, sentRequests, blocks, notifications] = await Promise.all([
      database.ref('analytics/playbackSessions').orderByChild('uid').equalTo(identity.uid).get(),
      database.ref('analytics/aggregates/uniqueViewers').get(),
      database.ref(`publicProfiles/${identity.uid}`).get(), database.ref(`following/${identity.uid}`).get(), database.ref(`followers/${identity.uid}`).get(), database.ref(`friendships/${identity.uid}`).get(), database.ref('reviews').get(),
      database.ref('reviewLikes').get(), database.ref('reviewReplies').get(), database.ref('friendRequests').get(), database.ref('sentFriendRequests').get(), database.ref('blocks').get(), database.ref('notifications').get(),
    ])
    const updates: Record<string, null> = {
      [`accountSessions/${identity.uid}`]: null,
      [`analytics/onlineSessions/${identity.uid}`]: null,
      [`analytics/aggregates/userDaily/${identity.uid}`]: null,
      [`personalization/userFeatures/${identity.uid}`]: null,
      [`personalization/recommendationEvents/${identity.uid}`]: null,
      [`users/${identity.uid}`]: null, [`publicProfiles/${identity.uid}`]: null, [`watchlists/${identity.uid}`]: null,
      [`publicWatchlists/${identity.uid}`]: null, [`publicRecent/${identity.uid}`]: null, [`following/${identity.uid}`]: null,
      [`followers/${identity.uid}`]: null, [`activities/${identity.uid}`]: null, [`notifications/${identity.uid}`]: null,
      [`friendships/${identity.uid}`]: null, [`friendRequests/${identity.uid}`]: null, [`sentFriendRequests/${identity.uid}`]: null,
      [`blocks/${identity.uid}`]: null, [`presenceConnections/${identity.uid}`]: null, [`presenceLastSeen/${identity.uid}`]: null,
      [`community/reportRate/${identity.uid}`]: null, [`community/mutationRate/${identity.uid}`]: null,
    }
    const username = profile.val()?.username
    if (username) updates[`usernames/${username}`] = null
    Object.keys(following.val() || {}).forEach((targetUid) => { updates[`followers/${targetUid}/${identity.uid}`] = null })
    Object.keys(followers.val() || {}).forEach((followerUid) => { updates[`following/${followerUid}/${identity.uid}`] = null })
    Object.keys(friends.val() || {}).forEach((friendUid) => { updates[`friendships/${friendUid}/${identity.uid}`] = null })
    Object.entries((reviews.val() || {}) as Record<string, Record<string, unknown>>).forEach(([movieSlug, rows]) => { if (rows[identity.uid]) { updates[`reviews/${movieSlug}/${identity.uid}`] = null; updates[`reviewLikes/${movieSlug}/${identity.uid}`] = null; updates[`reviewReplies/${movieSlug}/${identity.uid}`] = null } })
    Object.entries((likes.val() || {}) as Record<string, Record<string, Record<string, boolean>>>).forEach(([movieSlug, authors]) => Object.entries(authors || {}).forEach(([authorUid, likers]) => { if (likers?.[identity.uid]) updates[`reviewLikes/${movieSlug}/${authorUid}/${identity.uid}`] = null }))
    Object.entries((replies.val() || {}) as Record<string, Record<string, Record<string, { authorUid?: string }>>>).forEach(([movieSlug, authors]) => Object.entries(authors || {}).forEach(([authorUid, items]) => Object.entries(items || {}).forEach(([replyId, reply]) => { if (reply?.authorUid === identity.uid) updates[`reviewReplies/${movieSlug}/${authorUid}/${replyId}`] = null })))
    for (const snapshot of [friendRequests, sentRequests, blocks]) Object.entries((snapshot.val() || {}) as Record<string, Record<string, unknown>>).forEach(([ownerUid, rows]) => { if (rows?.[identity.uid]) updates[`${snapshot.ref.key}/${ownerUid}/${identity.uid}`] = null })
    Object.entries((notifications.val() || {}) as Record<string, Record<string, { actorUid?: string }>>).forEach(([ownerUid, rows]) => Object.entries(rows || {}).forEach(([notificationId, notification]) => { if (notification?.actorUid === identity.uid) updates[`notifications/${ownerUid}/${notificationId}`] = null }))
    Object.keys(sessions.val() || {}).forEach((sessionId) => { updates[`analytics/playbackSessions/${sessionId}`] = null })
    Object.entries((markers.val() || {}) as Record<string, Record<string, Record<string, boolean>>>).forEach(([day, movies]) => {
      Object.keys(movies || {}).forEach((movieSlug) => { if (movies[movieSlug]?.[identity.uid]) updates[`analytics/aggregates/uniqueViewers/${day}/${movieSlug}/${identity.uid}`] = null })
    })
    await database.ref().update(updates)
    await Promise.all([anonymizeFeedbackForDeletedAccount(identity.uid), anonymizeGithubStarClaimsForDeletedAccount(identity.uid), deleteAllProfileMedia(identity.uid)])
    return NextResponse.json({ deleted: true })
  } catch (error) { return apiError(error, 'Không thể xóa dữ liệu account trên server.') }
}
