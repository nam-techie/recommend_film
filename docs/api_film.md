# API Film Documentation

## Tổng quan
Tài liệu này ghi chú các API endpoints public của `phimapi.com` được sử dụng trong dự án web phim MovieWiser.

> Lưu ý: Các ví dụ bên dưới lấy domain gốc `https://phimapi.com`. Khi gọi từ FE/BE hãy đặt baseURL vào biến môi trường.

---

## 1. Phim mới cập nhật

```
GET /v1/api/danh-sach/phim-moi-cap-nhat?page={page}
```
Ví dụ:
```
https://phimapi.com/v1/api/danh-sach/phim-moi-cap-nhat?page=1
```
Tham số:
| Tên        | Kiểu  | Mặc định | Mô tả                                   |
|------------|-------|----------|-----------------------------------------|
| `page`     | int   | 1        | Trang cần lấy (bắt đầu từ 1)            |

Trả về: *(để trống – sẽ cập nhật sau khi test Thunder Client)*

{
  "status": true,
  "msg": "done",
  "items": [
    {
      "tmdb": {
        "type": "tv",
        "id": "83199",
        "season": 1,
        "vote_average": 7.7,
        "vote_count": 3
      },
      "imdb": {
        "id": null
      },
      "modified": {
        "time": "2025-07-05T16:52:26.000Z"
      },
      "_id": "a3ecc38635fffb4aefb0651b652c6627",
      "name": "Bốn Chàng Quý Tử",
      "slug": "bon-chang-quy-tu",
      "origin_name": "The Sons Of Sol Pharmacy House",
      "poster_url": "https://phimimg.com/upload/vod/20250705-1/10308b2cee3ef3d388f8b931d36dbefd.jpg",
      "thumb_url": "https://phimimg.com/upload/vod/20250705-1/14febdc1fdca1b8edb22e444db643287.jpg",
      "year": 2009
    },
    {
      "tmdb": {
        "type": "tv",
        "id": "292810",
        "season": 1,
        "vote_average": 0,
        "vote_count": 0
      },
      "imdb": {
        "id": null
      },
      "modified": {
        "time": "2025-07-05T15:38:51.000Z"
      },
      "_id": "ec615d81761cddecefc011465ed6e3a2",
      "name": "Mười Năm Khuynh Thành",
      "slug": "muoi-nam-khuynh-thanh",
      "origin_name": "Ten Years Of Unrequited Love",
      "poster_url": "https://phimimg.com/upload/vod/20250704-1/b8a8d6cf2ac367640b5288e859d9681a.jpg",
      "thumb_url": "https://phimimg.com/upload/vod/20250704-1/d9363c24299214ebd99e50c340ef375b.jpg",
      "year": 2025
    },
    {
      "tmdb": {
        "type": "tv",
        "id": "288089",
        "season": 1,
        "vote_average": 0,
        "vote_count": 0
      },
      "imdb": {
        "id": null
      },
      "modified": {
        "time": "2025-07-05T15:38:20.000Z"
      },
      "_id": "c44bfdfa0357e84e7243173b7bdee5a9",
      "name": "Dưới Tầng Ý Thức",
      "slug": "duoi-tang-y-thuc",
      "origin_name": "Destiny Switch",
      "poster_url": "https://phimimg.com/upload/vod/20250704-1/a762dddf9b7249db8ac9065febd5def2.jpg",
      "thumb_url": "https://phimimg.com/upload/vod/20250704-1/8149f75ade82f62bf810c63106ff1c47.jpg",
      "year": 2025
    },
    {
      "tmdb": {
        "type": "tv",
        "id": "292807",
        "season": 1,
        "vote_average": 0,
        "vote_count": 0
      },
      "imdb": {
        "id": null
      },
      "modified": {
        "time": "2025-07-05T15:37:48.000Z"
      },
      "_id": "6792ca026fefaf3a63297638dca900e9",
      "name": "Vân Thiên Chi Thượng",
      "slug": "van-thien-chi-thuong",
      "origin_name": "Above The Clouds",
      "poster_url": "https://phimimg.com/upload/vod/20250626-1/7259290b9b620275cd23b66dfe0f106b.jpg",
      "thumb_url": "https://phimimg.com/upload/vod/20250626-1/fa03a3337754f991dee4dcd7e4329922.jpg",
      "year": 2025
    },
    {
      "tmdb": {
        "type": "tv",
        "id": "292808",
        "season": 1,
        "vote_average": 0,
        "vote_count": 0
      },
      "imdb": {
        "id": null
      },
      "modified": {
        "time": "2025-07-05T15:37:18.000Z"
      },
      "_id": "e40dfc943a072c765a6ecf618443d386",
      "name": "Giấc Mộng Ban Sơ",
      "slug": "giac-mong-ban-so",
      "origin_name": "A Dream Like The True Love",
      "poster_url": "https://phimimg.com/upload/vod/20250629-1/595b65bf1f0a3394f84c3f9bbad4243e.jpg",
      "thumb_url": "https://phimimg.com/upload/vod/20250629-1/5c1df3fd4d6bbfc165b57d9bb49f01e5.jpg",
      "year": 2025
    },
    {
      "tmdb": {
        "type": "tv",
        "id": "294003",
        "season": 1,
        "vote_average": 0,
        "vote_count": 0
      },
      "imdb": {
        "id": null
      },
      "modified": {
        "time": "2025-07-05T15:19:43.000Z"
      },
      "_id": "df977c84b274de4bd67ed823cf61931e",
      "name": "Anh Vũ",
      "slug": "anh-vu",
      "origin_name": "Faith & Fire",
      "poster_url": "https://phimimg.com/upload/vod/20250705-1/3d86dc3603aece699c4013c377ea580b.jpg",
      "thumb_url": "https://phimimg.com/upload/vod/20250705-1/4691e6b776da46a3819603340f230972.jpg",
      "year": 2025
    },
    {
      "tmdb": {
        "type": "tv",
        "id": "108284",
        "season": 1,
        "vote_average": 8.346,
        "vote_count": 462
      },
      "imdb": {
        "id": null
      },
      "modified": {
        "time": "2025-07-05T15:15:16.000Z"
      },
      "_id": "ec5aa0b7846082a2415f0902f0da88f2",
      "name": "Bạn Trai Tôi Là Hồ Ly",
      "slug": "ban-trai-toi-la-ho-ly",
      "origin_name": "Tale Of The Nine Tailed",
      "poster_url": "https://phimimg.com/upload/vod/20250705-1/a4a386cd3fa5a2fdc8027541045dde9f.jpg",
      "thumb_url": "https://phimimg.com/upload/vod/20250705-1/704ca069bec8b39fa69f2819be991900.jpg",
      "year": 2020
    },
    {
      "tmdb": {
        "type": "tv",
        "id": "122612",
        "season": 1,
        "vote_average": 9.3,
        "vote_count": 3
      },
      "imdb": {
        "id": null
      },
      "modified": {
        "time": "2025-07-05T15:12:05.000Z"
      },
      "_id": "f8bf0d84e9b0e57f01008c4827d7fda5",
      "name": "Vạn Giới Độc Tôn",
      "slug": "van-gioi-doc-ton",
      "origin_name": "Ten Thousand Worlds",
      "poster_url": "https://phimimg.com/upload/vod/20250308-1/25c9c7486b5de820475bd8fe0ccb316e.jpg",
      "thumb_url": "https://phimimg.com/upload/vod/20250308-1/4b81238b9844aa16e3f7e9ee8afdbc94.jpg",
      "year": 2021
    },
    {
      "tmdb": {
        "type": "tv",
        "id": "274149",
        "season": 1,
        "vote_average": 9,
        "vote_count": 1
      },
      "imdb": {
        "id": null
      },
      "modified": {
        "time": "2025-07-05T15:11:11.000Z"
      },
      "_id": "4a1fee2e159e5ba76e1a8b3f54634d19",
      "name": "Trong Tông Môn Trừ Ta Ra Tất Cả Đều Là Gián Điệp",
      "slug": "trong-tong-mon-tru-ta-ra-tat-ca-deu-la-gian-diep",
      "origin_name": "Everyone In The Sect, Except Me, Is An Undercover Agent",
      "poster_url": "https://phimimg.com/upload/vod/20250219-1/38a3edcb90491413d8f3bc6b95c48229.jpg",
      "thumb_url": "https://phimimg.com/upload/vod/20250219-1/40d8c1b07a0ba5bed8a90d3753d6bf8e.jpg",
      "year": 2024
    },
    {
      "tmdb": {
        "type": "tv",
        "id": "101172",
        "season": 1,
        "vote_average": 8.4,
        "vote_count": 27
      },
      "imdb": {
        "id": null
      },
      "modified": {
        "time": "2025-07-05T15:10:38.000Z"
      },
      "_id": "6dd36e7dc260bc1beeb79a33da67b5df",
      "name": "Thôn Phệ Tinh Không",
      "slug": "thon-phe-tinh-khong",
      "origin_name": "Swallowed Star",
      "poster_url": "https://phimimg.com/upload/vod/20240821-1/a651652396e9f53c09cd88d28700d5c4.jpg",
      "thumb_url": "https://phimimg.com/upload/vod/20240821-1/22c49ba9590b0e5f3d126696c0bfbecf.jpg",
      "year": 2020
    }
  ],
  "pagination": {
    "totalItems": 23413,
    "totalItemsPerPage": 10,
    "currentPage": 1,
    "totalPages": 2342
  }
}

## 2. Thông tin phim & Danh sách tập phim

```
GET /v1/api/phim/{slug}
```
Ví dụ:
```
https://phimapi.com/phim/ngoi-truong-xac-song
```
Tham số:
| Tên    | Kiểu  | Mô tả                           |
|--------|-------|---------------------------------|
| `slug` | slug  | Slug phim lấy từ URL           |

Trả về: *(để trống – sẽ cập nhật sau)*

