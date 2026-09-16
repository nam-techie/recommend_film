'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { ArrowDown, ArrowUp, Check, ChevronLeft, ChevronRight, Crown, Download, Film, ImageIcon, Loader2, LockKeyhole, Palette, RefreshCw, Search, Share2, ShieldCheck, Shuffle, SlidersHorizontal, X } from 'lucide-react'
import { auth } from '@/lib/firebase'
import { useAuth } from '@/components/auth/AuthProvider'
import { useEntitlement } from '@/hooks/useEntitlement'
import { buildShareCardSvg, shareCardFilename, SHARE_CARD_ACCENTS } from '@/lib/share-card-artwork'
import type { ShareCardAccent, ShareCardAvatarLayout, ShareCardContext, ShareCardFormat, ShareCardMovie, ShareCardOptionalField, ShareCardRange, ShareCardTheme } from '@/lib/profile'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import styles from './ShareCardBuilder.module.css'

type ConfigTab = 'design' | 'content' | 'movies'
type FieldOption = { id: ShareCardOptionalField; label: string; detail: string; availability?: 'analytics' | 'activity' }
const defaultFields: ShareCardOptionalField[] = ['plan', 'joinedAt', 'favoriteGenres', 'moviesOpened', 'episodesWatched', 'watchHours', 'favoriteMovies']
const themes: Array<{ id: ShareCardTheme; label: string; detail: string; accent: ShareCardAccent }> = [
  { id: 'signature', label: 'Signature', detail: 'Dấu ấn CineMind', accent: 'violet' },
  { id: 'noir', label: 'Noir', detail: 'Tối giản, sắc nét', accent: 'cyan' },
  { id: 'premiere', label: 'Premiere', detail: 'Một đêm công chiếu', accent: 'amber' },
]
const accents: Array<[ShareCardAccent, string]> = [['violet', 'Tím'], ['fuchsia', 'Hồng'], ['cyan', 'Xanh'], ['amber', 'Vàng']]

async function authedFetch(url: string, init?: RequestInit) {
  const currentUser = auth?.currentUser
  if (!currentUser) throw new Error('Bạn cần đăng nhập để tạo thẻ.')
  const token = await currentUser.getIdToken()
  return fetch(url, { ...init, headers: { Authorization: 'Bearer ' + token, ...(init?.headers || {}) } })
}

