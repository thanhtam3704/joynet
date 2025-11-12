<template>
  <div class="reactions-summary" v-if="showSummary">
    <div class="reactions-left">
      <!-- Reactions Icons + Count -->
      <div class="reactions-icons-wrapper" v-if="totalReactions > 0">
        <div class="reactions-icons">
          <div
            v-for="reaction in topReactions"
            :key="reaction.type"
            class="reaction-icon-container"
            @mouseenter="loadReactorPreview(reaction.type, $event)"
            @mouseleave="hideReactorPreview"
          >
            <button
              class="reaction-icon-btn"
              :title="`${reaction.count} ${getReactionLabel(reaction.type)}`"
              @click="$emit('show-reactors', reaction.type)"
            >
              <span class="reaction-emoji-small">{{ getReactionEmoji(reaction.type) }}</span>
            </button>
          </div>
        </div>
        <button class="reactions-count" @click="$emit('show-all-reactors')">
          {{ totalReactions }}
        </button>
      </div>
    </div>

    <!-- Comments Count (right side) -->
    <div class="reactions-right" v-if="totalComments > 0">
      <button 
        class="comments-count" 
        @click="$emit('show-comments')"
        @mouseenter="loadCommentersPreview($event)"
        @mouseleave="hideCommentersPreview"
      >
        {{ totalComments }} bình luận
      </button>
    </div>
    
    <!-- Tooltip preview - render outside at body level -->
    <Teleport to="body">
      <div
        v-if="reactorPreview.show"
        class="reactor-tooltip"
        :style="{
          left: reactorPreview.x + 'px',
          top: reactorPreview.y + 'px',
        }"
      >
        <div v-if="reactorPreview.loading" class="tooltip-loading">
          Đang tải...
        </div>
        <div v-else-if="reactorPreview.reactors && reactorPreview.reactors.length > 0" class="tooltip-content">
          <div
            v-for="(reactor, index) in reactorPreview.reactors.slice(0, 3)"
            :key="reactor._id || index"
            class="tooltip-reactor"
            :title="reactor.username"
          >
            {{ reactor.username }}
          </div>
          <div
            v-if="reactorPreview.total > 3"
            class="tooltip-more"
          >
            và {{ reactorPreview.total - 3 }} người khác
          </div>
        </div>
        <div v-else class="tooltip-loading">
          Chưa có ai react
        </div>
      </div>
      
      <!-- Commenters tooltip -->
      <div
        v-if="commentersPreview.show"
        class="commenters-tooltip"
        :style="{
          left: commentersPreview.x + 'px',
          top: commentersPreview.y + 'px',
        }"
      >
        <div v-if="commentersPreview.loading" class="tooltip-loading">
          Đang tải...
        </div>
        <div v-else-if="commentersPreview.commenters && commentersPreview.commenters.length > 0" class="tooltip-content">
          <div
            v-for="(commenter, index) in commentersPreview.commenters.slice(0, 3)"
            :key="commenter._id || index"
            class="tooltip-commenter"
            :title="commenter.username"
          >
            {{ commenter.username }}
          </div>
          <div
            v-if="commentersPreview.total > 3"
            class="tooltip-more"
          >
            và {{ commentersPreview.total - 3 }} người khác
          </div>
        </div>
        <div v-else class="tooltip-loading">
          Chưa có bình luận nào
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script>
import { getReactors, getCommenters } from "@/api/posts";

