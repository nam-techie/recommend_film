const escapeHtml = (input) => String(input || '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character])
const headerText = (input) => String(input || '').replace(/[\r\n]+/g, ' ').trim()

export function buildWatchPartyInviteEmail({ actorName, movieTitle, roomId, joinUrl, expiresAt }) {
  const actor = headerText(actorName)
  const movie = headerText(movieTitle)
  const room = headerText(roomId)
  const safeActor = escapeHtml(actor)
  const safeMovie = escapeHtml(movie)
  const safeRoom = escapeHtml(room)
  const safeJoinUrl = escapeHtml(joinUrl)
  const expiry = new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(expiresAt))
  const subject = `${actor} mời bạn xem ${movie} trên CineMind`
  const text = `${actor} mời bạn xem ${movie} trên CineMind. Mã phòng: ${room}. Tham gia: ${joinUrl}. Phòng hết hạn lúc ${expiry}.`
  const html = `<!doctype html><html lang="vi"><body style="margin:0;background:#070910;color:#f8fafc;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#070910;padding:32px 12px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;border:1px solid #2b3040;border-radius:20px;background:#111522;overflow:hidden"><tr><td style="padding:30px"><div style="color:#e879f9;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase">CineMind · Xem chung</div><h1 style="margin:14px 0 10px;font-size:26px;line-height:1.25;color:#fff">${safeActor} mời bạn xem phim</h1><p style="margin:0 0 22px;color:#cbd5e1;line-height:1.65">Cùng xem <strong style="color:#fff">${safeMovie}</strong> và đồng bộ phát, tạm dừng, tua phim ngay trên CineMind.</p><div style="margin:0 0 22px;padding:16px;border-radius:14px;background:#090c14;border:1px solid #272b38"><div style="font-size:12px;color:#94a3b8">Mã phòng</div><div style="margin-top:5px;font-size:24px;font-weight:800;letter-spacing:.12em;color:#f0abfc">${safeRoom}</div></div><a href="${safeJoinUrl}" style="display:inline-block;padding:13px 20px;border-radius:12px;background:#c026d3;color:#fff;text-decoration:none;font-weight:700">Tham gia xem chung</a><p style="margin:22px 0 0;color:#94a3b8;font-size:12px;line-height:1.6">Phòng hết hạn lúc ${escapeHtml(expiry)}. Nếu nút không mở được, sao chép liên kết: <a href="${safeJoinUrl}" style="color:#e879f9">${safeJoinUrl}</a></p></td></tr></table><p style="margin:16px 0 0;color:#64748b;font-size:11px">Email này được gửi vì tài khoản CineMind của bạn đang bật lời mời xem chung.</p></td></tr></table></body></html>`
  return { subject, text, html }
}
