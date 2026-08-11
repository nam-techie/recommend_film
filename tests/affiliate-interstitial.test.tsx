import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AffiliateInterstitial } from '@/components/ui/AffiliateInterstitial'
import type { AffiliateCreative } from '@/lib/affiliate'

const auth = vi.hoisted(() => ({
  user: { getIdToken: vi.fn(async () => 'test-token') },
}))

vi.mock('@/components/auth/AuthProvider', () => ({ useAuth: () => auth }))

const creative: AffiliateCreative = {
  assignmentId: 'assignment-1',
  durationMs: 8000,
  productTitle: 'Ưu đãi Shopee',
  ctaLabel: 'Xem ưu đãi',
  disclosure: 'Liên kết tiếp thị có tài trợ.',
  redirectPath: '/go/affiliate/assignment-1',
}

let observerCallback: IntersectionObserverCallback

class IntersectionObserverMock {
  constructor(callback: IntersectionObserverCallback) { observerCallback = callback }
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return [] }
  readonly root = null
  readonly rootMargin = '0px'
  readonly thresholds = [0.5]
}

function setVisibility(value: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value })
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('AffiliateInterstitial', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-10T10:00:00.000Z'))
    vi.stubGlobal('IntersectionObserver', IntersectionObserverMock)
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })))
    act(() => { setVisibility('visible') })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('records one impression only after at least half of the creative is visible', async () => {
    render(<AffiliateInterstitial creative={creative} onContinue={vi.fn()} />)
    observerCallback([{ isIntersecting: true, intersectionRatio: 0.49 } as IntersectionObserverEntry], {} as IntersectionObserver)
    await act(async () => {})
    expect(fetch).not.toHaveBeenCalled()

    await act(async () => {
      observerCallback([{ isIntersecting: true, intersectionRatio: 0.5 } as IntersectionObserverEntry], {} as IntersectionObserver)
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(fetch).toHaveBeenCalledTimes(1)
    observerCallback([{ isIntersecting: true, intersectionRatio: 1 } as IntersectionObserverEntry], {} as IntersectionObserver)
    act(() => { setVisibility('hidden') })
    act(() => { setVisibility('visible') })
    await act(async () => {})
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('pauses while hidden and only continues after eight visible seconds plus a click', () => {
    const onContinue = vi.fn()
    render(<AffiliateInterstitial creative={creative} onContinue={onContinue} />)
    expect(screen.queryByRole('button', { name: /Tiếp tục xem/i })).not.toBeInTheDocument()

    act(() => { vi.advanceTimersByTime(3_000) })
    act(() => { setVisibility('hidden') })
    act(() => { vi.advanceTimersByTime(10_000) })
    expect(screen.queryByRole('button', { name: /Tiếp tục xem/i })).not.toBeInTheDocument()

    act(() => { setVisibility('visible') })
    act(() => { vi.advanceTimersByTime(5_100) })
    const continueButton = screen.getByRole('button', { name: /Tiếp tục xem/i })
    expect(onContinue).not.toHaveBeenCalled()
    fireEvent.click(continueButton)
    expect(onContinue).toHaveBeenCalledTimes(1)
  })
})
