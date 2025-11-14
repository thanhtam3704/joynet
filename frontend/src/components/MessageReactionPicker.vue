<template>
  <transition name="picker-fade">
    <div class="reaction-picker" v-if="show" :style="pickerStyle" @click.stop>
      <div class="reactions-list">
        <button 
          v-for="(reaction, index) in reactions" 
          :key="reaction.emoji"
          class="reaction-btn"
          :class="{ 'selected': isSelected(reaction.emoji) }"
          :style="{ animationDelay: `${index * 0.03}s` }"
          @click="selectReaction(reaction.emoji)"
          :title="reaction.name"
        >
          <span class="reaction-emoji">{{ reaction.emoji }}</span>
          <span class="reaction-label">{{ reaction.name }}</span>
        </button>
      </div>
    </div>
  </transition>
</template>

<script>
export default {
  name: 'MessageReactionPicker',
  props: {
    show: {
      type: Boolean,
      default: false
    },
    position: {
      type: Object,
      default: () => ({ top: 0, left: 0 })
    },
    selectedMessage: {
      type: Object,
      default: null
    },
    currentUserId: {
      type: String,
      default: null
    }
  },
  data() {
    return {
      reactions: [
        { emoji: '👍', name: 'Thích' },
        { emoji: '❤️', name: 'Yêu thích' },
        { emoji: '😂', name: 'Haha' },
        { emoji: '😮', name: 'Wow' },
        { emoji: '😢', name: 'Buồn' },
        { emoji: '😡', name: 'Phẫn nộ' }
      ]
    };
  },
  computed: {
    pickerStyle() {
      // Picker width is approximately 380px (6 reactions * ~60px each + padding)
      const pickerWidth = 380;
      const pickerHeight = 80;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let top = this.position.top;
      let left = this.position.left;
      
      // Adjust horizontal position if picker overflows right edge
      if (left + pickerWidth > viewportWidth) {
        left = viewportWidth - pickerWidth - 20; // 20px padding from edge
      }
      
      // Ensure picker doesn't go off left edge
      if (left < 20) {
        left = 20;
      }
      
      // Adjust vertical position if picker overflows bottom
      if (top + pickerHeight > viewportHeight) {
        top = viewportHeight - pickerHeight - 20;
      }
      
      // Ensure picker doesn't go off top edge
      if (top < 20) {
        top = 20;
      }
      
      return {
        top: `${top}px`,
        left: `${left}px`
      };
    },
    
    currentUserReaction() {
      if (!this.selectedMessage || !this.currentUserId) return null;
      
      // Chuyển về string để so sánh
      const currentUserId = String(this.currentUserId);
      
      const reaction = this.selectedMessage.reactions?.find(
        r => String(r.userId) === currentUserId
      );
      
      console.log('🔍 [ReactionPicker] Current user reaction:', {
        currentUserId,
        reactions: this.selectedMessage.reactions,
        found: reaction?.emoji
      });
      
      return reaction?.emoji || null;
    }
  },
  methods: {
    selectReaction(emoji) {
      this.$emit('select', emoji);
    },
    
    isSelected(emoji) {
      return this.currentUserReaction === emoji;
    }
  }
};
</script>

<style scoped>
.reaction-picker {
  position: fixed;
  background: white;
  border-radius: 30px;
  padding: 0.5rem 0.75rem;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18), 0 0 1px rgba(0, 0, 0, 0.1);
  z-index: 10000;
  border: 1px solid rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(10px);
}

.picker-fade-enter-active {
  animation: bounceIn 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.picker-fade-leave-active {
  animation: fadeOut 0.15s ease-out;
}

@keyframes bounceIn {
  0% {
    opacity: 0;
    transform: scale(0.3) translateY(10px);
  }
  50% {
    transform: scale(1.05) translateY(-5px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes fadeOut {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.8);
  }
}

.reactions-list {
  display: flex;
  gap: 0.25rem;
}

.reaction-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  border-radius: 50%;
  transition: all 0.2s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  position: relative;
  animation: reactionPop 0.3s ease backwards;
}

@keyframes reactionPop {
  0% {
    opacity: 0;
    transform: scale(0) translateY(10px);
  }
  70% {
    transform: scale(1.1) translateY(-2px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.reaction-emoji {
  font-size: 1.75rem;
  transition: transform 0.2s ease;
  display: block;
}

.reaction-label {
  position: absolute;
  bottom: -24px;
  left: 50%;
  transform: translateX(-50%) scale(0.8);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.625rem;
  font-weight: 600;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: all 0.2s ease;
  z-index: 1;
}

.reaction-btn:hover {
  background: rgba(102, 126, 234, 0.12);
}

.reaction-btn.selected {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.reaction-btn.selected .reaction-emoji {
  transform: scale(1.2);
  filter: brightness(1.2);
}

.reaction-btn:hover .reaction-emoji {
  transform: scale(1.4) translateY(-5px);
}

.reaction-btn:hover .reaction-label {
  opacity: 1;
  transform: translateX(-50%) scale(1);
}

.reaction-btn:active {
  transform: scale(0.9);
}
</style>
