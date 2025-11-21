<template>
  <Teleport to="body">
    <div v-if="isVisible" class="video-call-modal">
      <!-- Modal Header -->
      <div class="video-call-header">
        <div class="call-info">
          <h3>{{ callTitle }}</h3>
          <span class="call-duration">{{ formattedDuration }}</span>
        </div>
        <div class="header-actions">
          <button @click="toggleCamera" class="control-btn" :class="{ disabled: !isCameraOn }">
            <i class="material-icons">{{ isCameraOn ? 'videocam' : 'videocam_off' }}</i>
          </button>
          <button @click="toggleMic" class="control-btn" :class="{ disabled: !isMicOn }">
            <i class="material-icons">{{ isMicOn ? 'mic' : 'mic_off' }}</i>
          </button>
          <button @click="toggleScreenShare" class="control-btn" :class="{ active: isScreenSharing }">
            <i class="material-icons">{{ isScreenSharing ? 'stop_screen_share' : 'screen_share' }}</i>
          </button>
          <button @click="endCall()" class="control-btn end-call">
            <i class="material-icons">call_end</i>
          </button>
        </div>
      </div>

      <!-- Video Grid -->
      <div class="video-grid" :class="{ 'group-call': isGroupCall || remotePeers.length > 1 }">
        <!-- Remote Videos (Main) - người đối diện -->
        <div 
          v-for="peer in remotePeers" 
          :key="peer.userId"
          class="video-container remote-video"
          :class="{ 'main-video': !isGroupCall && remotePeers.length === 1 }"
        >
          <video :ref="`remoteVideo-${peer.userId}`" autoplay playsinline></video>
          <div class="video-overlay">
            <span class="user-name">{{ peer.userName }} {{ peer.isMicOn ? '' : '🔇' }}</span>
          </div>
        </div>

        <!-- Screen Share Video -->
        <div v-if="screenShareStream" class="video-container screen-share">
          <video ref="screenShareVideo" autoplay playsinline></video>
          <div class="video-overlay">
            <span class="user-name">Chia sẻ màn hình</span>
          </div>
        </div>

        <!-- Local Video (Picture-in-Picture) - video của chính mình -->
        <div class="video-container local-video pip-video" v-show="isCameraOn || localStream">
          <video ref="localVideo" autoplay muted playsinline></video>
          <div class="video-overlay">
            <span class="user-name">Bạn {{ isMicOn ? '' : '🔇' }}</span>
          </div>
        </div>
      </div>

      <!-- Participants List -->
      <div class="participants-panel" v-if="showParticipants">
        <h4>Người tham gia ({{ remotePeers.length + 1 }})</h4>
        <div class="participant-list">
          <div class="participant-item">
            <i class="material-icons">person</i>
            <span>Bạn (Host)</span>
          </div>
          <div v-for="peer in remotePeers" :key="peer.userId" class="participant-item">
            <i class="material-icons">person</i>
            <span>{{ peer.userName }}</span>
          </div>
        </div>
      </div>

      <!-- Floating Controls -->
      <div class="floating-controls">
        <button @click="showParticipants = !showParticipants" class="control-btn">
          <i class="material-icons">people</i>
          <span class="badge">{{ remotePeers.length + 1 }}</span>
        </button>
        <button @click="toggleChat" class="control-btn">
          <i class="material-icons">chat</i>
        </button>
        <button @click="toggleFullscreen" class="control-btn">
          <i class="material-icons">{{ isFullscreen ? 'fullscreen_exit' : 'fullscreen' }}</i>
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script>
import socketService from '@/services/socketService';

