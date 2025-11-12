<template>
  <teleport to="body">
    <transition name="modal-fade">
      <div class="modal-overlay" @click.self="$emit('close')">
        <div class="modal-container">
          <div class="modal-header">
            <h3> Yêu cầu theo dõi</h3>
            <button class="close-button" @click="$emit('close')">×</button>
          </div>
          
          <div class="modal-body">
            <FollowRequestsList 
              @request-handled="handleRequestUpdate"
            />
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script>
import FollowRequestsList from '@/components/FollowRequestsList.vue'

export default {
  name: 'FollowRequestsModal',
  components: {
    FollowRequestsList,
  },
  methods: {
    handleRequestUpdate() {
      // Emit event lên parent để cập nhật count
      this.$emit('request-updated')
    },
  },
}
</script>

<style lang="scss" scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(17, 24, 39, 0.85);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99999;
  padding: 1rem;
  animation: fadeIn 0.2s ease;
}

.modal-container {
  width: 95%;
  max-width: 500px;
  max-height: 80vh;
  background: linear-gradient(135deg, #ffffff 0%, #fafafa 100%);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25), 
              0 0 0 1px rgba(226, 232, 240, 0.6);
  animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    transform: translateY(30px) scale(0.95);
    opacity: 0;
  }
  to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(226, 232, 240, 0.8);
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.03) 0%, rgba(118, 75, 162, 0.03) 100%);
}

.modal-header h3 {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
  flex: 1;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.close-button {
  background: #f1f5f9;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #64748b;
  padding: 0;
  line-height: 1;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  font-weight: 300;
}

.close-button:hover {
  background: #e2e8f0;
  color: #475569;
  transform: rotate(90deg);
}

.modal-body {
  max-height: calc(80vh - 80px);
  overflow-y: auto;
  background: white;
  padding: 0;
}

/* Ẩn header của FollowRequestsList vì đã có header ở modal */
.modal-body ::v-deep .requests-card {
  box-shadow: none;
  border-radius: 0;
  padding: 1rem 1.5rem;
}

.modal-body ::v-deep .requests-header {
  display: none;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

/* Tùy chỉnh thanh cuộn */
.modal-body::-webkit-scrollbar {
  width: 6px;
}

.modal-body::-webkit-scrollbar-track {
  background: transparent;
}

.modal-body::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 10px;
}

.modal-body::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, #5568d3 0%, #63428b 100%);
}

@media (max-width: 640px) {
  .modal-container {
    max-width: 100%;
    max-height: 90vh;
    border-radius: 16px 16px 0 0;
    margin-top: auto;
  }
  
  .modal-header {
    padding: 1rem 1.25rem;
  }
  
  .modal-header h3 {
    font-size: 1.125rem;
  }
  
  .modal-body ::v-deep .requests-card {
    padding: 0.75rem 1rem;
  }
}
</style>
