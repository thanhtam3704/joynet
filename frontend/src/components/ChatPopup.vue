<template>
  <div>
    <div class="chat-popup" v-if="isVisible" :class="{ 'minimized': isMinimized }" v-bind="$attrs">
    <div class="chat-header" @click="toggleMinimize">
      <div class="chat-user-info">
        <!-- Group Chat Avatar -->
        <div v-if="conversation?.isGroup" class="chat-avatar group-avatar-wrapper">
          <i class="material-icons">groups</i>
        </div>
        
        <!-- 1-1 Chat Avatar -->
        <template v-else>
          <img 
            v-if="conversation?.participant?.profilePicture" 
            :src="`http://localhost:3000/uploads/user/${conversation.participant.profilePicture}`"
            alt="Avatar"
            class="chat-avatar"
          />
          <img 
            v-else 
            src="@/assets/defaultProfile.png" 
            alt="Avatar"
            class="chat-avatar"
          />
        </template>
        
        <div class="chat-user-details">
          <!-- Group Name -->
          <span v-if="conversation?.isGroup" class="chat-user-name">
            <i class="material-icons group-icon-inline">groups</i>
            {{ conversation.groupName }}
          </span>
          <!-- User Name - Clickable -->
          <span 
            v-else 
            class="chat-user-name clickable-name" 
            @click.stop="goToProfile"
            title="Xem trang cá nhân"
          >
            {{ conversation?.participant?.displayName || conversation?.participant?.email || 'Người dùng' }}
          </span>
          
          <!-- Group Members Count -->
          <span v-if="conversation?.isGroup" class="chat-online-status">
            {{ conversation.participants?.length || 0 }} thành viên
          </span>
          <!-- User Online Status -->
          <span v-else class="chat-online-status" v-show="conversation?.participant?.isOnline">
            Đang hoạt động
          </span>
        </div>
      </div>
      <div class="chat-actions">
        <!-- Video Call Button -->
        <i 
          class="material-icons action-btn video-call-btn" 
          @click.stop="startVideoCall"
          title="Gọi video"
        >
          videocam
        </i>
        
        <!-- Group Members Button -->
        <i 
          v-if="conversation?.isGroup" 
          class="material-icons action-btn" 
          @click.stop="showGroupMembers"
          title="Thành viên nhóm"
        >
          people
        </i>
        
        <i class="material-icons action-btn" @click.stop="toggleMinimize">
          {{ isMinimized ? 'expand_less' : 'remove' }}
        </i>
        <i class="material-icons action-btn" @click.stop="closeChat">close</i>
      </div>
    </div>

    <div class="chat-body" v-show="!isMinimized">
      <div class="chat-messages" ref="messagesContainer">
        <div v-if="loading" class="chat-loading">
          <div class="loading-spinner"></div>
          <span>Đang tải tin nhắn...</span>
        </div>
        
        <div v-else-if="messages.length === 0" class="empty-chat">
          <div class="empty-icon">💬</div>
          <p>Chưa có tin nhắn nào</p>
          <p class="empty-hint">Gửi tin nhắn đầu tiên!</p>
        </div>

        <div v-else class="messages-list">
          <div 
            v-for="message in messages" 
            :key="message._id"
            class="message-wrapper"
            :class="{ 'own-message': isOwnMessage(message) }"
          >
            <img 
              v-if="!isOwnMessage(message) && message.sender.profilePicture"
              :src="`http://localhost:3000/uploads/user/${message.sender.profilePicture}`"
              class="message-avatar"
            />
            <img 
              v-else-if="!isOwnMessage(message)"
              src="@/assets/defaultProfile.png"
              class="message-avatar"
            />
            
            <div class="message-with-reactions">
              <div 
                class="message-bubble" 
                :class="{ 'own-bubble': isOwnMessage(message) }"
                @mousedown="startLongPress($event, message)"
                @mouseup="cancelLongPress"
                @mouseleave="cancelLongPress"
                @touchstart="startLongPress($event, message)"
                @touchend="cancelLongPress"
              >
                <!-- More Options Button -->
                <button 
                  v-if="isOwnMessage(message)" 
                  class="message-more-btn"
                  @click.stop.prevent="showContextMenu($event, message)"
                >
                  <i class="material-icons">more_horiz</i>
                </button>

                <div v-if="message.messageType === 'image'" class="message-image">
                  <img :src="`http://localhost:3000/uploads/${message.file}`" alt="Image" />
                </div>
                <div v-else-if="message.messageType === 'file'" class="message-file" @click="downloadFile(message)">
                  <i class="material-icons">attach_file</i>
                  <span>{{ message.originalFileName || message.file }}</span>
                  <i class="material-icons download-icon">download</i>
                </div>
                <p v-else class="message-text">{{ message.content }}</p>
                <span class="message-time">{{ formatTime(message.createdAt) }}</span>
              </div>
              
              <!-- Message Reactions Summary - BÊN NGOÀI BUBBLE -->
              <MessageReactionsSummary 
                :reactions="getMessageReactions(message)"
                @show-reactors="showMessageReactors(message)"
              />
            </div>
          </div>
          <!-- Anchor element để scroll tới -->
          <div ref="messagesEnd"></div>
        </div>
      </div>

      <div class="chat-input">
        <div class="plus-menu-wrapper">
          <i class="material-icons plus-icon" @click.stop="toggleAttachMenu">add_circle</i>
          
          <!-- Attach Menu -->
          <div v-if="showAttachMenu" class="attach-menu" @click.stop>
            <div class="attach-menu-item" @click="triggerImageInput">
              <i class="material-icons">image</i>
              <span>Ảnh</span>
            </div>
            <div class="attach-menu-item" @click="triggerFileInput">
              <i class="material-icons">attach_file</i>
              <span>File</span>
            </div>
          </div>
          
          <input 
            type="file" 
            ref="fileInput" 
            accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx"
            style="display: none" 
            @change="handleFileSelect"
          />
          <input 
            type="file" 
            ref="imageInput" 
            accept="image/*" 
            style="display: none" 
            @change="handleImageSelect"
          />
        </div>
        
        <input 
          type="text" 
          v-model="messageInput" 
          placeholder="Aa"
          @keydown.enter="sendMessage"
          class="message-input"
          ref="chatInput"
        />
        
        <i class="material-icons emoji-icon" @click.stop="toggleEmojiPicker">sentiment_satisfied_alt</i>
        <i class="material-icons send-icon" @click="sendMessage" :class="{ 'active': messageInput.trim() }">
          send
        </i>
      </div>
    </div>
    
    <!-- Emoji Picker Modal -->
    <div v-if="showEmojiPicker" class="emoji-picker-overlay" @click="closeEmojiPicker">
      <div class="emoji-picker-container" @click.stop>
        <div class="emoji-picker-search">
          <i class="material-icons">search</i>
          <input 
            v-model="emojiSearch" 
            type="text" 
            placeholder="Tìm kiếm biểu tượng cảm xúc"
            @input="filterEmojis"
          />
        </div>
        
        <div class="emoji-categories">
          <button 
            v-for="cat in categories" 
            :key="cat.id"
            :class="['category-btn', { active: activeCategory === cat.id }]"
            @click="selectCategory(cat.id)"
            :title="cat.name"
          >
            {{ cat.icon }}
          </button>
        </div>
        
        <div class="emoji-category-title">
          {{ getCurrentCategoryName() }}
        </div>
        
        <div class="emoji-grid-container">
          <button 
            v-for="emoji in filteredEmojis" 
            :key="emoji" 
            @click="insertEmoji(emoji)"
            class="emoji-item"
            type="button"
          >
            {{ emoji }}
          </button>
        </div>
      </div>
    </div>
    
    <!-- Reaction Picker -->
    <MessageReactionPicker 
      :show="showReactionPicker"
      :position="reactionPickerPosition"
      :selected-message="selectedMessage"
      :current-user-id="currentUserId"
      @select="handleReactionSelect"
    />
    
    <!-- Floating Emoji Animation -->
    <transition-group name="float" tag="div" class="floating-emojis">
      <div 
        v-for="emoji in floatingEmojis" 
        :key="emoji.id"
        class="floating-emoji"
        :style="{ left: emoji.x + 'px', top: emoji.y + 'px' }"
      >
        {{ emoji.emoji }}
      </div>
    </transition-group>
    
    <!-- Message Reactors Modal -->
    <MessageReactorsModal 
      :show="showReactorsModal"
      :reactions="selectedMessageForReactors ? getMessageReactions(selectedMessageForReactors) : []"
      @close="showReactorsModal = false"
    />

    <!-- Context Menu -->
    <div 
      v-if="showMessageMenu" 
      class="message-context-menu"
      :style="{ top: menuPosition.y + 'px', left: menuPosition.x + 'px' }"
      @click.stop
    >
      <div class="menu-item" @click="editMessage" v-if="canEdit(contextMessage)">
        <i class="material-icons">edit</i>
        <span>Sửa</span>
      </div>
      <div class="menu-item delete" @click="confirmDelete">
        <i class="material-icons">delete</i>
        <span>Xóa</span>
      </div>
    </div>

    <!-- Edit Message Modal -->
    <div v-if="showEditModal" class="edit-modal-overlay" @click="cancelEdit">
      <div class="edit-modal" @click.stop>
        <div class="edit-modal-header">
          <h3>Sửa tin nhắn</h3>
          <button @click="cancelEdit" class="close-btn">
            <i class="material-icons">close</i>
          </button>
        </div>
        <div class="edit-modal-body">
          <textarea 
            v-model="editingContent"
            placeholder="Nhập nội dung tin nhắn..."
            ref="editTextarea"
            @keydown.enter.ctrl="saveEdit"
          ></textarea>
        </div>
        <div class="edit-modal-footer">
          <button @click="cancelEdit" class="btn-cancel">Hủy</button>
          <button @click="saveEdit" class="btn-save" :disabled="!editingContent.trim()">Lưu</button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="edit-modal-overlay" @click="showDeleteModal = false">
      <div class="edit-modal delete-confirm-modal" @click.stop>
        <div class="edit-modal-header">
          <h3>Xác nhận xóa</h3>
          <button @click="showDeleteModal = false" class="close-btn">
            <i class="material-icons">close</i>
          </button>
        </div>
        <div class="edit-modal-body">
          <p>Bạn có chắc muốn xóa tin nhắn này?</p>
        </div>
        <div class="edit-modal-footer">
          <button @click="showDeleteModal = false" class="btn-cancel">Hủy</button>
          <button @click="deleteMessage" class="btn-delete">Xóa</button>
        </div>
      </div>
    </div>
    
    <!-- Group Members Modal -->
    <teleport to="body">
      <GroupMembersModal 
        v-if="showMembersModal && conversation?.isGroup"
        :conversation="conversation"
        :current-user-id="currentUserId"
        @close="showMembersModal = false"
        @conversation-refreshed="handleConversationRefreshed"
        @members-updated="handleMembersUpdated"
        @member-removed="handleMemberRemoved"
        @member-promoted="handleMemberPromoted"
        @left-group="handleLeftGroup"
      />
    </teleport>

    <!-- Calling Modal (waiting for answer) -->
    <CallingModal
      ref="callingModal"
      :recipientName="recipientName"
      :recipientAvatar="recipientAvatar"
      :is-group-call="conversation?.isGroup || false"
      @cancel="cancelCall"
    />

    <!-- Video Call Modal -->
    <VideoCallModal
      ref="videoCallModal"
      :conversationId="conversation?._id"
      :participants="conversation?.participants || []"
      :is-group-call="conversation?.isGroup || false"
      @call-ended="onCallEnded"
    />
  </div>
  </div>