export default {
  name: 'VideoCallModal',
  emits: ['callEnded'],
  props: {
    conversationId: {
      type: String,
      required: true
    },
    participants: {
      type: Array,
      default: () => []
    },
    isGroupCall: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      isVisible: false,
      localStream: null,
      screenShareStream: null,
      remotePeers: [], // [{ userId, userName, peerConnection, stream, isMicOn }]
      peerConnections: new Map(),
      isCameraOn: true,
      isMicOn: true,
      isScreenSharing: false,
      showParticipants: false,
      isFullscreen: false,
      callStartTime: null,
      callDuration: 0,
      durationInterval: null,
      isCaller: false, // Track if this user is the caller
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        // Free TURN server for NAT traversal
        {
          urls: 'turn:openrelay.metered.ca:80',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: 'turn:openrelay.metered.ca:443',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: 'turn:openrelay.metered.ca:443?transport=tcp',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        }
      ]
    };
  },
  computed: {
    callTitle() {
      if (this.isGroupCall) {
        return `Cuộc gọi nhóm (${this.remotePeers.length + 1} người)`;
      }
      return this.remotePeers.length > 0 ? this.remotePeers[0].userName : 'Đang kết nối...';
    },
    formattedDuration() {
      const minutes = Math.floor(this.callDuration / 60);
      const seconds = this.callDuration % 60;
      return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    },
    gridClass() {
      const totalVideos = this.remotePeers.length + 1 + (this.isScreenSharing ? 1 : 0);
      if (totalVideos === 1) return 'grid-1';
      if (totalVideos === 2) return 'grid-2';
      if (totalVideos <= 4) return 'grid-4';
      if (totalVideos <= 6) return 'grid-6';
      return 'grid-9';
    }
  },
  methods: {
    async startCall() {
      try {
        this.isVisible = true;
        this.isCaller = true; // Mark as caller
        this.callStartTime = Date.now();
        this.startDurationTimer();

        console.log('🎥 Starting video call...');
        console.log('Conversation ID:', this.conversationId);
        console.log('Participants:', this.participants);

        // Get local media stream with better error handling
        try {
          this.localStream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 }
            },
            audio: {
              echoCancellation: true,
              noiseSuppression: true
            }
          });

          console.log('✅ Got local media stream');

          if (this.$refs.localVideo) {
            this.$refs.localVideo.srcObject = this.localStream;
          }
        } catch (mediaError) {
          console.error('❌ Media error:', mediaError);
          // Try audio only if video fails
          try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
              audio: true
            });
            this.isCameraOn = false;
            console.log('✅ Got audio-only stream');
          } catch (audioError) {
            console.error('❌ Cannot get media:', audioError);
            this.endCall();
            return;
          }
        }

        // Setup Socket.io listeners FIRST
        this.setupSocketListeners();

        console.log('📞 [Caller] Emitting video-call:start');

        // Emit call start to server (REMOVED - already done by ChatPopup)
        // The ChatPopup already emitted video-call:start, no need to do it again
        
        // Join the call room so we can receive user-joined events
        console.log('🚪 [Caller] Joining call room');
        socketService.emit('video-call:join', {
          conversationId: this.conversationId
        });

        console.log('✅ [Caller] Call started and joined room successfully');

      } catch (error) {
        console.error('❌ Error starting call:', error);
        this.endCall();
      }
    },

    // Method for receiver to join existing call
    async joinCall() {
      try {
        console.log('🎥 [Receiver] joinCall() method called');
        console.log('🎥 [Receiver] conversationId:', this.conversationId);
        console.log('🎥 [Receiver] participants:', this.participants);
        
        this.isVisible = true;
        this.isCaller = false; // Mark as receiver
        this.callStartTime = Date.now();
        this.startDurationTimer();

        console.log('🎥 [Receiver] Joining video call...');
        console.log('Conversation ID:', this.conversationId);

        // Get local media stream
        try {
          this.localStream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 }
            },
            audio: {
              echoCancellation: true,
              noiseSuppression: true
            }
          });

          console.log('✅ [Receiver] Got local media stream');
          console.log('✅ [Receiver] Stream tracks:', this.localStream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled })));

          if (this.$refs.localVideo) {
            this.$refs.localVideo.srcObject = this.localStream;
            console.log('✅ [Receiver] Local video srcObject set');
          } else {
            console.warn('⚠️ [Receiver] localVideo ref not found');
          }
        } catch (mediaError) {
          console.error('❌ Media error:', mediaError);
          // Try audio only
          try {
            this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.isCameraOn = false;
            console.log('✅ [Receiver] Got audio-only stream');
          } catch (audioError) {
            console.error('❌ Cannot get media:', audioError);
            this.endCall();
            return;
          }
        }

        // Setup Socket listeners
        this.setupSocketListeners();

        // Emit join to notify others
        console.log('📡 [Receiver] Emitting video-call:join');
        socketService.emit('video-call:join', {
          conversationId: this.conversationId
        });

        console.log('✅ [Receiver] Joined call successfully');

      } catch (error) {
        console.error('❌ Error joining call:', error);
        this.endCall();
      }
    },

    setupSocketListeners() {
      const role = this.isCaller ? 'Caller' : 'Receiver';
      console.log(`🎧 [${role}] Setting up video call socket listeners`);

      // User joined call
      socketService.on('video-call:user-joined', async ({ userId, userName }) => {
        console.log(`👤 [${role}] User joined:`, userId, userName);
        console.log(`👤 [${role}] Current remotePeers count:`, this.remotePeers.length);
        console.log(`👤 [${role}] Current user ID:`, this.$store.state.user?._id);
        
        // Determine who should initiate based on user ID comparison
        // The user with smaller ID (lexicographically) initiates
        const currentUserId = this.$store.state.user?._id;
        const shouldInitiate = currentUserId < userId;
        
        console.log(`👤 [${role}] Should I initiate with ${userId}? ${shouldInitiate}`);
        await this.createPeerConnection(userId, userName, shouldInitiate);
      });

      // Receive offer
      socketService.on('video-call:offer', async ({ from, offer, userName }) => {
        console.log('📩 Received offer from:', from, userName);
        await this.handleOffer(from, userName, offer);
      });

      // Receive answer
      socketService.on('video-call:answer', async ({ from, answer }) => {
        console.log('📩 Received answer from:', from);
        const pc = this.peerConnections.get(from);
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
      });

      // Receive ICE candidate
      socketService.on('video-call:ice-candidate', async ({ from, candidate }) => {
        const pc = this.peerConnections.get(from);
        if (pc && candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      });

      // User rejected call (for group calls)
      socketService.on('video-call:rejected', ({ userId, userName }) => {
        console.log('👎 User rejected call:', userId, userName);
        // In group call, someone rejected but call continues
        // Just show a notification (optional) but don't end call
        // The participant count will be correct since they never joined remotePeers
      });

      // User left call
      socketService.on('video-call:user-left', ({ userId }) => {
        console.log('User left:', userId);
        this.removePeer(userId);
        
        // If I'm the caller, create end call message
        if (this.isCaller && this.remotePeers.length === 0) {
          console.log('📞 [Caller] Other user left, ending call and creating message');
          this.endCall(true); // true = create system message
        } else if (!this.isCaller && this.remotePeers.length === 0) {
          console.log('📞 [Receiver] Caller left, just ending call');
          this.endCall(false); // false = don't create message
        }
      });

      // Call ended
      socketService.on('video-call:ended', () => {
        this.endCall();
      });

      // Mic/Camera toggle
      socketService.on('video-call:toggle-media', ({ userId, type, enabled }) => {
        const peer = this.remotePeers.find(p => p.userId === userId);
        if (peer) {
          if (type === 'mic') peer.isMicOn = enabled;
          if (type === 'camera') peer.isCameraOn = enabled;
        }
      });
    },

    async createPeerConnection(userId, userName, isInitiator) {
      const role = this.isCaller ? 'Caller' : 'Receiver';
      console.log(`🔗 [${role}] Creating peer connection for:`, userId, userName, 'isInitiator:', isInitiator);
      
      // Check if peer connection already exists
      if (this.peerConnections.has(userId)) {
        console.log(`⚠️ [${role}] Peer connection already exists for ${userId}, skipping`);
        return;
      }
      
      // Check if peer already in remotePeers
      const existingPeer = this.remotePeers.find(p => p.userId === userId);
      if (existingPeer) {
        console.log(`⚠️ [${role}] Peer ${userId} already in remotePeers, skipping`);
        return;
      }
      
      const pc = new RTCPeerConnection({ iceServers: this.iceServers });
      this.peerConnections.set(userId, pc);

      // Add local tracks
      if (!this.localStream) {
        console.error(`❌ [${role}] No local stream available!`);
        return;
      }
      
      this.localStream.getTracks().forEach(track => {
        console.log(`➕ [${role}] Adding track:`, track.kind, track.enabled);
        pc.addTrack(track, this.localStream);
      });

      // Handle remote stream with detailed logging
      pc.ontrack = (event) => {
        console.log(`🎬 [${role}] Received remote track from ${userId}:`, {
          kind: event.track.kind,
          enabled: event.track.enabled,
          muted: event.track.muted,
          readyState: event.track.readyState,
          streams: event.streams.length
        });
        
        const peer = this.remotePeers.find(p => p.userId === userId);
        if (peer) {
          peer.stream = event.streams[0];
          console.log(`✅ [${role}] Set stream for peer ${userId}`);
          
          this.$nextTick(() => {
            const videoElement = this.$refs[`remoteVideo-${userId}`];
            if (videoElement && videoElement[0]) {
              videoElement[0].srcObject = event.streams[0];
              console.log(`✅ [${role}] Remote video element updated for ${userId}`);
              
              // Log when video starts playing
              videoElement[0].onloadedmetadata = () => {
                console.log(`📺 [${role}] Remote video metadata loaded for ${userId}`);
              };
              videoElement[0].onplay = () => {
                console.log(`▶️ [${role}] Remote video playing for ${userId}`);
              };
            } else {
              console.error(`❌ [${role}] Video element not found for ${userId}`);
            }
          });
        } else {
          console.error(`❌ [${role}] Peer not found in remotePeers: ${userId}`);
        }
      };

      // Handle ICE candidates with detailed logging
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log(`🧊 [${role}] ICE candidate for ${userId}:`, {
            type: event.candidate.type,
            protocol: event.candidate.protocol,
            address: event.candidate.address,
            port: event.candidate.port,
            relatedAddress: event.candidate.relatedAddress
          });
          socketService.emit('video-call:ice-candidate', {
            to: userId,
            candidate: event.candidate,
            conversationId: this.conversationId
          });
        } else {
          console.log(`🧊 [${role}] ICE gathering complete for ${userId}`);
        }
      };
      
      // Monitor connection state
      pc.onconnectionstatechange = () => {
        console.log(`🔌 [${role}] Connection state for ${userId}:`, pc.connectionState);
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          console.error(`❌ [${role}] Connection ${pc.connectionState} for ${userId}`);
        }
      };
      
      // Monitor ICE connection state
      pc.oniceconnectionstatechange = () => {
        console.log(`❄️ [${role}] ICE connection state for ${userId}:`, pc.iceConnectionState);
      };

      // Add to remote peers
      this.remotePeers.push({
        userId,
        userName,
        peerConnection: pc,
        stream: null,
        isMicOn: true,
        isCameraOn: true
      });
      
      console.log(`✅ [${role}] Added to remotePeers. Total participants: ${this.remotePeers.length + 1}`);

      // If initiator, create and send offer
      if (isInitiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socketService.emit('video-call:offer', {
          to: userId,
          offer,
          conversationId: this.conversationId
        });
      }
    },

    async handleOffer(userId, userName, offer) {
      await this.createPeerConnection(userId, userName, false);
      const pc = this.peerConnections.get(userId);
      
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        socketService.emit('video-call:answer', {
          to: userId,
          answer,
          conversationId: this.conversationId
        });
      }
    },

    removePeer(userId) {
      const pc = this.peerConnections.get(userId);
      if (pc) {
        pc.close();
        this.peerConnections.delete(userId);
      }
      this.remotePeers = this.remotePeers.filter(p => p.userId !== userId);
    },

    toggleCamera() {
      if (this.localStream) {
        this.isCameraOn = !this.isCameraOn;
        const videoTrack = this.localStream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.enabled = this.isCameraOn;
        }
        socketService.emit('video-call:toggle-media', {
          conversationId: this.conversationId,
          type: 'camera',
          enabled: this.isCameraOn
        });
      }
    },

    toggleMic() {
      if (this.localStream) {
        this.isMicOn = !this.isMicOn;
        const audioTrack = this.localStream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = this.isMicOn;
        }
        socketService.emit('video-call:toggle-media', {
          conversationId: this.conversationId,
          type: 'mic',
          enabled: this.isMicOn
        });
      }
    },

    async toggleScreenShare() {
      if (!this.isScreenSharing) {
        try {
          this.screenShareStream = await navigator.mediaDevices.getDisplayMedia({
            video: { cursor: 'always' },
            audio: false
          });

          if (this.$refs.screenShareVideo) {
            this.$refs.screenShareVideo.srcObject = this.screenShareStream;
          }

          // Replace video track in all peer connections
          const screenTrack = this.screenShareStream.getVideoTracks()[0];
          this.peerConnections.forEach((pc) => {
            const sender = pc.getSenders().find(s => s.track?.kind === 'video');
            if (sender) {
              sender.replaceTrack(screenTrack);
            }
          });

          // Handle screen share stop
          screenTrack.onended = () => {
            this.stopScreenShare();
          };

          this.isScreenSharing = true;
        } catch (error) {
          console.error('Error sharing screen:', error);
        }
      } else {
        this.stopScreenShare();
      }
    },

    stopScreenShare() {
      if (this.screenShareStream) {
        this.screenShareStream.getTracks().forEach(track => track.stop());
        this.screenShareStream = null;
      }

      // Restore camera track
      if (this.localStream) {
        const cameraTrack = this.localStream.getVideoTracks()[0];
        this.peerConnections.forEach((pc) => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(cameraTrack);
          }
        });
      }

      this.isScreenSharing = false;
    },

    toggleChat() {
      this.$emit('toggle-chat');
    },

    toggleFullscreen() {
      if (!this.isFullscreen) {
        document.documentElement.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
      this.isFullscreen = !this.isFullscreen;
    },

    startDurationTimer() {
      this.durationInterval = setInterval(() => {
        this.callDuration = Math.floor((Date.now() - this.callStartTime) / 1000);
      }, 1000);
    },

    endCall(forceCreateMessage = false) {
      const duration = this.callDuration;
      // Trong group call: người cuối cùng rời (remotePeers = 0) HOẶC khi còn <=1 người thì tạo message
      // Trong 1-1 call: chỉ caller tạo message
      const isLastOrSecondLastInGroupCall = this.isGroupCall && this.remotePeers.length <= 1;
      const shouldCreateMessage = forceCreateMessage || this.isCaller || isLastOrSecondLastInGroupCall;
      
      console.log(`📞 Ending call - isCaller: ${this.isCaller}, isGroupCall: ${this.isGroupCall}, remotePeers: ${this.remotePeers.length}, shouldCreateMessage: ${shouldCreateMessage}, duration: ${duration}s`);
      
      // Stop duration timer
      if (this.durationInterval) {
        clearInterval(this.durationInterval);
      }

      // Stop local stream
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
        this.localStream = null;
      }

      // Stop screen share
      this.stopScreenShare();

      // Close all peer connections
      this.peerConnections.forEach((pc) => {
        pc.close();
      });
      this.peerConnections.clear();

      // Emit call end with duration and flag (only caller creates message)
      socketService.emit('video-call:end', {
        conversationId: this.conversationId,
        duration: duration,
        createSystemMessage: shouldCreateMessage
      });

      // Remove socket listeners
      socketService.off('video-call:user-joined');
      socketService.off('video-call:offer');
      socketService.off('video-call:answer');
      socketService.off('video-call:ice-candidate');
      socketService.off('video-call:user-left');
      socketService.off('video-call:ended');
      socketService.off('video-call:toggle-media');

      // Reset state
      this.remotePeers = [];
      this.isVisible = false;
      this.callDuration = 0;
      this.isCaller = false;

      this.$emit('call-ended');
    }
  },
  beforeUnmount() {
    this.endCall();
  }
};
</script>

