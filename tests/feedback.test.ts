import { describe, expect, it } from 'vitest'
import { feedbackDeviceClass, validFeedbackCategory } from '@/lib/feedback'

describe('feedback input helpers', () => {
  it('accepts only the locked categories', () => {
    expect(validFeedbackCategory('ui_ux')).toBe(true)
    expect(validFeedbackCategory('payment')).toBe(false)
  })

  it('classifies viewport without storing raw user agent', () => {
    expect(feedbackDeviceClass(390)).toBe('mobile')
    expect(feedbackDeviceClass(768)).toBe('tablet')
    expect(feedbackDeviceClass(1440)).toBe('desktop')
  })
})
