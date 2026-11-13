# Thư viện karaoke và song ca

Giao diện phòng desktop được thu gọn theo chiều cao viewport: video, thanh mic nhỏ và điều khiển luôn cạnh hàng chờ cuộn riêng. Thêm bài, bạn bè, thiết bị và cài đặt âm thanh mở khi cần; có nút toàn màn hình. Trang phòng không dùng header/footer và nút nổi của website. Giao diện đã được kiểm tra bằng Chromium headless ở 1440×900, 1366×768 và 390×844, với dữ liệu/âm thanh tổng hợp.

Đợt triển khai này giữ pilot, giới hạn bốn người/phòng và vòng đời phòng hiện tại. Chưa deploy production. Các kết quả kiểm tra ban đầu trong `karaoke-pilot.md` thuộc phiên bản cũ. Xem kết quả kiểm tra mới dưới đây.

## Dữ liệu cá nhân

`karaokeLibraries/{uid}` là vùng Firebase Admin riêng, client SDK bị từ chối đọc/ghi qua rules. API `/api/me/karaoke` xác định UID từ Firebase bearer token, không nhận UID truy cập dữ liệu từ query/body. Không kiểm tra quyền Smart Lists và không ghi watchlist phim. Luồng xóa dữ liệu tài khoản xóa luôn vùng này.

Một video có một bản ghi, URL chuẩn hóa, tên, thời điểm lưu và cờ Yêu thích. Bài có thể thuộc nhiều playlist. Bỏ tim giữ các tham chiếu playlist; xóa playlist giữ các bài còn yêu thích hoặc thuộc playlist khác. Bài không còn được lưu ở đâu được dọn để không chiếm hạn mức.

Giới hạn transaction: 500 bài, 20 playlist, 100 bài/playlist. Mọi lần sửa mang revision; xung đột trả 409 và client tải lại, không ghi đè dữ liệu tab khác. GET phân trang 50 bản ghi, cursor kèm revision để không ghép các trang từ nhiều phiên bản thư viện. Giao diện cũng hiển thị 50 bài/trang, tìm kiếm và chọn bài trên thứ tự danh sách. Chọn nhiều bài để xếp hàng được gửi trong một lệnh nguyên tử; server kiểm tra toàn bộ trước khi thêm.

`POST /api/me/karaoke/export` chỉ nhận danh sách video ID để tra trong thư viện của tài khoản hiện tại. Word được tạo tại server theo yêu cầu, chỉ có đoạn tên bài được đánh số bằng OOXML. Không có hyperlink, URL, thông tin tài khoản, phòng hay người hát. Bài chưa có tên ngoài video ID hoặc tên chứa URL phải được đổi tên/lấy lại tiêu đề. Không tải media và không kết nối Google Drive.

## Quyền lượt hát

`addedBy` do server đặt từ thành viên đăng nhập, đồng thời là chủ lượt. `performanceId` dùng ID lượt trong hàng chờ, nên yêu cầu song ca tồn tại khi lượt chuyển sang chuẩn bị. Chỉ chủ lượt hợp lệ đầu hàng được chuẩn bị; sau kết thúc server chọn bài hợp lệ kế tiếp nhưng không tự mở mic/phát nhạc.

Chủ lượt bắt đầu, tiếp tục, tạm dừng, kết thúc và gửi báo cáo đồng hồ nhạc. Host quản lý thứ tự, trộn, xóa bài, bỏ lượt, chặn mic và ban; không được gán chủ lượt hoặc chọn người song ca thay. Một người không đăng ký trùng video đang chờ/đang hát của chính họ; người khác có thể đăng ký cùng video.

Chủ lượt mất kết nối: pause, thu hồi cả hai mic, giữ lượt 30 giây. Vào lại vẫn cần tự chuẩn bị mic/phát nhạc; quá hạn chuyển lượt. Chủ động rời hoặc ban xóa bài đang chờ của người đó. Người song ca rời/mất kết nối trở về solo. Chặn mic chủ lượt kết thúc lượt; chặn người song ca bỏ phần song ca. Bài chờ của người bị chặn được giữ và bỏ qua khi chọn bài hợp lệ. Gỡ chặn không tự phục hồi trạng thái hát.

