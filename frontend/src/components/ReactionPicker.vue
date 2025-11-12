<template>
  <div class="reaction-picker">
    <button
      v-for="reaction in reactions"
      :key="reaction.type"
      class="reaction-btn"
      :title="reaction.label"
      @click="$emit('select', reaction.type)"
    >
      <span class="reaction-emoji">{{ reaction.emoji }}</span>
    </button>
  </div>
</template>

<script>
export default {
  name: "ReactionPicker",
  emits: ["select"],
  data() {
    return {
      reactions: [
        { type: "like", emoji: "👍", label: "Thích" },
        { type: "love", emoji: "❤️", label: "Yêu thích" },
        { type: "haha", emoji: "😂", label: "Haha" },
        { type: "wow", emoji: "😮", label: "Wow" },
        { type: "sad", emoji: "😢", label: "Buồn" },
        { type: "angry", emoji: "😠", label: "Phẫn nộ" },
      ],
    };
  },
};
</script>

<style scoped>
.reaction-picker {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0;
  display: flex;
  gap: 0.375rem;
  padding: 0.5rem 0.625rem;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(102, 126, 234, 0.15);
  border-radius: 50px;
  box-shadow: 
    0 8px 24px rgba(102, 126, 234, 0.15),
    0 4px 12px rgba(118, 75, 162, 0.1);
  animation: popIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  z-index: 100;
}

@keyframes popIn {
  0% {
    opacity: 0;
    transform: translateY(10px) scale(0.9);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.reaction-btn {
  background: none;
  border: none;
  padding: 0.375rem;
  cursor: pointer;
  border-radius: 50%;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.reaction-btn:hover {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%);
  transform: scale(1.35);
}

.reaction-btn:active {
  transform: scale(1.15);
}

.reaction-emoji {
  font-size: 1.5rem;
  line-height: 1;
  filter: grayscale(0.2);
  transition: filter 0.2s ease;
}

.reaction-btn:hover .reaction-emoji {
  filter: grayscale(0);
}

/* ========== RESPONSIVE DESIGN ========== */

@media (max-width: 768px) {
  .reaction-picker {
    gap: 0.25rem;
    padding: 0.4rem 0.5rem;
  }

  .reaction-btn {
    padding: 0.3rem;
  }

  .reaction-emoji {
    font-size: 1.35rem;
  }
}

@media (max-width: 480px) {
  .reaction-picker {
    gap: 0.2rem;
    padding: 0.35rem 0.4rem;
    bottom: calc(100% + 6px);
  }

  .reaction-btn {
    padding: 0.25rem;
  }

  .reaction-emoji {
    font-size: 1.25rem;
  }

  .reaction-btn:hover {
    transform: scale(1.25);
  }
}
</style>
