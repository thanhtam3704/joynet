# Video Call Messages Logic - Facebook Style

## Tổng quan

Hệ thống video call messages được thiết kế giống Facebook, với messages khác nhau cho người gọi (caller) và người nhận (receiver).

## Message Codes từ Backend

Backend gửi các message codes đặc biệt, frontend sẽ transform thành text hiển thị phù hợp.

### 1. Cuộc gọi 1-1 (One-to-One Call)

#### a. CALL_CANCELLED - Người gọi hủy trước khi người nhận chấp nhận
**Backend gửi:** `📞 CALL_CANCELLED`
**Frontend hiển thị:**
- Người gọi thấy: `📞 Bạn đã hủy cuộc gọi`
- Người nhận thấy: `📞 Cuộc gọi nhỡ`
User A: 1 message "Bạn đã hủy cuộc gọi" (blue)
User B: 1 message "Cuộc gọi nhỡ" (red)
User B modal: Tắt NGAY LẬP TỨC không cần click
Không có message thứ 2 nào xuất hiện
#### b. CALL_MISSED - Người nhận không trả lời/từ chối
**Backend gửi 2 messages riêng biệt:**
- Cho người gọi: `📞 CALL_NO_ANSWER`
- Cho người nhận: `📞 CALL_MISSED`

**Frontend hiển thị:**
- Người gọi thấy: `📞 Không có phản hồi` ⭐ Giống Facebook
- Người nhận thấy: `📞 Cuộc gọi nhỡ`
OK
#### c. CALL_ENDED - Cuộc gọi kết thúc sau khi được chấp nhận
**Backend gửi:** `🎥📞 CALL_ENDED|{duration}`
- Ví dụ: `🎥📞 CALL_ENDED|2 phút 30 giây`

**Frontend hiển thị:**
- Cả hai đều thấy: 
```
🎥📞 Cuộc gọi video kết thúc
Thời lượng: 2 phút 30 giây
```
OK
### 2. Cuộc gọi nhóm (Group Call)

#### a. CALL_CANCELLED_GROUP - Người gọi hủy cuộc gọi nhóm
**Backend gửi:** `📞 CALL_CANCELLED_GROUP`
**Frontend hiển thị:**
- Người gọi thấy: `📞 Bạn đã hủy cuộc gọi nhóm`
- Thành viên khác thấy: `📞 Cuộc gọi nhóm đã bị bỏ lỡ`

**Behavior:**
- Modal của TẤT CẢ người nhận tắt NGAY LẬP TỨC không cần click
- Backend emit event `video-call:cancelled` đến tất cả participants (3 channels: user room, socket ID, conversation room)
- Frontend ChatPopupsManager nhận event và gọi `modal.hide()` tự động
ok
#### b. CALL_MISSED_GROUP - Không ai tham gia cuộc gọi nhóm
**Backend gửi:** `📞 CALL_MISSED_GROUP`
**Khi nào:** Chỉ khi timeout (60s) mà không có ai join (ngoài caller)
**Frontend hiển thị:**
- Tất cả thành viên thấy: `📞 Cuộc gọi nhóm đã bị bỏ lỡ`

**Lưu ý quan trọng:**
- Nếu 1 hoặc nhiều người reject nhưng vẫn có người khác chưa reject → cuộc gọi VẪN TIẾP TỤC
- Người reject chỉ thoát khỏi cuộc gọi, KHÔNG tạo message ngay
- CHỈ khi timeout mà không ai join thì mới tạo CALL_MISSED_GROUP

#### c. CALL_ENDED_GROUP - Cuộc gọi nhóm kết thúc
**Backend gửi 2 loại message riêng biệt:**

**Cho người đã tham gia:** `🎥📞 CALL_ENDED_GROUP|{duration}|{joinedCount}`
- Ví dụ: `🎥📞 CALL_ENDED_GROUP|5 phút 12 giây|3`
- Message được lưu với field `visibleTo` chỉ chứa userId của người đã join
- CHỈ người join mới thấy message này trong chat history