export default {
  name: "ReactionsSummary",
  props: {
    postId: {
      type: String,
      required: true,
    },
    reactionsCount: {
      type: Object,
      default: () => ({}),
    },
    totalLikes: {
      type: Number,
      default: 0,
    },
    totalComments: {
      type: Number,
      default: 0,
    },
  },
  emits: ["show-reactors", "show-all-reactors", "show-comments"],
  data() {
    return {
      reactorPreview: {
        show: false,
        type: null,
        loading: false,
        reactors: [],
        total: 0,
        x: 0,
        y: 0,
      },
      commentersPreview: {
        show: false,
        loading: false,
        commenters: [],
        total: 0,
        x: 0,
        y: 0,
      },
      hideTimeout: null,
      hideCommentersTimeout: null,
    };
  },
  mounted() {
    console.log('ReactionsSummary mounted:', {
      reactionsCount: this.reactionsCount,
      totalLikes: this.totalLikes,
      totalComments: this.totalComments
    });
  },
  watch: {
    reactionsCount: {
      deep: true,
      handler(newVal) {
        console.log('ReactionsSummary - reactionsCount changed:', newVal);
      }
    },
    totalLikes(newVal) {
      console.log('ReactionsSummary - totalLikes changed:', newVal);
    }
  },
  computed: {
    totalReactions() {
      const total = this.totalLikes || Object.values(this.reactionsCount).reduce((sum, count) => sum + count, 0);
      console.log('totalReactions computed:', {
        totalLikes: this.totalLikes,
        reactionsCount: this.reactionsCount,
        total
      });
      return total;
    },
    showSummary() {
      return this.totalReactions > 0 || this.totalComments > 0;
    },
    topReactions() {
      // Debug: Log reactionsCount trước khi filter
      console.log('🔍 topReactions input:', {
        reactionsCount: this.reactionsCount,
        entries: Object.entries(this.reactionsCount || {})
      });

      // Lấy các reactions có count > 0 và sort theo count giảm dần
      const reactions = Object.entries(this.reactionsCount || {})
        .filter(([type, count]) => {
          // Chuyển count thành số và kiểm tra > 0
          const numCount = Number(count) || 0;
          const isValid = numCount > 0;
          console.log(`  ${type}: ${count} (${numCount}) → ${isValid ? 'KEEP' : 'REMOVE'}`);
          return isValid;
        })
        .map(([type, count]) => ({ type, count: Number(count) || 0 }))
        .sort((a, b) => b.count - a.count);
      
      console.log('✅ topReactions output:', reactions);
      
      // Lấy tối đa 3 reactions đầu
      return reactions.slice(0, 3);
    },
  },
  methods: {
    async loadReactorPreview(reactionType, event) {
      clearTimeout(this.hideTimeout);
      
      // Tính toán vị trí tooltip
      if (event && event.target) {
        const rect = event.target.getBoundingClientRect();
        this.reactorPreview.x = rect.left + rect.width / 2;
        this.reactorPreview.y = rect.top;
      }
      
      this.reactorPreview.show = true;
      this.reactorPreview.type = reactionType;
      this.reactorPreview.loading = true;

      console.log('🔍 Loading reactor preview:', {
        postId: this.postId,
        reactionType
      });

      try {
        const response = await getReactors(this.postId, reactionType);
        console.log('✅ Full API Response:', response);
        console.log('✅ Response Data:', response.data);
        console.log('✅ Reactors Array:', response.data.reactors);
        
        if (response.status === 200) {
          this.reactorPreview.reactors = response.data.reactors || [];
          this.reactorPreview.total = response.data.count || 0;
          
          console.log('✅ Reactors loaded:', {
            count: this.reactorPreview.total,
            reactors: this.reactorPreview.reactors,
            firstReactor: this.reactorPreview.reactors[0]
          });
        }
      } catch (error) {
        console.error("❌ Load reactor preview error:", error);
        console.error("Error response:", error.response?.data);
      } finally {
        this.reactorPreview.loading = false;
      }
    },
    hideReactorPreview() {
      this.hideTimeout = setTimeout(() => {
        this.reactorPreview.show = false;
        this.reactorPreview.type = null;
      }, 200);
    },
    async loadCommentersPreview(event) {
      // Clear any pending hide timeout
      if (this.hideCommentersTimeout) {
        clearTimeout(this.hideCommentersTimeout);
      }
      
      // Position tooltip
      if (event) {
        const rect = event.target.getBoundingClientRect();
        this.commentersPreview.x = rect.left + rect.width / 2;
        this.commentersPreview.y = rect.top;
      }
      
      this.commentersPreview.show = true;
      this.commentersPreview.loading = true;

      console.log('🔍 Loading commenters preview:', {
        postId: this.postId,
        totalComments: this.totalComments
      });

      try {
        const response = await getCommenters(this.postId);
        console.log('✅ Full Commenters Response:', {
          status: response.status,
          data: response.data,
          commenters: response.data?.commenters,
          count: response.data?.count,
          totalComments: response.data?.totalComments
        });
        
        if (response.status === 200 && response.data) {
          // Force Vue reactivity by creating new objects
          this.commentersPreview = {
            ...this.commentersPreview,
            commenters: response.data.commenters || [],
            total: response.data.count || 0,
            loading: false
          };
          
          console.log('✅ Commenters state updated:', {
            commentersArray: this.commentersPreview.commenters,
            commentersLength: this.commentersPreview.commenters.length,
            total: this.commentersPreview.total,
            showCondition: this.commentersPreview.commenters && this.commentersPreview.commenters.length > 0
          });
          
          // Force re-render
          this.$forceUpdate();
        }
      } catch (error) {
        console.error("❌ Load commenters preview error:", error);
        console.error("Error response:", error.response?.data);
        this.commentersPreview.loading = false;
      } finally {
        console.log('🏁 Loading finished, current state:', {
          loading: this.commentersPreview.loading,
          show: this.commentersPreview.show,
          commentersCount: this.commentersPreview.commenters.length
        });
      }
    },
    hideCommentersPreview() {
      this.hideCommentersTimeout = setTimeout(() => {
        this.commentersPreview.show = false;
      }, 200);
    },
    getReactionEmoji(reactionType) {
      const emojiMap = {
        like: "👍",
        love: "❤️",
        haha: "😂",
        wow: "😮",
        sad: "😢",
        angry: "😠",
      };
      return emojiMap[reactionType] || "👍";
    },
    getReactionLabel(reactionType) {
      const labelMap = {
        like: "Thích",
        love: "Yêu thích",
        haha: "Haha",
        wow: "Wow",
        sad: "Buồn",
        angry: "Phẫn nộ",
      };
      return labelMap[reactionType] || "Thích";
    },
  },
};
</script>

