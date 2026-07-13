const adjectives = [
  'Mơ Màng', 'Tinh Nghịch', 'Bình Tĩnh', 'Lấp Lánh', 'Dịu Dàng', 'Tò Mò',
  'Vui Vẻ', 'Bí Ẩn', 'Mộng Mơ', 'Nhanh Nhẹn', 'Ấm Áp', 'Yêu Phim',
]

const characters = [
  'Mèo Mun', 'Cáo Đêm', 'Gấu Trúc', 'Thỏ Trắng', 'Rái Cá', 'Sóc Nâu',
  'Cú Mèo', 'Hải Ly', 'Chim Cánh Cụt', 'Gấu Mật', 'Cá Heo', 'Nhím Nhỏ',
]

const randomIndex = (length: number) => {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const value = new Uint32Array(1)
    crypto.getRandomValues(value)
    return value[0] % length
  }
  return Math.floor(Math.random() * length)
}

export function createAnonymousName() {
  return `${characters[randomIndex(characters.length)]} ${adjectives[randomIndex(adjectives.length)]}`
}
