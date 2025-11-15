# Hướng dẫn Sử dụng Tính năng Video Call

## Tổng quan

Ứng dụng đã được tích hợp tính năng **Video Call** đầy đủ với WebRTC, hỗ trợ cả cuộc gọi 1-1 và cuộc gọi nhóm. Người dùng có thể thực hiện cuộc gọi video trực tiếp từ Chat Popup hoặc trang Messages.

## Tính năng chính

### 1. Cuộc gọi Video 1-1
- Gọi video trực tiếp với một người bạn
- Điều khiển camera và microphone
- Chia sẻ màn hình
- Hiển thị video local và remote

### 2. Cuộc gọi Video Nhóm
- Hỗ trợ tối đa 9 người tham gia
- Giao diện grid tự động điều chỉnh (1, 2, 4, 6, 9 người)
- Hiển thị tên người tham gia
- Danh sách người tham gia có thể mở/đóng

### 3. Điều khiển trong cuộc gọi
- **Bật/tắt Camera**: Nhấn nút camera để bật/tắt video
- **Bật/tắt Microphone**: Nhấn nút mic để bật/tắt âm thanh
- **Chia sẻ màn hình**: Chia sẻ màn hình của bạn với người khác
- **Kết thúc cuộc gọi**: Nhấn nút đỏ để rời khỏi cuộc gọi
- **Xem danh sách**: Nhấn nút người để xem ai đang trong cuộc gọi

## Cách sử dụng

### Từ Chat Popup (Popup nhỏ)

1. Mở chat popup với người bạn hoặc nhóm
2. Nhấn vào biểu tượng **videocam** (📹) ở góc phải header
3. Cuộc gọi sẽ bắt đầu và gửi thông báo cho người nhận

### Từ trang Messages (Trang tin nhắn chính)

1. Chọn cuộc trò chuyện trong danh sách
2. Nhấn vào nút **videocam** (📹) ở header bên phải
3. Cuộc gọi sẽ khởi động

### Nhận cuộc gọi đến

Khi có người gọi đến:
1. Một hộp thoại confirm sẽ hiện lên: `[Tên người gọi] đang gọi video. Chấp nhận?`
2. Nhấn **OK** để tham gia cuộc gọi
3. Nhấn **Cancel** để từ chối

## Kiến trúc Kỹ thuật

### Frontend

**VideoCallModal.vue** - Component chính xử lý video call
- Quản lý WebRTC PeerConnections
- Xử lý local/remote video streams
- Điều khiển media devices (camera, mic)
- Screen sharing via getDisplayMedia API
- Giao diện responsive với grid layout

**ChatPopup.vue & Message.vue** - Integration points
- Nút gọi video trong header
- Socket listeners cho incoming calls
- Ref đến VideoCallModal để start call

### Backend

**socketHandler.js** - WebSocket signaling server
- `video-call:start` - Khởi tạo cuộc gọi
- `video-call:join` - Người dùng tham gia
- `video-call:offer` - Trao đổi WebRTC offer
- `video-call:answer` - Trao đổi WebRTC answer
- `video-call:ice-candidate` - Trao đổi ICE candidates
- `video-call:toggle-media` - Đồng bộ trạng thái media
- `video-call:end` - Kết thúc cuộc gọi
- `video-call:reject` - Từ chối cuộc gọi

### WebRTC Flow

```
Caller                    Server                    Receiver
  |                          |                          |
  |--video-call:start------->|                          |
  |                          |--video-call:incoming---->|
  |                          |                          |
  |                          |<--video-call:join--------|
  |<--user-joined------------|                          |
  |                          |                          |
  |--offer------------------>|--offer------------------>|
  |<--answer-----------------|<--answer-----------------|
  |--ice-candidate---------->|--ice-candidate---------->|
  |<--ice-candidate----------|<--ice-candidate----------|
  |                          |                          |
  [WebRTC Peer Connection Established]
  |                          |                          |
  |--video-call:end--------->|--user-left-------------->|
```

## STUN Servers

Ứng dụng sử dụng Google STUN servers để NAT traversal:
- `stun:stun.l.google.com:19302`
- `stun:stun1.l.google.com:19302`

Trong môi trường production, nên cài đặt TURN server riêng để đảm bảo kết nối trong mọi trường hợp.

## Yêu cầu Trình duyệt

- Chrome/Edge: ✅ Hỗ trợ đầy đủ
- Firefox: ✅ Hỗ trợ đầy đủ
- Safari: ✅ Hỗ trợ (cần HTTPS)
- Opera: ✅ Hỗ trợ đầy đủ

**Lưu ý**: Trình duyệt sẽ yêu cầu quyền truy cập camera và microphone khi bắt đầu cuộc gọi.

## Permissions

Ứng dụng cần các quyền sau:
- **Camera**: Để hiển thị video của bạn
- **Microphone**: Để truyền âm thanh của bạn
- **Screen Capture** (tùy chọn): Để chia sẻ màn hình

## Xử lý Lỗi

### Lỗi thường gặp:

1. **"Permission denied"**
   - Nguyên nhân: Người dùng từ chối quyền camera/mic
   - Giải pháp: Kiểm tra settings trình duyệt và cấp quyền

2. **"Could not start video call"**
   - Nguyên nhân: Socket chưa kết nối hoặc lỗi WebRTC
   - Giải pháp: Reload trang và thử lại

3. **Video bị lag**
   - Nguyên nhân: Kết nối mạng yếu
   - Giải pháp: Tắt camera hoặc giảm chất lượng video

## Tối ưu hóa

### Hiệu suất
- Video codec: VP8/VP9 (WebRTC default)
- Audio codec: Opus
- Bitrate tự động điều chỉnh theo băng thông

### Bảo mật
- Tất cả WebRTC traffic được mã hóa (DTLS-SRTP)
- Signaling qua Socket.io với JWT authentication
- Không lưu trữ video/audio trên server

## TODO / Tính năng tương lai

- [ ] Thêm blur background
- [ ] Ghi hình cuộc gọi
- [ ] Chat trong khi video call
- [ ] Virtual backgrounds
- [ ] Noise cancellation
- [ ] Picture-in-Picture mode
- [ ] Call history/logs
- [ ] Quality indicators
- [ ] Reactions/emojis trong call

## Troubleshooting

### Không thấy video của mình
1. Kiểm tra camera có bị ứng dụng khác sử dụng không
2. Reload trang
3. Kiểm tra quyền truy cập trong browser settings

### Không nghe thấy âm thanh
1. Kiểm tra volume hệ thống
2. Kiểm tra mic không bị mute
3. Test với cuộc gọi khác để xác định vấn đề

### Kết nối bị ngắt
1. Kiểm tra kết nối internet
2. Thử reload trang
3. Kiểm tra firewall settings

## Liên hệ

Nếu có vấn đề hoặc câu hỏi, vui lòng:
1. Kiểm tra browser console để xem logs
2. Chụp màn hình lỗi
3. Mô tả các bước để tái hiện lỗi

---

**Version**: 1.0.0  
**Last Updated**: 2024  
**Technology**: Vue 3, WebRTC, Socket.io, Node.js
