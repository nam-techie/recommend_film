import { describe, it, expect } from 'vitest'
import { karaokeTarget, KaraokePerformance } from '@/lib/karaoke-types'
describe('karaoke playback target', () => {
  const p = {playback:{currentTime:10,isPlaying:true,serverUpdatedAt:1000}} as KaraokePerformance
  it('extrapolates singer timeline and applies listener-only delay without mutating it',()=>{
    expect(karaokeTarget(p,2000,300)).toBe(10.7)
    expect(karaokeTarget(p,2000,0)).toBe(11)
    expect(p.playback.currentTime).toBe(10)
  })
  it('freezes paused timeline and clamps at zero',()=>{
    expect(karaokeTarget({...p,playback:{...p.playback,isPlaying:false}},5000,0)).toBe(10)
    expect(karaokeTarget({...p,playback:{...p.playback,currentTime:0}},1000,1000)).toBe(0)
  })
})
