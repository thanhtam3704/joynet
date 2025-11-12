const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  fromUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  toUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['like', 'comment', 'follow', 'follow_request', 'follow_request_accepted', 'message', 'post', 'system'],
    required: true
  },
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    default: null
  },
  commentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  message: {
    type: String,
    default: ''
  },
  reactionType: {
    type: String,
    enum: ['like', 'love', 'haha', 'wow', 'sad', 'angry', null],
    default: null
  },
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index để tối ưu hóa query theo user và thời gian
NotificationSchema.index({ toUser: 1, createdAt: -1 });
NotificationSchema.index({ toUser: 1, isRead: 1 });

module.exports = mongoose.model('Notification', NotificationSchema);