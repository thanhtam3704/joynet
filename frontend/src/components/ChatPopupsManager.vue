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
import { eventBus } from '@/utils/eventBus'

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
    // Register global method to open chat popup
    window.openChatPopup = this.handleOpenChatPopup;
    
    // Expose manager instance for VideoCallModal to access activeVideoCall
    window.ChatPopupsManager = this;
    
    // ✅ Setup video call listener immediately
    this.setupVideoCallListener();
    
    // ✅ Listen for socket reconnection and re-setup listener
    window.addEventListener('socket-connected', this.setupVideoCallListener);
    
    // ✅ CRITICAL: Add browser event listener as fallback
    window.addEventListener('video-call-cancelled', this.handleBrowserCallCancelled);
    console.log('🟢 [ChatPopupsManager] Browser event listener registered');
    
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
    window.removeEventListener('video-call-cancelled', this.handleBrowserCallCancelled);
    socketService.off('video-call:incoming', this.handleGlobalIncomingCall);
    socketService.off('video-call:cancelled', this.handleGlobalCallCancelled);
    socketService.off('video-call:group-missed', this.handleGroupMissedNotification);
  },
  methods: {
    setupVideoCallListener() {
      console.log('🌐 [ChatPopupsManager] Setting up global video call listener');
      console.log('🌐 [ChatPopupsManager] Socket connected:', socketService.getConnectionStatus());
      
      // Remove existing listener first to avoid duplicates
      socketService.off('video-call:incoming', this.handleGlobalIncomingCall);
      socketService.off('video-call:cancelled', this.handleGlobalCallCancelled);
      socketService.off('video-call:group-missed', this.handleGroupMissedNotification);
      
      // Setup new listener
      socketService.on('video-call:incoming', this.handleGlobalIncomingCall);
      socketService.on('video-call:cancelled', this.handleGlobalCallCancelled);
      socketService.on('video-call:group-missed', this.handleGroupMissedNotification);
      
      console.log('✅ [ChatPopupsManager] Video call listeners registered');
    },
    
    async handleOpenChatPopup({ recipientId, recipientName, recipientAvatar, conversationId }) {
      try {
        // ❌ NGHIÊM CẤM: Không bao giờ mở ChatPopup khi đang ở trang Messages
        if (this.$route && this.$route.path === '/messages') {
          console.log('🚫 [ChatPopupsManager] Cannot open chat popup in Messages page - BLOCKED');
          return;
        }
        
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
            // Reload conversations from store so we get the same formatted object
            // that other code paths (and openChat replacement logic) expect.
            await this.$store.dispatch('loadConversations');

            // Try to find the formatted conversation in the store by participant id
            const formattedConv = (this.$store.getters.sortedConversations || []).find(conv => {
              return !conv.isGroup && conv.participant && String(conv.participant._id) === String(recipientId);
            });

            if (formattedConv) {
              console.log('✅ Found formatted conversation in store, opening:', formattedConv._id);
              // openChat will replace the temp popup by matching participant._id
              this.openChat(formattedConv);
            } else {
              // Fallback: if not found, open raw response (still better than nothing)
              console.warn('⚠️ Formatted conversation not found in store, falling back to raw response');
              this.openChat(response.data);
            }
          }
        }
      } catch (error) {
        console.error('❌ Error opening chat popup:', error);
        // Xóa temp conversation nếu lỗi
        this.openChats = this.openChats.filter(c => !c._id.startsWith('temp_'));
      }
    },
    
    openChat(conversation) {
      // ❌ NGHIÊM CẤM: Không bao giờ mở ChatPopup khi đang ở trang Messages
      if (this.$route && this.$route.path === '/messages') {
        console.log('🚫 [ChatPopupsManager.openChat] Cannot open chat popup in Messages page - BLOCKED');
        return;
      }
      
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
      
      // Use avatar URL directly
      const formattedAvatar = callerAvatar || 'https://via.placeholder.com/100';
      
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
    
    handleGroupMissedNotification(data) {
      console.log('📢📢📢 [ChatPopupsManager] ===== GROUP MISSED NOTIFICATION RECEIVED =====');
      console.log('📢 [ChatPopupsManager] Data:', JSON.stringify(data));
      console.log('📢 [ChatPopupsManager] Timestamp:', new Date().toISOString());
      
      const { callerName, duration, joinedCount, conversationId } = data;
      
      // DEBUG: Show alert to verify event is received
      alert(`🔔 Bạn đã bỏ lỡ cuộc gọi nhóm từ ${callerName}\nThời lượng: ${duration}\n${joinedCount} người đã tham gia`);
      
      // Show toast notification (không lưu vào message history)
      if (this.$store && this.$store.dispatch) {
        this.$store.dispatch('addNewNotification', {
          type: 'video_call_missed',
          fromUser: {
            displayName: callerName
          },
          content: `Bạn đã bỏ lỡ cuộc gọi nhóm từ ${callerName}`,
          metadata: {
            duration: duration,
            joinedCount: joinedCount,
            conversationId: conversationId
          },
          createdAt: new Date()
        });
        console.log('✅ [ChatPopupsManager] Notification dispatched to store');
      } else {
        console.error('❌ [ChatPopupsManager] Store not available!');
      }
      
      console.log('✅ [ChatPopupsManager] Group missed notification shown');
    },
    
    handleBrowserCallCancelled(event) {
      console.log('🟣🟣🟣 [ChatPopupsManager] BROWSER EVENT HANDLER TRIGGERED');
      console.log('🟣 [ChatPopupsManager] Event detail:', event.detail);
      // Call the main handler
      this.handleGlobalCallCancelled(event.detail);
    },
    
    handleGlobalCallCancelled(data) {
      console.log('❌❌❌ [ChatPopupsManager] ===== CALL CANCELLED HANDLER TRIGGERED =====');
      console.log('❌ [ChatPopupsManager] Timestamp:', new Date().toISOString());
      console.log('❌ [ChatPopupsManager] Event data:', JSON.stringify(data));
      console.log('❌ [ChatPopupsManager] Handler function:', this.handleGlobalCallCancelled.name);
      
      const conversationId = data?.conversationId || data;
      console.log('❌ [ChatPopupsManager] Call cancelled for conversation:', conversationId);
      console.log('🔍 [ChatPopupsManager] Current incomingCall:', JSON.stringify(this.incomingCall));
      console.log('🔍 [ChatPopupsManager] Modal ref exists:', !!this.$refs.incomingCallModal);
      console.log('🔍 [ChatPopupsManager] Modal ref:', this.$refs.incomingCallModal);
      console.log('🔍 [ChatPopupsManager] Component ready:', this.isComponentReady);
      
      // If incoming call modal is showing for this conversation, hide it
      if (this.incomingCall.conversationId === conversationId) {
        console.log('🔕 [ChatPopupsManager] Hiding IncomingCallModal - call was cancelled');
        if (this.$refs.incomingCallModal) {
          this.$refs.incomingCallModal.hide();
          console.log('✅ [ChatPopupsManager] Modal.hide() called successfully');
        } else {
          console.error('❌ [ChatPopupsManager] Modal ref not found!');
        }
        // Clear incoming call data
        this.incomingCall = {
          conversationId: null,
          callerId: null,
          callerName: '',
          callerAvatar: '',
          isGroupCall: false
        };
        console.log('✅ [ChatPopupsManager] Incoming call data cleared');
      } else {
        console.log('⏭️ [ChatPopupsManager] Not hiding - conversationId mismatch:', {
          received: conversationId,
          current: this.incomingCall.conversationId
        });
      }
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
      
      // Emit accept to backend - backend sẽ notify caller
      socketService.emit('video-call:accept', { conversationId, callerId });
      
      // ✅ CHECK: Xem user đang ở trang Message hay không
      const isOnMessagesPage = this.$route && this.$route.path === '/messages';
      console.log('📍 [ChatPopupsManager] User location:', isOnMessagesPage ? 'Messages page' : 'Other page');
      
      if (isOnMessagesPage) {
        // ✅ Trường hợp 1: Đang ở trang Message.vue
        console.log('📞 [ChatPopupsManager] On Messages page - delegating to Message.vue');
        
        // Emit event để Message.vue xử lý
        eventBus.$emit('accept-incoming-call-in-message', { conversationId, callerId });
        
        // Hoặc dùng router để truyền info
        this.$router.push({
          path: '/messages',
          query: { 
            acceptCall: conversationId,
            callerId: callerId
          }
        });
      } else {
        // ✅ Trường hợp 2: Đang ở trang khác → Dùng ChatPopup
        console.log('📞 [ChatPopupsManager] Not on Messages page - using ChatPopup');
        
        // Mở popup nếu chưa có (đảm bảo có popup để start video call)
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
              console.log('📹 [ChatPopupsManager] Receiver joining video call via ChatPopup');
              
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
      }
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
