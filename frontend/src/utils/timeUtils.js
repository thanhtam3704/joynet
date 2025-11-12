/**
 * Chuyển đổi timestamp thành chuỗi thời gian tương đối (vd: "2 giờ trước", "3 ngày trước")
 * @param {String|Date} timestamp - Thời gian cần chuyển đổi
 * @returns {String} Chuỗi thời gian tương đối
 */
export function getTimeAgo(timestamp) {
  if (!timestamp) return '';
  
  const now = new Date();
  const postTime = new Date(timestamp);
  
  // Kiểm tra timestamp hợp lệ
  if (isNaN(postTime.getTime())) return '';
  
  const seconds = Math.floor((now - postTime) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  
  if (seconds < 60) {
    return 'Vừa xong';
  } else if (minutes < 60) {
    return `${minutes} phút trước`;
  } else if (hours < 24) {
    return `${hours} giờ trước`;
  } else if (days < 7) {
    return `${days} ngày trước`;
  } else if (weeks < 4) {
    return `${weeks} tuần trước`;
  } else if (months < 12) {
    return `${months} tháng trước`;
  } else {
    return `${years} năm trước`;
  }
}

/**
 * Định dạng timestamp thành chuỗi ngày giờ đầy đủ
 * @param {String|Date} timestamp - Thời gian cần định dạng
 * @param {Boolean} includeTime - Có bao gồm giờ phút hay không
 * @returns {String} Chuỗi ngày giờ đã định dạng
 */
export function formatDateTime(timestamp, includeTime = true) {
  if (!timestamp) return '';
  
  let date = new Date(timestamp);
  
  // Kiểm tra timestamp hợp lệ
  if (isNaN(date.getTime())) return '';
  
  // Trừ đi 7 giờ vì backend đã cộng thêm 7 giờ (UTC+7)
  date = new Date(date.getTime() - 7 * 60 * 60 * 1000);
  
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  
  if (includeTime) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} lúc ${hours}:${minutes}`;
  }
  
  return `${day}/${month}/${year}`;
}

/**
 * Lấy chuỗi ngày giờ ngắn gọn (hiển thị trên UI)
 * @param {String|Date} timestamp - Thời gian cần chuyển đổi
 * @returns {String} Chuỗi thời gian ngắn gọn
 */
export function getShortDateTime(timestamp) {
  if (!timestamp) return '';
  
  const now = new Date();
  const postTime = new Date(timestamp);
  
  // Kiểm tra timestamp hợp lệ
  if (isNaN(postTime.getTime())) return '';
  
  const seconds = Math.floor((now - postTime) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  // Nếu trong vòng 24 giờ, hiển thị "x giờ trước"
  if (days < 1) {
    return getTimeAgo(timestamp);
  }
  
  // Nếu trong tuần này, hiển thị "Thứ X"
  const dayOfWeek = postTime.getDay();
  const dayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  
  if (days < 7 && now.getDay() >= dayOfWeek) {
    return dayNames[dayOfWeek];
  }
  
  // Nếu xa hơn, hiển thị ngày tháng
  const day = postTime.getDate();
  const month = postTime.getMonth() + 1;
  const year = postTime.getFullYear();
  const currentYear = now.getFullYear();
  
  // Nếu cùng năm thì không hiển thị năm
  if (year === currentYear) {
    return `${day} tháng ${month}`;
  }
  
  return `${day} tháng ${month}, ${year}`;
}