<style scoped>
.video-call-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #1c1e21;
  z-index: 9999;
  display: flex;
  flex-direction: column;
}

/* Header */
.video-call-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.call-info h3 {
  margin: 0;
  color: white;
  font-size: 1.125rem;
  font-weight: 600;
}

.call-duration {
  color: #b0b3b8;
  font-size: 0.875rem;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

/* Video Grid */
.video-grid {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1a1a1a;
  overflow: hidden;
}

/* Group call grid */
.video-grid.group-call {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 8px;
  padding: 8px;
}

.video-container {
  position: relative;
  background: #242526;
  border-radius: 12px;
  overflow: hidden;
  min-height: 200px;
}

.video-container video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Main video (người đối diện) - chiếm toàn màn hình */
.remote-video.main-video {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  border-radius: 0;
  min-height: unset;
}

/* Local video (PiP - Picture in Picture) - video của chính mình */
.local-video.pip-video {
  position: absolute;
  bottom: 80px;
  right: 20px;
  width: 240px;
  height: 180px;
  border: 3px solid #667eea;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  z-index: 10;
  border-radius: 12px;
  min-height: unset;
}

.local-video.pip-video video {
  transform: scaleX(-1); /* Mirror effect for local video */
}

.screen-share {
  grid-column: span 2;
  grid-row: span 2;
}

.video-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 0.75rem 1rem;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
}