{
  "status": true,
  "msg": "done",
  "movie": {
    "tmdb": {
      "type": "tv",
      "id": "99966",
      "season": 2,
      "vote_average": 8.287,
      "vote_count": 4010
    },
    "imdb": {
      "id": null
    },
    "created": {
      "time": "2024-05-24T02:45:20.000Z"
    },
    "modified": {
      "time": "2025-03-25T17:16:13.000Z"
    },
    "_id": "15341840eedadf2f53ad8571ac6078a2",
    "name": "Ngôi Trường Xác Sống",
    "slug": "ngoi-truong-xac-song",
    "origin_name": "All of Us Are Dead",
    "content": "Một trường cấp ba trở thành điểm bùng phát virus thây ma. Các học sinh mắc kẹt phải nỗ lực thoát ra – hoặc biến thành một trong những người nhiễm bệnh hung tợn.",
    "type": "series",
    "status": "completed",
    "poster_url": "https://phimimg.com/upload/vod/20250325-1/6db202d6161c123d96b0180c2da9b1e5.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250325-1/6985255433cba78af7f28fe63c5126c9.jpg",
    "is_copyright": false,
    "sub_docquyen": false,
    "chieurap": false,
    "trailer_url": "https://www.youtube.com/watch?v=IN5TD4VRcSM",
    "time": "65 phút/tập",
    "episode_current": "Hoàn Tất (12/12)",
    "episode_total": "12",
    "quality": "FHD",
    "lang": "Vietsub + Lồng Tiếng",
    "notify": "",
    "showtimes": "",
    "year": 2022,
    "view": 1,
    "actor": [
      "Park Ji-hu",
      "Yoon Chan-young",
      "Cho Yi-hyun",
      "Lomon",
      "Yoo In-soo",
      "Lee You-mi",
      "Kim Byung-chul",
      "Lee Kyoo-hyung",
      "Jeon Bae-soo"
    ],
    "director": [
      "Đang cập nhật"
    ],
    "category": [
      {
        "id": "9822be111d2ccc29c7172c78b8af8ff5",
        "name": "Hành Động",
        "slug": "hanh-dong"
      },
      {
        "id": "66c78b23908113d478d8d85390a244b4",
        "name": "Phiêu Lưu",
        "slug": "phieu-luu"
      },
      {
        "id": "37a7b38b6184a5ebd3c43015aa20709d",
        "name": "Chính Kịch",
        "slug": "chinh-kich"
      },
      {
        "id": "0bcf4077916678de9b48c89221fcf8ae",
        "name": "Khoa Học",
        "slug": "khoa-hoc"
      },
      {
        "id": "68564911f00849030f9c9c144ea1b931",
        "name": "Viễn Tưởng",
        "slug": "vien-tuong"
      }
    ],
    "country": [
      {
        "id": "05de95be5fc404da9680bbb3dd8262e6",
        "name": "Hàn Quốc",
        "slug": "han-quoc"
      }
    ]
  },
  "episodes": [
    {
      "server_name": "#Hà Nội (Vietsub)",
      "server_data": [
        {
          "name": "Tập 01",
          "slug": "tap-01",
          "filename": "Ngôi Trường Xác Sống - All of Us Are Dead - 2022 - 1080p - Vietsub - Tập 01",
          "link_embed": "https://player.phimapi.com/player/?url=https://s4.phim1280.tv/20250325/15U0OSx5/index.m3u8",
          "link_m3u8": "https://s4.phim1280.tv/20250325/15U0OSx5/index.m3u8"
        },
        {
          "name": "Tập 02",
          "slug": "tap-02",
          "filename": "Ngôi Trường Xác Sống - All of Us Are Dead - 2022 - 1080p - Vietsub - Tập 02",
          "link_embed": "https://player.phimapi.com/player/?url=https://s4.phim1280.tv/20250325/L13mtaK3/index.m3u8",
          "link_m3u8": "https://s4.phim1280.tv/20250325/L13mtaK3/index.m3u8"
        },
        {
          "name": "Tập 03",
          "slug": "tap-03",
          "filename": "Ngôi Trường Xác Sống - All of Us Are Dead - 2022 - 1080p - Vietsub - Tập 03",
          "link_embed": "https://player.phimapi.com/player/?url=https://s4.phim1280.tv/20250325/xqyp5Z1I/index.m3u8",
          "link_m3u8": "https://s4.phim1280.tv/20250325/xqyp5Z1I/index.m3u8"
        },
        {
          "name": "Tập 04",
          "slug": "tap-04",
          "filename": "Ngôi Trường Xác Sống - All of Us Are Dead - 2022 - 1080p - Vietsub - Tập 04",
          "link_embed": "https://player.phimapi.com/player/?url=https://s4.phim1280.tv/20250325/urYLPIR6/index.m3u8",
          "link_m3u8": "https://s4.phim1280.tv/20250325/urYLPIR6/index.m3u8"
        },
        {
          "name": "Tập 05",
          "slug": "tap-05",
          "filename": "Ngôi Trường Xác Sống - All of Us Are Dead - 2022 - 1080p - Vietsub - Tập 05",
          "link_embed": "https://player.phimapi.com/player/?url=https://s4.phim1280.tv/20250325/PzPUQ6vI/index.m3u8",
          "link_m3u8": "https://s4.phim1280.tv/20250325/PzPUQ6vI/index.m3u8"
        },
        {
          "name": "Tập 06",
          "slug": "tap-06",
          "filename": "Ngôi Trường Xác Sống - All of Us Are Dead - 2022 - 1080p - Vietsub - Tập 06",
          "link_embed": "https://player.phimapi.com/player/?url=https://s4.phim1280.tv/20250325/BqradtcC/index.m3u8",
          "link_m3u8": "https://s4.phim1280.tv/20250325/BqradtcC/index.m3u8"
        },
        {
          "name": "Tập 07",
          "slug": "tap-07",
          "filename": "Ngôi Trường Xác Sống - All of Us Are Dead - 2022 - 1080p - Vietsub - Tập 07",
          "link_embed": "https://player.phimapi.com/player/?url=https://s4.phim1280.tv/20250325/NOt6t0Kl/index.m3u8",
          "link_m3u8": "https://s4.phim1280.tv/20250325/NOt6t0Kl/index.m3u8"
        },
        {
          "name": "Tập 08",
          "slug": "tap-08",
          "filename": "Ngôi Trường Xác Sống - All of Us Are Dead - 2022 - 1080p - Vietsub - Tập 08",
          "link_embed": "https://player.phimapi.com/player/?url=https://s4.phim1280.tv/20250325/7lkLmHTd/index.m3u8",
          "link_m3u8": "https://s4.phim1280.tv/20250325/7lkLmHTd/index.m3u8"
        },
        {
          "name": "Tập 09",
          "slug": "tap-09",
          "filename": "Ngôi Trường Xác Sống - All of Us Are Dead - 2022 - 1080p - Vietsub - Tập 09",
          "link_embed": "https://player.phimapi.com/player/?url=https://s4.phim1280.tv/20250325/CX7skR5r/index.m3u8",
          "link_m3u8": "https://s4.phim1280.tv/20250325/CX7skR5r/index.m3u8"
        },
        {
          "name": "Tập 10",
          "slug": "tap-10",
          "filename": "Ngôi Trường Xác Sống - All of Us Are Dead - 2022 - 1080p - Vietsub - Tập 10",
          "link_embed": "https://player.phimapi.com/player/?url=https://s4.phim1280.tv/20250325/BceIVv5Y/index.m3u8",
          "link_m3u8": "https://s4.phim1280.tv/20250325/BceIVv5Y/index.m3u8"
        },
        {
          "name": "Tập 11",
          "slug": "tap-11",
          "filename": "Ngôi Trường Xác Sống - All of Us Are Dead - 2022 - 1080p - Vietsub - Tập 11",
          "link_embed": "https://player.phimapi.com/player/?url=https://s4.phim1280.tv/20250325/maF3oplG/index.m3u8",
          "link_m3u8": "https://s4.phim1280.tv/20250325/maF3oplG/index.m3u8"
        },
        {
          "name": "Tập 12",
          "slug": "tap-12",
          "filename": "Ngôi Trường Xác Sống - All of Us Are Dead - 2022 - 1080p - Vietsub - Tập 12",
          "link_embed": "https://player.phimapi.com/player/?url=https://s4.phim1280.tv/20250325/YbkatJrM/index.m3u8",
          "link_m3u8": "https://s4.phim1280.tv/20250325/YbkatJrM/index.m3u8"
        }
      ]
    },
    {
      "server_name": "#Hà Nội (Lồng Tiếng)",
      "server_data": [
        {
          "name": "Tập 01",
          "slug": "tap-01",
          "filename": "Ngôi Trường Xác Sống - All of Us Are Dead - 2022 - 1080p - Lồng Tiếng - Tập 01",
          "link_embed": "https://player.phimapi.com/player/?url=https://s4.phim1280.tv/20250325/JpYZg7Jp/index.m3u8",
          "link_m3u8": "https://s4.phim1280.tv/20250325/JpYZg7Jp/index.m3u8"
        },
        {
          "name": "Tập 02",
          "slug": "tap-02",
          "filename": "Ngôi Trường Xác Sống - All of Us Are Dead - 2022 - 1080p - Lồng Tiếng - Tập 02",
          "link_embed": "https://player.phimapi.com/player/?url=https://s4.phim1280.tv/20250325/1dVXUeaC/index.m3u8",
          "link_m3u8": "https://s4.phim1280.tv/20250325/1dVXUeaC/index.m3u8"
        },
        {
          "name": "Tập 03",
          "slug": "tap-03",
          "filename": "Ngôi Trường Xác Sống - All of Us Are Dead - 2022 - 1080p - Lồng Tiếng - Tập 03",
          "link_embed": "https://player.phimapi.com/player/?url=https://s4.phim1280.tv/20250325/RI9PdPPK/index.m3u8",
          "link_m3u8": "https://s4.phim1280.tv/20250325/RI9PdPPK/index.m3u8"
        },
        {
          "name": "Tập 04",
          "slug": "tap-04",
          "filename": "Ngôi Trường Xác Sống - All of Us Are Dead - 2022 - 1080p - Lồng Tiếng - Tập 04",
          "link_embed": "https://player.phimapi.com/player/?url=https://s4.phim1280.tv/20250325/8uxFiwTD/index.m3u8",
          "link_m3u8": "https://s4.phim1280.tv/20250325/8uxFiwTD/index.m3u8"
        },
        {
          "name": "Tập 05",
          "slug": "tap-05",
          "filename": "Ngôi Trường Xác Sống - All of Us Are Dead - 2022 - 1080p - Lồng Tiếng - Tập 05",
          "link_embed": "https://player.phimapi.com/player/?url=https://s4.phim1280.tv/20250325/ZIgjYXZN/index.m3u8",
          "link_m3u8": "https://s4.phim1280.tv/20250325/ZIgjYXZN/index.m3u8"
        },
        {
          "name": "Tập 06",
          "slug": "tap-06",
          "filename": "Ngôi Trường Xác Sống - All of Us Are Dead - 2022 - 1080p - Lồng Tiếng - Tập 06",
          "link_embed": "https://player.phimapi.com/player/?url=https://s4.phim1280.tv/20250325/KgGB3Yva/index.m3u8",
          "link_m3u8": "https://s4.phim1280.tv/20250325/KgGB3Yva/index.m3u8"
        },
        {
          "name": "Tập 07",
          "slug": "tap-07",
          "filename": "Ngôi Trường Xác Sống - All of Us Are Dead - 2022 - 1080p - Lồng Tiếng - Tập 07",
          "link_embed": "https://player.phimapi.com/player/?url=https://s4.phim1280.tv/20250325/ZnlWLvub/index.m3u8",
          "link_m3u8": "https://s4.phim1280.tv/20250325/ZnlWLvub/index.m3u8"
        },
        {
          "name": "Tập 08",
          "slug": "tap-08",
          "filename": "Ngôi Trường Xác Sống - All of Us Are Dead - 2022 - 1080p - Lồng Tiếng - Tập 08",
          "link_embed": "https://player.phimapi.com/player/?url=https://s4.phim1280.tv/20250325/3mBOdB1h/index.m3u8",
          "link_m3u8": "https://s4.phim1280.tv/20250325/3mBOdB1h/index.m3u8"
        },
        {
          "name": "Tập 09",
          "slug": "tap-09",
          "filename": "Ngôi Trường Xác Sống - All of Us Are Dead - 2022 - 1080p - Lồng Tiếng - Tập 09",
          "link_embed": "https://player.phimapi.com/player/?url=https://s4.phim1280.tv/20250325/fBrzVXfH/index.m3u8",
          "link_m3u8": "https://s4.phim1280.tv/20250325/fBrzVXfH/index.m3u8"
        },
        {
          "name": "Tập 10",
          "slug": "tap-10",
          "filename": "Ngôi Trường Xác Sống - All of Us Are Dead - 2022 - 1080p - Lồng Tiếng - Tập 10",
          "link_embed": "https://player.phimapi.com/player/?url=https://s4.phim1280.tv/20250325/faYd8qAt/index.m3u8",
          "link_m3u8": "https://s4.phim1280.tv/20250325/faYd8qAt/index.m3u8"
        },
        {
          "name": "Tập 11",
          "slug": "tap-11",
          "filename": "Ngôi Trường Xác Sống - All of Us Are Dead - 2022 - 1080p - Lồng Tiếng - Tập 11",
          "link_embed": "https://player.phimapi.com/player/?url=https://s4.phim1280.tv/20250325/xLFFPtQq/index.m3u8",
          "link_m3u8": "https://s4.phim1280.tv/20250325/xLFFPtQq/index.m3u8"
        },
        {
          "name": "Tập 12",
          "slug": "tap-12",
          "filename": "Ngôi Trường Xác Sống - All of Us Are Dead - 2022 - 1080p - Lồng Tiếng - Tập 12",
          "link_embed": "https://player.phimapi.com/player/?url=https://s4.phim1280.tv/20250325/RgQ9zXvf/index.m3u8",
          "link_m3u8": "https://s4.phim1280.tv/20250325/RgQ9zXvf/index.m3u8"
        }
      ]
    }
  ]
}

