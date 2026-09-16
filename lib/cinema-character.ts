export const CINEMA_CHARACTERS = ['male', 'female', 'male_vip', 'female_vip'] as const
export type CinemaCharacter = typeof CINEMA_CHARACTERS[number]
export type CharacterStatus = 'loading' | 'walking' | 'seated' | 'error'
export interface CinemaCharacterPreview {
  character: CinemaCharacter
  replay: number
  onStatus: (status: CharacterStatus) => void
}
export const isCinemaCharacter = (value: unknown): value is CinemaCharacter =>
  typeof value === 'string' && (CINEMA_CHARACTERS as readonly string[]).includes(value)

export function characterAsset(character: CinemaCharacter) {
  return `/3d/${character}_3d.optimized.glb`
}

// This preference belongs to the isolated demo; it grants no membership rights.
export const CINEMA_CHARACTER_DEMO_STORAGE = 'cinemind:character-demo:v1'

// Tier comes from the entitlement provider or the server room member, never the seat.
export function characterForPlan(choice: CinemaCharacter, plan?: string): CinemaCharacter {
  const gender = choice.startsWith('female') ? 'female' : 'male'
  return plan === 'ultra' ? `${gender}_vip` : gender
}

export function defaultMemberCharacter(memberId: string, plan?: string): CinemaCharacter {
  const hash = Array.from(memberId).reduce((value, char) => (value * 31 + char.charCodeAt(0)) >>> 0, 0)
  return characterForPlan(hash % 2 ? 'female' : 'male', plan)
}
