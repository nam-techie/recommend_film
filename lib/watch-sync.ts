export interface ClockSample { offset: number; roundTrip: number }

export function estimateClockOffset(samples: ClockSample[]) {
  const valid = samples.filter((sample) => Number.isFinite(sample.offset) && Number.isFinite(sample.roundTrip))
  if (!valid.length) return 0
  const best = [...valid].sort((a, b) => a.roundTrip - b.roundTrip).slice(0, Math.min(3, valid.length))
  return best.sort((a, b) => a.offset - b.offset)[Math.floor(best.length / 2)].offset
}

export function projectedPlaybackTime(currentTime: number, isPlaying: boolean, serverUpdatedAt: number, clockOffset: number, now = Date.now()) {
  return Math.max(0, currentTime + (isPlaying ? Math.max(0, now + clockOffset - serverUpdatedAt) / 1000 : 0))
}

export function makeEpisodeKey(serverName: string, episodeSlug: string) {
  return `${encodeURIComponent(serverName.trim().toLowerCase())}__${encodeURIComponent(episodeSlug.trim().toLowerCase())}`
}
