const escapeHtml = (input) => String(input || '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character])
const headerText = (input) => String(input || '').replace(/[\r\n]+/g, ' ').trim()

const safeHttpUrl = (input) => {
  try {
    const url = new URL(String(input || ''))
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : ''
  } catch {
    return ''
  }
}

const movieTypeLabel = (type) => ({ single: 'Phim lẻ', series: 'Phim bộ', hoathinh: 'Hoạt hình' })[type] || ''

const renderBadge = (label, color = '#e879f9') => `<span style="display:inline-block;margin:0 6px 7px 0;padding:6px 10px;border:1px solid #34394a;border-radius:999px;background:#191e2d;color:${color};font-size:12px;font-weight:700;line-height:1">${escapeHtml(label)}</span>`

export function buildWatchPartyInviteEmail({
  actorName,
  movieTitle,
  movieOriginalTitle,
  moviePosterUrl,
  movieYear,
  movieDuration,
  movieType,
  movieGenres = [],
  movieQuality,
  movieLanguage,
  movieRating,
  roomId,
  joinUrl,
  expiresAt,
}) {
  const actor = headerText(actorName)
  const movie = headerText(movieTitle)
  const room = headerText(roomId)
  const safeActor = escapeHtml(actor)
  const safeMovie = escapeHtml(movie)
  const safeOriginalTitle = escapeHtml(headerText(movieOriginalTitle))
  const safeRoom = escapeHtml(room)
  const safeJoinUrl = escapeHtml(safeHttpUrl(joinUrl))
  const safePosterUrl = escapeHtml(safeHttpUrl(moviePosterUrl))
  const genres = Array.isArray(movieGenres)
    ? movieGenres.map(headerText).filter(Boolean).slice(0, 5)
    : []
  const typeLabel = movieTypeLabel(movieType)
  const meta = [
    Number.isInteger(movieYear) ? String(movieYear) : '',
    headerText(movieDuration),
    typeLabel,
  ].filter(Boolean)
  const highlights = [
    headerText(movieQuality),
    headerText(movieLanguage),
    Number.isFinite(movieRating) && movieRating > 0 ? `★ ${Number(movieRating).toFixed(1)}` : '',
  ].filter(Boolean)
  const expiry = new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(expiresAt))
  const subject = `${actor} mời bạn xem ${movie} trên CineMind`
  const textDetails = [headerText(movieOriginalTitle), ...meta, ...(genres.length ? [`Thể loại: ${genres.join(', ')}`] : [])].filter(Boolean).join(' · ')
  const text = `${actor} mời bạn xem ${movie} trên CineMind.${textDetails ? ` ${textDetails}.` : ''} Mã phòng: ${room}. Tham gia: ${joinUrl}. Phòng hết hạn lúc ${expiry}.`

  const posterCell = safePosterUrl ? `<td class="poster-cell stack-column" width="184" valign="top" style="width:184px;padding:0 0 28px 28px"><img class="poster-image" src="${safePosterUrl}" width="184" alt="Poster ${safeMovie}" style="display:block;width:184px;max-width:184px;height:auto;border:0;border-radius:16px;background:#090c14;box-shadow:0 18px 45px rgba(0,0,0,.35)"></td>` : ''
  const highlightBadges = highlights.map((label) => renderBadge(label, label.startsWith('★') ? '#facc15' : '#f0abfc')).join('')
  const genreBadges = genres.map((label) => renderBadge(label, '#cbd5e1')).join('')
  const contentPadding = safePosterUrl ? '0 28px 28px 24px' : '0 28px 28px'

  const html = `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    @media only screen and (max-width:600px) {
      .email-shell { width:100% !important; }
      .stack-column { display:block !important; width:100% !important; box-sizing:border-box !important; }
      .poster-cell { padding:0 24px 20px !important; text-align:center !important; }
      .poster-image { width:156px !important; max-width:156px !important; margin:0 auto !important; }
      .content-cell { padding:0 24px 26px !important; }
      .email-title { font-size:25px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#070910;color:#f8fafc;font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#070910">
    <tr><td align="center" style="padding:32px 12px">
      <table class="email-shell" role="presentation" width="640" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:640px;border:1px solid #2b3040;border-radius:22px;background:#111522;overflow:hidden">
        <tr><td style="padding:28px 28px 22px">
          <div style="color:#e879f9;font-size:12px;font-weight:800;letter-spacing:.15em;text-transform:uppercase">✦ CineMind Spotlight</div>
          <h1 class="email-title" style="margin:13px 0 7px;font-size:29px;line-height:1.18;color:#ffffff">${safeActor} mời bạn xem phim</h1>
          <p style="margin:0;color:#94a3b8;font-size:14px;line-height:1.55">Một lời mời xem chung đang chờ bạn.</p>
        </td></tr>
        <tr><td>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
            ${posterCell}
            <td class="content-cell stack-column" valign="top" style="padding:${contentPadding}">
              ${highlightBadges ? `<div style="margin-bottom:5px">${highlightBadges}</div>` : ''}
              <h2 style="margin:0;color:#ffffff;font-size:24px;line-height:1.2">${safeMovie}</h2>
              ${safeOriginalTitle ? `<p style="margin:7px 0 0;color:#94a3b8;font-size:14px;line-height:1.45">${safeOriginalTitle}</p>` : ''}
              ${meta.length ? `<p style="margin:13px 0 0;color:#cbd5e1;font-size:13px;line-height:1.6">${meta.map(escapeHtml).join(' &nbsp;•&nbsp; ')}</p>` : ''}
              ${genreBadges ? `<div style="margin-top:15px">${genreBadges}</div>` : ''}
              <p style="margin:13px 0 18px;color:#cbd5e1;font-size:14px;line-height:1.6">Cùng đồng bộ phát, tạm dừng và tua phim ngay trên CineMind.</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 18px;border:1px solid #2b3040;border-radius:14px;background:#090c14">
                <tr><td style="padding:14px 16px"><div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.08em">Mã phòng</div><div style="margin-top:5px;font-size:22px;font-weight:800;letter-spacing:.13em;color:#f0abfc">${safeRoom}</div></td></tr>
              </table>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td bgcolor="#c026d3" style="border-radius:12px;background:#c026d3"><a href="${safeJoinUrl}" style="display:inline-block;padding:13px 20px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:800">Tham gia xem chung</a></td></tr></table>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:18px 28px 24px;border-top:1px solid #242938;background:#0c101b">
          <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6">Phòng hết hạn lúc ${escapeHtml(expiry)}. Nếu nút không mở được, sao chép liên kết:<br><a href="${safeJoinUrl}" style="color:#e879f9;word-break:break-all">${safeJoinUrl}</a></p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;color:#64748b;font-size:11px;line-height:1.5">Email này được gửi vì tài khoản CineMind của bạn đang bật lời mời xem chung.</p>
    </td></tr>
  </table>
</body>
</html>`
  return { subject, text, html }
}