## 3. Tổng hợp danh sách phim (đa dụng)

```
GET /v1/api/danh-sach/{type_list}?page={page}&sort_field={sort_field}&sort_type={sort_type}&sort_lang={sort_lang}&category={category}&country={country}&year={year}&limit={limit}
```
Ví dụ:
```
https://phimapi.com/v1/api/danh-sach/phim-le?page=1&sort_field=modified_time&sort_type=desc&sort_lang=vietsub&category=hanh-dong&country=trung-quoc&year=2024&limit=10



### Thông số kỹ thuật
| Tên           | Kiểu   | Giá trị mẫu        | Mô tả                                                                                      |
|---------------|--------|--------------------|-------------------------------------------------------------------------------------------|
| `type_list`   | slug   | `phim-le`, `phim-bo`, `phim-chieu-rap`, `phim-thuyet-minh`, `phim-long-tieng`, `tv` | Loại danh sách phim cần lấy |
| `page`        | int    | `1`                | Trang hiện tại (start = 1)                                                                 |
| `sort_field`  | string | `modified_time`    | Trường sắp xếp (hiện tại chỉ thấy `modified_time`)                                         |
| `sort_type`   | string | `desc`, `asc`      | Thứ tự sắp xếp                                                                             |
| `sort_lang`   | slug   | `vietsub`, `thuyet-minh`, `long-tieng` | Ngôn ngữ / phiên bản phim                                        |
| `category`    | slug   | `hanh-dong`        | Thể loại (slug)                                                                            |
| `country`     | slug   | `trung-quoc`       | Quốc gia (slug)                                                                            |
| `year`        | int    | `2024`             | Năm phát hành                                                                              |
| `limit`       | int    | `10` (max 64)      | Giới hạn số kết quả trả về                                                                 |

Trả về: *(để trống – sẽ cập nhật sau)*

{
  "status": true,
  "msg": "done",
  "data": {
    "seoOnPage": {
      "og_type": "website",
      "titleHead": "Phim lẻ | Phim lẻ hay tuyển chọn | Phim lẻ mới nhất 2025",
      "descriptionHead": "Phim lẻ mới nhất tuyển chọn chất lượng cao, phim lẻ trọn bộ vietsub cập nhật nhanh nhất. Phim lẻ vietsub nhanh nhất",
      "og_image": [
        "/upload/vod/20250701-1/1d1ffed3edae586ebd534f8bf39883d5.jpg",
        "/upload/vod/20241112-1/80b6820b76be7503e9890b1f7582d93c.jpg",
        "/upload/vod/20250511-1/8c44aeef971ba41899c3b4fe711e3c5a.jpg",
        "/upload/vod/20250509-1/faa835fc86397a6ef8850393cd7b12e6.jpg",
        "/upload/vod/20240305-1/2e5c4897a63b1a96e76ab017d38b50e9.jpg",
        "/upload/vod/20240719-1/2e3e50c7d820f8d41eae05eeefc5f675.jpg",
        "/upload/vod/20250421-1/d3841ec78cc50b6ad419e8c4ace621d8.jpg",
        "/upload/vod/20250305-1/740fa151d4103e4ec04b1204bdfe315a.jpg",
        "/upload/vod/20250313-1/9e0b0c02ce124d9d1b2e31fbb924858f.jpg",
        "/upload/vod/20250313-1/531372020d2f804a76c5913dad1517fa.jpg"
      ],
      "og_url": "danh-sach/phim-le"
    },
    "breadCrumb": [
      {
        "name": "Phim Lẻ",
        "slug": "/danh-sach/phim-le",
        "isCurrent": false,
        "position": 2
      },
      {
        "name": "Trang 1",
        "isCurrent": true,
        "position": 3
      }
    ],
    "titlePage": "Phim Lẻ",
    "items": [
      {
        "tmdb": {
          "type": "movie",
          "id": "1229349",
          "season": null,
          "vote_average": 6.427,
          "vote_count": 82
        },
        "imdb": {
          "id": null
        },
        "created": {
          "time": "2024-07-30T17:58:41.000Z"
        },
        "modified": {
          "time": "2025-07-01T09:29:33.000Z"
        },
        "_id": "3ad9b2048e580655c901c44e06d9dd69",
        "name": "Cay Nóng Hôi Hổi (Nhiệt Lạt Cổn Thang)",
        "slug": "cay-nong-hoi-hoi-nhiet-lat-con-thang",
        "origin_name": "Yolo",
        "type": "single",
        "poster_url": "upload/vod/20250701-1/1d1ffed3edae586ebd534f8bf39883d5.jpg",
        "thumb_url": "upload/vod/20250701-1/6277c9a1e77a5b14af949980b7558d8d.jpg",
        "sub_docquyen": false,
        "chieurap": false,
        "time": "129 phút",
        "episode_current": "Full",
        "quality": "FHD",
        "lang": "Vietsub + Thuyết Minh",
        "year": 2024,
        "category": [
          {
            "id": "37a7b38b6184a5ebd3c43015aa20709d",
            "name": "Chính Kịch",
            "slug": "chinh-kich"
          },
          {
            "id": "ba6fd52e5a3aca80eaaf1a3b50a182db",
            "name": "Hài Hước",
            "slug": "hai-huoc"
          },
          {
            "id": "9822be111d2ccc29c7172c78b8af8ff5",
            "name": "Hành Động",
            "slug": "hanh-dong"
          },
          {
            "id": "a7b065b92ad356387ef2e075dee66529",
            "name": "Tâm Lý",
            "slug": "tam-ly"
          }
        ],
        "country": [
          {
            "id": "3e075636c731fe0f889c69e0bf82c083",
            "name": "Trung Quốc",
            "slug": "trung-quoc"
          }
        ]
      },
      {
        "tmdb": {
          "type": "movie",
          "id": "1369863",
          "season": null,
          "vote_average": 3,
          "vote_count": 1
        },
        "imdb": {
          "id": null
        },
        "created": {
          "time": "2024-11-12T18:28:09.000Z"
        },
        "modified": {
          "time": "2025-06-24T10:27:14.000Z"
        },
        "_id": "a409a00df31982807386f27f8dc84407",
        "name": "Lang Chiến",
        "slug": "lang-chien",
        "origin_name": "Fangs & Fury",
        "type": "single",
        "poster_url": "upload/vod/20241112-1/80b6820b76be7503e9890b1f7582d93c.jpg",
        "thumb_url": "upload/vod/20241112-1/09c7c40c0b0f95f2695253942138ab2d.jpg",
        "sub_docquyen": false,
        "chieurap": false,
        "time": "72 phút",
        "episode_current": "Full",
        "quality": "FHD",
        "lang": "Vietsub + Thuyết Minh",
        "year": 2024,
        "category": [
          {
            "id": "9822be111d2ccc29c7172c78b8af8ff5",
            "name": "Hành Động",
            "slug": "hanh-dong"
          },
          {
            "id": "0bcf4077916678de9b48c89221fcf8ae",
            "name": "Khoa Học",
            "slug": "khoa-hoc"
          },
          {
            "id": "68564911f00849030f9c9c144ea1b931",
            "name": "Viễn Tưởng",
            "slug": "vien-tuong"
          },
          {
            "id": "bb2b4b030608ca5984c8dd0770f5b40b",
            "name": "Tình Cảm",
            "slug": "tinh-cam"
          }
        ],
        "country": [
          {
            "id": "3e075636c731fe0f889c69e0bf82c083",
            "name": "Trung Quốc",
            "slug": "trung-quoc"
          }
        ]
      },
      {
        "tmdb": {
          "type": "movie",
          "id": "1327843",
          "season": null,
          "vote_average": 7.2,
          "vote_count": 4
        },
        "imdb": {
          "id": null
        },
        "created": {
          "time": "2024-09-13T16:35:47.000Z"
        },
        "modified": {
          "time": "2025-05-11T02:38:58.000Z"
        },
        "_id": "60ee22c27013613e980104db94ae53c9",
        "name": "Trò Chơi Sinh Tử",
        "slug": "tro-choi-sinh-tu-2024",
        "origin_name": "The Death Game",
        "type": "single",
        "poster_url": "upload/vod/20250511-1/8c44aeef971ba41899c3b4fe711e3c5a.jpg",
        "thumb_url": "upload/vod/20250511-1/e0f035d67ca3096aa9c2b0a935e9a6b7.jpg",
        "sub_docquyen": false,
        "chieurap": false,
        "time": "88 phút",
        "episode_current": "Full",
        "quality": "FHD",
        "lang": "Vietsub",
        "year": 2024,
        "category": [
          {
            "id": "66c78b23908113d478d8d85390a244b4",
            "name": "Phiêu Lưu",
            "slug": "phieu-luu"
          },
          {
            "id": "9822be111d2ccc29c7172c78b8af8ff5",
            "name": "Hành Động",
            "slug": "hanh-dong"
          },
          {
            "id": "f8ec3e9b77c509fdf64f0c387119b916",
            "name": "Lịch Sử",
            "slug": "lich-su"
          }
        ],
        "country": [
          {
            "id": "3e075636c731fe0f889c69e0bf82c083",
            "name": "Trung Quốc",
            "slug": "trung-quoc"
          }
        ]
      },
      {
        "tmdb": {
          "type": "movie",
          "id": "1305642",
          "season": null,
          "vote_average": 6.105,
          "vote_count": 19
        },
        "imdb": {
          "id": null
        },
        "created": {
          "time": "2025-05-09T16:56:43.000Z"
        },
        "modified": {
          "time": "2025-05-09T16:56:43.000Z"
        },
        "_id": "dbcec7736b4d543d9251de81b4a9917f",
        "name": "Phẫn Thành",
        "slug": "phan-thanh",
        "origin_name": "Cesium Fallout",
        "type": "single",
        "poster_url": "upload/vod/20250509-1/faa835fc86397a6ef8850393cd7b12e6.jpg",
        "thumb_url": "upload/vod/20250509-1/bb7fa1600cc31f8c5471b8de872770d8.jpg",
        "sub_docquyen": false,
        "chieurap": false,
        "time": "136 phút",
        "episode_current": "Full",
        "quality": "FHD",
        "lang": "Vietsub",
        "year": 2024,
        "category": [
          {
            "id": "37a7b38b6184a5ebd3c43015aa20709d",
            "name": "Chính Kịch",
            "slug": "chinh-kich"
          },
          {
            "id": "9822be111d2ccc29c7172c78b8af8ff5",
            "name": "Hành Động",
            "slug": "hanh-dong"
          },
          {
            "id": "7a035ac0b37f5854f0f6979260899c90",
            "name": "Hình Sự",
            "slug": "hinh-su"
          },
          {
            "id": "a7b065b92ad356387ef2e075dee66529",
            "name": "Tâm Lý",
            "slug": "tam-ly"
          }
        ],
        "country": [
          {
            "id": "3e075636c731fe0f889c69e0bf82c083",
            "name": "Trung Quốc",
            "slug": "trung-quoc"
          },
          {
            "id": "a0cd53c9875b96640ac264ca81996f9f",
            "name": "Hồng Kông",
            "slug": "hong-kong"
          }
        ]
      },
      {
        "tmdb": {
          "type": null,
          "id": null,
          "season": null,
          "vote_average": 0,
          "vote_count": 0
        },
        "imdb": {
          "id": null
        },
        "created": {
          "time": "2024-03-05T12:49:02.000Z"
        },
        "modified": {
          "time": "2025-04-28T19:37:35.000Z"
        },
        "_id": "b92d0fcbc8d2624a2ea66907feb8d8de",
        "name": "Phá Chiến",
        "slug": "pha-chien",
        "origin_name": "Break War",
        "type": "single",
        "poster_url": "upload/vod/20240305-1/2e5c4897a63b1a96e76ab017d38b50e9.jpg",
        "thumb_url": "upload/vod/20240305-1/b2fb0a42f68a20a0d585c03b660425c7.jpg",
        "sub_docquyen": false,
        "chieurap": false,
        "time": "86 phút",
        "episode_current": "Full",
        "quality": "FHD",
        "lang": "Vietsub + Thuyết Minh",
        "year": 2024,
        "category": [
          {
            "id": "37a7b38b6184a5ebd3c43015aa20709d",
            "name": "Chính Kịch",
            "slug": "chinh-kich"
          },
          {
            "id": "9822be111d2ccc29c7172c78b8af8ff5",
            "name": "Hành Động",
            "slug": "hanh-dong"
          },
          {
            "id": "2fb53017b3be83cd754a08adab3e916c",
            "name": "Bí Ẩn",
            "slug": "bi-an"
          }
        ],
        "country": [
          {
            "id": "92aa3c93de523a414a520399bb6a4304",
            "name": "Trung Quốc",
            "slug": "trung-quoc"
          }
        ]
      },
      {
        "tmdb": {
          "type": null,
          "id": null,
          "season": null,
          "vote_average": 0,
          "vote_count": 0
        },
        "imdb": {
          "id": null
        },
        "created": {
          "time": "2024-07-19T15:03:12.000Z"
        },
        "modified": {
          "time": "2025-04-28T17:17:58.000Z"
        },
        "_id": "27c602eea419202c123f75f17df800e0",
        "name": "Địch Nhân Kiệt Thông Thiên Nhân Ngẫu",
        "slug": "dich-nhan-kiet-thong-thien-nhan-ngau",
        "origin_name": "The Mystery Of Humanoid Puppet",
        "type": "single",
        "poster_url": "upload/vod/20240719-1/2e3e50c7d820f8d41eae05eeefc5f675.jpg",
        "thumb_url": "upload/vod/20240719-1/6ca74096951861aa44454e4998e7aced.jpg",
        "sub_docquyen": false,
        "chieurap": false,
        "time": "87 phút",
        "episode_current": "Full",
        "quality": "FHD",
        "lang": "Vietsub + Thuyết Minh",
        "year": 2024,
        "category": [
          {
            "id": "37a7b38b6184a5ebd3c43015aa20709d",
            "name": "Chính Kịch",
            "slug": "chinh-kich"
          },
          {
            "id": "2fb53017b3be83cd754a08adab3e916c",
            "name": "Bí Ẩn",
            "slug": "bi-an"
          },
          {
            "id": "9822be111d2ccc29c7172c78b8af8ff5",
            "name": "Hành Động",
            "slug": "hanh-dong"
          }
        ],
        "country": [
          {
            "id": "3e075636c731fe0f889c69e0bf82c083",
            "name": "Trung Quốc",
            "slug": "trung-quoc"
          }
        ]
      },
      {
        "tmdb": {
          "type": "movie",
          "id": "1281386",
          "season": null,
          "vote_average": 6.8,
          "vote_count": 2
        },
        "imdb": {
          "id": null
        },
        "created": {
          "time": "2025-04-21T04:21:25.000Z"
        },
        "modified": {
          "time": "2025-04-21T05:34:01.000Z"
        },
        "_id": "474e406fc68c5e3f0bce9a7206cdef5e",
        "name": "Đấu Phá Thương Khung 3: Trừ Gian Diệt Ác",
        "slug": "dau-pha-thuong-khung-3-tru-gian-diet-ac",
        "origin_name": "Fights Break Sphere 3",
        "type": "single",
        "poster_url": "upload/vod/20250421-1/d3841ec78cc50b6ad419e8c4ace621d8.jpg",
        "thumb_url": "upload/vod/20250421-1/3cc0bba6829dddb6298853026e9a87eb.jpg",
        "sub_docquyen": false,
        "chieurap": false,
        "time": "81 phút",
        "episode_current": "Full",
        "quality": "FHD",
        "lang": "Vietsub",
        "year": 2024,
        "category": [
          {
            "id": "66c78b23908113d478d8d85390a244b4",
            "name": "Phiêu Lưu",
            "slug": "phieu-luu"
          },
          {
            "id": "9822be111d2ccc29c7172c78b8af8ff5",
            "name": "Hành Động",
            "slug": "hanh-dong"
          },
          {
            "id": "68564911f00849030f9c9c144ea1b931",
            "name": "Viễn Tưởng",
            "slug": "vien-tuong"
          }
        ],
        "country": [
          {
            "id": "3e075636c731fe0f889c69e0bf82c083",
            "name": "Trung Quốc",
            "slug": "trung-quoc"
          }
        ]
      },
      {
        "tmdb": {
          "type": "movie",
          "id": "1122824",
          "season": null,
          "vote_average": 5.7,
          "vote_count": 12
        },
        "imdb": {
          "id": null
        },
        "created": {
          "time": "2025-03-05T20:48:34.000Z"
        },
        "modified": {
          "time": "2025-03-18T18:31:59.000Z"
        },
        "_id": "9745c8309fb3902f9b19a3b78d0cbdec",
        "name": "Môn Tiền Bảo Địa",
        "slug": "mon-tien-bao-dia",
        "origin_name": "100 Yards",
        "type": "single",
        "poster_url": "upload/vod/20250305-1/740fa151d4103e4ec04b1204bdfe315a.jpg",
        "thumb_url": "upload/vod/20250305-1/2bbf611b26b9e0c01e4b37f9775d92b1.jpg",
        "sub_docquyen": false,
        "chieurap": true,
        "time": "108 phút",
        "episode_current": "Full",
        "quality": "FHD",
        "lang": "Vietsub",
        "year": 2024,
        "category": [
          {
            "id": "9822be111d2ccc29c7172c78b8af8ff5",
            "name": "Hành Động",
            "slug": "hanh-dong"
          },
          {
            "id": "37a7b38b6184a5ebd3c43015aa20709d",
            "name": "Chính Kịch",
            "slug": "chinh-kich"
          }
        ],
        "country": [
          {
            "id": "3e075636c731fe0f889c69e0bf82c083",
            "name": "Trung Quốc",
            "slug": "trung-quoc"
          }
        ]
      },
      {
        "tmdb": {
          "type": "movie",
          "id": "1257399",
          "season": null,
          "vote_average": 2.8,
          "vote_count": 2
        },
        "imdb": {
          "id": null
        },
        "created": {
          "time": "2025-03-13T16:19:26.000Z"
        },
        "modified": {
          "time": "2025-03-13T16:19:26.000Z"
        },
        "_id": "d1baab7ffae45100860a3825fa29b7e1",
        "name": "Quái Vật Tập Kích",
        "slug": "quai-vat-tap-kich",
        "origin_name": "The Monster Is Coming",
        "type": "single",
        "poster_url": "upload/vod/20250313-1/9e0b0c02ce124d9d1b2e31fbb924858f.jpg",
        "thumb_url": "upload/vod/20250313-1/de9abbb3aca1804387d58adf7417192e.jpg",
        "sub_docquyen": false,
        "chieurap": false,
        "time": "83 phút",
        "episode_current": "Full",
        "quality": "FHD",
        "lang": "Vietsub",
        "year": 2024,
        "category": [
          {
            "id": "37a7b38b6184a5ebd3c43015aa20709d",
            "name": "Chính Kịch",
            "slug": "chinh-kich"
          },
          {
            "id": "9822be111d2ccc29c7172c78b8af8ff5",
            "name": "Hành Động",
            "slug": "hanh-dong"
          },
          {
            "id": "66c78b23908113d478d8d85390a244b4",
            "name": "Phiêu Lưu",
            "slug": "phieu-luu"
          }
        ],
        "country": [
          {
            "id": "3e075636c731fe0f889c69e0bf82c083",
            "name": "Trung Quốc",
            "slug": "trung-quoc"
          }
        ]
      },
      {
        "tmdb": {
          "type": "movie",
          "id": "1339149",
          "season": null,
          "vote_average": 5.875,
          "vote_count": 4
        },
        "imdb": {
          "id": null
        },
        "created": {
          "time": "2025-03-13T15:57:50.000Z"
        },
        "modified": {
          "time": "2025-03-13T15:57:50.000Z"
        },
        "_id": "4260ccc84d7f06c14d2f4d6ca383f0cc",
        "name": "12 Giờ Của Lửa Giận",
        "slug": "12-gio-cua-lua-gian",
        "origin_name": "Fury 12 Hours",
        "type": "single",
        "poster_url": "upload/vod/20250313-1/531372020d2f804a76c5913dad1517fa.jpg",
        "thumb_url": "upload/vod/20250313-1/47c967937a6ed0506582e96e0a26b675.jpg",
        "sub_docquyen": false,
        "chieurap": false,
        "time": "83 phút",
        "episode_current": "Full",
        "quality": "FHD",
        "lang": "Vietsub + Lồng Tiếng",
        "year": 2024,
        "category": [
          {
            "id": "9822be111d2ccc29c7172c78b8af8ff5",
            "name": "Hành Động",
            "slug": "hanh-dong"
          },
          {
            "id": "2fb53017b3be83cd754a08adab3e916c",
            "name": "Bí Ẩn",
            "slug": "bi-an"
          }
        ],
        "country": [
          {
            "id": "3e075636c731fe0f889c69e0bf82c083",
            "name": "Trung Quốc",
            "slug": "trung-quoc"
          }
        ]
      }
    ],
    "params": {
      "type_slug": "danh-sach",
      "filterCategory": [
        "hanh-dong"
      ],
      "filterCountry": [
        "trung-quoc"
      ],
      "filterYear": [
        "2024"
      ],
      "filterType": [
        "vietsub"
      ],
      "sortField": "modified.time",
      "sortType": "desc",
      "pagination": {
        "totalItems": 92,
        "totalItemsPerPage": 10,
        "currentPage": 1,
        "totalPages": 10
      }
    },
    "type_list": "phim-le",
    "APP_DOMAIN_FRONTEND": "https://phimapi.com",
    "APP_DOMAIN_CDN_IMAGE": "https://phimimg.com"
  }
}

## 4. Tìm kiếm phim

```
GET /v1/api/tim-kiem?keyword={keyword}&page={page}&sort_field={sort_field}&sort_type={sort_type}&sort_lang={sort_lang}&category={category}&country={country}&year={year}&limit={limit}
```
Ví dụ:
```
https://phimapi.com/v1/api/tim-kiem?keyword=ngoi+truong+xac+song&page=1
```

Tham số giống endpoint **Tổng hợp danh sách** (mục 3) với bổ sung:
| Tên        | Kiểu | Mô tả                       |
|------------|------|-----------------------------|
| `keyword`  | str  | Từ khóa tìm kiếm (bắt buộc) |

Trả về: *(để trống – sẽ cập nhật sau)*

{
  "status": "success",
  "msg": "done",
  "data": {
    "seoOnPage": {
      "og_type": "website",
      "titleHead": "Phim ngoi truong xac song | ngoi truong xac song vietsub | Phim ngoi truong xac song hay | Tuyển tập ngoi truong xac song mới nhất 2025",
      "descriptionHead": "Phim ngoi truong xac song hay tuyển tập, phim ngoi truong xac song mới nhất, tổng hợp phim ngoi truong xac song, ngoi truong xac song full HD, ngoi truong xac song vietsub, xem ngoi truong xac song online",
      "og_image": [
        "/upload/vod/20250325-1/6db202d6161c123d96b0180c2da9b1e5.jpg"
      ],
      "og_url": "tim-kiem?keyword=ngoi truong xac song"
    },
    "breadCrumb": [
      {
        "name": "Tìm kiếm từ khóa: ngoi truong xac song - Trang 1",
        "isCurrent": true,
        "position": 2
      }
    ],
    "titlePage": "Tìm kiếm từ khóa: ngoi truong xac song",
    "items": [
      {
        "tmdb": {
          "type": "tv",
          "id": "99966",
          "season": 2,
          "vote_average": 8.287,
          "vote_count": 4010
        },
        "imdb": {
          "id": null
        },
        "created": {
          "time": "2024-05-24T02:45:20.000Z"
        },
        "modified": {
          "time": "2025-03-25T17:16:13.000Z"
        },
        "_id": "15341840eedadf2f53ad8571ac6078a2",
        "name": "Ngôi Trường Xác Sống",
        "slug": "ngoi-truong-xac-song",
        "origin_name": "All of Us Are Dead",
        "type": "series",
        "poster_url": "upload/vod/20250325-1/6db202d6161c123d96b0180c2da9b1e5.jpg",
        "thumb_url": "upload/vod/20250325-1/6985255433cba78af7f28fe63c5126c9.jpg",
        "sub_docquyen": false,
        "chieurap": false,
        "time": "65 phút/tập",
        "episode_current": "Hoàn Tất (12/12)",
        "quality": "FHD",
        "lang": "Vietsub + Lồng Tiếng",
        "year": 2022,
        "category": [
          {
            "id": "9822be111d2ccc29c7172c78b8af8ff5",
            "name": "Hành Động",
            "slug": "hanh-dong"
          },
          {
            "id": "66c78b23908113d478d8d85390a244b4",
            "name": "Phiêu Lưu",
            "slug": "phieu-luu"
          },
          {
            "id": "37a7b38b6184a5ebd3c43015aa20709d",
            "name": "Chính Kịch",
            "slug": "chinh-kich"
          },
          {
            "id": "0bcf4077916678de9b48c89221fcf8ae",
            "name": "Khoa Học",
            "slug": "khoa-hoc"
          },
          {
            "id": "68564911f00849030f9c9c144ea1b931",
            "name": "Viễn Tưởng",
            "slug": "vien-tuong"
          }
        ],
        "country": [
          {
            "id": "05de95be5fc404da9680bbb3dd8262e6",
            "name": "Hàn Quốc",
            "slug": "han-quoc"
          }
        ]
      }
    ],
    "params": {
      "type_slug": "tim-kiem",
      "keyword": "ngoi truong xac song",
      "filterCategory": [
        ""
      ],
      "filterCountry": [
        ""
      ],
      "filterYear": [
        ""
      ],
      "filterType": [
        ""
      ],
      "sortField": "modified.time",
      "sortType": "desc",
      "pagination": {
        "totalItems": 1,
        "totalItemsPerPage": 24,
        "currentPage": 1,
        "totalPages": 1
      }
    },
    "type_list": "",
    "APP_DOMAIN_FRONTEND": "https://phimapi.com",
    "APP_DOMAIN_CDN_IMAGE": "https://phimimg.com"
  }
}

## 5. Danh sách thể loại phim
```
GET /v1/api/the-loai
```
Ví dụ: `https://phimapi.com/the-loai`