</template>

<script>
import MessageAPI from '@/api/messages';
import socketService from '@/services/socketService';
import GroupMembersModal from './GroupMembersModal.vue';
import MessageReactionPicker from './MessageReactionPicker.vue';
import MessageReactionsSummary from './MessageReactionsSummary.vue';
import MessageReactorsModal from './MessageReactorsModal.vue';
import VideoCallModal from './VideoCallModal.vue';
import CallingModal from './CallingModal.vue';

export default {
  name: 'ChatPopup',
  inheritAttrs: false,
  components: {
    GroupMembersModal,
    MessageReactionPicker,
    MessageReactionsSummary,
    MessageReactorsModal,
    VideoCallModal,
    CallingModal,
    CallingModal
  },
  props: {
    conversation: {
      type: Object,
      required: true
    },
    isVisible: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
      isMinimized: false,
      messages: [],
      messageInput: '',
      loading: false,
      selectedFile: null,
      currentUserId: this.$store.state.user?._id,
      showMembersModal: false,
      showReactionPicker: false,
      reactionPickerPosition: { top: 0, left: 0 },
      selectedMessage: null,
      longPressTimer: null,
      longPressDuration: 500,
      floatingEmojis: [],
      lastEvent: null,
      showReactorsModal: false,
      selectedMessageForReactors: null,
      showMessageMenu: false,
      menuPosition: { x: 0, y: 0 },
      contextMessage: null,
      showEditModal: false,
      showDeleteModal: false,
      editingContent: '',
      editingMessageId: null,
      showEmojiPicker: false,
      showAttachMenu: false,
      emojiSearch: '',
      activeCategory: 'smileys',
      categories: [
        { id: 'smileys', name: 'Mặt cười và hình người', icon: '😀' },
        { id: 'animals', name: 'Động vật và thiên nhiên', icon: '🐻' },
        { id: 'food', name: 'Đồ ăn và đồ uống', icon: '🍔' },
        { id: 'activities', name: 'Hoạt động', icon: '⚽' },
        { id: 'travel', name: 'Du lịch và địa điểm', icon: '🚗' },
        { id: 'objects', name: 'Đồ vật', icon: '💡' },
        { id: 'symbols', name: 'Biểu tượng', icon: '❤️' },
        { id: 'flags', name: 'Cờ', icon: '🏳️' }
      ],
      emojiData: {
        smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '😶\u200d🌫️', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'],
        animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐕\u200d🦺', '🐈', '🐓', '🦃', '🦚', '🦜', '🦢', '🦩', '🕊️', '🐇', '🦝', '🦨', '🦡', '🦦', '🦥', '🐁', '🐀', '🐿️', '🦔'],
        food: ['🍇', '🍈', '🍉', '🍊', '🍋', '🍌', '🍍', '🥭', '🍎', '🍏', '🍐', '🍑', '🍒', '🍓', '🥝', '🍅', '🥥', '🥑', '🍆', '🥔', '🥕', '🌽', '🌶️', '🥒', '🥬', '🥦', '🧄', '🧅', '🍄', '🥜', '🌰', '🍞', '🥐', '🥖', '🥨', '🥯', '🥞', '🧇', '🧀', '🍖', '🍗', '🥩', '🥓', '🍔', '🍟', '🍕', '🌭', '🥪', '🌮', '🌯', '🥙', '🧆', '🥚', '🍳', '🥘', '🍲', '🥣', '🥗', '🍿', '🧈', '🧂', '🥫', '🍱', '🍘', '🍙', '🍚', '🍛', '🍜', '🍝', '🍠', '🍢', '🍣', '🍤', '🍥', '🥮', '🍡', '🥟', '🥠', '🥡', '🦀', '🦞', '🦐', '🦑', '🦪', '🍦', '🍧', '🍨', '🍩', '🍪', '🎂', '🍰', '🧁', '🥧', '🍫', '🍬', '🍭', '🍮', '🍯', '🍼', '🥛', '☕', '🍵', '🍶', '🍾', '🍷', '🍸', '🍹', '🍺', '🍻', '🥂', '🥃', '🥤', '🧃', '🧉', '🧊'],
        activities: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '🤺', '⛹️', '🤾', '🏌️', '🏇', '🧘', '🏊', '🤽', '🚣', '🧗', '🚴', '🚵', '🎪', '🎭', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🪕', '🎻', '🎲', '♟️', '🎯', '🎳', '🎮', '🎰', '🧩'],
        travel: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🚚', '🚛', '🚜', '🦯', '🦽', '🦼', '🛴', '🚲', '🛵', '🏍️', '🛺', '🚨', '🚔', '🚍', '🚘', '🚖', '🚡', '🚠', '🚟', '🚃', '🚋', '🚞', '🚝', '🚄', '🚅', '🚈', '🚂', '🚆', '🚇', '🚊', '🚉', '✈️', '🛫', '🛬', '🛩️', '💺', '🛰️', '🚀', '🛸', '🚁', '🛶', '⛵', '🚤', '🛥️', '🛳️', '⛴️', '🚢', '⚓', '⛽', '🚧', '🚦', '🚥', '🚏', '🗺️', '🗿', '🗽', '🗼', '🏰', '🏯', '🏟️', '🎡', '🎢', '🎠', '⛲', '⛱️', '🏖️', '🏝️', '🏜️', '🌋', '⛰️', '🏔️', '🗻', '🏕️', '⛺', '🏠', '🏡', '🏘️', '🏚️', '🏗️', '🏭', '🏢', '🏬', '🏣', '🏤', '🏥', '🏦', '🏨', '🏪', '🏫', '🏩', '💒', '🏛️', '⛪', '🕌', '🕍', '🛕', '🕋'],
        objects: ['⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭', '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋', '🔌', '💡', '🔦', '🕯️', '🪔', '🧯', '🛢️', '💸', '💵', '💴', '💶', '💷', '💰', '💳', '💎', '⚖️', '🧰', '🔧', '🔨', '⚒️', '🛠️', '⛏️', '🔩', '⚙️', '🧱', '⛓️', '🧲', '🔫', '💣', '🧨', '🪓', '🔪', '🗡️', '⚔️', '🛡️', '🚬', '⚰️', '⚱️', '🏺', '🔮', '📿', '🧿', '💈', '⚗️', '🔭', '🔬', '🕳️', '🩹', '🩺', '💊', '💉', '🩸', '🧬', '🦠', '🧫', '🧪', '🌡️', '🧹', '🧺', '🧻', '🚽', '🚰', '🚿', '🛁', '🛀', '🧼', '🪒', '🧽', '🧴', '🛎️', '🔑', '🗝️', '🚪', '🪑', '🛋️', '🛏️', '🛌', '🧸', '🖼️', '🛍️', '🛒', '🎁', '🎈', '🎏', '🎀', '🎊', '🎉', '🎎', '🏮', '🎐', '🧧', '✉️', '📩', '📨', '📧', '💌', '📥', '📤', '📦', '🏷️', '📪', '📫', '📬', '📭', '📮', '📯', '📜', '📃', '📄', '📑', '🧾', '📊', '📈', '📉', '🗒️', '🗓️', '📆', '📅', '🗑️', '📇', '🗃️', '🗳️', '🗄️', '📋', '📁', '📂', '🗂️', '🗞️', '📰', '📓', '📔', '📒', '📕', '📗', '📘', '📙', '📚', '📖', '🔖', '🧷', '🔗', '📎', '🖇️', '📐', '📏', '🧮', '📌', '📍', '✂️', '🖊️', '🖋️', '✒️', '🖌️', '🖍️', '📝', '✏️', '🔍', '🔎', '🔏', '🔐', '🔒', '🔓'],
        symbols: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗', '❕', '❓', '❔', '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯', '💹', '❇️', '✳️', '❎', '🌐', '💠', 'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿', '🅿️', '🈳', '🈂️', '🛂', '🛃', '🛄', '🛅', '🚹', '🚺', '🚼', '🚻', '🚮', '🎦', '📶', '🈁', '🔣', 'ℹ️', '🔤', '🔡', '🔠', '🆖', '🆗', '🆙', '🆒', '🆕', '🆓', '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', '🔢', '#️⃣', '*️⃣', '⏏️', '▶️', '⏸️', '⏯️', '⏹️', '⏺️', '⏭️', '⏮️', '⏩', '⏪', '⏫', '⏬', '◀️', '🔼', '🔽', '➡️', '⬅️', '⬆️', '⬇️', '↗️', '↘️', '↙️', '↖️', '↕️', '↔️', '↪️', '↩️', '⤴️', '⤵️', '🔀', '🔁', '🔂', '🔄', '🔃', '🎵', '🎶', '➕', '➖', '➗', '✖️', '♾️', '💲', '💱', '™️', '©️', '®️', '〰️', '➰', '➿', '🔚', '🔙', '🔛', '🔝', '🔜', '✔️', '☑️', '🔘', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '🔺', '🔻', '🔸', '🔹', '🔶', '🔷', '🔳', '🔲', '▪️', '▫️', '◾', '◽', '◼️', '◻️', '🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '⬛', '⬜', '🟫', '🔈', '🔇', '🔉', '🔊', '🔔', '🔕', '📣', '📢', '👁️\u200d🗨️', '💬', '💭', '🗯️', '♠️', '♣️', '♥️', '♦️', '🃏', '🎴', '🀄', '🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛', '🕜', '🕝', '🕞', '🕟', '🕠', '🕡', '🕢', '🕣', '🕤', '🕥', '🕦', '🕧'],
        flags: ['🏳️', '🏴', '🏴\u200d☠️', '🏁', '🚩', '🏳️\u200d🌈', '🏳️\u200d⚧️', '🇻🇳', '🇺🇸', '🇬🇧', '🇫🇷', '🇩🇪', '🇯🇵', '🇰🇷', '🇨🇳', '🇮🇹', '🇪🇸', '🇷🇺', '🇧🇷', '🇦🇺', '🇨🇦', '🇮🇳', '🇲🇽', '🇮🇩', '🇹🇭', '🇸🇬', '🇲🇾', '🇵🇭']
      }
    }
  },
  watch: {
    'conversation._id': {
      handler(newId, oldId) {
        // Leave old conversation
        if (oldId) {
          socketService.leaveConversation(oldId)
        }
        
        // Load and join new conversation
        if (newId) {
          this.loadMessages()
          socketService.joinConversation(newId)
        }
      },
      immediate: true
    },
    isMinimized(newVal) {
      // Khi mở rộng popup (từ minimized → expanded)
      if (!newVal) {
        this.markConversationAsRead()
        
        // Scroll xuống tin nhắn mới nhất khi mở popup
        this.$nextTick(() => {
          setTimeout(() => {
            this.scrollToBottom()
          }, 300)
        })
      }
    }
  },
  mounted() {
    console.log('🔵 [ChatPopup] Mounted for conversation:', this.conversation?._id);
    console.log('🔵 [ChatPopup] Setting up video call listener...');
    
    // Đợi một chút để đảm bảo socket đã connect
    this.$nextTick(() => {
      this.setupSocketListeners()
      
      console.log('✅ [ChatPopup] Socket listeners setup complete');
      
      // Scroll xuống tin nhắn mới nhất khi mở popup lần đầu - tăng delay lên 1s
      setTimeout(() => {
        console.log('🚀 [ChatPopup mounted] Triggering scroll to bottom');
        this.scrollToBottom()
      }, 1000)
      
      // Thử lại lần nữa để chắc chắn
      setTimeout(() => {
        console.log('🚀 [ChatPopup mounted] 2nd scroll attempt');
        this.scrollToBottom()
      }, 1500)
    })
    
    // Close menus on click outside
    document.addEventListener('click', this.handleClickOutside)
  },
  beforeUnmount() {
    console.log('🧹 ChatPopup unmounting, cleaning up')
    // Clean up socket listeners
    if (this.conversation?._id) {
      socketService.leaveConversation(this.conversation._id)
    }
    socketService.off('newMessage', this.handleNewMessage)
    socketService.off('messageReactionUpdated', this.handleReactionUpdate)
    // video-call:incoming is now handled globally in ChatPopupsManager
    
    // Remove click outside listener
    document.removeEventListener('click', this.handleClickOutside)
  },
  methods: {
    setupSocketListeners() {
      console.log('🎧 Setting up socket listeners for conversation:', this.conversation._id)
      
      // Kiểm tra socket đã connect chưa
      if (!socketService.getConnectionStatus()) {
        console.warn('⚠️ Socket not connected yet, attempting to connect...')
        socketService.connect()
        
        // Đợi socket connect xong rồi setup listener
        setTimeout(() => {
          if (socketService.getConnectionStatus()) {
            socketService.onNewMessage(this.handleNewMessage)
            socketService.onMessageReactionUpdated(this.handleReactionUpdate)
          } else {
            console.error('❌ Socket connection failed')
          }
        }, 1000)
      } else {
        // Socket đã connect, setup listener ngay
        socketService.onNewMessage(this.handleNewMessage)
        socketService.onMessageReactionUpdated(this.handleReactionUpdate)
        
        // Listen for messages read updates
        socketService.on('messagesRead', (data) => {
          if (data.conversationId === this.conversationId) {
            // Update readBy for all affected messages
            data.messages.forEach(updatedMsg => {
              const msgIndex = this.messages.findIndex(m => m._id === updatedMsg._id);
              if (msgIndex !== -1) {
                this.messages[msgIndex].readBy = updatedMsg.readBy;
              }
            });
          }
        });
      }
    },

    handleReactionUpdate(data) {
      console.log('👍 Reaction update received:', data)
      const { messageId, reactions, userId } = data
      
      console.log('🔍 [Frontend] Raw reactions from socket:', JSON.stringify(reactions, null, 2))
      
      // Find and update message
      const message = this.messages.find(m => m._id === messageId)
      if (message) {
        // Convert backend format to frontend format
        message.reactions = reactions.map(r => {
          const user = r.user || {}
          console.log('🔍 [Frontend] Processing user:', user)
          const userName = user.displayName || 
                          (user.email ? user.email.split('@')[0] : null) ||
                          'Unknown User'
          
          console.log('🔍 [Frontend] Mapped userName:', userName)
          
          return {
            userId: user._id || r.user,
            userName: userName,
            userAvatar: user.profilePicture || null,
            emoji: r.emoji
          }
        })
        
        console.log('🔍 [Frontend] Final message.reactions:', message.reactions)
        
        // Show floating emoji if someone else reacted
        if (userId && userId !== this.currentUserId) {
          const userReaction = reactions.find(r => 
            (r.user?._id || r.user) === userId
          )
          if (userReaction) {
            this.createFloatingEmoji(userReaction.emoji, null)
          }
        }
      }
    },

    handleNewMessage(data) {
      
      // Normalize data structure
      let message, conversationId
      
      // Preferred format: { conversationId: 'xxx', message: {...} }
      if (data.conversationId && data.message) {
        message = data.message
        conversationId = data.conversationId
      }
      // Legacy format: message sent directly (with conversation field)
      else if (data._id) {
        message = data
        conversationId = data.conversation || data.conversationId
      }
      // Invalid format
      else {
        console.error('❌ Invalid message data received:', data)
        return
      }
      
      // Validate message structure
      if (!message || !message._id) {
        console.error('❌ Invalid message structure:', message)
        return
      }
      
      // Chỉ xử lý tin nhắn thuộc conversation hiện tại
      if (conversationId !== this.conversation._id) {
        return
      }
      
      // Kiểm tra tin nhắn đã tồn tại chưa (tránh duplicate)
      const exists = this.messages.some(m => m && m._id === message._id)
      if (exists) {
        return
      }
      
      // Kiểm tra nếu đây là tin nhắn của chính mình (đã có từ optimistic update)
      const isSentByMe = message.sender?._id?.toString() === this.currentUserId?.toString()
      if (isSentByMe) {
        // Kiểm tra xem có tin nhắn temp nào không
        const tempIndex = this.messages.findIndex(m => m && m.isTemp)
        if (tempIndex !== -1) {
          // Thay tin nhắn temp bằng tin nhắn thật
          this.messages.splice(tempIndex, 1, message)
          
          // Scroll to bottom
          this.$nextTick(() => {
            this.scrollToBottom()
          })
          return
        }
      }

      
      // ✅ Đảm bảo message có sender đầy đủ (ưu tiên dữ liệu từ backend)
      console.log('📨 [ChatPopup] Received message with sender:', message.sender);
      
      if (!message.sender || typeof message.sender === 'string') {
        // Nếu sender là string hoặc không tồn tại, cần populate
        const currentUser = this.$store.state.user
        const senderId = typeof message.sender === 'string' ? message.sender : message.sender?._id
        
        // Tìm participant info từ conversation
        const participant = this.conversation.participant || 
                           this.conversation.participants?.find(p => p._id === senderId)
        
        message.sender = {
          _id: senderId,
          displayName: participant?.displayName || 
                      (senderId === currentUser._id ? currentUser.displayName : 'Unknown'),
          profilePicture: participant?.profilePicture || 
                         (senderId === currentUser._id ? currentUser.profilePicture : null)
        }
      } else if (message.sender && typeof message.sender === 'object') {
        // ✅ Sender đã là object - kiểm tra đầy đủ thông tin
        if (!message.sender._id || !message.sender.displayName) {
          const currentUser = this.$store.state.user
          const senderId = message.sender._id || currentUser._id
          
          // Tìm thông tin từ conversation participants
          const participant = this.conversation.participant || 
                             this.conversation.participants?.find(p => p._id === senderId)
          
          message.sender._id = senderId
          message.sender.displayName = message.sender.displayName || 
                                       participant?.displayName || 
                                       currentUser.displayName
          message.sender.profilePicture = message.sender.profilePicture || 
                                          participant?.profilePicture || 
                                          currentUser.profilePicture
        }
        // ✅ Sender đã đầy đủ - giữ nguyên thông tin từ backend
        console.log('✅ [ChatPopup] Sender info complete:', {
          _id: message.sender._id,
          displayName: message.sender.displayName,
          profilePicture: message.sender.profilePicture
        });
      }
      
      // Đảm bảo message có readBy
      if (!message.readBy) {
        message.readBy = [];
      }
      
      // Map reactions về đúng format frontend
      if (message.reactions) {
        message.reactions = message.reactions.map(r => {
          const user = r.user || {}
          const userName = user.displayName || 
                          (user.email ? user.email.split('@')[0] : null) ||
                          'Unknown User'
          
          return {
            userId: user._id || r.user,
            userName: userName,
            userAvatar: user.profilePicture || null,
            emoji: r.emoji
          }
        })
      } else {
        message.reactions = []
      }
      
      console.log('✅ [ChatPopup] Adding message with avatar:', message.sender?.profilePicture);
      
      // Thêm tin nhắn mới vào danh sách
      this.messages.push(message)
      
      // Scroll to bottom
      this.$nextTick(() => {
        this.scrollToBottom()
      })
      
      // Đánh dấu đã đọc nếu popup đang mở
      if (!this.isMinimized) {
        this.markConversationAsRead()
      }
    },

    async markConversationAsRead() {
      try {
        await MessageAPI.markAsRead(this.conversation._id)
        // Cập nhật lại store để refresh unread count
        this.$store.dispatch('loadConversations')
      } catch (error) {
        console.error('Mark as read error:', error)
      }
    },

    async loadMessages() {
      if (!this.conversation?._id) return
      
      this.loading = true
      try {
        const response = await MessageAPI.getMessages(this.conversation._id)
        if (response.status === 200) {
          // Map messages với reactions đúng format
          this.messages = (response.data.messages || []).map(msg => ({
            ...msg,
            reactions: (msg.reactions || []).map(r => {
              const user = r.user || {}
              const userName = user.displayName || 
                              (user.email ? user.email.split('@')[0] : null) ||
                              'Unknown User'
              
              return {
                userId: user._id || r.user,
                userName: userName,
                userAvatar: user.profilePicture || null,
                emoji: r.emoji
              }
            })
          }))
          
          // Scroll to bottom sau khi load - với nhiều lần thử
          this.$nextTick(() => {
            console.log('🔄 [loadMessages] Messages loaded, scrolling...');
            this.scrollToBottom()
            
            // Thử lại sau 300ms để đảm bảo DOM render xong
            setTimeout(() => {
              console.log('🔄 [loadMessages] 2nd scroll attempt');
              this.scrollToBottom()
            }, 300)
            
            // Thử lại lần cuối sau 600ms
            setTimeout(() => {
              console.log('🔄 [loadMessages] Final scroll attempt');
              this.scrollToBottom()
            }, 600)
          })
        }
        
        // Đánh dấu đã đọc ngay khi load messages
        await this.markConversationAsRead()
      } catch (error) {
        console.error('Load messages error:', error)
      } finally {
        this.loading = false
      }
    },

    async sendMessage() {
      if (!this.messageInput.trim() && !this.selectedFile) return

      const currentUser = this.$store.state.user
      const tempMessageContent = this.messageInput.trim()
      const tempFile = this.selectedFile

      // Clear input ngay lập tức để UX mượt hơn
      this.messageInput = ''
      this.selectedFile = null

      try {
        const messageData = {
          content: tempMessageContent,
          messageType: tempFile ? (tempFile.type.startsWith('image/') ? 'image' : 'file') : 'text',
          file: tempFile
        }

        // Tạo tin nhắn tạm thời để hiển thị ngay
        const tempMessage = {
          _id: 'temp-' + Date.now(),
          content: tempMessageContent,
          messageType: messageData.messageType,
          file: tempFile ? tempFile.name : null,
          originalFileName: tempFile ? tempFile.name : null,
          sender: {
            _id: currentUser._id,
            displayName: currentUser.displayName,
            profilePicture: currentUser.profilePicture
          },
          readBy: [{ user: currentUser._id }],
          createdAt: new Date().toISOString(),
          isTemp: true
        }

        // Thêm tin nhắn tạm vào danh sách
        this.messages.push(tempMessage)
        
        // Scroll ngay lập tức
        this.$nextTick(() => {
          this.scrollToBottom()
        })

        const response = await MessageAPI.sendMessage(this.conversation._id, messageData)
        
        if (response.status === 200 || response.status === 201) {
          // Socket sẽ tự động thêm tin nhắn qua handleNewMessage
          // Chỉ cần xóa temp message
          const tempIndex = this.messages.findIndex(m => m._id === tempMessage._id)
          if (tempIndex !== -1) {
            this.messages.splice(tempIndex, 1)
          }
          
          // Nếu socket chưa thêm (chậm), thêm thủ công
          const socketAdded = this.messages.some(m => m._id === response.data._id)
          if (!socketAdded) {
            const newMessage = {
              ...response.data,
              sender: response.data.sender || {
                _id: currentUser._id,
                displayName: currentUser.displayName,
                profilePicture: currentUser.profilePicture
              }
            }
            
            this.messages.push(newMessage)
            
            // Scroll lại sau khi thêm tin nhắn thật
            this.$nextTick(() => {
              this.scrollToBottom()
            })
          }
          
          // Cập nhật store
          this.$store.dispatch('loadConversations')
        }
      } catch (error) {
        console.error('Send message error:', error)
        // Xóa tin nhắn tạm nếu gửi thất bại
        const tempIndex = this.messages.findIndex(m => m.isTemp)
        if (tempIndex !== -1) {
          this.messages.splice(tempIndex, 1)
        }
        // Khôi phục input nếu gửi thất bại
        this.messageInput = tempMessageContent
        this.selectedFile = tempFile
      }
    },

    toggleMinimize() {
      this.isMinimized = !this.isMinimized
    },

    closeChat() {
      this.$emit('close')
    },
    
    // GROUP CHAT METHODS
    showGroupMembers() {
      this.showMembersModal = true
    },
    
    handleConversationRefreshed(updatedConversation) {
      console.log('🔄 [ChatPopup] Conversation refreshed, updating...');
      // Update the local conversation object - but since it's a prop, we need to emit to parent
      this.$emit('conversation-updated', updatedConversation);
    },
    
    async handleMembersUpdated(updatedConversation) {
      // Cập nhật conversation với thông tin mới
      this.$emit('conversation-updated', updatedConversation)
      await this.$store.dispatch('loadConversations')
    },
    
    async handleMemberRemoved(memberId) {
      // Reload conversation để cập nhật danh sách members
      await this.$store.dispatch('loadConversations')
      
      // Nếu user hiện tại bị xóa, đóng chat
      if (memberId === this.currentUserId) {
        this.closeChat()
      }
    },
    
    async handleMemberPromoted(memberId) {
      // Reload conversation để cập nhật admins
      await this.$store.dispatch('loadConversations')
    },
    
    handleLeftGroup() {
      // Đóng chat và reload conversations
      this.$store.dispatch('loadConversations')
      this.closeChat()
    },

    goToProfile() {
      // Chỉ cho phép đi đến profile nếu không phải group chat
      if (this.conversation?.isGroup) return
      
      const userId = this.conversation?.participant?._id
      if (userId) {
        // Điều hướng đến trang profile
        this.$router.push(`/profile/${userId}`)
      }
    },

    scrollToBottom() {
      console.log('📜 [ChatPopup] Scrolling to bottom...');
      
      // Dùng messagesContainer với scrollTop
      if (this.$refs.messagesContainer) {
        const container = this.$refs.messagesContainer;
        console.log('✅ Using messagesContainer ref, scrollHeight:', container.scrollHeight, 'clientHeight:', container.clientHeight);
        
        // Force reflow để đảm bảo layout đã hoàn thành
        void container.offsetHeight;
        
        // Dùng requestAnimationFrame để scroll sau khi browser paint
        requestAnimationFrame(() => {
          container.scrollTop = container.scrollHeight;
          console.log('📍 [RAF] Scrolled to:', container.scrollTop);
          
          // Double check sau 50ms
          setTimeout(() => {
            container.scrollTop = container.scrollHeight;
            console.log('📍 [Timeout] Final scroll to:', container.scrollTop);
          }, 50);
        });
      }
      
      // Fallback: Sử dụng messagesEnd anchor
      if (this.$refs.messagesEnd) {
        console.log('✅ Also using messagesEnd ref');
        this.$refs.messagesEnd.scrollIntoView({ behavior: 'instant', block: 'end' })
      }
    },

    isOwnMessage(message) {
      if (!message || !message.sender || !this.currentUserId) return false
      
      const senderId = message.sender._id || message.sender
      const currentId = this.currentUserId
      
      // So sánh cả dạng string và object
      return senderId?.toString() === currentId?.toString()
    },

    triggerFileInput() {
      this.$refs.fileInput.click()
    },

    triggerImageInput() {
      this.$refs.imageInput.click()
    },
    
    // Reaction Methods
    startLongPress(event, message) {
      if (!message) return
      
      // Prevent text selection
      event.preventDefault()
      
      this.selectedMessage = message
      this.lastEvent = event // Save event for floating animation
      
      this.longPressTimer = setTimeout(() => {
        this.showReactionPickerAtPosition(event)
      }, this.longPressDuration)
    },
    
    cancelLongPress() {
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer)
        this.longPressTimer = null
      }
    },
    
    showReactionPickerAtPosition(event) {
      const rect = event.target.closest('.message-bubble').getBoundingClientRect()
      this.reactionPickerPosition = {
        top: rect.top - 60,
        left: rect.left + (rect.width / 2) - 130
      }
      this.showReactionPicker = true
      
      // Delay adding click outside listener to prevent immediate close
      setTimeout(() => {
        document.addEventListener('click', this.handleClickOutside)
      }, 100)
    },
    
    handleClickOutside(event) {
      if (this.showReactionPicker) {
        const picker = document.querySelector('.reaction-picker')
        const messageBubble = event.target.closest('.message-bubble')
        const isClickInsidePicker = picker && picker.contains(event.target)
        
        // Chỉ đóng khi click bên ngoài cả picker VÀ message bubble
        if (!isClickInsidePicker && !messageBubble) {
          this.showReactionPicker = false
          this.selectedMessage = null
          document.removeEventListener('click', this.handleClickOutside)
        }
      }
    },
    
    handleReactionSelect(emoji) {
      if (this.selectedMessage) {
        // Check if user already reacted with this emoji
        const currentUserId = this.currentUserId
        const existingReaction = this.selectedMessage.reactions?.find(r => r.userId === currentUserId)
        const newReaction = existingReaction?.emoji === emoji ? null : emoji
        
        this.applyReaction(this.selectedMessage, newReaction)
      }
      this.showReactionPicker = false
      this.selectedMessage = null
      document.removeEventListener('click', this.handleClickOutside)
    },
    
    applyReaction(message, reaction) {
      // Create floating emoji animation
      if (reaction) {
        this.createFloatingEmoji(reaction, this.lastEvent)
      }
      
      // Update local message object immediately for instant feedback
      if (!message.reactions) {
        message.reactions = []
      }
      
      const currentUserId = this.currentUserId
      const currentUser = this.$store?.state?.user
      const existingReactionIndex = message.reactions.findIndex(
        r => r.userId === currentUserId
      )
      
      if (reaction) {
        // Add or update reaction
        const reactionObj = {
          userId: currentUserId,
          userName: currentUser?.displayName || currentUser?.email || 'Bạn',
          userAvatar: currentUser?.profilePicture || null,
          emoji: reaction
        }
        
        if (existingReactionIndex !== -1) {
          // Update existing - Vue 3 auto tracks
          message.reactions[existingReactionIndex] = reactionObj
        } else {
          // Add new
          message.reactions.push(reactionObj)
        }
      } else {
        // Remove reaction
        if (existingReactionIndex !== -1) {
          message.reactions.splice(existingReactionIndex, 1)
        }
      }
      
      // Call API to save reaction to database
      MessageAPI.addReaction(message._id, reaction)
        .then(response => {
          console.log('Reaction saved:', response.data)
        })
        .catch(error => {
          console.error('Failed to save reaction:', error)
          // Rollback on error
          if (reaction) {
            const idx = message.reactions.findIndex(r => r.userId === currentUserId)
            if (idx !== -1) message.reactions.splice(idx, 1)
          }
        })
      
      console.log('Applied reaction:', reaction, 'to message:', message._id)
      console.log('Reactions after:', message.reactions)
    },
    
    createFloatingEmoji(emoji, clickEvent) {
      const id = Date.now() + Math.random()
      const floatingEmoji = {
        id,
        emoji,
        x: clickEvent ? clickEvent.clientX : window.innerWidth / 2,
        y: clickEvent ? clickEvent.clientY : window.innerHeight / 2
      }
      
      this.floatingEmojis.push(floatingEmoji)
      
      // Remove after animation completes
      setTimeout(() => {
        const index = this.floatingEmojis.findIndex(e => e.id === id)
        if (index !== -1) {
          this.floatingEmojis.splice(index, 1)
        }
      }, 1000)
    },
    
    getMessageReactions(message) {
      if (!message.reactions || message.reactions.length === 0) {
        return []
      }
      
      // Convert backend format to frontend format if needed
      return message.reactions.map(r => {
        // Backend format: { user: {_id, displayName, profilePicture}, emoji }
        // Frontend format: { userId, userName, userAvatar, emoji }
        if (r.user && typeof r.user === 'object') {
          return {
            userId: r.user._id,
            userName: r.user.displayName || r.user.email || 'Unknown',
            userAvatar: r.user.profilePicture || null,
            emoji: r.emoji
          }
        }
        // Already in frontend format
        return r
      })
    },
    
    showMessageReactors(message) {
      this.selectedMessageForReactors = message
      this.showReactorsModal = true
    },

    handleFileSelect(event) {
      this.selectedFile = event.target.files[0]
      if (this.selectedFile) {
        this.sendMessage()
      }
    },

    handleImageSelect(event) {
      this.selectedFile = event.target.files[0]
      if (this.selectedFile) {
        this.sendMessage()
      }
    },

    downloadFile(message) {
      if (!message.file) return;
      
      const token = localStorage.getItem('token');
      const filename = message.file;
      const downloadUrl = `http://localhost:3000/api/messages/download/${filename}`;
      
      // Add auth header via fetch and blob
      fetch(downloadUrl, {
        headers: { token }
      })
      .then(response => response.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = message.originalFileName || message.file;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      })
      .catch(error => {
        console.error('Download error:', error);
        this.showErrorMessage('Không thể tải file');
      });
    },

    formatTime(timestamp) {
      if (!timestamp) return ''
      
      const date = new Date(timestamp)
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      
      return `${hours}:${minutes}`
    },

    showContextMenu(event, message) {
      if (!this.isOwnMessage(message)) return;
      
      this.contextMessage = message;
      
      // Calculate position to prevent menu from going off-screen
      const menuWidth = 150;
      const menuHeight = 100;
      let x = event.clientX;
      let y = event.clientY;
      
      // If too close to right edge, position menu to the left
      if (x + menuWidth > window.innerWidth) {
        x = event.clientX - menuWidth;
      }
      
      // If too close to bottom, position menu above
      if (y + menuHeight > window.innerHeight) {
        y = event.clientY - menuHeight;
      }
      
      this.menuPosition = { x, y };
      this.showMessageMenu = true;

      const closeMenu = () => {
        this.showMessageMenu = false;
        document.removeEventListener('click', closeMenu);
      };
      setTimeout(() => {
        document.addEventListener('click', closeMenu);
      }, 0);
    },

    canEdit(message) {
      if (!message || message.messageType !== 'text') return false;
      if (message.readBy && message.readBy.length > 1) return false;
      // Don't allow editing system messages (video call, etc.)
      if (message.content && message.content.includes('📞 Đã bỏ lỡ cuộc gọi video')) return false;
      if (message.content && message.content.includes('Cuộc gọi video')) return false;
      return true;
    },

    editMessage() {
      this.showMessageMenu = false;
      this.editingMessageId = this.contextMessage._id;
      this.editingContent = this.contextMessage.content || '';
      this.showEditModal = true;
      
      this.$nextTick(() => {
        if (this.$refs.editTextarea) {
          this.$refs.editTextarea.focus();
        }
      });
    },

    cancelEdit() {
      this.showEditModal = false;
      this.editingContent = '';
      this.editingMessageId = null;
    },

    async saveEdit() {
      if (!this.editingContent.trim() || !this.editingMessageId) return;

      try {
        await MessageAPI.editMessage(this.editingMessageId, this.editingContent.trim());
        
        const messageIndex = this.messages.findIndex(m => m._id === this.editingMessageId);
        if (messageIndex !== -1) {
          this.messages[messageIndex].content = this.editingContent.trim();
          this.messages[messageIndex].isEdited = true;
        }

        this.cancelEdit();
      } catch (error) {
        console.error('Edit message error:', error);
        // Show error in a better way
        this.showErrorMessage(error.response?.data?.error || 'Không thể sửa tin nhắn');
      }
    },

    confirmDelete() {
      this.showMessageMenu = false;
      this.showDeleteModal = true;
    },

    async deleteMessage() {
      if (!this.contextMessage) return;

      try {
        await MessageAPI.deleteMessage(this.contextMessage._id);
        
        const messageIndex = this.messages.findIndex(m => m._id === this.contextMessage._id);
        if (messageIndex !== -1) {
          this.messages.splice(messageIndex, 1);
        }

        this.showDeleteModal = false;

      } catch (error) {
        console.error('Delete message error:', error);
        this.showErrorMessage('Không thể xóa tin nhắn');
        this.showDeleteModal = false;
      }
    },

    showErrorMessage(message) {
      // Simple error display - can be enhanced with toast/snackbar later
      console.error(message);
      // Could emit to parent or show in modal
    },

    toggleEmojiPicker() {
      this.showEmojiPicker = !this.showEmojiPicker;
      if (!this.showEmojiPicker) {
        this.emojiSearch = '';
      }
      if (this.showEmojiPicker) {
        this.showAttachMenu = false;
      }
    },

    closeEmojiPicker() {
      this.showEmojiPicker = false;
      this.emojiSearch = '';
    },

    toggleAttachMenu() {
      this.showAttachMenu = !this.showAttachMenu;
      if (this.showAttachMenu) {
        this.showEmojiPicker = false;
      }
    },

    handleClickOutside(event) {
      const target = event.target;
      const clickedInsidePopup = this.$el && this.$el.contains(target);
      
      if (!clickedInsidePopup) {
        this.showAttachMenu = false;
      }
    },

    insertEmoji(emoji) {
      const input = this.$refs.chatInput;
      const start = input.selectionStart;
      const end = input.selectionEnd;
      
      this.messageInput = this.messageInput.substring(0, start) + emoji + this.messageInput.substring(end);
      
      this.$nextTick(() => {
        input.focus();
        const newPos = start + emoji.length;
        input.setSelectionRange(newPos, newPos);
      });
    },

    selectCategory(categoryId) {
      this.activeCategory = categoryId;
      this.emojiSearch = '';
    },

    filterEmojis() {
      // Trigger computed property update
    },

    getCurrentCategoryName() {
      const category = this.categories.find(c => c.id === this.activeCategory);
      return category ? category.name : '';
    },

    // Video Call Methods
    startVideoCall() {
      console.log('📞 [ChatPopup] Starting video call...');
      console.log('📞 [ChatPopup] Socket connected:', socketService.getConnectionStatus());
      console.log('📞 [ChatPopup] Conversation:', this.conversation);
      console.log('📞 [ChatPopup] Computed recipientName:', this.recipientName);
      console.log('📞 [ChatPopup] Computed recipientAvatar:', this.recipientAvatar);
      console.log('📞 [ChatPopup] Conversation.participant:', this.conversation?.participant);
      console.log('📞 [ChatPopup] Conversation.recipientName:', this.conversation?.recipientName);
      
      // Show calling modal instead of immediately starting video
      if (this.$refs.callingModal) {
        this.$refs.callingModal.show();
      }

      // Build participants array
      let participants = [];
      if (this.conversation.isGroup) {
        // Group chat: use participants array
        participants = this.conversation.participants || [];
      } else {
        // 1-1 chat: build array from participant info
        if (this.conversation.participant) {
          participants = [this.conversation.participant];
        } else if (this.conversation.recipientId) {
          participants = [{ _id: this.conversation.recipientId }];
        }
      }

      console.log('📞 [ChatPopup] Participants to notify:', participants);

      // Emit call start - backend will notify other users
      socketService.emit('video-call:start', {
        conversationId: this.conversation._id,
        participants: participants,
        isGroupCall: this.conversation.isGroup || false
      });

      // Reset cancel flag for new call
      this._callCancelled = false;
      
      // Remove old listeners first to prevent duplicates
      if (this._acceptedHandler) {
        socketService.off('video-call:accepted', this._acceptedHandler);
      }
      if (this._rejectedHandler) {
        socketService.off('video-call:rejected', this._rejectedHandler);
      }
      
      // Set timeout 45 seconds - auto cancel if not answered
      this._callTimeout = setTimeout(() => {
        console.log('⏱️ [ChatPopup] Call timeout - no answer after 45s');
        this.cancelCall();
        if (this.$refs.callingModal) {
          this.$refs.callingModal.hide();
        }
      }, 45000);

      // Listen for when someone accepts - use arrow function to preserve context
      const acceptedHandler = () => {
        console.log('✅ [ChatPopup] Call accepted by recipient');
        console.log('🎬 [ChatPopup] Hiding calling modal and starting video');
        
        // Clear timeout since call was accepted
        if (this._callTimeout) {
          clearTimeout(this._callTimeout);
          this._callTimeout = null;
        }
        
        // Hide calling modal
        if (this.$refs.callingModal) {
          console.log('✅ [ChatPopup] Calling modal found, hiding');
          this.$refs.callingModal.hide();
        } else {
          console.error('❌ [ChatPopup] Calling modal ref not found');
        }
        
        // Start actual video call
        if (this.$refs.videoCallModal) {
          console.log('✅ [ChatPopup] VideoCallModal found, starting call');
          
          // Mark as active call in global manager BEFORE starting
          if (window.ChatPopupsManager) {
            window.ChatPopupsManager.activeVideoCall = { conversationId: this.conversation._id };
            console.log('✅ [ChatPopup] Set activeVideoCall for caller:', window.ChatPopupsManager.activeVideoCall);
          }
          
          // Note: activeVideoCall will be cleared by onVideoCallEnded() when call ends
          
          this.$refs.videoCallModal.startCall();
        } else {
          console.error('❌ [ChatPopup] VideoCallModal ref not found');
        }
        
        // Cleanup listeners
        socketService.off('video-call:accepted', acceptedHandler);
        if (this._rejectedHandler) {
          socketService.off('video-call:rejected', this._rejectedHandler);
        }
      };
      
      // Listen for when someone rejects
      const rejectedHandler = () => {
        console.log('❌ [ChatPopup] Call rejected by recipient');
        console.log('📞 [ChatPopup] Conversation ID:', this.conversation._id);
        
        // Clear timeout
        if (this._callTimeout) {
          clearTimeout(this._callTimeout);
          this._callTimeout = null;
        }
        
        // Hide calling modal
        if (this.$refs.callingModal) {
          console.log('🔕 [ChatPopup] Hiding calling modal');
          this.$refs.callingModal.hide();
        }
        
        // Reset cancel flag
        this._callCancelled = false;
        
        // Cleanup listeners
        socketService.off('video-call:rejected', rejectedHandler);
        if (this._acceptedHandler) {
          socketService.off('video-call:accepted', this._acceptedHandler);
        }
      };
      
      console.log('🎧 [ChatPopup] Setting up video-call:rejected listener');
      socketService.on('video-call:accepted', acceptedHandler);
      socketService.on('video-call:rejected', rejectedHandler);
      
      // Store handlers for cleanup
      this._acceptedHandler = acceptedHandler;
      this._rejectedHandler = rejectedHandler;
    },

    onVideoCallEnded() {
      console.log('📵 [ChatPopup] Video call ended event received');
      // Clear activeVideoCall in global manager
      if (window.ChatPopupsManager) {
        window.ChatPopupsManager.activeVideoCall = null;
        console.log('✅ [ChatPopup] Cleared activeVideoCall in manager');
      }
    },

    cancelCall() {
      console.log('❌ [ChatPopup] Call cancelled by caller');
      
      // Prevent duplicate cancel emissions
      if (this._callCancelled) {
        console.log('⚠️ [ChatPopup] Call already cancelled, skipping');
        return;
      }
      this._callCancelled = true;
      
      // Clear timeout if exists
      if (this._callTimeout) {
        clearTimeout(this._callTimeout);
        this._callTimeout = null;
      }
      
      socketService.emit('video-call:cancel', {
        conversationId: this.conversation._id
      });
      if (this._acceptedHandler) {
        socketService.off('video-call:accepted', this._acceptedHandler);
        this._acceptedHandler = null;
      }
      if (this._rejectedHandler) {
        socketService.off('video-call:rejected', this._rejectedHandler);
        this._rejectedHandler = null;
      }
    },

    onCallEnded() {
      console.log('📵 [ChatPopup] Video call ended event received');
      
      // Clear activeVideoCall in global manager
      if (window.ChatPopupsManager) {
        window.ChatPopupsManager.activeVideoCall = null;
        console.log('✅ [ChatPopup] Cleared activeVideoCall in manager');
      }
      
      // Cleanup socket listeners
      if (this._acceptedHandler) {
        socketService.off('video-call:accepted', this._acceptedHandler);
        this._acceptedHandler = null;
      }
      if (this._rejectedHandler) {
        socketService.off('video-call:rejected', this._rejectedHandler);
        this._rejectedHandler = null;
      }
    },

    // DEPRECATED: Incoming call is now handled globally in ChatPopupsManager
    // This method is kept for reference but no longer called
    // handleIncomingCall({ conversationId, callerId, callerName, isGroupCall }) {
    //   console.log('📞 [ChatPopup] Incoming call received:', { conversationId, callerId, callerName, isGroupCall });
    //   ...
    // }
    
    acceptIncomingVideoCall({ conversationId, callerId }) {
      console.log('📹 [ChatPopup] Accepting incoming video call from manager');
      // Start video call immediately without confirm (already confirmed in manager)
      if (this.$refs.videoCallModal) {
        this.$refs.videoCallModal.startCall();
      } else {
        console.error('❌ [ChatPopup] VideoCallModal ref not found');
      }
    }
  },

  computed: {
    filteredEmojis() {
      const search = this.emojiSearch.trim().toLowerCase();
      
      if (!search) {
        // No search, return current category
        return this.emojiData[this.activeCategory] || [];
      }
      
      // Search by category name
      const matchedCategories = this.categories.filter(cat => 
        cat.name.toLowerCase().includes(search)
      );
      
      if (matchedCategories.length > 0) {
        // Return emojis from all matched categories
        return matchedCategories.flatMap(cat => this.emojiData[cat.id] || []);
      }
      
      // If no category match, return current category
      return this.emojiData[this.activeCategory] || [];
    },

    recipientName() {
      if (!this.conversation) return 'Người dùng';
      if (this.conversation.isGroup) {
        return this.conversation.groupName || 'Nhóm chat';
      }
      // Ưu tiên recipientName (từ Message.vue style)
      if (this.conversation.recipientName) {
        return this.conversation.recipientName;
      }
      // Fallback sang participant (từ ChatPopup style)
      if (this.conversation.participant && this.conversation.participant.displayName) {
        return this.conversation.participant.displayName;
      }
      return 'Người dùng';
    },

    recipientAvatar() {
      if (!this.conversation) return null;
      if (this.conversation.isGroup) {
        return this.conversation.groupAvatar || null;
      }
      // Ưu tiên recipientAvatar (từ Message.vue style)
      if (this.conversation.recipientAvatar) {
        return this.conversation.recipientAvatar;
      }
      // Fallback sang participant (từ ChatPopup style)
      if (this.conversation.participant && this.conversation.participant.profilePicture) {
        return this.conversation.participant.profilePicture;
      }
      return null;
    }
  }
}
</script>

