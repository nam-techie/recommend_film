import { get, push, ref, set, update } from 'firebase/database'
import { DirectConversation, DirectMessage, FriendshipRecord, PublicProfile } from '@/lib/account-types'
import { database } from '@/lib/firebase'

function requireDatabase() {
  if (!database) throw new Error('Dịch vụ tin nhắn chưa được cấu hình.')
  return database
}

export function directConversationId(firstUid: string, secondUid: string) {
  return `dm_${[firstUid, secondUid].sort().join('_')}`
}

export async function ensureDirectConversation(actor: PublicProfile, friend: FriendshipRecord) {
  const db = requireDatabase()
  const conversationId = directConversationId(actor.uid, friend.uid)
  const conversationRef = ref(db, `directConversations/${conversationId}`)
  const snapshot = await get(conversationRef)
  const [memberA, memberB] = [actor.uid, friend.uid].sort()
  const now = Date.now()
  if (!snapshot.exists()) {
    const conversation: DirectConversation = {
      id: conversationId,
      memberA,
      memberB,
      memberUids: { [actor.uid]: true, [friend.uid]: true },
      lastMessage: '',
      lastMessageType: 'system',
      lastSenderUid: '',
      lastMessageAt: 0,
      createdAt: now,
      updatedAt: now,
    }
    await update(ref(db), {
      [`directConversations/${conversationId}`]: conversation,
      [`userConversations/${actor.uid}/${conversationId}`]: { conversationId, otherUid: friend.uid, lastReadAt: now, muted: false, updatedAt: now },
    })
  } else {
    const stateSnapshot = await get(ref(db, `userConversations/${actor.uid}/${conversationId}`))
    const state = stateSnapshot.val() as { conversationId?: string; lastReadAt?: number } | null
    if (!stateSnapshot.exists() || state?.conversationId !== conversationId || typeof state?.lastReadAt !== 'number') await set(ref(db, `userConversations/${actor.uid}/${conversationId}`), { conversationId, otherUid: friend.uid, lastReadAt: now, muted: false, updatedAt: now })
  }
  return conversationId
}

export async function sendDirectMessage(actor: PublicProfile, friend: FriendshipRecord, rawText: string) {
  const text = rawText.trim().replace(/\s+/g, ' ').slice(0, 1000)
  if (!text) throw new Error('Hãy nhập nội dung tin nhắn.')
  const db = requireDatabase()
  const conversationId = await ensureDirectConversation(actor, friend)
  const messageRef = push(ref(db, `directMessages/${conversationId}`))
  const now = Date.now()
  const message: DirectMessage = { id: messageRef.key!, conversationId, senderUid: actor.uid, senderName: actor.displayName, type: 'text', text, createdAt: now }
  await update(ref(db), {
    [`directMessages/${conversationId}/${message.id}`]: message,
    [`directConversations/${conversationId}/lastMessage`]: text,
    [`directConversations/${conversationId}/lastMessageType`]: 'text',
    [`directConversations/${conversationId}/lastSenderUid`]: actor.uid,
    [`directConversations/${conversationId}/lastMessageAt`]: now,
    [`directConversations/${conversationId}/updatedAt`]: now,
    [`userConversations/${actor.uid}/${conversationId}/updatedAt`]: now,
    [`userConversations/${friend.uid}/${conversationId}/updatedAt`]: now,
  })
  return message
}

export async function markConversationRead(uid: string, conversationId: string) {
  const now = Date.now()
  await update(ref(requireDatabase(), `userConversations/${uid}/${conversationId}`), { lastReadAt: now, updatedAt: now })
}

export async function setConversationTyping(conversationId: string, uid: string, typing: boolean) {
  const typingRef = ref(requireDatabase(), `directTyping/${conversationId}/${uid}`)
  if (!typing) return set(typingRef, null)
  return set(typingRef, { typing: true, updatedAt: Date.now() })
}
