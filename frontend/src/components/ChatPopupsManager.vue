<template>
  <div class="chat-popups-container">
    <ChatPopup
      v-for="(conversation, index) in openChats"
      :key="conversation._id"
      :ref="`popup_${conversation._id}`"
      :conversation="conversation"
      :class="`popup-position-${index}`"
      @close="closeChat(conversation._id)"
      @conversation-updated="updateConversation"
    />
    
    <IncomingCallModal
      ref="incomingCallModal"
      :callerName="incomingCall.callerName"
      :callerAvatar="incomingCall.callerAvatar"
      :isGroupCall="incomingCall.isGroupCall"
      @accept="onAcceptIncomingCall"
      @reject="onRejectIncomingCall"
    />
  </div>
</template>

<script>
import ChatPopup from './ChatPopup.vue'
import IncomingCallModal from './IncomingCallModal.vue'
import MessageAPI from '@/api/messages'
import socketService from '@/services/socketService'

export default {
  name: 'ChatPopupsManager',
  components: {
    ChatPopup,
    IncomingCallModal
  },
  data() {
    return {
      openChats: [],
      incomingCall: {
        conversationId: null,
        callerId: null,
        callerName: '',
        callerAvatar: '',
        isGroupCall: false
      },
      activeVideoCall: null, // Track active video call to prevent duplicate modals
      isComponentReady: false // Track if component is fully mounted
    }
  },
  mounted() {
    console.log('🚀 [ChatPopupsManager] Component mounted');
    console.log('🚀 [ChatPopupsManager] Socket connected:', socketService.getConnectionStatus());
    console.log('🚀 [ChatPopupsManager] Socket object:', socketService.socket);
    
    // Register global method to open chat popup
    window.openChatPopup = this.handleOpenChatPopup;
    
    // Expose manager instance for VideoCallModal to access activeVideoCall
    window.ChatPopupsManager = this;
    
    // ✅ Setup video call listener immediately
    this.setupVideoCallListener();
    
    // ✅ Listen for socket reconnection and re-setup listener
    window.addEventListener('socket-connected', this.setupVideoCallListener);
    
    // ✅ Mark component as ready after mount
    this.$nextTick(() => {
      this.isComponentReady = true;
      console.log('✅ [ChatPopupsManager] Component fully ready');
    });
    
    console.log('✅ [ChatPopupsManager] Video call listener setup complete');
  },
  beforeUnmount() {
    delete window.openChatPopup;
    delete window.ChatPopupsManager;
    window.removeEventListener('socket-connected', this.setupVideoCallListener);
    socketService.off('video-call:incoming', this.handleGlobalIncomingCall);
  },
  methods: {
    setupVideoCallListener() {
      console.log('🌐 [ChatPopupsManager] Setting up global video call listener');
      // Remove existing listener first to avoid duplicates
      socketService.off('video-call:incoming', this.handleGlobalIncomingCall);
      // Setup new listener
      socketService.on('video-call:incoming', this.handleGlobalIncomingCall);
    },
    
    async handleOpenChatPopup({ recipientId, recipientName, recipientAvatar, conversationId }) {
      try {
        console.log('🔵 handleOpenChatPopup called:', { recipientId, conversationId });
        console.log('🔵 Current openChats before processing:', this.openChats.map(c => ({ id: c._id, participantId: c.participant?._id })));
        
        // Tìm trong store trước để có đầy đủ thông tin
        const conversationsInStore = this.$store.getters.sortedConversations || [];
        
        // UNIFIED CHECK: Kiểm tra popup đã mở (theo conversationId HOẶC recipientId)
        let targetConversation = null;
        
        if (conversationId) {
          // Đường dropdown: có conversationId
          targetConversation = conversationsInStore.find(conv => conv._id === conversationId);
          
          // Kiểm tra đã mở bởi conversationId hoặc participant
          const alreadyOpen = this.openChats.find(chat => 
            chat._id === conversationId ||
            (!chat.isGroup && targetConversation && !targetConversation.isGroup && 
             chat.participant?._id === targetConversation.participant?._id)
          );
          
          if (alreadyOpen) {
            console.log('✅ Chat already open (by conversationId path), NOT opening again:', alreadyOpen._id);
            // Không gọi openChat để tránh re-render
            return;
          }
        }
        
        if (recipientId) {
          // Đường SidebarRight: có recipientId
          targetConversation = targetConversation || conversationsInStore.find(conv => 
            !conv.isGroup && conv.participant?._id === recipientId
          );
          
          // Kiểm tra đã mở bởi recipientId hoặc conversationId
          const alreadyOpen = this.openChats.find(chat => 
            (!chat.isGroup && chat.participant?._id === recipientId) ||
            chat._id === `temp_${recipientId}` ||
            (targetConversation && chat._id === targetConversation._id)
          );
          
          if (alreadyOpen) {
            console.log('✅ Chat already open (by recipientId path), NOT opening again:', alreadyOpen._id);
            // Không gọi openChat để tránh re-render
            return;
          }
        }
        
        // Nếu có conversationId và đã tìm thấy trong store → mở luôn
        if (conversationId && targetConversation) {
          console.log('✅ Found conversation in store by conversationId, opening:', targetConversation._id);
          this.openChat(targetConversation);
          return;
        }
        
        // Nếu có conversationId nhưng chưa có trong store → reload
        if (conversationId && !targetConversation) {
          console.log('⚠️ Conversation not found in store, reloading...');
          await this.$store.dispatch('loadConversations');
          const reloadedConv = this.$store.getters.sortedConversations.find(conv => conv._id === conversationId);
          if (reloadedConv) {
            this.openChat(reloadedConv);
            return;
          }
        }
        
        // Logic cho recipientId (khi chưa có conversation)
        if (recipientId) {
          // Đã tìm trong store ở trên, nếu có thì mở
          if (targetConversation) {
            console.log('✅ Found conversation in store by recipientId, opening:', targetConversation._id);
            this.openChat(targetConversation);
            return;
          }
          
          // Không có trong store → tạo temp và fetch từ API
          console.log('🔄 Creating temp conversation and fetching from API...');
          const tempConversation = {
            _id: `temp_${recipientId}`,
            isGroup: false,
            participant: {
              _id: recipientId,
              displayName: recipientName,
              profilePicture: recipientAvatar,
              isOnline: false
            },
            messages: [],
            isLoading: true
          };
          
          // Mở chat với temp conversation trước
          this.openChat(tempConversation);
          
          // Fetch conversation thật từ API
          const response = await MessageAPI.createOrGetConversation(recipientId);
          if (response.status === 200 || response.status === 201) {
            const realConversation = response.data;
            console.log('✅ Fetched real conversation:', realConversation._id);
          
            // openChat sẽ tự động thay thế temp bằng real (theo participant._id)
            this.openChat(realConversation);
            
            // Cập nhật store để lần sau không cần fetch nữa
            await this.$store.dispatch('loadConversations');
          }
        }
      } catch (error) {
        console.error('❌ Error opening chat popup:', error);
        // Xóa temp conversation nếu lỗi
        this.openChats = this.openChats.filter(c => !c._id.startsWith('temp_'));
      }
    },
    
    openChat(conversation) {
      // Ưu tiên: thay thế popup đã mở (theo _id hoặc participant) để tránh trùng
      const byIdIndex = this.openChats.findIndex(c => c._id === conversation._id);

      console.log('📋 [openChat] Current openChats:', this.openChats.map(c => ({ id: c._id, participant: c.participant?._id, isGroup: c.isGroup })));
      console.log('📋 [openChat] Trying to open:', { id: conversation._id, participant: conversation.participant?._id, isGroup: conversation.isGroup });
      console.log('📋 [openChat] byIdIndex:', byIdIndex);

      if (byIdIndex !== -1) {
        // Đảm bảo thay thế dữ liệu bằng cuộc trò chuyện “thật” (ví dụ sau temp_*)
        this.openChats.splice(byIdIndex, 1, conversation);
        console.log('🔁 Replaced existing popup by id at index:', byIdIndex);
        return;
      }

      // Với chat cá nhân (non-group), hợp nhất theo participant._id để tránh 2 popup
      let byParticipantIndex = -1;
      if (!conversation.isGroup && conversation.participant && conversation.participant._id) {
        byParticipantIndex = this.openChats.findIndex(c =>
          !c.isGroup && c.participant && c.participant._id === conversation.participant._id
        );
      }

      console.log('📋 [openChat] byParticipantIndex:', byParticipantIndex);

      if (byParticipantIndex !== -1) {
        this.openChats.splice(byParticipantIndex, 1, conversation);
        console.log('🔁 Replaced existing popup by participant at index:', byParticipantIndex);
        return;
      }

      // Không có trùng → thêm vào cuối (mới nằm ngoài cùng bên phải)
      this.openChats.push(conversation);
      console.log('✅ Added to openChats. New array:', this.openChats.map(c => c._id));
      console.log('📍 Popup positions:', this.openChats.map((c, i) => `${c._id.substring(0, 8)}: right=${80 + i * 348}px`));

      // Giới hạn tối đa 3 chats cùng lúc
      if (this.openChats.length > 3) {
        const removed = this.openChats.shift();
        console.log('🗑️ Removed oldest chat:', removed._id);
      }
    },
    
    closeChat(conversationId) {
      this.openChats = this.openChats.filter(c => c._id !== conversationId)
    },
    
    updateConversation(updatedConversation) {
      console.log('🔄 [ChatPopupsManager] Updating conversation:', updatedConversation);
      const index = this.openChats.findIndex(c => c._id === updatedConversation._id);
      if (index !== -1) {
        // Replace the entire conversation object to trigger reactivity
        this.openChats[index] = { ...updatedConversation };
        console.log('✅ [ChatPopupsManager] Conversation updated at index', index);
      }
    },
    
    async handleGlobalIncomingCall({ conversationId, callerId, callerName, callerAvatar, isGroupCall }) {
      console.log('🌐 [ChatPopupsManager] Global incoming call:', { conversationId, callerId, callerName, callerAvatar, isGroupCall });
      
      // Don't show incoming call modal if already in this video call
      if (this.activeVideoCall && this.activeVideoCall.conversationId === conversationId) {
        console.log('⚠️ [ChatPopupsManager] Already in this video call, ignoring incoming call');
        return;
      }
      
      // ✅ Wait for component to be ready if it's not yet
      if (!this.isComponentReady) {
        console.log('⏳ [ChatPopupsManager] Component not ready, waiting...');
        await new Promise(resolve => {
          const checkReady = () => {
            if (this.isComponentReady) {
              resolve();
            } else {
              setTimeout(checkReady, 50);
            }
          };
          checkReady();
        });
      }
      
      // Format avatar URL properly
      let formattedAvatar = 'https://via.placeholder.com/100';
      if (callerAvatar) {
        if (callerAvatar.startsWith('http')) {
          formattedAvatar = callerAvatar;
        } else {
          formattedAvatar = `http://localhost:3000/uploads/user/${callerAvatar}`;
        }
      }
      
      // Lưu thông tin cuộc gọi
      this.incomingCall = {
        conversationId,
        callerId,
        callerName: callerName || 'Unknown',
        callerAvatar: formattedAvatar,
        isGroupCall
      };
      
      console.log('📞 [ChatPopupsManager] Incoming call saved:', this.incomingCall);
      
      // ✅ Hiển thị modal cuộc gọi ngay lập tức, không cần mở popup trước
      // Popup sẽ được mở khi user accept cuộc gọi
      // Thêm retry logic để đảm bảo ref được khởi tạo
      const showModal = (retries = 0) => {
        this.$nextTick(() => {
          if (this.$refs.incomingCallModal) {
            console.log('📞 [ChatPopupsManager] Showing incoming call modal');
            this.$refs.incomingCallModal.show();
          } else if (retries < 5) {
            console.warn(`⚠️ [ChatPopupsManager] incomingCallModal ref not found, retrying... (${retries + 1}/5)`);
            setTimeout(() => showModal(retries + 1), 100);
          } else {
            console.error('❌ [ChatPopupsManager] incomingCallModal ref not found after 5 retries');
          }
        });
      };
      
      showModal();
    },
    
    async onAcceptIncomingCall() {
      console.log('✅ [ChatPopupsManager] User accepted call');
      const { conversationId, callerId } = this.incomingCall;
      
      // Mark this call as active NOW (before joinCall)
      this.activeVideoCall = { conversationId };
      console.log('✅ [ChatPopupsManager] Set activeVideoCall:', this.activeVideoCall);
      
      // Hide modal
      if (this.$refs.incomingCallModal) {
        this.$refs.incomingCallModal.hide();
      }
      
      // ✅ Mở popup nếu chưa có (đảm bảo có popup để start video call)
      let popup = this.openChats.find(c => c._id === conversationId);
      if (!popup) {
        console.log('📞 [ChatPopupsManager] Opening popup before accepting call...');
        try {
          await this.handleOpenChatPopup({ conversationId });
          popup = this.openChats.find(c => c._id === conversationId);
          console.log('✅ [ChatPopupsManager] Popup opened:', !!popup);
        } catch (error) {
          console.error('❌ [ChatPopupsManager] Failed to open popup:', error);
        }
      }
      
      // Emit accept to backend - backend sẽ notify caller
      socketService.emit('video-call:accept', { conversationId, callerId });
      
      // Start video call immediately for receiver
      this.$nextTick(() => {
        setTimeout(() => {
          const refName = `popup_${conversationId}`;
          const chatPopupRef = this.$refs[refName];
          const popup = Array.isArray(chatPopupRef) ? chatPopupRef[0] : chatPopupRef;
          
          console.log('🔍 [ChatPopupsManager] Looking for VideoCallModal in popup:', {
            refName,
            hasPopup: !!popup,
            hasChatPopupRef: !!chatPopupRef,
            isArray: Array.isArray(chatPopupRef),
            hasRefs: !!popup?.$refs,
            hasVideoCallModal: !!popup?.$refs?.videoCallModal
          });
          
          if (popup && popup.$refs && popup.$refs.videoCallModal) {
            console.log('📹 [ChatPopupsManager] Receiver joining video call');
            
            // joinCall() will handle the video call
            // activeVideoCall will be cleared when call-ended event is emitted to ChatPopup
            popup.$refs.videoCallModal.joinCall();
          } else {
            console.error('❌ [ChatPopupsManager] Cannot find VideoCallModal ref');
            console.log('Available refs:', Object.keys(this.$refs));
            console.log('Popup refs:', popup?.$refs ? Object.keys(popup.$refs) : 'none');
          }
        }, 200); // Increased timeout to ensure ref is ready
      });
    },
    
    onRejectIncomingCall() {
      console.log('❌ [ChatPopupsManager] User rejected call');
      const { conversationId, callerId } = this.incomingCall;
      socketService.emit('video-call:reject', { conversationId, callerId });
    }
  }
}
</script>

<style scoped>
.chat-popups-container {
  position: fixed;
  bottom: 0;
  right: 0;
  z-index: 9998;
  pointer-events: none;
}

.chat-popups-container > * {
  pointer-events: all;
}
</style>