.user-name {
  color: white;
  font-weight: 500;
  font-size: 0.875rem;
}

/* Controls */
.control-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
}

.control-btn.disabled {
  background: rgba(220, 38, 38, 0.2);
  color: #dc2626;
}

.control-btn.active {
  background: #667eea;
}

.control-btn.end-call {
  background: #dc2626;
}

.control-btn.end-call:hover {
  background: #b91c1c;
}

/* Floating Controls */
.floating-controls {
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 1rem;
  background: rgba(0, 0, 0, 0.8);
  padding: 1rem;
  border-radius: 50px;
  backdrop-filter: blur(10px);
}

.badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #dc2626;
  color: white;
  font-size: 0.625rem;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: 600;
}

/* Participants Panel */
.participants-panel {
  position: absolute;
  top: 5rem;
  right: 1rem;
  width: 280px;
  background: rgba(0, 0, 0, 0.9);
  border-radius: 12px;
  padding: 1rem;
  backdrop-filter: blur(10px);
}

.participants-panel h4 {
  margin: 0 0 1rem 0;
  color: white;
  font-size: 1rem;
}

.participant-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.participant-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: white;
  padding: 0.5rem;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
}

.participant-item i {
  font-size: 20px;
  color: #667eea;
}

/* Responsive */
@media (max-width: 768px) {
  .video-call-header {
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
  }

  .header-actions {
    width: 100%;
    justify-content: center;
  }

  .grid-4, .grid-6, .grid-9 {
    grid-template-columns: 1fr;
  }

  .screen-share {
    grid-column: span 1;
    grid-row: span 1;
  }

  .participants-panel {
    width: calc(100% - 2rem);
    right: 1rem;
    left: 1rem;
  }
}
</style>