Trả về: *(để trống – sẽ cập nhật sau)*

[
  {
    "_id": "9822be111d2ccc29c7172c78b8af8ff5",
    "name": "Hành Động",
    "slug": "hanh-dong"
  },
  {
    "_id": "d111447ee87ec1a46a31182ce4623662",
    "name": "Miền Tây",
    "slug": "mien-tay"
  },
  {
    "_id": "0c853f6238e0997ee318b646bb1978bc",
    "name": "Trẻ Em",
    "slug": "tre-em"
  },
  {
    "_id": "f8ec3e9b77c509fdf64f0c387119b916",
    "name": "Lịch Sử",
    "slug": "lich-su"
  },
  {
    "_id": "3a17c7283b71fa84e5a8d76fb790ed3e",
    "name": "Cổ Trang",
    "slug": "co-trang"
  },
  {
    "_id": "1bae5183d681b7649f9bf349177f7123",
    "name": "Chiến Tranh",
    "slug": "chien-tranh"
  },
  {
    "_id": "68564911f00849030f9c9c144ea1b931",
    "name": "Viễn Tưởng",
    "slug": "vien-tuong"
  },
  {
    "_id": "4db8d7d4b9873981e3eeb76d02997d58",
    "name": "Kinh Dị",
    "slug": "kinh-di"
  },
  {
    "_id": "1645fa23fa33651cef84428b0dcc2130",
    "name": "Tài Liệu",
    "slug": "tai-lieu"
  },
  {
    "_id": "2fb53017b3be83cd754a08adab3e916c",
    "name": "Bí Ẩn",
    "slug": "bi-an"
  },
  {
    "_id": "4b4457a1af8554c282dc8ac41fd7b4a1",
    "name": "Phim 18+",
    "slug": "phim-18"
  },
  {
    "_id": "bb2b4b030608ca5984c8dd0770f5b40b",
    "name": "Tình Cảm",
    "slug": "tinh-cam"
  },
  {
    "_id": "a7b065b92ad356387ef2e075dee66529",
    "name": "Tâm Lý",
    "slug": "tam-ly"
  },
  {
    "_id": "591bbb2abfe03f5aa13c08f16dfb69a2",
    "name": "Thể Thao",
    "slug": "the-thao"
  },
  {
    "_id": "66c78b23908113d478d8d85390a244b4",
    "name": "Phiêu Lưu",
    "slug": "phieu-luu"
  },
  {
    "_id": "252e74b4c832ddb4233d7499f5ed122e",
    "name": "Âm Nhạc",
    "slug": "am-nhac"
  },
  {
    "_id": "a2492d6cbc4d58f115406ca14e5ec7b6",
    "name": "Gia Đình",
    "slug": "gia-dinh"
  },
  {
    "_id": "01c8abbb7796a1cf1989616ca5c175e6",
    "name": "Học Đường",
    "slug": "hoc-duong"
  },
  {
    "_id": "ba6fd52e5a3aca80eaaf1a3b50a182db",
    "name": "Hài Hước",
    "slug": "hai-huoc"
  },
  {
    "_id": "7a035ac0b37f5854f0f6979260899c90",
    "name": "Hình Sự",
    "slug": "hinh-su"
  },
  {
    "_id": "578f80eb493b08d175c7a0c29687cbdf",
    "name": "Võ Thuật",
    "slug": "vo-thuat"
  },
  {
    "_id": "0bcf4077916678de9b48c89221fcf8ae",
    "name": "Khoa Học",
    "slug": "khoa-hoc"
  },
  {
    "_id": "2276b29204c46f75064735477890afd6",
    "name": "Thần Thoại",
    "slug": "than-thoai"
  },
  {
    "_id": "37a7b38b6184a5ebd3c43015aa20709d",
    "name": "Chính Kịch",
    "slug": "chinh-kich"
  },
  {
    "_id": "268385d0de78827ff7bb25c35036ee2a",
    "name": "Kinh Điển",
    "slug": "kinh-dien"
  }
]

