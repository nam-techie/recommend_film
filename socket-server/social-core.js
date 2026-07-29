export function isAnonymousFirebaseActor(actor) {
  return actor?.firebase?.sign_in_provider === 'anonymous' || actor?.provider_id === 'anonymous'
}

export function directoryProfile(profile, fallbackUid = '') {
  const uid = typeof profile?.uid === 'string' && profile.uid ? profile.uid : fallbackUid
  if (!uid || typeof profile?.username !== 'string' || typeof profile?.displayName !== 'string') return null
  return {
    uid,
    username: profile.username,
    displayName: profile.displayName,
    ...(typeof profile.avatar === 'string' && profile.avatar ? { avatar: profile.avatar } : {}),
  }
}

export function requestIp(req) {
  const forwarded = String(req?.headers?.['x-forwarded-for'] || '').split(',').map((value) => value.trim()).filter(Boolean).at(-1)
  return forwarded || req?.socket?.remoteAddress || 'unknown'
}
