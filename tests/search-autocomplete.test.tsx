import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SearchAutocomplete } from '@/components/search/SearchAutocomplete'

const push = vi.fn()
const searchMovies = vi.fn()

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }), usePathname: () => '/search' }))
vi.mock('next/link', () => ({ default: ({ href, onClick, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...props} onClick={(event) => { event.preventDefault(); onClick?.(event) }}>{children}</a> }))
vi.mock('next/image', () => ({ default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} /> }))
vi.mock('@/components/ui/MovieImage', () => ({ MovieImage: ({ alt }: { alt: string }) => <img alt={alt} /> }))
vi.mock('@/lib/api', () => ({
  getImageUrl: (value: string) => value,
  searchMovies: (...args: unknown[]) => searchMovies(...args),
}))

const dragon = { _id: '1', slug: 'dragon', name: 'Dragon', origin_name: 'Dragon', poster_url: '', thumb_url: '', year: 2025 }

describe('SearchAutocomplete', () => {
  beforeEach(() => { vi.useFakeTimers(); push.mockReset(); searchMovies.mockReset() })

  async function showDragon() {
    searchMovies.mockResolvedValue({ items: [dragon] })
    render(<SearchAutocomplete />)
    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'drag' } })
    await act(async () => { vi.advanceTimersByTime(300); await Promise.resolve() })
    return { input, option: screen.getByRole('option', { name: /Dragon/i }) }
  }

  it('keeps a suggestion mounted after a slow blur/touch and preserves its movie link', async () => {
    const { input, option } = await showDragon()
    fireEvent.blur(input)
    fireEvent.pointerDown(option, { pointerType: 'touch' })
    await act(async () => { vi.advanceTimersByTime(300) })
    expect(screen.getByRole('option', { name: /Dragon/i })).toHaveAttribute('href', '/movie/dragon')
    fireEvent.click(option)
    expect(screen.queryByRole('option', { name: /Dragon/i })).not.toBeInTheDocument()
  })

  it('supports ArrowDown and Enter through the same selection flow', async () => {
    const { input } = await showDragon()
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.submit(input.closest('form')!)
    expect(push).toHaveBeenCalledWith('/movie/dragon')
  })

  it('closes on outside pointer and ignores stale responses', async () => {
    let resolveOld!: (value: unknown) => void
    let resolveNew!: (value: unknown) => void
    searchMovies
      .mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveNew = resolve }))
    render(<><SearchAutocomplete /><button>Outside</button></>)
    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'old' } })
    await act(async () => { vi.advanceTimersByTime(300) })
    fireEvent.change(input, { target: { value: 'new' } })
    await act(async () => { vi.advanceTimersByTime(300) })
    await act(async () => { resolveNew({ items: [{ ...dragon, slug: 'new', name: 'New result' }] }); await Promise.resolve() })
    await act(async () => { resolveOld({ items: [{ ...dragon, slug: 'old', name: 'Old result' }] }); await Promise.resolve() })
    expect(screen.getByRole('option', { name: /New result/i })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /Old result/i })).not.toBeInTheDocument()
    fireEvent.pointerDown(screen.getByText('Outside'))
    expect(screen.queryByRole('option')).not.toBeInTheDocument()
  })
})
