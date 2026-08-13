import { PROFILE_GENRES, type ProfilePatchInput } from '@/lib/profile'

const usernamePattern = /^[a-z0-9_]{3,24}$/

function cleanText(value: unknown, max: number) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max)
}

export function normalizeProfilePatch(value: unknown): ProfilePatchInput {
  const input = (value || {}) as Partial<ProfilePatchInput>
  const displayName = cleanText(input.displayName, 40)
  const username = cleanText(input.username, 24).toLowerCase()
  const bio = cleanText(input.bio, 180)
  const favoriteGenres = Array.from(new Set(Array.isArray(input.favoriteGenres) ? input.favoriteGenres.filter((genre): genre is string => PROFILE_GENRES.includes(genre as typeof PROFILE_GENRES[number])) : [])).slice(0, 8)
  if (displayName.length < 2) throw new Error('Tên hiển thị cần ít nhất 2 ký tự.')
  if (!usernamePattern.test(username)) throw new Error('Username cần 3–24 ký tự, chỉ gồm chữ thường, số hoặc _.')
  if (!Number.isFinite(input.expectedUpdatedAt)) throw new Error('Thiếu phiên bản hồ sơ cần cập nhật.')
  return { expectedUpdatedAt: Number(input.expectedUpdatedAt), displayName, username, bio, favoriteGenres }
}