<style scoped>
.reactions-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgba(102, 126, 234, 0.1);
  min-height: 48px;
  position: relative;
  overflow: visible;
}

.reactions-left {
  flex: 1;
  overflow: visible;
}

.reactions-icons-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  overflow: visible;
}

.reactions-icons {
  display: flex;
  align-items: center;
  margin-right: -8px; /* Compensate for overlap */
  overflow: visible;
  position: relative;
}

.reaction-icon-container {
  position: relative;
  display: inline-block;
  z-index: 1;
  overflow: visible;
}

.reaction-icon-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: white;
  border: 2px solid white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 1;
}

.reaction-icon-btn:hover {
  transform: scale(1.2) translateY(-2px);
  z-index: 2;
  box-shadow: 0 4px 8px rgba(102, 126, 234, 0.2);
}

.reaction-icon-container:not(:first-child) .reaction-icon-btn {
  margin-left: -8px; /* Overlap effect */
}

.reactor-tooltip {
  position: fixed;
  background: rgba(28, 28, 30, 0.98);
  color: white;
  padding: 0.625rem 0.875rem;
  border-radius: 10px;
  font-size: 0.8125rem;
  white-space: normal;
  word-wrap: break-word;
  word-break: break-word;
  z-index: 99999;
  min-width: 140px;
  max-width: 280px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3);
  animation: tooltipFadeIn 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
  transform: translate(-50%, calc(-100% - 12px));
}

@keyframes tooltipFadeIn {
  from {
    opacity: 0;
    transform: translate(-50%, calc(-100% - 8px));
  }
  to {
    opacity: 1;
    transform: translate(-50%, calc(-100% - 12px));
  }
}

.tooltip-loading {
  text-align: center;
  padding: 0.125rem 0;
  font-size: 0.6875rem;
  opacity: 0.85;
  color: rgba(255, 255, 255, 0.9);
  white-space: nowrap;
}

.tooltip-content {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  max-width: 100%;
  overflow: hidden;
}