### 5.1 Chi tiết thể loại
```
GET /v1/api/the-loai/{slug}?type_list={type_list}&page={page}&sort_field={sort_field}&sort_type={sort_type}&sort_lang={sort_lang}&year={year}&limit={limit}
```
Ví dụ: `https://phimapi.com/v1/api/the-loai/hanh-dong?type_list=phim-le&page=1`

Tham số tương tự mục 3 (bỏ country).

{
  "status": true,
  "msg": "done",
  "data": {
    "seoOnPage": {
      "og_type": "website",
      "titleHead": "Phim Hành Động | Phim Hành Động hay tuyển chọn | Phim Hành Động mới nhất 2025",
      "descriptionHead": "Phim Hành Động mới nhất tuyển chọn chất lượng cao, phim Hành Động vietsub cập nhật nhanh nhất. Phim Hành Động vietsub nhanh nhất",
      "og_image": [
        "/upload/vod/20250308-1/25c9c7486b5de820475bd8fe0ccb316e.jpg",
        "/upload/vod/20240821-1/a651652396e9f53c09cd88d28700d5c4.jpg",
        "/upload/vod/20250617-1/8682bed7677ab2f87c5c5d6515c3bb44.jpg",
        "/upload/vod/20250308-1/02bc24a35b294ea2ddc6d7240f5ef27d.jpg",
        "/upload/vod/20250520-1/8fc321e71315997e7d07d0e9892efdfb.jpg",
        "/upload/vod/20250219-1/b880c627b5571d9afd22e58d056e772a.jpg",
        "/upload/vod/20250219-1/0ddffeb590aa6bad556a0724302487ad.jpg",
        "/upload/vod/20250517-1/1ef0aa912dcaf60d79bcceb1bf7716c3.jpg",
        "/upload/vod/20250613-1/bd352eebc9d159abc450757aa14c70f4.jpg",
        "/upload/vod/20240103-1/af2ae10bcb72617994f00dce440205dc.jpg"
      ],
      "og_url": "the-loai/hanh-dong"
    },
    "breadCrumb": [
      {
        "name": "Hành Động",
        "slug": "/the-loai/hanh-dong",
        "isCurrent": false,
        "position": 2
      },
      {
        "name": "Trang 1",
        "isCurrent": true,
        "position": 3
      }
    ],
    "titlePage": "Hành Động",
    "items": [
      {
        "tmdb": {
          "type": "tv",
          "id": "122612",
          "season": 1,
          "vote_average": 9.3,
          "vote_count": 3
        },
        "imdb": {
          "id": null
        },
        "created": {
          "time": "2025-03-08T18:50:42.000Z"
        },
        "modified": {
          "time": "2025-07-05T15:12:05.000Z"
        },
        "_id": "f8bf0d84e9b0e57f01008c4827d7fda5",
        "name": "Vạn Giới Độc Tôn",
        "slug": "van-gioi-doc-ton",
        "origin_name": "Ten Thousand Worlds",
        "type": "hoathinh",
        "poster_url": "upload/vod/20250308-1/25c9c7486b5de820475bd8fe0ccb316e.jpg",
        "thumb_url": "upload/vod/20250308-1/4b81238b9844aa16e3f7e9ee8afdbc94.jpg",
        "sub_docquyen": false,
        "chieurap": false,
        "time": "10 phút/tập",
        "episode_current": "Tập 344",
        "quality": "FHD",
        "lang": "Vietsub",
        "year": 2021,
        "category": [
          {
            "id": "37a7b38b6184a5ebd3c43015aa20709d",
            "name": "Chính Kịch",
            "slug": "chinh-kich"
          },
          {
            "id": "9822be111d2ccc29c7172c78b8af8ff5",
            "name": "Hành Động",
            "slug": "hanh-dong"
          },
          {
            "id": "66c78b23908113d478d8d85390a244b4",
            "name": "Phiêu Lưu",
            "slug": "phieu-luu"
          },
          {
            "id": "0bcf4077916678de9b48c89221fcf8ae",
            "name": "Khoa Học",
            "slug": "khoa-hoc"
          },
          {
            "id": "68564911f00849030f9c9c144ea1b931",
            "name": "Viễn Tưởng",
            "slug": "vien-tuong"
          }
        ],
        "country": [
          {
            "id": "3e075636c731fe0f889c69e0bf82c083",
            "name": "Trung Quốc",
            "slug": "trung-quoc"
          }
        ]
      },
      {
        "tmdb": {
          "type": "tv",
          "id": "101172",
          "season": 1,
          "vote_average": 8.4,
          "vote_count": 27
        },
        "imdb": {
          "id": null
        },
        "created": {
          "time": "2024-08-21T17:24:14.000Z"
        },
        "modified": {
          "time": "2025-07-05T15:10:38.000Z"
        },
        "_id": "6dd36e7dc260bc1beeb79a33da67b5df",
        "name": "Thôn Phệ Tinh Không",
        "slug": "thon-phe-tinh-khong",
        "origin_name": "Swallowed Star",
        "type": "hoathinh",
        "poster_url": "upload/vod/20240821-1/a651652396e9f53c09cd88d28700d5c4.jpg",
        "thumb_url": "upload/vod/20240821-1/22c49ba9590b0e5f3d126696c0bfbecf.jpg",
        "sub_docquyen": false,
        "chieurap": false,
        "time": "20 phút/tập",
        "episode_current": "Tập 178",
        "quality": "FHD",
        "lang": "Vietsub",
        "year": 2020,
        "category": [
          {
            "id": "0bcf4077916678de9b48c89221fcf8ae",
            "name": "Khoa Học",
            "slug": "khoa-hoc"
          },
          {
            "id": "68564911f00849030f9c9c144ea1b931",
            "name": "Viễn Tưởng",
            "slug": "vien-tuong"
          },
          {
            "id": "9822be111d2ccc29c7172c78b8af8ff5",
            "name": "Hành Động",
            "slug": "hanh-dong"
          },
          {
            "id": "66c78b23908113d478d8d85390a244b4",
            "name": "Phiêu Lưu",
            "slug": "phieu-luu"
          }
        ],
        "country": [
          {
            "id": "3e075636c731fe0f889c69e0bf82c083",
            "name": "Trung Quốc",
            "slug": "trung-quoc"
          }
        ]
      },
      {
        "tmdb": {
          "type": "tv",
          "id": "292624",
          "season": 1,
          "vote_average": 10,
          "vote_count": 1
        },
        "imdb": {
          "id": null
        },
        "created": {
          "time": "2025-06-17T11:30:00.000Z"
        },
        "modified": {
          "time": "2025-07-05T15:10:05.000Z"
        },
        "_id": "876af3a1db90d050582dc4b1c2201198",
        "name": "Thần Quốc Chi Thượng",
        "slug": "than-quoc-chi-thuong",
        "origin_name": "Over The Divine Realms",
        "type": "hoathinh",
        "poster_url": "upload/vod/20250617-1/8682bed7677ab2f87c5c5d6515c3bb44.jpg",
        "thumb_url": "upload/vod/20250617-1/67b3a7895771edc3a19779975c3408dd.jpg",
        "sub_docquyen": false,
        "chieurap": false,
        "time": "29 phút/tập",
        "episode_current": "Tập 6",
        "quality": "FHD",
        "lang": "Vietsub",
        "year": 2025,
        "category": [
          {
            "id": "9822be111d2ccc29c7172c78b8af8ff5",
            "name": "Hành Động",
            "slug": "hanh-dong"
          },
          {
            "id": "66c78b23908113d478d8d85390a244b4",
            "name": "Phiêu Lưu",
            "slug": "phieu-luu"
          },
          {
            "id": "a7b065b92ad356387ef2e075dee66529",
            "name": "Tâm Lý",
            "slug": "tam-ly"
          }
        ],
        "country": [
          {
            "id": "3e075636c731fe0f889c69e0bf82c083",
            "name": "Trung Quốc",
            "slug": "trung-quoc"
          }
        ]
      },
      {
        "tmdb": {
          "type": "tv",
          "id": "281587",
          "season": 1,
          "vote_average": 0,
          "vote_count": 0
        },
        "imdb": {
          "id": null
        },
        "created": {
          "time": "2025-03-08T17:06:24.000Z"
        },
        "modified": {
          "time": "2025-07-05T15:09:36.000Z"
        },
        "_id": "0d14e3ef9e05269b449abdfcf5c8c60a",
        "name": "Thăng Cấp Mạnh Nhất",
        "slug": "thang-cap-manh-nhat",
        "origin_name": "The Strongest Upgrade, The Mightiest Level Up",
        "type": "hoathinh",
        "poster_url": "upload/vod/20250308-1/02bc24a35b294ea2ddc6d7240f5ef27d.jpg",
        "thumb_url": "upload/vod/20250308-1/8afb345e4dfd00972423029ea7d9cc95.jpg",
        "sub_docquyen": false,
        "chieurap": false,
        "time": "10 phút/tập",
        "episode_current": "Hoàn Tất (40/40)",
        "quality": "FHD",
        "lang": "Vietsub",
        "year": 2025,
        "category": [
          {
            "id": "9822be111d2ccc29c7172c78b8af8ff5",
            "name": "Hành Động",
            "slug": "hanh-dong"
          },
          {
            "id": "66c78b23908113d478d8d85390a244b4",
            "name": "Phiêu Lưu",
            "slug": "phieu-luu"
          },
          {
            "id": "0bcf4077916678de9b48c89221fcf8ae",
            "name": "Khoa Học",
            "slug": "khoa-hoc"
          },
          {
            "id": "68564911f00849030f9c9c144ea1b931",
            "name": "Viễn Tưởng",
            "slug": "vien-tuong"
          },
          {
            "id": "ba6fd52e5a3aca80eaaf1a3b50a182db",
            "name": "Hài Hước",
            "slug": "hai-huoc"
          }
        ],
        "country": [
          {
            "id": "3e075636c731fe0f889c69e0bf82c083",
            "name": "Trung Quốc",
            "slug": "trung-quoc"
          }
        ]
      },
      {
        "tmdb": {
          "type": "tv",
          "id": "288418",
          "season": 1,
          "vote_average": 7,
          "vote_count": 1
        },
        "imdb": {
          "id": null
        },
        "created": {
          "time": "2025-05-20T18:41:47.000Z"
        },
        "modified": {
          "time": "2025-07-05T15:08:57.000Z"
        },
        "_id": "4c74744a9c10b3001a1d9b87f86eb26f",
        "name": "Thái Cổ Chiến Hồn",
        "slug": "thai-co-chien-hon",
        "origin_name": "Ancient War Soul / Tai Gu Zhan Hun",
        "type": "hoathinh",
        "poster_url": "upload/vod/20250520-1/8fc321e71315997e7d07d0e9892efdfb.jpg",
        "thumb_url": "upload/vod/20250520-1/49aa1d4a07451b524c3d6d82f3e6b40f.jpg",
        "sub_docquyen": false,
        "chieurap": false,
        "time": "12 phút/tập",
        "episode_current": "Tập 26",
        "quality": "FHD",
        "lang": "Vietsub + Thuyết Minh",
        "year": 2025,
        "category": [
          {
            "id": "9822be111d2ccc29c7172c78b8af8ff5",
            "name": "Hành Động",
            "slug": "hanh-dong"
          },
          {
            "id": "66c78b23908113d478d8d85390a244b4",
            "name": "Phiêu Lưu",
            "slug": "phieu-luu"
          }
        ],
        "country": [
          {
            "id": "3e075636c731fe0f889c69e0bf82c083",
            "name": "Trung Quốc",
            "slug": "trung-quoc"
          }
        ]
      },
      {
        "tmdb": {
          "type": null,
          "id": null,
          "season": null,
          "vote_average": 0,
          "vote_count": 0
        },
        "imdb": {
          "id": null
        },
        "created": {
          "time": "2025-02-19T00:00:14.000Z"
        },
        "modified": {
          "time": "2025-07-05T15:08:09.000Z"
        },
        "_id": "0055a5709f2388ee34e6a39c4719fccb",
        "name": "Tuyệt Thế Chiến Hồn",
        "slug": "tuyet-the-chien-hon",
        "origin_name": "Peerless Soul",
        "type": "hoathinh",
        "poster_url": "upload/vod/20250219-1/b880c627b5571d9afd22e58d056e772a.jpg",
        "thumb_url": "upload/vod/20250219-1/b2facbf6cebbf66d0c728df0b75ad5b9.jpg",
        "sub_docquyen": false,
        "chieurap": false,
        "time": "12 phút/tập",
        "episode_current": "Tập 128",
        "quality": "FHD",
        "lang": "Vietsub",
        "year": 2024,
        "category": [
          {
            "id": "9822be111d2ccc29c7172c78b8af8ff5",
            "name": "Hành Động",
            "slug": "hanh-dong"
          },
          {
            "id": "37a7b38b6184a5ebd3c43015aa20709d",
            "name": "Chính Kịch",
            "slug": "chinh-kich"
          },
          {
            "id": "2276b29204c46f75064735477890afd6",
            "name": "Thần Thoại",
            "slug": "than-thoai"
          }
        ],
        "country": [
          {
            "id": "92aa3c93de523a414a520399bb6a4304",
            "name": "Trung Quốc",
            "slug": "trung-quoc"
          }
        ]
      },
      {
        "tmdb": {
          "type": "tv",
          "id": "220850",
          "season": 1,
          "vote_average": 8.1,
          "vote_count": 7
        },
        "imdb": {
          "id": null
        },
        "created": {
          "time": "2025-02-18T23:56:45.000Z"
        },
        "modified": {
          "time": "2025-07-05T14:31:33.000Z"
        },
        "_id": "da90fdf234654eb69d7d14654641134f",
        "name": "Luyện Khí Mười Vạn Năm",
        "slug": "luyen-khi-muoi-van-nam",
        "origin_name": "One Hundred Thousand Years of Qi Refining",
        "type": "hoathinh",
        "poster_url": "upload/vod/20250219-1/0ddffeb590aa6bad556a0724302487ad.jpg",
        "thumb_url": "upload/vod/20250219-1/9e7246fa85194e2fad2da74ce43f0c7d.jpg",
        "sub_docquyen": false,
        "chieurap": false,
        "time": "12 phút/tập",
        "episode_current": "Tập 255",
        "quality": "FHD",
        "lang": "Vietsub",
        "year": 2023,
        "category": [
          {
            "id": "9822be111d2ccc29c7172c78b8af8ff5",
            "name": "Hành Động",
            "slug": "hanh-dong"
          },
          {
            "id": "66c78b23908113d478d8d85390a244b4",
            "name": "Phiêu Lưu",
            "slug": "phieu-luu"
          },
          {
            "id": "0bcf4077916678de9b48c89221fcf8ae",
            "name": "Khoa Học",
            "slug": "khoa-hoc"
          },
          {
            "id": "68564911f00849030f9c9c144ea1b931",
            "name": "Viễn Tưởng",
            "slug": "vien-tuong"
          }
        ],
        "country": [
          {
            "id": "3e075636c731fe0f889c69e0bf82c083",
            "name": "Trung Quốc",
            "slug": "trung-quoc"
          }
        ]
      },
      {
        "tmdb": {
          "type": "tv",
          "id": "240975",
          "season": 1,
          "vote_average": 9,
          "vote_count": 1
        },
        "imdb": {
          "id": null
        },
        "created": {
          "time": "2025-05-17T18:12:49.000Z"
        },
        "modified": {
          "time": "2025-07-05T14:30:33.000Z"
        },
        "_id": "51a9c5784bc9459856a826362c057737",
        "name": "Knock Out",
        "slug": "knock-out",
        "origin_name": "Knock Out",
        "type": "series",
        "poster_url": "upload/vod/20250517-1/1ef0aa912dcaf60d79bcceb1bf7716c3.jpg",
        "thumb_url": "upload/vod/20250517-1/af35cee6d00946bc89af16ce06957e06.jpg",
        "sub_docquyen": false,
        "chieurap": false,
        "time": "70 phút/tập",
        "episode_current": "Tập 9",
        "quality": "FHD",
        "lang": "Vietsub",
        "year": 2025,
        "category": [
          {
            "id": "37a7b38b6184a5ebd3c43015aa20709d",
            "name": "Chính Kịch",
            "slug": "chinh-kich"
          },
          {
            "id": "9822be111d2ccc29c7172c78b8af8ff5",
            "name": "Hành Động",
            "slug": "hanh-dong"
          },
          {
            "id": "66c78b23908113d478d8d85390a244b4",
            "name": "Phiêu Lưu",
            "slug": "phieu-luu"
          }
        ],
        "country": [
          {
            "id": "cefbf1640a17bad1e13c2f6f2a811a2d",
            "name": "Thái Lan",
            "slug": "thai-lan"
          }
        ]
      },
      {
        "tmdb": {
          "type": "tv",
          "id": "289273",
          "season": 1,
          "vote_average": 9,
          "vote_count": 1
        },
        "imdb": {
          "id": null
        },
        "created": {
          "time": "2025-06-13T07:59:31.000Z"
        },
        "modified": {
          "time": "2025-07-05T14:20:37.000Z"
        },
        "_id": "90be09f2c0cf80e0004fc73d2a72473d",
        "name": "Dư Tẫn Hành Giả",
        "slug": "du-tan-hanh-gia",
        "origin_name": "Embers",
        "type": "hoathinh",
        "poster_url": "upload/vod/20250613-1/bd352eebc9d159abc450757aa14c70f4.jpg",
        "thumb_url": "upload/vod/20250613-1/b25e831b5d2c543493c9615588efcc13.jpg",
        "sub_docquyen": false,
        "chieurap": false,
        "time": "22 phút/tập",
        "episode_current": "Tập 6",
        "quality": "FHD",
        "lang": "Vietsub",
        "year": 2025,
        "category": [
          {
            "id": "9822be111d2ccc29c7172c78b8af8ff5",
            "name": "Hành Động",
            "slug": "hanh-dong"
          },
          {
            "id": "66c78b23908113d478d8d85390a244b4",
            "name": "Phiêu Lưu",
            "slug": "phieu-luu"
          },
          {
            "id": "68564911f00849030f9c9c144ea1b931",
            "name": "Viễn Tưởng",
            "slug": "vien-tuong"
          },
          {
            "id": "37a7b38b6184a5ebd3c43015aa20709d",
            "name": "Chính Kịch",
            "slug": "chinh-kich"
          }
        ],
        "country": [
          {
            "id": "3e075636c731fe0f889c69e0bf82c083",
            "name": "Trung Quốc",
            "slug": "trung-quoc"
          }
        ]
      },
      {
        "tmdb": {
          "type": null,
          "id": null,
          "season": null,
          "vote_average": 0,
          "vote_count": 0
        },
        "imdb": {
          "id": null
        },
        "created": {
          "time": "2024-01-03T17:31:52.000Z"
        },
        "modified": {
          "time": "2025-07-05T14:19:56.000Z"
        },
        "_id": "21a38ed2ee0c2c081c31286d29db2acc",
        "name": "Đấu La Đại Lục 2 (Tuyệt Thế Đường Môn)",
        "slug": "dau-la-dai-luc-2-tuyet-the-duong-mon",
        "origin_name": "Soul Land 2 (The Peerless Tang Clan)",
        "type": "hoathinh",
        "poster_url": "upload/vod/20240103-1/af2ae10bcb72617994f00dce440205dc.jpg",
        "thumb_url": "upload/vod/20240103-1/bbe888d771d0e6ff0f9935f8f6194c79.jpg",
        "sub_docquyen": false,
        "chieurap": false,
        "time": "22 phút/tập",
        "episode_current": "Tập 108",
        "quality": "FDH",
        "lang": "Vietsub",
        "year": 2023,
        "category": [
          {
            "id": "9822be111d2ccc29c7172c78b8af8ff5",
            "name": "Hành Động",
            "slug": "hanh-dong"
          },
          {
            "id": "66c78b23908113d478d8d85390a244b4",
            "name": "Phiêu Lưu",
            "slug": "phieu-luu"
          },
          {
            "id": "578f80eb493b08d175c7a0c29687cbdf",
            "name": "Võ Thuật",
            "slug": "vo-thuat"
          }
        ],
        "country": [
          {
            "id": "92aa3c93de523a414a520399bb6a4304",
            "name": "Trung Quốc",
            "slug": "trung-quoc"
          }
        ]
      }
    ],
    "params": {
      "type_slug": "the-loai",
      "slug": "hanh-dong",
      "filterCategory": [
        "hanh-dong"
      ],
      "filterCountry": [
        ""
      ],
      "filterYear": [
        ""
      ],
      "filterType": [
        ""
      ],
      "sortField": "modified.time",
      "sortType": "desc",
      "pagination": {
        "totalItems": 6238,
        "totalItemsPerPage": 10,
        "currentPage": 1,
        "totalPages": 624
      }
    },
    "type_list": "hanh-dong",
    "APP_DOMAIN_FRONTEND": "https://phimapi.com",
    "APP_DOMAIN_CDN_IMAGE": "https://phimimg.com"
  }
}

