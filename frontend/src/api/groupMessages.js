import axios from '@/utils/axios';

const GroupMessageAPI = {
  // Tạo nhóm chat mới
  async createGroup(groupName, memberIds) {
    const token = localStorage.getItem('token');
    return axios.post('/messages/groups', 
      { groupName, memberIds },
      { headers: { token } }
    );
  },

  // Thêm member vào nhóm
  async addMembers(conversationId, memberIds) {
    const token = localStorage.getItem('token');
    return axios.post(`/messages/groups/${conversationId}/members`,
      { memberIds },
      { headers: { token } }
    );
  },

  // Xóa member khỏi nhóm
  async removeMember(conversationId, memberId) {
    const token = localStorage.getItem('token');
    return axios.delete(`/messages/groups/${conversationId}/members/${memberId}`,
      { headers: { token } }
    );
  },

  // Cập nhật thông tin nhóm
  async updateGroupInfo(conversationId, data) {
    const token = localStorage.getItem('token');
    return axios.put(`/messages/groups/${conversationId}`,
      data,
      { headers: { token } }
    );
  },

  // Promote member thành admin
  async promoteToAdmin(conversationId, memberId) {
    const token = localStorage.getItem('token');
    return axios.post(`/messages/groups/${conversationId}/admins/${memberId}`,
      {},
      { headers: { token } }
    );
  },

  // Rời khỏi nhóm
  async leaveGroup(conversationId) {
    const token = localStorage.getItem('token');
    return axios.post(`/messages/groups/${conversationId}/leave`,
      {},
      { headers: { token } }
    );
  },

  // Chuyển quyền trưởng nhóm
  async transferOwnership(conversationId, newOwnerId) {
    const token = localStorage.getItem('token');
    return axios.post(`/messages/groups/${conversationId}/transfer-ownership`,
      { newOwnerId },
      { headers: { token } }
    );
  },

  // Giải tán nhóm
  async disbandGroup(conversationId) {
    const token = localStorage.getItem('token');
    return axios.delete(`/messages/groups/${conversationId}/disband`,
      { headers: { token } }
    );
  }
};

export default GroupMessageAPI;
