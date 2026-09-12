export const CINEMA_REGULAR_SEATS = 32
export const CINEMA_VIP_SEATS = 4
export const CINEMA_CAPACITY = 36
export const isVipSeat = (seatId?: string | null) => /^V[1-4]$/.test(seatId || '')
export interface CinemaSeatSnapshot { revision: number; capacity: number; seats: Record<string, string> }
export interface CinemaPerson { memberId: string; displayName: string; avatar?: string; connected?: boolean }
export function cinemaLayout(_capacity = CINEMA_CAPACITY) {
  return Array.from({ length: CINEMA_CAPACITY }, (_, index) => {
    const row = Math.floor(index / 4), column = index % 4, vip = index >= CINEMA_REGULAR_SEATS
    return { id: vip ? `V${column + 1}` : `${String.fromCharCode(65 + row)}${column + 1}`, row, column, vip,
      x: (vip ? [-3.15, -1.35, 1.35, 3.15] : [-2.15, -0.95, 0.95, 2.15])[column], y: row * 0.3, z: row * 1.65 + (vip ? 0.75 : 0) }
  })
}