## 6. Danh sách quốc gia
```
GET /v1/api/quoc-gia
`

[
  {
    "_id": "f6ce1ae8b39af9d38d653b8a0890adb8",
    "name": "Việt Nam",
    "slug": "viet-nam"
  },
  {
    "_id": "3e075636c731fe0f889c69e0bf82c083",
    "name": "Trung Quốc",
    "slug": "trung-quoc"
  },
  {
    "_id": "cefbf1640a17bad1e13c2f6f2a811a2d",
    "name": "Thái Lan",
    "slug": "thai-lan"
  },
  {
    "_id": "dcd5551cbd22ea2372726daafcd679c1",
    "name": "Hồng Kông",
    "slug": "hong-kong"
  },
  {
    "_id": "92f688188aa938a03a61a786d6616dcb",
    "name": "Pháp",
    "slug": "phap"
  },
  {
    "_id": "24a5bf049aeef94ab79bad1f73f16b92",
    "name": "Đức",
    "slug": "duc"
  },
  {
    "_id": "41487913363f08e29ea07f6fdfb49a41",
    "name": "Hà Lan",
    "slug": "ha-lan"
  },
  {
    "_id": "8dbb07a18d46f63d8b3c8994d5ccc351",
    "name": "Mexico",
    "slug": "mexico"
  },
  {
    "_id": "61709e9e6ca6ca8245bc851c0b781673",
    "name": "Thụy Điển",
    "slug": "thuy-dien"
  },
  {
    "_id": "77dab2f81a6c8c9136efba7ab2c4c0f2",
    "name": "Philippines",
    "slug": "philippines"
  },
  {
    "_id": "208c51751eff7e1480052cdb4e26176a",
    "name": "Đan Mạch",
    "slug": "dan-mach"
  },
  {
    "_id": "69e561770d6094af667b9361f58f39bd",
    "name": "Thụy Sĩ",
    "slug": "thuy-si"
  },
  {
    "_id": "c338f80e38dd2381f8faf9eccb6e6c1c",
    "name": "Ukraina",
    "slug": "ukraina"
  },
  {
    "_id": "05de95be5fc404da9680bbb3dd8262e6",
    "name": "Hàn Quốc",
    "slug": "han-quoc"
  },
  {
    "_id": "74d9fa92f4dea9ecea8fc2233dc7921a",
    "name": "Âu Mỹ",
    "slug": "au-my"
  },
  {
    "_id": "aadd510492662beef1a980624b26c685",
    "name": "Ấn Độ",
    "slug": "an-do"
  },
  {
    "_id": "445d337b5cd5de476f99333df6b0c2a7",
    "name": "Canada",
    "slug": "canada"
  },
  {
    "_id": "8a40abac202ab3659bb98f71f05458d1",
    "name": "Tây Ban Nha",
    "slug": "tay-ban-nha"
  },
  {
    "_id": "4647d00cf81f8fb0ab80f753320d0fc9",
    "name": "Indonesia",
    "slug": "indonesia"
  },
  {
    "_id": "59317f665349487a74856ac3e37b35b5",
    "name": "Ba Lan",
    "slug": "ba-lan"
  },
  {
    "_id": "3f0e49c46cbde0c7adf5ea04a97ab261",
    "name": "Malaysia",
    "slug": "malaysia"
  },
  {
    "_id": "fcd5da8ea7e4bf894692933ee3677967",
    "name": "Bồ Đào Nha",
    "slug": "bo-dao-nha"
  },
  {
    "_id": "b6ae56d2d40c99fc293aefe45dcb3b3d",
    "name": "UAE",
    "slug": "uae"
  },
  {
    "_id": "471cdb11e01cf8fcdafd3ab5cd7b4241",
    "name": "Châu Phi",
    "slug": "chau-phi"
  },
  {
    "_id": "cc85d02a69f06f7b43ab67f5673604a3",
    "name": "Ả Rập Xê Út",
    "slug": "a-rap-xe-ut"
  },
  {
    "_id": "d4097fbffa8f7149a61281437171eb83",
    "name": "Nhật Bản",
    "slug": "nhat-ban"
  },
  {
    "_id": "559fea9881e3a6a3e374b860fa8fb782",
    "name": "Đài Loan",
    "slug": "dai-loan"
  },
  {
    "_id": "932bbaca386ee0436ad0159117eabae4",
    "name": "Anh",
    "slug": "anh"
  },
  {
    "_id": "45a260effdd4ba38e861092ae2a1b96a",
    "name": "Quốc Gia Khác",
    "slug": "quoc-gia-khac"
  },
  {
    "_id": "8931caa7f43ee5b07bf046c8300f4eba",
    "name": "Thổ Nhĩ Kỳ",
    "slug": "tho-nhi-ky"
  },
  {
    "_id": "2dbf49dd0884691f87e44769a3a3a29e",
    "name": "Nga",
    "slug": "nga"
  },
  {
    "_id": "435a85571578e419ed511257881a1e75",
    "name": "Úc",
    "slug": "uc"
  },
  {
    "_id": "42537f0fb56e31e20ab9c2305752087d",
    "name": "Brazil",
    "slug": "brazil"
  },
  {
    "_id": "a30878a7fdb6a94348fce16d362edb11",
    "name": "Ý",
    "slug": "y"
  },
  {
    "_id": "638f494a6d33cf5760f6e95c8beb612a",
    "name": "Na Uy",
    "slug": "na-uy"
  },
  {
    "_id": "3cf479dac2caaead12dfa36105b1c402",
    "name": "Nam Phi",
    "slug": "nam-phi"
  }
] 

