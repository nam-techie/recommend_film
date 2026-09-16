import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MovieDetail } from '@/lib/api'

const mocks = vi.hoisted(() => ({
  user: { uid: 'viewer', getIdToken: vi.fn(async () => 'test-token') },
  signal: vi.fn(), finalize: vi.fn(async () => undefined), save: vi.fn(),
}))
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }))
vi.mock('next/dynamic', () => ({ default: () => () => <div data-testid="movie-player" /> }))
vi.mock('@/components/auth/AuthProvider', () => ({ useAuth: () => ({ user: mocks.user, loading: false }) }))
vi.mock('@/hooks/useWatchProgress', () => ({ useWatchProgress: () => ({ saveProgress: mocks.save }) }))
vi.mock('@/hooks/usePlaybackAnalytics', () => ({ usePlaybackAnalytics: () => ({ signal: mocks.signal, finalize: mocks.finalize }) }))
vi.mock('@/hooks/useWatchParty', () => ({ buildWatchPartyEpisodes: () => [{ id: 'episode-1', slug: 'tap-1', episodeKey: 'tap-1', serverIndex: 0, episodeIndex: 0, name: 'Tập 1', serverName: 'Server 1', linkM3u8: '/test.m3u8' }] }))
vi.mock('@/components/ui/CreateWatchPartyDialog', () => ({ CreateWatchPartyDialog: () => null }))
vi.mock('@/components/account/MovieLibraryActions', () => ({ MovieLibraryActions: () => null }))
vi.mock('@/components/account/MovieSocialPanel', () => ({ MovieSocialPanel: () => null }))
vi.mock('@/components/ui/AffiliateInterstitial', () => ({ AffiliateInterstitial: () => null }))
vi.mock('@/components/ui/MovieImage', () => ({ MovieImage: () => null }))

import { MovieDetailPage } from '@/components/pages/MovieDetailPage'

const detail = {
  movie: { slug: 'van-gioi-doc-ton', name: 'Vạn Giới Độc Tôn', origin_name: 'Ten Thousand Worlds', content: 'Phim thử nghiệm', year: 2021, poster_url: '', thumb_url: '', category: [], country: [], actor: [], director: [], type: 'hoathinh', time: '10 phút', tmdb: { vote_average: 9.5 } },
  episodes: [{ server_name: 'Server 1', server_data: [{ name: 'Tập 1', slug: 'tap-1', link_m3u8: '/test.m3u8', link_embed: '' }] }],
} as unknown as MovieDetail

describe('movie watch-access feedback', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); window.HTMLElement.prototype.scrollIntoView = vi.fn() })
  afterEach(() => { vi.unstubAllGlobals() })

  it('shows retry instead of upgrade on a server failure and opens the movie after retry succeeds', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Không thể kiểm tra quyền xem phim.' }), { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ allowed: true, plan: 'ultra', usage: null, viewSession: { id: 'view-1', affiliate: null }, playbackGrant: { grantId: 'grant-1', expiresAt: Date.now() + 60_000 } })))
    render(<MovieDetailPage slug="van-gioi-doc-ton" initialDetail={detail} />)
    fireEvent.click(screen.getByRole('button', { name: /Xem ngay/ }))
    expect(await screen.findByRole('heading', { name: 'Chưa kiểm tra được quyền xem' })).toBeInTheDocument()
    expect(screen.queryByText('Tập phim đang bị khóa')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Xem gói nâng cấp' })).not.toBeInTheDocument()
    expect(screen.queryByTestId('movie-player')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByTestId('movie-player')).toBeInTheDocument()
    expect(screen.getByText('Gói hiện tại được xem không giới hạn')).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('still locks a free account when the server reports a daily quota', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ error: 'CinePass xem tối đa 3 phim khác nhau mỗi ngày.', code: 'MOVIE_DAILY_LIMIT', usage: { moviesUsed: 3, moviesLimit: 3, episodesUsed: 0, episodesLimit: 5, resetsAt: Date.now() + 60_000 } }), { status: 403 }))
    render(<MovieDetailPage slug="van-gioi-doc-ton" initialDetail={detail} />)
    fireEvent.click(screen.getByRole('button', { name: /Xem ngay/ }))
    expect(await screen.findByText('Tập phim đang bị khóa')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Xem gói nâng cấp' })).toHaveAttribute('href', '/pricing')
    expect(screen.queryByTestId('movie-player')).not.toBeInTheDocument()
  })

  it('keeps playback closed on network failure without claiming the plan is insufficient', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'))
    render(<MovieDetailPage slug="van-gioi-doc-ton" initialDetail={detail} />)
    fireEvent.click(screen.getByRole('button', { name: /Xem ngay/ }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument())
    expect(screen.queryByTestId('movie-player')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Xem gói nâng cấp' })).not.toBeInTheDocument()
  })
})