function download(file: File) {
  const url = URL.createObjectURL(file)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = file.name
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export function ShareCardBuilder({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth()
  const { entitlement, loading: entitlementLoading, error: entitlementError, refresh } = useEntitlement()
  const [open, setOpen] = useState(false)
  const [range, setRange] = useState<ShareCardRange>('30d')
  const [format, setFormat] = useState<ShareCardFormat>('portrait')
  const [theme, setTheme] = useState<ShareCardTheme>('premiere')
  const [accent, setAccent] = useState<ShareCardAccent>('amber')
  const [avatarLayout, setAvatarLayout] = useState<ShareCardAvatarLayout>('corner')
  const [avatarSeed, setAvatarSeed] = useState(0)
  const [fields, setFields] = useState<ShareCardOptionalField[]>(defaultFields)
  const [movieSlugs, setMovieSlugs] = useState<string[] | null>(null)
  const [context, setContext] = useState<ShareCardContext | null>(null)
  const [contextOwner, setContextOwner] = useState('')
  const [configTab, setConfigTab] = useState<ConfigTab>('design')
  const [mobilePane, setMobilePane] = useState<'preview' | 'customize'>('preview')
  const [loading, setLoading] = useState(false)
  const [rendering, setRendering] = useState(false)
  const [locked, setLocked] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [retry, setRetry] = useState(0)
  const [prepared, setPrepared] = useState<{ key: string; file: File } | null>(null)
  const exportController = useRef<AbortController | null>(null)
  const isUltra = entitlement?.uid === user?.uid && entitlement?.plan === 'ultra'
  const activeContext = contextOwner === user?.uid ? context : null

  useEffect(() => {
    setContext(null); setContextOwner(''); setMovieSlugs(null); setPrepared(null)
    setFields(defaultFields); setLocked(false); setError(''); setNotice('')
    exportController.current?.abort()
  }, [user?.uid])

  useEffect(() => {
    if (!open || !isUltra) return
    const controller = new AbortController()
    setLoading(true); setError(''); setLocked(false); setContext(null); setPrepared(null); setNotice('')
    void authedFetch('/api/me/share-card/context?range=' + range, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json()
        if (controller.signal.aborted) return
        if (!response.ok) {
          if (payload.code === 'ULTRA_REQUIRED') setLocked(true)
          throw new Error(payload.error || 'Không tải được dữ liệu thẻ. Hãy thử lại.')
        }
        setContext(payload); setContextOwner(user?.uid || '')
        setMovieSlugs((current) => current === null ? payload.favoriteMovies.slice(0, 3).map((movie: ShareCardMovie) => movie.movieSlug) : current.filter((slug) => payload.favoriteMovies.some((movie: ShareCardMovie) => movie.movieSlug === slug)))
      })
      .catch((nextError) => { if (!controller.signal.aborted) setError(nextError instanceof Error ? nextError.message : 'Không tải được dữ liệu thẻ.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [open, isUltra, range, retry, user?.uid])

  useEffect(() => {
    if (!open || !isUltra) { exportController.current?.abort(); setPrepared(null) }
    return () => exportController.current?.abort()
  }, [open, isUltra])

  const options: FieldOption[] = [
    { id: 'plan', label: 'Huy hiệu Ultra', detail: 'Vương miện thành viên' },
    { id: 'joinedAt', label: 'Ngày gia nhập', detail: 'Tháng và năm tham gia' },
    { id: 'favoriteGenres', label: 'Gu điện ảnh', detail: 'Thể loại trong hồ sơ' },
    { id: 'favoriteMovies', label: 'Phim yêu thích', detail: 'Tối đa 3 poster' },
    { id: 'moviesOpened', label: 'Phim đã mở', detail: 'Tích lũy từ hồ sơ', availability: 'activity' },
    { id: 'episodesWatched', label: 'Tập đã xem', detail: 'Tích lũy từ hồ sơ', availability: 'activity' },
    { id: 'watchHours', label: 'Giờ xem', detail: activeContext?.activity.source === 'verified' ? 'Theo kỳ đã chọn' : 'Ước tính từ tiến độ xem', availability: 'activity' },
    { id: 'completionRate', label: 'Tỷ lệ hoàn thành', detail: 'Theo kỳ đã chọn', availability: 'analytics' },
  ]
  const available = (option: FieldOption) => option.availability === 'analytics' ? Boolean(activeContext?.analytics.available) : option.availability === 'activity' ? Boolean(activeContext && activeContext.activity.source !== 'none') : true
  const selectedFields = fields.filter((field) => { const option = options.find((item) => item.id === field); return option && available(option) })
  const selectedMovies = (movieSlugs || []).map((slug) => activeContext?.favoriteMovies.find((movie) => movie.movieSlug === slug)).filter((movie): movie is ShareCardMovie => Boolean(movie))
  const input = { range, format, theme, accent, avatarLayout, avatarSeed, fields: selectedFields, favoriteMovieSlugs: selectedFields.includes('favoriteMovies') ? selectedMovies.map((movie) => movie.movieSlug) : [] }
  const configKey = JSON.stringify({ ...input, uid: user?.uid, context: activeContext })
  const previewSvg = activeContext ? buildShareCardSvg({ context: activeContext, ...input, selectedMovies }) : ''
  const readyFile = prepared?.key === configKey ? prepared.file : null
  const shareSupported = typeof navigator !== 'undefined' && typeof navigator.share === 'function' && typeof navigator.canShare === 'function'

  useEffect(() => { setPrepared(null); setNotice(''); setError('') }, [configKey])

  const toggleField = (field: ShareCardOptionalField) => setFields((current) => current.includes(field) ? current.filter((item) => item !== field) : [...current, field])
  const changeMovies = (slugs: string[]) => {
    setMovieSlugs(slugs)
    if (slugs.length && !fields.includes('favoriteMovies')) setFields((current) => [...current, 'favoriteMovies'])
  }
  const togglePosters = (target: EventTarget) => {
    const stack = (target as Element).closest?.('.poster-stack')
    if (stack) { const expanded = stack.getAttribute('data-expanded') !== 'true'; stack.setAttribute('data-expanded', String(expanded)); stack.setAttribute('aria-pressed', String(expanded)) }
  }

  const exportPng = async (action: 'download' | 'share') => {
    if (rendering || !isUltra || locked || !activeContext) return
    setError(''); setNotice('')
    if (readyFile) {
      if (action === 'download') { download(readyFile); setNotice('Đã gửi ảnh đến trình tải xuống của bạn.'); return }
      try {
        if (!navigator.canShare?.({ files: [readyFile] })) { setNotice('Thiết bị này chưa hỗ trợ chia sẻ ảnh. Bạn có thể tải PNG.'); return }
        await navigator.share({ title: 'Thẻ điện ảnh CineMind của tôi', files: [readyFile] })
        setNotice('Đã chia sẻ ảnh.')
      } catch (nextError) {
        if ((nextError as DOMException)?.name !== 'AbortError') setError('Chưa chia sẻ được ảnh. Bạn có thể thử lại hoặc tải PNG.')
      }
      return
    }
    const controller = new AbortController()
    exportController.current = controller
    setRendering(true)
    try {
      const response = await authedFetch('/api/me/share-card/render', { method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        if (payload.code === 'ULTRA_REQUIRED' && !controller.signal.aborted) { setLocked(true); setPrepared(null); setContext(null) }
        throw new Error(payload.error || 'Chưa tạo được ảnh. Thiết kế vẫn được giữ, hãy thử lại.')
      }
      const blob = await response.blob()
      if (controller.signal.aborted) return
      const file = new File([blob], shareCardFilename(activeContext.profile.displayName, theme, format), { type: 'image/png' })
      setPrepared({ key: configKey, file })
      if (action === 'download') { download(file); setNotice('Ảnh đã sẵn sàng. Đã gửi đến trình tải xuống của bạn.') }
      else setNotice('Ảnh đã sẵn sàng. Nhấn “Chia sẻ ảnh” để chọn ứng dụng.')
    } catch (nextError) {
      if (!controller.signal.aborted) setError(nextError instanceof Error ? nextError.message : 'Không tạo được thẻ chia sẻ.')
    } finally {
      if (exportController.current === controller) setRendering(false)
    }
  }

  const showLock = !entitlementLoading && !entitlementError && (!isUltra || locked)
  return <Dialog open={open} onOpenChange={(next) => {
    setOpen(next)
    if (!next) { setMobilePane('preview'); setConfigTab('design'); exportController.current?.abort() }
  }}>
    <DialogTrigger asChild><Button variant={compact ? 'ghost' : 'outline'} size={compact ? 'sm' : 'default'} className={styles.trigger}><ImageIcon className="mr-2 h-4 w-4" />Thẻ điện ảnh<span className={styles.ultraBadge}><Crown size={12} />Ultra</span></Button></DialogTrigger>
    <DialogContent className={cn(styles.dialog, 'flex flex-col gap-0 overflow-hidden p-0 text-fg')}>
      <DialogHeader className={styles.header}>
        <div className={styles.titleRow}><DialogTitle className={styles.title}>Studio thẻ điện ảnh</DialogTitle><span className={styles.ultraBadge}><Crown size={12} />Ultra</span></div>
        <DialogDescription className={styles.subtitle}>Gu phim của bạn. Một tấm vé mang dấu ấn riêng.</DialogDescription>
      </DialogHeader>
      {entitlementLoading ? <State icon={<Loader2 className="animate-spin" />} title="Đang kiểm tra quyền lợi…" /> : entitlementError ? <State icon={<RefreshCw />} title="Chưa tải được gói thành viên" detail={entitlementError}><Button variant="outline" onClick={() => void refresh()}>Thử lại</Button></State> : showLock ? <div className={styles.locked}>
        <div className={styles.sampleTicket} aria-hidden="true"><span>CineMind</span><Crown /><strong>Gu phim.<br />Dấu ấn riêng.</strong><span className={styles.samplePerforation} /><small>CINEPASS ULTRA · MEMBER PASS</small></div>
        <div className={styles.lockedCopy}><LockKeyhole className={styles.goldIcon} /><h2>Tấm vé của riêng bạn.</h2><p>Biến hồ sơ và những bộ phim yêu thích thành một tấm thẻ điện ảnh với CinePass Ultra.</p><ul><li><Check />3 phong cách, 4 màu nhấn</li><li><Check />Avatar và bộ ba poster của bạn</li><li><Check />PNG 1080px cho bài đăng hoặc Story</li></ul><Button asChild><Link href="/pricing" onClick={() => setOpen(false)}>Khám phá CinePass Ultra</Link></Button><small>Bạn tự chọn thông tin xuất hiện trên ảnh.</small></div>
      </div> : loading ? <State icon={<Loader2 className="animate-spin" />} title="Đang chuẩn bị thẻ của bạn…" detail="Lấy hồ sơ, phim yêu thích và số liệu mới nhất." /> : !activeContext ? <State icon={<ImageIcon />} title="Chưa tải được thẻ" detail={error || 'Hãy thử tải lại dữ liệu hồ sơ.'}><Button variant="outline" onClick={() => setRetry((value) => value + 1)}><RefreshCw className="mr-2 h-4 w-4" />Thử lại</Button></State> : <>
        <div className={styles.paneTabs} role="group" aria-label="Khu vực studio"><button aria-pressed={mobilePane === 'preview'} onClick={() => setMobilePane('preview')}>Xem trước</button><button aria-pressed={mobilePane === 'customize'} onClick={() => setMobilePane('customize')}>Tùy chỉnh</button></div>
        <div className={styles.workspace}>
          <section aria-label="Xem trước thẻ" className={cn(styles.preview, mobilePane !== 'preview' && styles.mobileHidden)}>
            <div className={styles.previewHeading}><span>Bản xem trước</span><span>{format === 'story' ? '9:16 · Story' : '4:5 · Bài đăng'}</span></div>
            <div className={styles.artwork} onClick={(event) => togglePosters(event.target)} onKeyDown={(event) => { if (['Enter', ' '].includes(event.key) && (event.target as Element).closest?.('.poster-stack')) { event.preventDefault(); togglePosters(event.target) } }} dangerouslySetInnerHTML={{ __html: previewSvg }} />
            <p className={styles.previewHint}>{selectedFields.includes('favoriteMovies') && selectedMovies.length ? 'Chạm vào bộ poster để xòe những bộ phim bạn yêu thích.' : 'Mọi thay đổi hiển thị ngay trên thẻ của bạn.'}</p>
          </section>
          <fieldset disabled={rendering} className={cn(styles.controls, mobilePane !== 'customize' && styles.mobileHidden)} aria-label="Tùy chỉnh thẻ">
            <div className={styles.tabs} role="group" aria-label="Các phần tùy chỉnh">{([{ id: 'design', label: 'Thiết kế', icon: Palette }, { id: 'content', label: 'Nội dung', icon: SlidersHorizontal }, { id: 'movies', label: 'Phim', icon: Film }] as const).map(({ id, label, icon: Icon }) => <button key={id} aria-pressed={configTab === id} onClick={() => setConfigTab(id)}><Icon size={16} />{label}{id === 'movies' && <span className={styles.count}>{selectedMovies.length}/3</span>}</button>)}</div>
            <div className={styles.panel}>
              {configTab === 'design' && <div className={styles.designPanel}>
                <Group title="Phong cách thẻ"><div className={styles.themes}>{themes.map((item) => <button key={item.id} aria-pressed={theme === item.id} onClick={() => { setTheme(item.id); setAccent(item.accent) }} className={styles.themeOption}><span className={cn(styles.miniTicket, styles[item.id])} aria-hidden="true"><i /><b>CineMind</b><span /><em /><em /><em /></span><strong>{item.label}{theme === item.id && <Check size={13} />}</strong><small>{item.detail}</small></button>)}</div></Group>
                <Group title="Khung hình"><Segmented value={format} options={[[ 'portrait', 'Bài đăng · 4:5' ], [ 'story', 'Story · 9:16' ]]} onChange={(value) => setFormat(value as ShareCardFormat)} /></Group>
                <Group title="Màu nhấn"><div className={styles.swatches}>{accents.map(([id, label]) => <button key={id} aria-label={'Màu ' + label} aria-pressed={accent === id} onClick={() => setAccent(id)}><span style={{ background: SHARE_CARD_ACCENTS[id] }} aria-hidden="true">{accent === id && <Check size={13} />}</span>{label}</button>)}</div></Group>
                <Group title="Bố cục ảnh đại diện"><div className={styles.layouts}>{([{ id: 'corner', label: 'Góc vé' }, { id: 'right', label: 'Chân dung' }, { id: 'floating', label: 'Tự do' }] as const).map((layout) => <button key={layout.id} aria-pressed={avatarLayout === layout.id} onClick={() => setAvatarLayout(layout.id)}><span className={cn(styles.layoutSketch, styles[layout.id])} aria-hidden="true"><i /><b /><em /></span>{layout.label}</button>)}</div></Group>
                <button className={styles.shuffle} onClick={() => { setAvatarLayout('floating'); setAvatarSeed((seed) => (seed + 19) % 65536) }}><Shuffle size={15} />Thử một góc ảnh khác</button>
              </div>}
              {configTab === 'content' && <div className={styles.contentPanel}>
                <div className={styles.panelIntro}><h3>Bạn chọn điều muốn kể.</h3><p>Tên, username và avatar luôn có trên thẻ. Các thông tin còn lại do bạn chọn.</p></div>
                <Group title="Khoảng thống kê"><Segmented value={range} options={[[ '30d', '30 ngày' ], [ '90d', '90 ngày' ]]} onChange={(value) => setRange(value as ShareCardRange)} /></Group>
                <div className={styles.fields}>{options.map((option) => <button key={option.id} role="checkbox" aria-checked={selectedFields.includes(option.id)} disabled={!available(option)} onClick={() => toggleField(option.id)}><span className={styles.checkbox}>{selectedFields.includes(option.id) && <Check size={13} />}</span><span><strong>{option.label}</strong><small>{available(option) ? option.detail : 'Chưa có dữ liệu'}</small></span></button>)}</div>
                <p className={styles.sourceNote}>{activeContext.activity.source === 'verified' ? 'Giờ xem và tỷ lệ hoàn thành theo kỳ đã chọn. Số phim và tập là tổng tích lũy.' : activeContext.activity.source === 'legacy_resume' ? 'Số liệu tích lũy từ hồ sơ; giờ xem ước tính từ tiến độ xem, không thay đổi theo kỳ 30/90 ngày.' : 'Bạn vẫn có thể tạo thẻ với hồ sơ và phim yêu thích khi chưa có số liệu xem.'}</p>
              </div>}
              {configTab === 'movies' && <MoviesPanel movies={activeContext.favoriteMovies} selected={selectedMovies.map((movie) => movie.movieSlug)} onChange={changeMovies} enabled={fields.includes('favoriteMovies')} onEnable={() => toggleField('favoriteMovies')} />}
            </div>
            <div className={styles.privacy}><ShieldCheck size={14} /><span>Chỉ xuất ảnh. Không thay đổi quyền riêng tư hồ sơ.</span></div>
          </fieldset>
        </div>
        <footer className={styles.footer}>
          <div className={styles.exportInfo} aria-live="polite">{error ? <p role="alert" className={styles.error}>{error}</p> : notice ? <p className={styles.success}>{notice}</p> : <><strong>{format === 'story' ? '1080 × 1920' : '1080 × 1350'}<span>PNG</span></strong><small>Sẵn sàng cho {format === 'story' ? 'Story' : 'bài đăng của bạn'}</small></>}</div>
          <div className={styles.exportActions}>{shareSupported && <Button variant="outline" disabled={rendering} onClick={() => void exportPng('share')}><Share2 className="mr-2 h-4 w-4" />{readyFile ? 'Chia sẻ ảnh' : 'Chuẩn bị chia sẻ'}</Button>}<Button className={styles.download} disabled={rendering} onClick={() => void exportPng('download')}>{rendering ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}{rendering ? 'Đang tạo ảnh…' : 'Tải ảnh PNG'}</Button></div>
        </footer>
      </>}
    </DialogContent>
  </Dialog>
}

function MoviesPanel({ movies, selected, onChange, enabled, onEnable }: { movies: ShareCardMovie[]; selected: string[]; onChange: (slugs: string[]) => void; enabled: boolean; onEnable: () => void }) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const normalize = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')
  const filtered = movies.filter((movie) => normalize(movie.title).includes(normalize(query.trim())))
  const pageCount = Math.max(1, Math.ceil(filtered.length / 4))
  const currentPage = Math.min(page, pageCount - 1)
  const reorder = (index: number, direction: number) => { const next = [...selected]; [next[index], next[index + direction]] = [next[index + direction], next[index]]; onChange(next) }
  return <div className={styles.moviesPanel}>
    <div className={styles.panelIntro}><h3>Bộ ba nói lên gu phim.</h3><p>Chọn tối đa 3 phim. Thứ tự bên dưới là thứ tự poster trên vé.</p></div>
    {!enabled && <button className={styles.enableMovies} onClick={onEnable}>Phần phim đang ẩn · Bật hiển thị</button>}
    {!movies.length ? <div className={styles.emptyMovies}><Film size={28} /><strong>Gu phim đang chờ bạn.</strong><p>Thêm phim vào danh sách Yêu thích trong “Phim của tôi”, rồi mở lại studio.</p></div> : <>
      <div className={styles.selection}>{[0, 1, 2].map((index) => {
        const movie = movies.find((item) => item.movieSlug === selected[index])
        return <div key={index} className={styles.selectedMovie}>{movie ? <><Poster movie={movie} /><div><strong title={movie.title}>{movie.title}</strong><div className={styles.orderActions}><button disabled={index === 0} aria-label={'Đưa ' + movie.title + ' lên trước'} onClick={() => reorder(index, -1)}><ArrowUp size={13} /></button><button disabled={index === selected.length - 1} aria-label={'Đưa ' + movie.title + ' ra sau'} onClick={() => reorder(index, 1)}><ArrowDown size={13} /></button><button aria-label={'Bỏ chọn ' + movie.title} onClick={() => onChange(selected.filter((slug) => slug !== movie.movieSlug))}><X size={13} /></button></div></div></> : <span className={styles.emptySlot}><Film size={15} />Chọn phim {index + 1}</span>}</div>
      })}</div>
      <label className={styles.search}><Search size={16} /><input aria-label="Tìm trong phim yêu thích" placeholder="Tìm trong phim yêu thích…" value={query} onChange={(event) => { setQuery(event.target.value); setPage(0) }} /></label>
      <div className={styles.movieGrid}>{filtered.slice(currentPage * 4, currentPage * 4 + 4).map((movie) => {
        const checked = selected.includes(movie.movieSlug)
        return <button key={movie.movieSlug} aria-pressed={checked} disabled={!checked && selected.length === 3} onClick={() => onChange(checked ? selected.filter((slug) => slug !== movie.movieSlug) : [...selected, movie.movieSlug])}><Poster movie={movie} /><span title={movie.title}>{movie.title}</span><span className={styles.movieCheck}>{checked ? <Check size={13} /> : '+'}</span></button>
      })}</div>
      {!filtered.length && <p className={styles.sourceNote}>Không tìm thấy phim. Thử tên khác nhé.</p>}
      <div className={styles.pagination}><span>{selected.length === 3 ? 'Đủ 3 phim · Bỏ một phim để đổi' : `${selected.length}/3 phim đã chọn`}</span><div><button aria-label="Trang phim trước" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={16} /></button><span>{currentPage + 1}/{pageCount}</span><button aria-label="Trang phim sau" disabled={currentPage + 1 === pageCount} onClick={() => setPage(currentPage + 1)}><ChevronRight size={16} /></button></div></div>
    </>}
  </div>
}

function Poster({ movie }: { movie: ShareCardMovie }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [movie.poster])
  return <span className={styles.poster}>{movie.poster && !failed ? <img src={movie.poster} alt="" loading="lazy" onError={() => setFailed(true)} /> : <Film size={16} />}</span>
}
function Group({ title, children }: { title: string; children: ReactNode }) { return <section className={styles.group}><h3>{title}</h3>{children}</section> }
function Segmented({ value, options, onChange }: { value: string; options: Array<[string, string]>; onChange: (value: string) => void }) {
  return <div className={styles.segmented}>{options.map(([id, label]) => <button key={id} aria-pressed={value === id} onClick={() => onChange(id)}>{label}</button>)}</div>
}
function State({ icon, title, detail, children }: { icon: ReactNode; title: string; detail?: string; children?: ReactNode }) {
  return <div className={styles.state} role="status">{icon}<h2>{title}</h2>{detail && <p>{detail}</p>}{children}</div>
}
