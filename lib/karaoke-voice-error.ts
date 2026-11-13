/** User-facing messages only; never render provider/token details. */
export function karaokeVoiceError(error: unknown, phase: 'connection' | 'microphone'): string {
  // DOMException may come from a different browser/iframe realm.
  const name = error && typeof error === 'object' && 'name' in error && typeof error.name === 'string' ? error.name : ''
  if (phase === 'connection') return 'Chưa kết nối được âm thanh phòng. Bấm Bật âm thanh để thử lại. Nếu vẫn không được, hãy rời phòng rồi vào lại.'
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') return 'Microphone chưa được cấp quyền. Cho phép microphone trong cài đặt trang của trình duyệt, rồi bấm Chuẩn bị mic để thử lại.'
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return 'Không tìm thấy microphone. Kết nối thiết bị thu âm rồi bấm Chuẩn bị mic để thử lại.'
  if (name === 'NotReadableError' || name === 'TrackStartError') return 'Chưa sử dụng được microphone. Kiểm tra thiết bị hoặc đóng ứng dụng đang dùng mic, rồi thử lại.'
  return 'Mic chưa sẵn sàng cho lượt hát này. Kiểm tra bạn đang được chọn hát, rồi bấm Chuẩn bị mic để thử lại.'
}
