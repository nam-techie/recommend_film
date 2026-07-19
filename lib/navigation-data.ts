import type { Country, Genre } from '@/lib/api'
import { fetchCountries, fetchGenres } from '@/lib/api'

const fallbackGenres: Genre[] = [
  ['Bí Ẩn', 'bi-an'], ['Chiến Tranh', 'chien-tranh'], ['Chính Kịch', 'chinh-kich'], ['Cổ Trang', 'co-trang'],
  ['Gia Đình', 'gia-dinh'], ['Hài Hước', 'hai-huoc'], ['Hành Động', 'hanh-dong'], ['Hình Sự', 'hinh-su'],
  ['Học Đường', 'hoc-duong'], ['Khoa Học', 'khoa-hoc'], ['Kinh Dị', 'kinh-di'], ['Kinh Điển', 'kinh-dien'],
  ['Lịch Sử', 'lich-su'], ['Miền Tây', 'mien-tay'], ['Phim Ngắn', 'phim-ngan'], ['Phiêu Lưu', 'phieu-luu'],
  ['Tâm Lý', 'tam-ly'], ['Tình Cảm', 'tinh-cam'], ['Viễn Tưởng', 'vien-tuong'], ['Võ Thuật', 'vo-thuat'],
].map(([name, slug]) => ({ _id: slug, name, slug }))

const fallbackCountries: Country[] = [
  ['Anh', 'anh'], ['Ba Lan', 'ba-lan'], ['Brazil', 'brazil'], ['Bồ Đào Nha', 'bo-dao-nha'], ['Canada', 'canada'],
  ['Châu Phi', 'chau-phi'], ['Hà Lan', 'ha-lan'], ['Hàn Quốc', 'han-quoc'], ['Hồng Kông', 'hong-kong'],
  ['Indonesia', 'indonesia'], ['Malaysia', 'malaysia'], ['Mexico', 'mexico'], ['Na Uy', 'na-uy'], ['Nam Phi', 'nam-phi'],
  ['Nga', 'nga'], ['Nhật Bản', 'nhat-ban'], ['Philippines', 'philippines'], ['Pháp', 'phap'],
  ['Quốc Gia Khác', 'quoc-gia-khac'], ['Thái Lan', 'thai-lan'], ['Thổ Nhĩ Kỳ', 'tho-nhi-ky'],
  ['Thụy Sĩ', 'thuy-si'], ['Thụy Điển', 'thuy-dien'], ['Trung Quốc', 'trung-quoc'], ['Tây Ban Nha', 'tay-ban-nha'],
  ['UAE', 'uae'], ['Ukraina', 'ukraina'], ['Việt Nam', 'viet-nam'], ['Âu Mỹ', 'au-my'], ['Úc', 'uc'],
  ['Ý', 'y'], ['Đan Mạch', 'dan-mach'], ['Đài Loan', 'dai-loan'], ['Đức', 'duc'], ['Ả Rập Xê Út', 'a-rap-xe-ut'], ['Ấn Độ', 'an-do'],
].map(([name, slug]) => ({ _id: slug, name, slug }))

export async function getNavigationData() {
  const [genreResult, countryResult] = await Promise.allSettled([fetchGenres(), fetchCountries()])
  return {
    genres: genreResult.status === 'fulfilled' && genreResult.value.length ? genreResult.value : fallbackGenres,
    countries: countryResult.status === 'fulfilled' && countryResult.value.length ? countryResult.value : fallbackCountries,
  }
}
