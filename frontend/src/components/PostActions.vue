<template>
  <div class="post-actions">
    <!-- Three-dot menu button -->
    <button 
      class="actions-button"
      @click.prevent.stop="toggleDropdown"
      :class="{ 'active': isDropdownOpen }"
      v-show="canShowActions"
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <circle cx="10" cy="4" r="1.5"/>
        <circle cx="10" cy="10" r="1.5"/>
        <circle cx="10" cy="16" r="1.5"/>
      </svg>
    </button>

    <!-- Dropdown menu - render in body -->
    <teleport to="body">
      <div 
        class="actions-dropdown"
        v-show="isDropdownOpen"
        @click.stop
        :style="dropdownStyle"
      >
        <ul class="actions-list">
          <li class="action-item edit-item" @click.prevent.stop="handleEdit">
            <div class="action-icon-wrapper">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </div>
            <span class="action-text">Chỉnh sửa bài viết</span>
          </li>
          <li class="action-item delete-item" @click.prevent.stop="handleDelete">
            <div class="action-icon-wrapper">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                <line x1="10" y1="11" x2="10" y2="17"/>
                <line x1="14" y1="11" x2="14" y2="17"/>
              </svg>
            </div>
            <span class="action-text">Xóa bài viết</span>
          </li>
        </ul>
      </div>
    </teleport>

    <!-- Overlay to close dropdown when clicking outside -->
    <div 
      class="dropdown-overlay"
      v-show="isDropdownOpen"
      @click="closeDropdown"
    ></div>

    <!-- Delete Confirmation Modal -->
    <teleport to="body">
      <div 
        class="delete-modal-overlay"
        v-show="showDeleteModal"
        @click="cancelDelete"
      >
        <div 
          class="delete-modal"
          @click.stop
        >
          <div class="modal-icon">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          
          <div class="modal-content">
            <h3 class="modal-title">Xóa bài viết?</h3>
            <p class="modal-description">Bạn có chắc chắn muốn xóa bài viết này không?</p>
            <p class="modal-warning">Hành động này không thể hoàn tác.</p>
          </div>
          
          <div class="modal-actions">
            <button 
              class="btn btn-cancel"
              @click="cancelDelete"
            >
              Hủy
            </button>
            <button 
              class="btn btn-delete"
              @click="confirmDelete"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
              Xóa bài viết
            </button>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script>
export default {
  name: 'PostActions',
  props: {
    post: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      isDropdownOpen: false,
      showDeleteModal: false,
      dropdownPosition: {
        top: '0px',
        left: '0px'
      }
    };
  },
  computed: {
    currentUser() {
      return this.$store.state.user;
    },
    canShowActions() {
      // Chỉ hiển thị actions nếu người dùng hiện tại là chủ bài viết
      return this.currentUser && this.post && this.currentUser._id === this.post.userId;
    },
    dropdownStyle() {
      return {
        position: 'fixed',
        top: this.dropdownPosition.top,
        left: this.dropdownPosition.left,
        zIndex: '99999',
        width: '200px'
      };
    }
  },
  methods: {
    toggleDropdown() {
      console.log('Toggle dropdown clicked, current state:', this.isDropdownOpen);
      this.isDropdownOpen = !this.isDropdownOpen;
      console.log('New state:', this.isDropdownOpen);
      
      if (this.isDropdownOpen) {
        this.$nextTick(() => {
          this.adjustDropdownPosition();
        });
      }
    },
    adjustDropdownPosition() {
      console.log('Adjusting dropdown position...');
      const button = this.$el.querySelector('.actions-button');
      
      if (!button) {
        console.log('Button not found');
        return;
      }
      
      this.$nextTick(() => {
        const rect = button.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const windowWidth = window.innerWidth;
        const dropdownHeight = 120;
        const dropdownWidth = 200;
        
        let top, left;
        
        // Calculate horizontal position
        if (rect.right >= dropdownWidth) {
          left = rect.right - dropdownWidth;
        } else {
          left = Math.max(8, rect.left);
        }
        
        // Calculate vertical position
        if (windowHeight - rect.bottom >= dropdownHeight) {
          // Show below
          top = rect.bottom + 4;
        } else {
          // Show above  
          top = rect.top - dropdownHeight - 4;
        }
        
        // Ensure dropdown stays within viewport
        top = Math.max(8, Math.min(top, windowHeight - dropdownHeight - 8));
        left = Math.max(8, Math.min(left, windowWidth - dropdownWidth - 8));
        
        this.dropdownPosition = {
          top: top + 'px',
          left: left + 'px'
        };
        
        console.log('Dropdown position set:', this.dropdownPosition);
      });
    },
    closeDropdown() {
      console.log('Closing dropdown');
      this.isDropdownOpen = false;
    },
    handleEdit() {
      this.closeDropdown();
      this.$emit('edit-post', this.post);
    },
    handleDelete() {
      this.closeDropdown();
      // Hiển thị modal xác nhận xóa
      this.showDeleteModal = true;
    },
    confirmDelete() {
      this.showDeleteModal = false;
      this.$emit('delete-post', this.post);
    },
    cancelDelete() {
      this.showDeleteModal = false;
    },
    handleOutsideClick(event) {
      if (!this.$el.contains(event.target)) {
        this.closeDropdown();
      }
    },
    handleScroll() {
      // Đóng dropdown khi scroll để tránh lỗi positioning
      if (this.isDropdownOpen) {
        this.closeDropdown();
      }
    },
    handleResize() {
      if (this.isDropdownOpen) {
        this.closeDropdown();
      }
    },
    handleEscKey(event) {
      if (event.key === 'Escape') {
        if (this.showDeleteModal) {
          this.cancelDelete();
        } else if (this.isDropdownOpen) {
          this.closeDropdown();
        }
      }
    }
  },
  // Đóng dropdown khi click ra ngoài, scroll hoặc resize
  mounted() {
    document.addEventListener('click', this.handleOutsideClick);
    window.addEventListener('scroll', this.handleScroll, true);
    window.addEventListener('resize', this.handleResize);
    document.addEventListener('keydown', this.handleEscKey);
  },
  beforeUnmount() {
    document.removeEventListener('click', this.handleOutsideClick);
    window.removeEventListener('scroll', this.handleScroll, true);
    window.removeEventListener('resize', this.handleResize);
    document.removeEventListener('keydown', this.handleEscKey);
  }
};
</script>