<style scoped>
.chat-popup {
  position: fixed;
  bottom: 0;
  right: 80px; /* Default for first popup */
  width: 328px;
  height: 455px;
  background: white;
  border-radius: 12px 12px 0 0;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  z-index: 9999;
  transition: height 0.3s ease;
}

/* Position classes from parent */
.chat-popup.popup-position-0 {
  right: 80px;
}

.chat-popup.popup-position-1 {
  right: 428px;
}

.chat-popup.popup-position-2 {
  right: 776px;
}

.chat-popup.minimized {
  height: 56px;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px 12px 0 0;
  cursor: pointer;
  user-select: none;
}

.chat-user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  min-width: 0;
}

.chat-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid white;
  flex-shrink: 0;
}

/* Group Avatar Styles */
.group-avatar-wrapper {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid white;
  flex-shrink: 0;
}

.group-avatar-wrapper i {
  color: white;
  font-size: 20px;
}

.group-icon-inline {
  font-size: 16px !important;
  vertical-align: middle;
  margin-right: 4px;
}

.chat-user-details {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.chat-user-name {
  font-weight: 600;
  font-size: 0.9375rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.clickable-name {
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 2px 6px;
  margin: -2px -6px;
  border-radius: 4px;
}

.clickable-name:hover {
  background: rgba(255, 255, 255, 0.2);
  text-decoration: underline;
}

.chat-online-status {
  font-size: 0.75rem;
  opacity: 0.9;
}

.chat-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.action-btn {
  font-size: 20px;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.video-call-btn {
  color: #667eea;
  transition: all 0.2s ease;
}

.video-call-btn:hover {
  color: #764ba2;
  transform: scale(1.1);
  background: rgba(102, 126, 234, 0.1) !important;
}

.chat-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 1rem;
  background: #f8f9fa;
}

.chat-messages::-webkit-scrollbar {
  width: 6px;
}

.chat-messages::-webkit-scrollbar-track {
  background: transparent;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 3px;
}

.chat-loading,
.empty-chat {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #718096;
  gap: 0.5rem;
}

.empty-icon {
  font-size: 3rem;
  opacity: 0.5;
}

.empty-hint {
  font-size: 0.8125rem;
  color: #a0aec0;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #e2e8f0;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.message-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.message-wrapper.own-message {
  flex-direction: row-reverse;
}

.message-with-reactions {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  max-width: 75%;
}

.message-wrapper.own-message .message-with-reactions {
  align-items: flex-end;
}

.message-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.message-bubble {
  max-width: 100%;
  padding: 0.625rem 0.875rem;
  border-radius: 18px;
  background: white;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  position: relative;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.message-bubble:hover .message-more-btn {
  opacity: 1;
  visibility: visible;
}

.message-more-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  background: rgba(0, 0, 0, 0.1);
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease;
  z-index: 10;
}

.message-more-btn:hover {
  background: rgba(0, 0, 0, 0.2);
  transform: scale(1.1);
}

.message-more-btn i {
  font-size: 16px;
  color: white;
}

.message-bubble.own-bubble {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.message-reaction {
  position: absolute;
  bottom: -8px;
  right: -8px;
  background: white;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  border: 2px solid white;
  animation: popIn 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);
  cursor: pointer;
  transition: transform 0.2s ease;
}

.message-reaction:hover {
  transform: scale(1.2);
}

@keyframes popIn {
  0% {
    opacity: 0;
    transform: scale(0);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.message-text {
  margin: 0;
  font-size: 0.9375rem;
  line-height: 1.4;
  word-wrap: break-word;
}

.message-time {
  font-size: 0.6875rem;
  opacity: 0.7;
  margin-top: 0.25rem;
  display: block;
}

.message-image img {
  max-width: 200px;
  border-radius: 8px;
  display: block;
}

.message-file {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.message-file:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

.message-file i.material-icons {
  font-size: 20px;
}

.message-file .download-icon {
  margin-left: auto;
  font-size: 18px;
  opacity: 0.7;
}

.message-file span {
  font-size: 0.875rem;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-input {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border-top: 1px solid #e2e8f0;
  background: white;
}

/* Plus Menu */
.plus-menu-wrapper {
  position: relative;
  flex-shrink: 0;
}

.plus-icon {
  font-size: 24px;
  color: #667eea;
  cursor: pointer;
  transition: all 0.2s ease;
}

.plus-icon:hover {
  transform: rotate(90deg) scale(1.1);
}

.attach-menu {
  position: absolute;
  bottom: 100%;
  left: 0;
  margin-bottom: 8px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 8px;
  min-width: 150px;
  z-index: 1000;
  animation: slideUp 0.2s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.attach-menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.attach-menu-item:hover {
  background: #f7fafc;
}

.attach-menu-item i {
  font-size: 20px;
  color: #667eea;
}

.attach-menu-item span {
  font-size: 14px;
  color: #334155;
  font-weight: 500;
}

.message-input {
  flex: 1;
  border: none;
  outline: none;
  padding: 0.625rem 1rem;
  border-radius: 20px;
  background: #f7fafc;
  font-size: 0.9375rem;
}

.message-input::placeholder {
  color: #a0aec0;
}

/* Emoji Icon */
.emoji-icon {
  font-size: 22px;
  color: #667eea;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem;
}

.emoji-icon:hover {
  transform: scale(1.1);
}

/* Send Icon */
.send-icon {
  font-size: 22px;
  color: #cbd5e0;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0.375rem;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.send-icon.active {
  color: #667eea;
}

.send-icon:hover.active {
  background: #f7fafc;
  transform: scale(1.1);
}

/* Floating Emoji Animation */
.floating-emojis {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 10001;
}

.floating-emoji {
  position: fixed;
  font-size: 48px;
  animation: floatUp 1s ease-out forwards;
  pointer-events: none;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
}

@keyframes floatUp {
  0% {
    opacity: 1;
    transform: translateY(0) scale(1) rotate(0deg);
  }
  50% {
    transform: translateY(-60px) scale(1.3) rotate(15deg);
  }
  100% {
    opacity: 0;
    transform: translateY(-120px) scale(0.8) rotate(-10deg);
  }
}

.float-enter-active {
  animation: floatUp 1s ease-out;
}

.float-leave-active {
  animation: fadeOutFloat 0.3s ease-out;
}

@keyframes fadeOutFloat {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

@media (max-width: 768px) {
  .chat-popup {
    right: 20px;
    width: calc(100% - 40px);
    max-width: 328px;
  }
}

/* Context Menu */
.message-context-menu {
  position: fixed;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 0.5rem 0;
  z-index: 10000;
  min-width: 150px;
}

.message-context-menu .menu-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: background 0.2s;
}

.message-context-menu .menu-item:hover {
  background: #f3f4f6;
}

.message-context-menu .menu-item.delete {
  color: #ef4444;
}

.message-context-menu .menu-item.delete:hover {
  background: #fee2e2;
}

.message-context-menu .menu-item i {
  font-size: 20px;
}

.message-context-menu .menu-item span {
  font-size: 0.9rem;
}

/* Edit Modal */
.edit-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10001;
}

.edit-modal {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.edit-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.edit-modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
}

.edit-modal-header .close-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #6b7280;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  border-radius: 4px;
}

.edit-modal-header .close-btn:hover {
  background: #f3f4f6;
}

.edit-modal-body {
  padding: 1.5rem;
}

.edit-modal-body textarea {
  width: 100%;
  min-height: 100px;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.95rem;
  font-family: inherit;
  resize: vertical;
}

.edit-modal-body textarea:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.edit-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.edit-modal-footer button {
  padding: 0.625rem 1.25rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.edit-modal-footer .btn-cancel {
  background: #f3f4f6;
  border: none;
  color: #374151;
}

.edit-modal-footer .btn-cancel:hover {
  background: #e5e7eb;
}

.edit-modal-footer .btn-save {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  color: white;
}

.edit-modal-footer .btn-save:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.edit-modal-footer .btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Delete button styles */
.btn-delete {
  background: #ef4444;
  border: none;
  color: white;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-delete:hover {
  background: #dc2626;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.delete-confirm-modal .edit-modal-body {
  padding: 20px;
  text-align: center;
}

.delete-confirm-modal .edit-modal-body p {
  margin: 0;
  font-size: 16px;
  color: #4b5563;
}

/* Emoji Picker Modal */
.emoji-picker-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 99999;
  background: transparent;
}

.emoji-picker-container {
  position: fixed;
  bottom: 80px;
  right: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  width: 350px;
  max-height: 450px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: fadeInUp 0.2s ease;
}

.emoji-picker-search {
  display: flex;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid #e5e7eb;
  gap: 8px;
}

.emoji-picker-search i {
  color: #9ca3af;
  font-size: 20px;
}

.emoji-picker-search input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
  color: #1f2937;
}

.emoji-picker-search input::placeholder {
  color: #9ca3af;
}

.emoji-categories {
  display: flex;
  padding: 8px 12px;
  gap: 4px;
  border-bottom: 1px solid #e5e7eb;
  overflow-x: auto;
}

.emoji-categories::-webkit-scrollbar {
  height: 4px;
}

.emoji-categories::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 2px;
}

.category-btn {
  background: none;
  border: none;
  padding: 8px;
  font-size: 20px;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.category-btn:hover {
  background: #f3f4f6;
}

.category-btn.active {
  background: rgba(102, 126, 234, 0.1);
}

.emoji-category-title {
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 600;
  color: #6b7280;
  border-bottom: 1px solid #e5e7eb;
}

.emoji-grid-container {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 4px;
  align-content: start;
}

.emoji-grid-container::-webkit-scrollbar {
  width: 8px;
}

.emoji-grid-container::-webkit-scrollbar-track {
  background: #f3f4f6;
}

.emoji-grid-container::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 4px;
}

.emoji-grid-container::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

.emoji-item {
  background: none;
  border: none;
  font-size: 28px;
  padding: 6px;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
}

.emoji-item:hover {
  background: #f3f4f6;
  transform: scale(1.2);
}

.emoji-item:active {
  transform: scale(1.1);
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .emoji-picker-container {
    width: 320px;
    max-height: 400px;
  }
  
  .emoji-grid-container {
    grid-template-columns: repeat(7, 1fr);
  }
  
  .emoji-item {
    font-size: 24px;
  }
}
</style>