.tooltip-reactor {
  padding: 0.25rem 0;
  font-weight: 500;
  color: white;
  font-size: 0.8125rem;
  white-space: normal;
  word-wrap: break-word;
  word-break: break-word;
  overflow: visible;
  line-height: 1.4;
}

.tooltip-reactor:first-child {
  padding-top: 0;
}

.tooltip-reactor:last-of-type {
  padding-bottom: 0;
}

.tooltip-more {
  padding: 0.25rem 0 0 0;
  margin-top: 0.25rem;
  border-top: 1px solid rgba(255, 255, 255, 0.15);
  font-size: 0.6875rem;
  opacity: 0.75;
  color: rgba(255, 255, 255, 0.85);
  font-style: italic;
  white-space: normal;
  word-wrap: break-word;
  overflow: visible;
  text-overflow: clip;
}

.reaction-emoji-small {
  font-size: 1rem;
  line-height: 1;
}

.reactions-count {
  font-size: 0.875rem;
  color: #6b7280;
  cursor: pointer;
  background: none;
  border: none;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  transition: all 0.2s ease;
  font-weight: 500;
}

.reactions-count:hover {
  text-decoration: underline;
  color: #667eea;
}

.reactions-right {
  display: flex;
  align-items: center;
}

.comments-count {
  font-size: 0.875rem;
  color: #6b7280;
  cursor: pointer;
  background: none;
  border: none;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  transition: all 0.2s ease;
  font-weight: 500;
}

.comments-count:hover {
  text-decoration: underline;
  color: #667eea;
}

/* Commenters Tooltip */
.commenters-tooltip {
  position: fixed;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0.625rem 0.875rem;
  border-radius: 12px;
  font-size: 0.875rem;
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.35),
              0 4px 12px rgba(118, 75, 162, 0.25);
  z-index: 99999;
  pointer-events: none;
  transform: translate(-50%, calc(-100% - 12px));
  min-width: 140px;
  max-width: 280px;
  animation: tooltipFadeIn 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.commenters-tooltip .tooltip-loading {
  text-align: center;
  padding: 0.125rem 0;
  font-size: 0.6875rem;
  opacity: 0.85;
  color: rgba(255, 255, 255, 0.9);
  white-space: nowrap;
}

.commenters-tooltip .tooltip-content {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  max-width: 100%;
  overflow: hidden;
}

.tooltip-commenter {
  padding: 0.25rem 0;
  font-weight: 500;
  color: white;
  font-size: 0.8125rem;
  white-space: normal;
  word-wrap: break-word;
  word-break: break-word;
  overflow: visible;
  line-height: 1.4;
}

.tooltip-commenter:first-child {
  padding-top: 0;
}

.tooltip-commenter:last-of-type {
  padding-bottom: 0;
}

.commenters-tooltip .tooltip-more {
  padding: 0.25rem 0 0 0;
  margin-top: 0.25rem;
  border-top: 1px solid rgba(255, 255, 255, 0.15);
  font-size: 0.6875rem;
  opacity: 0.75;
  color: rgba(255, 255, 255, 0.85);
  font-style: italic;
  white-space: normal;
  word-wrap: break-word;
  overflow: visible;
  text-overflow: clip;
}


/* ========== RESPONSIVE DESIGN ========== */

@media (max-width: 768px) {
  .reactions-summary {
    padding: 0.6rem 0.875rem;
    min-height: 42px;
  }

  .reaction-icon-btn {
    width: 24px;
    height: 24px;
  }

  .reaction-emoji-small {
    font-size: 0.875rem;
  }

  .reactions-count,
  .comments-count {
    font-size: 0.8125rem;
  }
}

@media (max-width: 480px) {
  .reactions-summary {
    padding: 0.5rem 0.75rem;
    min-height: 38px;
  }

  .reaction-icon-btn {
    width: 22px;
    height: 22px;
  }

  .reaction-emoji-small {
    font-size: 0.8125rem;
  }

  .reactions-count,
  .comments-count {
    font-size: 0.75rem;
  }

  .reaction-icon-btn:not(:first-child) {
    margin-left: -6px;
  }
}
</style>