<style scoped>
.post-actions {
  position: relative;
  display: inline-block;
  contain: layout;
  z-index: 1;
}

.actions-button {
  background: transparent;
  border: none;
  padding: 8px;
  border-radius: 50%;
  cursor: pointer;
  color: #65676b;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  outline: none;
}

.actions-button:hover {
  background-color: rgba(102, 126, 234, 0.1);
  color: #667eea;
}

.actions-button.active {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
  color: #667eea;
}

.actions-dropdown {
  position: fixed;
  background: white;
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
  z-index: 99999;
  width: 220px;
  overflow: hidden;
  animation: dropdownSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes dropdownSlideIn {
  from {
    opacity: 0;
    transform: translateY(-10px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.actions-list {
  list-style: none;
  padding: 6px;
  margin: 0;
}

.action-item {
  display: flex !important;
  align-items: center;
  padding: 12px 14px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 8px;
  margin-bottom: 4px;
  gap: 12px;
  visibility: visible !important;
  opacity: 1 !important;
}

.action-item:last-child {
  margin-bottom: 0;
}

.action-icon-wrapper {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.edit-item .action-icon-wrapper {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  color: #667eea;
}

.delete-item .action-icon-wrapper {
  background: linear-gradient(135deg, rgba(228, 30, 63, 0.1) 0%, rgba(220, 30, 63, 0.1) 100%);
  color: #e41e3f;
}

.action-item:hover {
  transform: translateX(4px);
}

.edit-item:hover {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%);
}

.edit-item:hover .action-icon-wrapper {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  transform: scale(1.1);
}

.delete-item:hover {
  background: linear-gradient(135deg, rgba(228, 30, 63, 0.08) 0%, rgba(220, 30, 63, 0.08) 100%);
}

.delete-item:hover .action-icon-wrapper {
  background: linear-gradient(135deg, #e41e3f 0%, #dc1e3f 100%);
  color: white;
  transform: scale(1.1);
}

.action-text {
  font-size: 15px;
  font-weight: 600;
  color: #1c1e21;
  flex: 1;
}

.dropdown-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 99998;
  background: transparent;
  pointer-events: auto;
}

/* Delete Modal Styles */
.delete-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999999;
  backdrop-filter: blur(4px);
  animation: fadeIn 0.2s ease;
  padding: 20px;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.delete-modal {
  background: white;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 420px;
  width: 100%;
  animation: modalSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
}

@keyframes modalSlideIn {
  from {
    transform: scale(0.9) translateY(20px);
    opacity: 0;
  }
  to {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}

.modal-icon {
  padding: 32px 32px 16px 32px;
  display: flex;
  justify-content: center;
}

.modal-icon svg {
  color: #e41e3f;
  filter: drop-shadow(0 4px 12px rgba(228, 30, 63, 0.2));
}

.modal-content {
  padding: 0 32px 24px 32px;
  text-align: center;
}

.modal-title {
  margin: 0 0 12px 0;
  font-size: 22px;
  font-weight: 700;
  color: #1c1e21;
}

.modal-description {
  margin: 0 0 8px 0;
  color: #65676b;
  font-size: 15px;
  line-height: 1.5;
}

.modal-warning {
  margin: 0;
  color: #e41e3f;
  font-weight: 600;
  font-size: 14px;
}

.modal-actions {
  padding: 20px 32px 32px 32px;
  display: flex;
  gap: 12px;
}

.btn {
  flex: 1;
  padding: 12px 24px;
  border-radius: 12px;
  border: 2px solid transparent;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-cancel {
  background: white;
  color: #65676b;
  border-color: #dadde1;
}

.btn-cancel:hover {
  background: #f0f2f5;
  border-color: #bcc0c4;
  transform: translateY(-2px);
}

.btn-delete {
  background: linear-gradient(135deg, #e41e3f 0%, #dc1e3f 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(228, 30, 63, 0.3);
}

.btn-delete:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(228, 30, 63, 0.4);
}

.btn-delete:active {
  transform: translateY(0);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .actions-dropdown {
    width: 200px;
  }
  
  .action-item {
    padding: 10px 12px;
  }
  
  .action-text {
    font-size: 14px;
  }
  
  .delete-modal {
    margin: 20px;
    max-width: 100%;
  }
  
  .modal-icon {
    padding: 24px 24px 12px 24px;
  }
  
  .modal-icon svg {
    width: 48px;
    height: 48px;
  }
  
  .modal-content {
    padding: 0 24px 20px 24px;
  }
  
  .modal-title {
    font-size: 20px;
  }
  
  .modal-actions {
    padding: 16px 24px 24px 24px;
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .actions-dropdown {
    width: 180px;
  }
  
  .action-icon-wrapper {
    width: 28px;
    height: 28px;
  }
  
  .action-icon-wrapper svg {
    width: 16px;
    height: 16px;
  }
}
</style>