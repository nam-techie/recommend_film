import type { WatchPartyRoom } from './watch-party-types'

export type CharacterGender = 'male' | 'female'
export type CharacterUpdate = { memberId: string; characterGender: CharacterGender; characterRevision: number }
export type CharacterResult = { ok: boolean; code?: string } & Partial<CharacterUpdate>
export type ChangeCharacter = (gender: CharacterGender, initialize?: boolean) => Promise<CharacterResult>

export function applyCharacterUpdate(room: WatchPartyRoom | null, update: CharacterUpdate) {
  const member = room?.members[update.memberId]
  if (!room || !member || !['male', 'female'].includes(update.characterGender) || !Number.isSafeInteger(update.characterRevision) || update.characterRevision <= (member.characterRevision || 0)) return room
  return { ...room, members: { ...room.members, [update.memberId]: { ...member, characterGender: update.characterGender, characterRevision: update.characterRevision } } }
}

export function preserveCharacterUpdates(next: WatchPartyRoom, current: WatchPartyRoom | null) {
  if (!current) return next
  let merged = next
  for (const member of Object.values(current.members)) {
    if (member.characterGender && member.characterRevision) merged = applyCharacterUpdate(merged, { memberId: member.memberId, characterGender: member.characterGender, characterRevision: member.characterRevision })!
  }
  return merged
}
