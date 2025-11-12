import axios from '@/utils/axios'

export default {
  // Lấy danh sách yêu cầu theo dõi đang chờ (người nhận)
  async getPendingRequests(userId) {
    return await axios.get(`/follow-requests/${userId}/pending`, {
      withCredentials: true,
    })
  },

  // Lấy danh sách yêu cầu đã gửi (người gửi)
  async getSentRequests(userId) {
    return await axios.get(`/follow-requests/${userId}/sent`, {
      withCredentials: true,
    })
  },

  // Kiểm tra xem đã gửi request chưa
  async checkFollowRequest(fromUserId, toUserId) {
    return await axios.get(`/follow-requests/check/${fromUserId}/${toUserId}`, {
      withCredentials: true,
    })
  },

  // Gửi yêu cầu theo dõi
  async sendFollowRequest(fromUserId, toUserId) {
    return await axios.post(
      '/follow-requests/send',
      { fromUserId, toUserId },
      { withCredentials: true }
    )
  },

  // Chấp nhận yêu cầu theo dõi
  async acceptFollowRequest(requestId, userId) {
    return await axios.put(
      `/follow-requests/${requestId}/accept`,
      { userId },
      { withCredentials: true }
    )
  },

  // Từ chối yêu cầu theo dõi
  async rejectFollowRequest(requestId, userId) {
    return await axios.put(
      `/follow-requests/${requestId}/reject`,
      { userId },
      { withCredentials: true }
    )
  },

  // Hủy yêu cầu theo dõi (người gửi)
  async cancelFollowRequest(requestId, userId) {
    return await axios.delete(`/follow-requests/${requestId}/cancel`, {
      data: { userId },
      withCredentials: true,
    })
  },

  // Cập nhật privacy settings
  async updatePrivacy(userId, isPrivate) {
    return await axios.put(
      `/users/${userId}/privacy`,
      { isPrivate },
      { withCredentials: true }
    )
  },
}
