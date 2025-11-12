const mongoose = require('mongoose')

const FollowRequestSchema = new mongoose.Schema(
  {
    fromUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    toUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
  },
  { timestamps: true }
)

// Tạo index để tránh duplicate requests
FollowRequestSchema.index({ fromUser: 1, toUser: 1 }, { unique: true })

module.exports = mongoose.model('FollowRequest', FollowRequestSchema)