### 6.1 Chi tiết quốc gia
```
GET /v1/api/quoc-gia/{slug}?type_list={type_list}&page={page}&sort_field={sort_field}&sort_type={sort_type}&sort_lang={sort_lang}&year={year}&limit={limit}
```

https://phimapi.com/v1/api/quoc-gia/trung-quoc?page=1&sort_field=_id&sort_type=asc&sort_lang=long-tieng&category=hanh-dong&year=2024&limit=10


{
  "status": "success",
  "msg": "",
  "data": {
    "seoOnPage": {
      "og_type": "website",
      "titleHead": "Phim Trung Quốc | Phim Trung Quốc hay tuyển chọn | Phim Trung Quốc mới nhất 2025",
      "descriptionHead": "Phim Trung Quốc mới nhất tuyển chọn chất lượng cao, phim Trung Quốc vietsub cập nhật nhanh nhất. Phim Trung Quốc vietsub nhanh nhất",
      "og_image": [
        "/upload/vod/20240410-1/79a25ff0bc4f37bb2ea7f6fe1fe1a0e2.jpg",
        "/upload/vod/20240714-1/748752557306e462e2a8356f2c6e5b8e.jpg",
        "/upload/vod/20250313-1/531372020d2f804a76c5913dad1517fa.jpg"
      ],
      "og_url": "quoc-gia/trung-quoc"
    },
    "breadCrumb": [
      {
        "name": "Trung Quốc",
        "slug": "/quoc-gia/trung-quoc",
        "isCurrent": false,
        "position": 2
      },
      {
        "name": "Trang 1",
        "isCurrent": true,
        "position": 3
      }
    ],
    "titlePage": "Trung Quốc",
    "items": [
      {
        "tmdb": {
          "type": null,
          "id": null,
          "season": null,
          "vote_average": 0,
          "vote_count": 0
        },
        "imdb": {
          "id": null
        },
        "created": {
          "time": "2024-04-10T01:04:01.000Z"
        },
        "modified": {
          "time": "2024-05-13T03:00:36.000Z"
        },
        "_id": "2e565cdec9dcdff44afa2b1ea71c2c2c",
        "name": "Nghịch Thiên Kỳ Án 2",
        "slug": "nghich-thien-ky-an-2",
        "origin_name": "Sinister Beings 2",
        "type": "series",
        "poster_url": "upload/vod/20240410-1/79a25ff0bc4f37bb2ea7f6fe1fe1a0e2.jpg",
        "thumb_url": "upload/vod/20240411-1/aa89a78fe2f97c31f1c531d24c4ad3c1.jpg",
        "sub_docquyen": false,
        "chieurap": false,
        "time": "45 phút/tập",
        "episode_current": "Hoàn Tất (30/30)",
        "quality": "FHD",
        "lang": "Lồng Tiếng",
        "year": 2024,
        "category": [
          {
            "id": "a7b065b92ad356387ef2e075dee66529",
            "name": "Tâm Lý",
            "slug": "tam-ly"
          },
          {
            "id": "9822be111d2ccc29c7172c78b8af8ff5",
            "name": "Hành Động",
            "slug": "hanh-dong"
          }
        ],
        "country": [
          {
            "id": "dcd5551cbd22ea2372726daafcd679c1",
            "name": "Hồng Kông",
            "slug": "hong-kong"
          },
          {
            "id": "3e075636c731fe0f889c69e0bf82c083",
            "name": "Trung Quốc",
            "slug": "trung-quoc"
          }
        ]
      },
      {
        "tmdb": {
          "type": null,
          "id": null,
          "season": null,
          "vote_average": 0,
          "vote_count": 0
        },
        "imdb": {
          "id": null
        },
        "created": {
          "time": "2024-07-14T13:47:46.000Z"
        },
        "modified": {
          "time": "2024-07-26T21:25:19.000Z"
        },
        "_id": "c5218f6c84f93bd3d2d9a888a720ccd9",
        "name": "Anh Hùng Phản Hắc",
        "slug": "anh-hung-phan-hac",
        "origin_name": "No Room for Crime",
        "type": "series",
        "poster_url": "upload/vod/20240714-1/748752557306e462e2a8356f2c6e5b8e.jpg",
        "thumb_url": "upload/vod/20240714-1/92dc8a67a51ab3708df5a66c90a4dbb5.jpg",
        "sub_docquyen": false,
        "chieurap": false,
        "time": "43 phút/tập",
        "episode_current": "Hoàn Tất (25/25)",
        "quality": "FHD",
        "lang": "Lồng Tiếng",
        "year": 2024,
        "category": [
          {
            "id": "7a035ac0b37f5854f0f6979260899c90",
            "name": "Hình Sự",
            "slug": "hinh-su"
          },
          {
            "id": "37a7b38b6184a5ebd3c43015aa20709d",
            "name": "Chính Kịch",
            "slug": "chinh-kich"
          },
          {
            "id": "9822be111d2ccc29c7172c78b8af8ff5",
            "name": "Hành Động",
            "slug": "hanh-dong"
          }
        ],
        "country": [
          {
            "id": "3e075636c731fe0f889c69e0bf82c083",
            "name": "Trung Quốc",
            "slug": "trung-quoc"
          },
          {
            "id": "a0cd53c9875b96640ac264ca81996f9f",
            "name": "Hồng Kông",
            "slug": "hong-kong"
          }
        ]
      },
      {
        "tmdb": {
          "type": "movie",
          "id": "1339149",
          "season": null,
          "vote_average": 5.875,
          "vote_count": 4
        },
        "imdb": {
          "id": null
        },
        "created": {
          "time": "2025-03-13T15:57:50.000Z"
        },
        "modified": {
          "time": "2025-03-13T15:57:50.000Z"
        },
        "_id": "4260ccc84d7f06c14d2f4d6ca383f0cc",
        "name": "12 Giờ Của Lửa Giận",
        "slug": "12-gio-cua-lua-gian",
        "origin_name": "Fury 12 Hours",
        "type": "single",
        "poster_url": "upload/vod/20250313-1/531372020d2f804a76c5913dad1517fa.jpg",
        "thumb_url": "upload/vod/20250313-1/47c967937a6ed0506582e96e0a26b675.jpg",
        "sub_docquyen": false,
        "chieurap": false,
        "time": "83 phút",
        "episode_current": "Full",
        "quality": "FHD",
        "lang": "Vietsub + Lồng Tiếng",
        "year": 2024,
        "category": [
          {
            "id": "9822be111d2ccc29c7172c78b8af8ff5",
            "name": "Hành Động",
            "slug": "hanh-dong"
          },
          {
            "id": "2fb53017b3be83cd754a08adab3e916c",
            "name": "Bí Ẩn",
            "slug": "bi-an"
          }
        ],
        "country": [
          {
            "id": "3e075636c731fe0f889c69e0bf82c083",
            "name": "Trung Quốc",
            "slug": "trung-quoc"
          }
        ]
      }
    ],
    "params": {
      "type_slug": "quoc-gia",
      "slug": "trung-quoc",
      "filterCategory": [
        "hanh-dong"
      ],
      "filterCountry": [
        "trung-quoc"
      ],
      "filterYear": [
        "2024"
      ],
      "filterType": [
        "long-tieng"
      ],
      "sortField": "_id",
      "sortType": "asc",
      "pagination": {
        "totalItems": 3,
        "totalItemsPerPage": 10,
        "currentPage": 1,
        "totalPages": 1
      }
    },
    "type_list": "trung-quoc",
    "APP_DOMAIN_FRONTEND": "https://phimapi.com",
    "APP_DOMAIN_CDN_IMAGE": "https://phimimg.com"
  }
}

