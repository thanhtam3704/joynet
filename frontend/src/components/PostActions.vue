<template>
  <div class="post-actions">
    <!-- Three-dot menu button -->
    <button 
      class="actions-button"
      @click.prevent.stop="toggleDropdown"
      :class="{ 'active': isDropdownOpen }"
      v-show="canShowActions"
    >
      <span class="dots">⋯</span>
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
          <li class="action-item" @click.prevent.stop="handleEdit">
            <span class="action-icon">✏️</span>
            <span class="action-text">Chỉnh sửa bài viết</span>
          </li>
          <li class="action-item danger" @click.prevent.stop="handleDelete">
            <span class="action-icon">🗑️</span>
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
          <div class="modal-header">
            <h3>Xác nhận xóa bài viết</h3>
          </div>
          
          <div class="modal-body">
            <div class="warning-icon">⚠️</div>
            <p>Bạn có chắc chắn muốn xóa bài viết này không?</p>
            <p class="warning-text">Hành động này không thể hoàn tác.</p>
          </div>
          
          <div class="modal-footer">
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
  /* Prevent scroll when interacting */
  contain: layout;
  /* Ensure proper stacking context */
  z-index: 1;
}

.actions-button {
  background: transparent;
  border: none;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  color: #65676b;
  font-size: 16px;
  transition: background-color 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  height: 36px;
  /* Prevent scroll when focused */
  scroll-margin: 0;
  outline: none;
}

.actions-button:hover {
  background-color: #f0f2f5;
}

.actions-button.active {
  background-color: #e4e6ea;
}

.dots {
  font-weight: bold;
  line-height: 1;
  display: inline-block;
}

.actions-dropdown {
  position: fixed;
  background: white;
  border: 1px solid #dadde1;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  z-index: 99999;
  width: 200px;
  /* Ensure both items are always visible */
  height: auto;
  min-height: 96px;
  overflow: visible;
}

.actions-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.action-item {
  display: flex !important;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  border-bottom: 1px solid #f0f2f5;
  min-height: 48px;
  width: 100%;
  box-sizing: border-box;
  /* Force visibility */
  visibility: visible !important;
  opacity: 1 !important;
}

.action-item:last-child {
  border-bottom: none;
}

.action-item:hover {
  background-color: #f0f2f5;
}

.action-item.danger:hover {
  background-color: #ffebee;
}

.action-icon {
  margin-right: 12px;
  font-size: 16px;
  width: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-text {
  font-size: 15px;
  font-weight: 500;
  color: #1c1e21;
  flex: 1;
}

.action-item.danger .action-text {
  color: #e41e3f;
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
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999999;
  backdrop-filter: blur(2px);
}

.delete-modal {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  max-width: 400px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  animation: modalSlideIn 0.3s ease;
}

@keyframes modalSlideIn {
  from {
    transform: scale(0.9) translateY(-20px);
    opacity: 0;
  }
  to {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}

.modal-header {
  padding: 24px 24px 16px 24px;
  border-bottom: 1px solid #f0f2f5;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1c1e21;
}

.modal-body {
  padding: 20px 24px;
  text-align: center;
}

.warning-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.modal-body p {
  margin: 8px 0;
  color: #1c1e21;
  font-size: 15px;
  line-height: 1.4;
}

.warning-text {
  color: #e41e3f !important;
  font-weight: 500;
  font-size: 14px !important;
}

.modal-footer {
  padding: 16px 24px 24px 24px;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn {
  padding: 10px 20px;
  border-radius: 6px;
  border: none;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 100px;
}

.btn-cancel {
  background: #f0f2f5;
  color: #1c1e21;
}

.btn-cancel:hover {
  background: #e4e6ea;
}

.btn-delete {
  width: 35%;
  background: #e41e3f;
  color: white;
}

.btn-delete:hover {
  background: #d91e3f;
  transform: translateY(-1px);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .actions-dropdown {
    right: -8px;
    min-width: 180px;
  }
  
  .action-item {
    padding: 10px 12px;
  }
  
  .action-text {
    font-size: 14px;
  }
  
  .delete-modal {
    width: 95%;
    margin: 20px;
  }
  
  .modal-footer {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
  }
}
</style>