**Cho người không tham gia:** `📞 CALL_MISSED_GROUP_USER|{callerName}`
- Ví dụ: `📞 CALL_MISSED_GROUP_USER|Nguyễn Văn A`
- Message được lưu với field `visibleTo` chỉ chứa userId của người không join
- Mỗi người không join có 1 message riêng với tên caller

**Frontend hiển thị:**
- Người đã tham gia thấy:
```
🎥📞 Cuộc gọi nhóm kết thúc
Thời lượng: 5 phút 12 giây
3 người đã tham gia
```

- Người không tham gia thấy (màu đỏ):
```
📞 Bạn đã bỏ lỡ cuộc gọi nhóm từ {callerName}
```



## Backend Implementation

### socketHandler.js

#### 1. Helper Functions

```javascript
// Tạo message và emit chung cho tất cả
async function createAndEmitMessage(io, conversationId, senderId, content, senderInfo = null)

// Tạo message không emit (dùng cho personalized messages)
async function createMessage(conversationId, senderId, content)

// Emit messages khác nhau cho caller vs receivers
async function emitMessageToParticipants(io, conversation, callerMessage, receiverMessage, callerId)
```

#### 2. Socket Events

**video-call:cancel** - Caller hủy cuộc gọi:
- 1-1: Tạo 2 messages khác nhau (CALL_CANCELLED cho caller, CALL_MISSED cho receiver)
- Group: Tạo 1 message chung (CALL_CANCELLED_GROUP)

**video-call:reject** - Receiver từ chối:
- 1-1: Tạo 1 message với code CALL_NO_ANSWER (frontend transform khác nhau cho caller/receiver)
- Group: KHÔNG tạo message, cuộc gọi vẫn tiếp tục cho những người khác (chỉ notify caller)

**video-call:end** - Cuộc gọi kết thúc:
- 1-1: Tạo 1 message với duration (CALL_ENDED|duration) cho cả 2 người
- Group: Tạo 2 loại messages khác nhau:
  - **Cho người đã join:** Tạo message `CALL_ENDED_GROUP|duration|count` với field `visibleTo` chỉ chứa người đã join
  - **Cho người không join:** Tạo message riêng `CALL_MISSED_GROUP_USER|{callerName}` cho từng người với field `visibleTo` chỉ chứa userId của người đó

**Timeout** - Không ai trả lời:
- 1-1: Tạo 2 messages khác nhau (CALL_MISSED_NO_ANSWER, CALL_MISSED)
- Group: Tạo 1 message chung (CALL_MISSED_GROUP)

## Frontend Implementation

### Helper Methods

Cả `ChatPopup.vue` và `ChatMessages.vue` đều có:

```javascript
// Kiểm tra có phải call message không
isCallMessage(message) {
  return content.includes('📞') || content.includes('🎥📞') || 
         content.includes('CALL_CANCELLED') || content.includes('CALL_MISSED') || 
         content.includes('CALL_ENDED');
}

// Kiểm tra có phải missed call không (để tô màu đỏ)
isMissedCallMessage(message) {
  return content.includes('CALL_MISSED') || 
         content.includes('📞 Cuộc gọi nhỡ') || 
         content.includes('📞 Bạn đã bỏ lỡ') ||
         content.startsWith('📞 CALL_MISSED_GROUP_USER|');
}

// Transform message code thành text hiển thị
getCallMessageDisplay(message) {
  const content = String(message.content);
  const isMyMessage = /* check if current user is sender */;
  
  // CALL_ENDED_GROUP - parse duration and participants
  if (content.startsWith('🎥📞 CALL_ENDED_GROUP|')) {
    const parts = content.split('|');
    const duration = parts[1] || '0 giây';
    const joinedCount = parts[2] || '0';
    return `🎥📞 Cuộc gọi nhóm kết thúc\nThời lượng: ${duration}\n${joinedCount} người đã tham gia`;
  }
  
  // CALL_MISSED_GROUP_USER - parse caller name for missed group call
  if (content.startsWith('📞 CALL_MISSED_GROUP_USER|')) {
    const parts = content.split('|');
    const callerName = parts[1] || 'Unknown';
    return `📞 Bạn đã bỏ lỡ cuộc gọi nhóm từ ${callerName}`;
  }
  
  // Transform dựa vào message code và ai là viewer
  // Return formatted text
}
```

