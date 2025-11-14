<template>
  <div>
    <div 
      ref="reactionsSummary"
      class="reactions-summary" 
      v-if="hasReactions" 
      @click.stop="handleClick"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
    >
      <div class="reactions-icons">
        <transition-group name="reaction-pop" tag="span">
          <span 
            v-for="emoji in uniqueEmojis" 
            :key="emoji"
            class="reaction-icon"
          >
            {{ emoji }}
          </span>
        </transition-group>
      </div>
      <span class="reactions-count" v-if="totalCount > 0">{{ totalCount }}</span>
    </div>
    
    <!-- Tooltip hiển thị khi hover - Render ở root level -->
    <teleport to="body">
      <transition name="tooltip-fade">
        <div 
          class="reactions-tooltip" 
          v-if="showTooltip"
          :style="tooltipStyle"
          @mouseenter="handleMouseEnter"
          @mouseleave="handleMouseLeave"
        >
          <div class="tooltip-content">
            <div v-for="(reactors, emoji) in groupedReactions" :key="emoji" class="tooltip-row">
              <span class="tooltip-emoji">{{ emoji }}</span>
              <span class="tooltip-names">{{ formatReactorNames(reactors) }}</span>
            </div>
          </div>
        </div>
      </transition>
    </teleport>
  </div>
</template>

<script>
export default {
  name: 'MessageReactionsSummary',
  props: {
    reactions: {
      type: Array,
      default: () => []
      // Mỗi reaction: { userId: '123', userName: 'John Doe', emoji: '👍' }
    }
  },
  data() {
    return {
      showTooltip: false,
      tooltipStyle: {}
    };
  },
  computed: {
    hasReactions() {
      return this.reactions && this.reactions.length > 0;
    },
    
    uniqueEmojis() {
      // Lấy tối đa 3 emoji khác nhau, sắp xếp theo số lượng
      const emojiCount = {};
      this.reactions.forEach(r => {
        emojiCount[r.emoji] = (emojiCount[r.emoji] || 0) + 1;
      });
      
      return Object.keys(emojiCount)
        .sort((a, b) => emojiCount[b] - emojiCount[a])
        .slice(0, 3);
    },
    
    totalCount() {
      return this.reactions.length;
    },
    
    groupedReactions() {
      // Nhóm reactions theo emoji
      const grouped = {};
      this.reactions.forEach(r => {
        if (!grouped[r.emoji]) {
          grouped[r.emoji] = [];
        }
        grouped[r.emoji].push(r);
      });
      return grouped;
    }
  },
  methods: {
    formatReactorNames(reactors) {
      const names = reactors.map(r => r.userName);
      if (names.length === 1) {
        return names[0];
      } else if (names.length === 2) {
        return `${names[0]} và ${names[1]}`;
      } else if (names.length === 3) {
        return `${names[0]}, ${names[1]} và ${names[2]}`;
      } else {
        return `${names[0]}, ${names[1]} và ${names.length - 2} người khác`;
      }
    },
    
    handleMouseEnter() {
      this.showTooltip = true;
      this.$nextTick(() => {
        this.calculateTooltipPosition();
      });
    },
    
    handleMouseLeave() {
      this.showTooltip = false;
    },
    
    calculateTooltipPosition() {
      if (!this.$refs.reactionsSummary) return;
      
      const rect = this.$refs.reactionsSummary.getBoundingClientRect();
      const tooltipWidth = 280; // max-width của tooltip
      const spacing = 4; // khoảng cách nhỏ giữa tooltip và reactions
      
      // Tính toán vị trí top (hiển thị phía trên, sát reactions)
      let top = rect.top - spacing;
      let showAbove = true;
      
      // Nếu không đủ chỗ phía trên, hiển thị phía dưới
      if (top < 60) {
        top = rect.bottom + spacing;
        showAbove = false;
      }
      
      // Tính toán vị trí left (giữ ở giữa)
      let left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
      
      // Đảm bảo tooltip không tràn ra ngoài màn hình
      if (left < 10) {
        left = 10;
      } else if (left + tooltipWidth > window.innerWidth - 10) {
        left = window.innerWidth - tooltipWidth - 10;
      }
      
      this.tooltipStyle = {
        position: 'fixed',
        left: `${left}px`,
        ...(showAbove ? {
          bottom: `${window.innerHeight - rect.top + spacing}px`,
          transform: 'none'
        } : {
          top: `${top}px`,
          transform: 'none'
        })
      };
    },
    
    handleClick() {
      this.showTooltip = false; // Ẩn tooltip khi click
      this.$emit('show-reactors');
    }
  }
};
</script>

<style scoped>
.reactions-summary {
  position: relative;
  margin-top: 4px;
  margin-left: 0;
  background: white;
  border-radius: 12px;
  padding: 2px 6px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  border: 1.5px solid rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 10;
}

.reactions-summary:hover {
  transform: scale(1.08);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
}

.reactions-icons {
  display: flex;
  align-items: center;
}

.reaction-icon {
  font-size: 14px;
  line-height: 1;
  margin-left: -3px;
  background: white;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: 1px solid white;
}

.reaction-icon:first-child {
  margin-left: 0;
}

.reaction-pop-enter-active {
  animation: reactionPopIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.reaction-pop-leave-active {
  animation: reactionPopOut 0.3s ease;
}

@keyframes reactionPopIn {
  0% {
    opacity: 0;
    transform: scale(0) rotate(-180deg);
  }
  60% {
    transform: scale(1.2) rotate(10deg);
  }
  100% {
    opacity: 1;
    transform: scale(1) rotate(0);
  }
}

@keyframes reactionPopOut {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0);
  }
}

.reactions-count {
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  line-height: 1;
  margin-left: 2px;
}

/* Tooltip */
.reactions-tooltip {
  position: fixed;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(10px);
  color: white;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  min-width: 120px;
  max-width: 280px;
  white-space: normal;
  word-wrap: break-word;
  pointer-events: auto;
  z-index: 10000;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}

.tooltip-fade-enter-active,
.tooltip-fade-leave-active {
  transition: all 0.2s ease;
}

.tooltip-fade-enter-from,
.tooltip-fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

.tooltip-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tooltip-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tooltip-emoji {
  font-size: 14px;
}

.tooltip-names {
  font-weight: 500;
}

/* Responsive */
@media (max-width: 480px) {
  .reactions-summary {
    padding: 2px 5px;
  }
  
  .reaction-icon {
    font-size: 12px;
    width: 16px;
    height: 16px;
  }
  
  .reactions-count {
    font-size: 10px;
  }
}
</style>