## Hai microphone

Mỗi performance có `mics[memberId] = { authorized, revocationPending }`, không có cờ cấp mic chung. Chọn người song ca không cấp mic. Chỉ chủ lượt và người được chọn còn hợp lệ có thể tự xin cấp quyền, tối đa hai người trong luồng khóa tuần tự của phòng.

Đổi người song ca thu hồi người cũ trước. Lỗi thu hồi giữ lựa chọn cũ và trạng thái đang xử lý; không cấp thêm mic. Người dùng chọn lại sau khi xử lý thành công. Grant không rõ kết quả cũng tạo một lần thu hồi bắt buộc. Các mic pending được retry độc lập, kể cả khi playback đã pause. Kết thúc lượt và gỡ người song ca đang pending được hoàn tất sau khi provider xác nhận. Participant không tồn tại được xem là đã thu hồi.

Client nhận tối đa hai remote microphone, không attach microphone local vào loa. Mỗi người có meter thật riêng và nhãn local/remote; âm lượng giọng nhận được là cài đặt tại máy. Audio element được giữ qua các report playback; chỉ tháo khi track không còn hợp lệ. Không thêm bù trễ hai chiều hoặc cam kết song ca khớp nhạc.

Ban từ chối join và lệnh ứng dụng theo UID, disconnect socket và gọi `RemoveParticipant`; provider lỗi thì retry ngắt voice. **Giới hạn provider cần kiểm tra:** LiveKit self-host không vô hiệu token đã cấp khi remove/update participant; Cloud có cơ chế thu hồi riêng và cutoff mặc định có buffer thời gian. SDK hiện có chỉ hỗ trợ `removeParticipant(room, identity)`. Vì vậy việc chống phát lại token provider đã cache, đặc biệt token được refresh khi còn quyền mic, chưa được nghiệm thu; không coi kiểm tra Socket.IO giả lập là bằng chứng cho quyền provider sau reconnect. Xem [LiveKit token lifecycle](https://docs.livekit.io/frontends/reference/tokens-grants/) và [Remove participant](https://docs.livekit.io/intro/basics/rooms-participants-tracks/participants/).

## Kiểm tra khi có lệnh test

Backend: `socket-server/test/karaoke.test.js` và `karaoke-socket.test.js` có các trường hợp quyền chủ lượt, hàng chờ nguyên tử, yêu cầu song ca, không cấp mic thứ ba, lỗi thu hồi, chặn mic/ban, disconnect và chống lệnh lặp. Frontend/server Next: các test `tests/karaoke-*.test.ts*`, gồm thư viện, phân trang, xung đột và nội dung OOXML.

Khi được yêu cầu, chạy bộ test liên quan, rules emulator, TypeScript và build; kiểm tra desktop/mobile và render một Word nhiều trang có dấu tiếng Việt, tên dài, ký tự XML. Nghe thật với hai người hát và một người nghe, dùng tai nghe trên các mạng khác nhau. Thử từ chối mic, đổi người, mất mạng, nhiều tab, grant/revoke lỗi và phát lại token cũ. Chỉ nghiệm thu sau khi đã kiểm tra cả quyền provider lẫn âm thanh thật.

**Trước khi chạy local:** thay đổi schema phòng yêu cầu restart socket, kết thúc mọi phòng hiện có. Phải thông báo người dùng trước khi restart. Không dùng schema mới trên các phòng đang chạy bằng phiên bản cũ. Không triển khai production trong đợt này.

## Kết quả kiểm tra đợt PR

Checkout riêng từ main: 137 test frontend/API (32 file), 49 test backend, 5 test Firebase emulator đều qua. TypeScript no-emit qua. Kiểm tra Chromium desktop/laptop/mobile qua, gồm nút điều khiển trong viewport ở desktop/laptop, hàng chờ dài, thao tác mic, im lặng và mất kết nối. Test dùng audio tổng hợp; chưa xác minh chất lượng song ca thật, phát lại token provider hay mở Word bằng ứng dụng Office. Không deploy production.