### Styling

```css
.call-message {
  background: transparent !important;
  border: 1px solid rgba(102, 126, 234, 0.3);
  padding: 12px 16px;
}

.call-message-content {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #667eea;
}

.call-icon.missed,
.call-message-content.missed {
  color: #ef4444 !important;
}
```

## So sánh với Facebook

| Tính năng | Facebook | JoyNet (hiện tại) |
|-----------|----------|-------------------|
| **1-1 Cancelled** | Caller: "Đã hủy" / Receiver: "Cuộc gọi nhỡ" | ✅ Giống |
| **1-1 No Answer** | Caller: "Không có phản hồi" / Receiver: "Cuộc gọi nhỡ" | ✅ Giống |
| **1-1 Ended** | Both: "Cuộc gọi video • Thời lượng X" | ✅ Giống |
| **Group Started** | "X bắt đầu cuộc gọi" | ❌ Chưa có |
| **Group Ended** | "Cuộc gọi kết thúc • Thời lượng X" | ✅ Giống |
| **Group Missed** | "Bạn đã bỏ lỡ cuộc gọi từ X" | ✅ Giống |

## Testing Scenarios

### Test 1-1 Call
1. **Cancel before answer:** 
   - A gọi B → A hủy ngay
   - Kết quả: A thấy "Bạn đã hủy", B thấy "Cuộc gọi nhỡ"

2. **Reject/No answer:**
   - A gọi B → B từ chối hoặc timeout
   - Kết quả: A thấy "Không có phản hồi", B thấy "Cuộc gọi nhỡ"

3. **Answer and end:**
   - A gọi B → B chấp nhận → gọi 2 phút → A hoặc B kết thúc
   - Kết quả: Cả hai thấy "Cuộc gọi video kết thúc\nThời lượng: 2 phút"

### Test Group Call
1. **Cancel group:**
   - A tạo nhóm với B, C → A gọi nhóm → A hủy
   - Kết quả: 
     - A thấy "Bạn đã hủy cuộc gọi nhóm" (1 message)
     - B+C thấy "Cuộc gọi nhóm đã bị bỏ lỡ" (1 message mỗi người)
     - Modal của B và C tắt NGAY LẬP TỨC không cần click

2. **No one joins:**
   - A gọi nhóm → không ai join → timeout
   - Kết quả: Tất cả thấy "Cuộc gọi nhóm đã bị bỏ lỡ"

3. **Some join:**
   - A gọi nhóm (A,B,C,D) → B+C join → cuộc gọi kết thúc
   - Kết quả: 
     - A+B+C thấy message "Cuộc gọi nhóm kết thúc\nThời lượng: X\n3 người đã tham gia" (trong chat)
     - D thấy message riêng "Bạn đã bỏ lỡ cuộc gọi nhóm từ A" (màu đỏ, trong chat history)

## Migration Notes

Nếu có messages cũ trong database với format cũ:
- `📞 Đã bỏ lỡ...` 
- `📞 Cuộc gọi đã bị bỏ lỡ...`
- `🎥📞 Cuộc gọi video kết thúc...`

Frontend vẫn sẽ hiển thị đúng vì:
1. `isCallMessage()` detect được emoji 📞 và 🎥📞
2. `getCallMessageDisplay()` trả về nguyên content nếu không match message codes mới
3. Styling vẫn áp dụng cho các message có emoji này

## Future Enhancements

1. **Group call start message:** Thêm message "X bắt đầu cuộc gọi" khi gọi nhóm
2. **User join/leave notifications:** "X đã tham gia cuộc gọi", "Y đã rời cuộc gọi"
3. **Recall/Unsend call:** Cho phép xóa message cuộc gọi nhỡ
4. **Call quality indicator:** Hiển thị chất lượng cuộc gọi (tốt/trung bình/kém)