## 7. Danh sách phim theo năm
```
GET /v1/api/nam?year={year}&page={page}&sort_field={sort_field}&sort_type={sort_type}&sort_lang={sort_lang}&category={category}&country={country}&limit={limit}
```

https://phimapi.com/v1/api/nam/2024?page=1&sort_field=_id&sort_type=asc&sort_lang=long-tieng&category=hanh-dong&country=trung-quoc&limit=10

{
  "status": true,
  "msg": "done",
  "data": {
    "seoOnPage": {
      "og_type": "website",
      "titleHead": "Phim năm 2024 | Phim năm 2024 hay tuyển chọn | Phim năm 2024 mới nhất ",
      "descriptionHead": "Phim năm 2024 mới nhất tuyển chọn chất lượng cao, phim năm 2024 vietsub cập nhật nhanh nhất. Phim năm 2024 vietsub nhanh nhất",
      "og_image": [
        "/upload/vod/20240410-1/79a25ff0bc4f37bb2ea7f6fe1fe1a0e2.jpg",
        "/upload/vod/20250313-1/531372020d2f804a76c5913dad1517fa.jpg"
      ],
      "og_url": "nam/2024"
    },
    "breadCrumb": [
      {
        "name": "Phim năm 2024",
        "slug": "/nam/2024",
        "isCurrent": false,
        "position": 2
      },
      {
        "name": "Trang 1",
        "isCurrent": true,
        "position": 3
      }
    ],
    "titlePage": "Năm 2024",
    "items": [
      {
        "tmdb": {
          "type": null,
          "id": null,
          "season": null,
          "vote_average": 0,
          "vote_count": 0
        },
        "imdb": {
          "id": null
        },
        "created": {
          "time": "2024-04-10T01:04:01.000Z"
        },
        "modified": {
          "time": "2024-05-13T03:00:36.000Z"
        },
        "_id": "2e565cdec9dcdff44afa2b1ea71c2c2c",
        "name": "Nghịch Thiên Kỳ Án 2",
        "slug": "nghich-thien-ky-an-2",
        "origin_name": "Sinister Beings 2",
        "type": "series",
        "poster_url": "upload/vod/20240410-1/79a25ff0bc4f37bb2ea7f6fe1fe1a0e2.jpg",
        "thumb_url": "upload/vod/20240411-1/aa89a78fe2f97c31f1c531d24c4ad3c1.jpg",
        "sub_docquyen": false,
        "chieurap": false,
        "time": "45 phút/tập",
        "episode_current": "Hoàn Tất (30/30)",
        "quality": "FHD",
        "lang": "Lồng Tiếng",
        "year": 2024,
        "category": [
          {
            "id": "a7b065b92ad356387ef2e075dee66529",
            "name": "Tâm Lý",
            "slug": "tam-ly"
          },
          {
            "id": "9822be111d2ccc29c7172c78b8af8ff5",
            "name": "Hành Động",
            "slug": "hanh-dong"
          }
        ],
        "country": [
          {
            "id": "dcd5551cbd22ea2372726daafcd679c1",
            "name": "Hồng Kông",
            "slug": "hong-kong"
          },
          {
            "id": "3e075636c731fe0f889c69e0bf82c083",
            "name": "Trung Quốc",
            "slug": "trung-quoc"
          }
        ]
      },
      {
        "tmdb": {
          "type": "movie",
          "id": "1339149",
          "season": null,
          "vote_average": 5.875,
          "vote_count": 4
        },
        "imdb": {
          "id": null
        },
        "created": {
          "time": "2025-03-13T15:57:50.000Z"
        },
        "modified": {
          "time": "2025-03-13T15:57:50.000Z"
        },
        "_id": "4260ccc84d7f06c14d2f4d6ca383f0cc",
        "name": "12 Giờ Của Lửa Giận",
        "slug": "12-gio-cua-lua-gian",
        "origin_name": "Fury 12 Hours",
        "type": "single",
        "poster_url": "upload/vod/20250313-1/531372020d2f804a76c5913dad1517fa.jpg",
        "thumb_url": "upload/vod/20250313-1/47c967937a6ed0506582e96e0a26b675.jpg",
        "sub_docquyen": false,
        "chieurap": false,
        "time": "83 phút",
        "episode_current": "Full",
        "quality": "FHD",
        "lang": "Vietsub + Lồng Tiếng",
        "year": 2024,
        "category": [
          {
            "id": "9822be111d2ccc29c7172c78b8af8ff5",
            "name": "Hành Động",
            "slug": "hanh-dong"
          },
          {
            "id": "2fb53017b3be83cd754a08adab3e916c",
            "name": "Bí Ẩn",
            "slug": "bi-an"
          }
        ],
        "country": [
          {
            "id": "3e075636c731fe0f889c69e0bf82c083",
            "name": "Trung Quốc",
            "slug": "trung-quoc"
          }
        ]
      }
    ],
    "params": {
      "type_slug": "nam",
      "filterCategory": [
        "hanh-dong"
      ],
      "filterCountry": [
        "trung-quoc"
      ],
      "filterYear": "2024",
      "filterType": "long-tieng",
      "sortField": "_id",
      "sortType": "asc",
      "pagination": {
        "totalItems": 2,
        "totalItemsPerPage": 10,
        "currentPage": 1,
        "totalPages": 1
      }
    },
    "type_list": "2024",
    "APP_DOMAIN_FRONTEND": "https://phimapi.com",
    "APP_DOMAIN_CDN_IMAGE": "https://phimimg.com"
  }
}

## 8. Cấu trúc Response (Placeholder)
```json
{
  // TODO: Cập nhật cấu trúc response sau khi test Thunder Client
}
```

---

## 9. Ghi chú
- Các endpoint đều hỗ trợ **CORS** cho client-side requests.
- `limit` tối đa 64 theo tài liệu gốc.
- `year` hỗ trợ từ 1970 – hiện tại.
- Sẽ bổ sung thêm ví dụ response cụ thể ngay khi có dữ liệu thực tế.

---

*Last updated: [chờ cập nhật]*
