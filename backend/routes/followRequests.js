const router = require('express').Router()
const FollowRequest = require('../models/FollowRequest.js')
const User = require('../models/User.js')
const Notification = require('../models/Notification.js')
const { createNotification } = require('./notifications.js')
const sanitize = require('mongo-sanitize')

// GET PENDING FOLLOW REQUESTS (người nhận xem các yêu cầu gửi đến)
router.get('/:userId/pending', async (req, res) => {
  try {
    const userId = sanitize(req.params.userId)
    
    const requests = await FollowRequest.find({
      toUser: userId,
      status: 'pending'
    })
    .populate('fromUser', 'displayName email profilePicture')
    .sort({ createdAt: -1 })
    
    return res.status(200).json(requests)
  } catch (err) {
    console.error('Get pending requests error:', err)
    return res.status(500).json(err)
  }
})

// GET SENT FOLLOW REQUESTS (người gửi xem các yêu cầu đã gửi)
router.get('/:userId/sent', async (req, res) => {
  try {
    const userId = sanitize(req.params.userId)
    
    const requests = await FollowRequest.find({
      fromUser: userId,
      status: 'pending'
    })
    .populate('toUser', 'displayName email profilePicture')
    .sort({ createdAt: -1 })
    
    return res.status(200).json(requests)
  } catch (err) {
    console.error('Get sent requests error:', err)
    return res.status(500).json(err)
  }
})

// CHECK IF FOLLOW REQUEST EXISTS
router.get('/check/:fromUserId/:toUserId', async (req, res) => {
  try {
    const fromUserId = sanitize(req.params.fromUserId)
    const toUserId = sanitize(req.params.toUserId)
    
    const request = await FollowRequest.findOne({
      fromUser: fromUserId,
      toUser: toUserId,
      status: 'pending'
    })
    
    return res.status(200).json({ 
      exists: !!request,
      request: request 
    })
  } catch (err) {
    console.error('Check request error:', err)
    return res.status(500).json(err)
  }
})

// SEND FOLLOW REQUEST
router.post('/send', async (req, res) => {
  try {
    const fromUserId = sanitize(req.body.fromUserId)
    const toUserId = sanitize(req.body.toUserId)
    
    console.log('Send follow request:', { fromUserId, toUserId })
    
    if (!fromUserId || !toUserId) {
      return res.status(400).json('Missing required fields')
    }
    
    if (fromUserId === toUserId) {
      return res.status(403).json('Cannot send follow request to yourself')
    }
    
    // Kiểm tra xem user có tồn tại không
    const toUser = await User.findById(toUserId)
    if (!toUser) {
      return res.status(404).json('User not found')
    }
    
    // Nếu tài khoản công khai, follow trực tiếp
    if (!toUser.isPrivate) {
      return res.status(400).json('This account is public, follow directly instead')
    }
    
    // Kiểm tra xem đã follow chưa
    if (toUser.followers.includes(fromUserId)) {
      return res.status(403).json('Already following this user')
    }
    
    // Kiểm tra xem đã gửi request chưa
    const existingRequest = await FollowRequest.findOne({
      fromUser: fromUserId,
      toUser: toUserId,
      status: 'pending'
    })
    
    if (existingRequest) {
      return res.status(403).json('Follow request already sent')
    }
    
    // Tạo follow request mới
    const newRequest = new FollowRequest({
      fromUser: fromUserId,
      toUser: toUserId,
      status: 'pending'
    })
    
    await newRequest.save()
    
    // Tạo thông báo
    const fromUser = await User.findById(fromUserId)
    const notification = await createNotification(
      fromUserId,
      toUserId,
      'follow_request',
      null,
      null,
      `${fromUser.displayName || fromUser.email} đã gửi yêu cầu theo dõi bạn`
    )
    
    // Emit WebSocket notification
    if (notification) {
      const io = req.app.get('io')
      if (io) {
        io.emitNewNotification(notification, toUserId)
      }
    }
    
    return res.status(200).json({ 
      message: 'Follow request sent',
      request: newRequest 
    })
  } catch (err) {
    console.error('Send follow request error:', err)
    return res.status(500).json(err)
  }
})

// ACCEPT FOLLOW REQUEST
router.put('/:requestId/accept', async (req, res) => {
  try {
    const requestId = sanitize(req.params.requestId)
    const userId = sanitize(req.body.userId)
    
    const request = await FollowRequest.findById(requestId)
    
    if (!request) {
      return res.status(404).json('Follow request not found')
    }
    
    // Kiểm tra quyền (chỉ người nhận mới có thể chấp nhận)
    if (request.toUser.toString() !== userId) {
      return res.status(403).json('Not authorized')
    }
    
    if (request.status !== 'pending') {
      return res.status(400).json('Request already processed')
    }
    
    // Cập nhật followers và followings
    const toUser = await User.findById(request.toUser)
    const fromUser = await User.findById(request.fromUser)
    
    if (!toUser.followers.includes(request.fromUser)) {
      await toUser.updateOne({ $push: { followers: request.fromUser } })
    }
    
    if (!fromUser.followings.includes(request.toUser)) {
      await fromUser.updateOne({ $push: { followings: request.toUser } })
    }
    
    // Cập nhật status của request
    request.status = 'accepted'
    await request.save()
    
    // Tạo thông báo
    const notification = await createNotification(
      request.toUser,
      request.fromUser,
      'follow_request_accepted',
      null,
      null,
      `${toUser.displayName || toUser.email} đã chấp nhận yêu cầu theo dõi của bạn`
    )
    
    // Emit WebSocket notification
    if (notification) {
      const io = req.app.get('io')
      if (io) {
        io.emitNewNotification(notification, request.fromUser)
      }
    }
    
    return res.status(200).json({ 
      message: 'Follow request accepted',
      request 
    })
  } catch (err) {
    console.error('Accept follow request error:', err)
    return res.status(500).json(err)
  }
})

// REJECT FOLLOW REQUEST
router.put('/:requestId/reject', async (req, res) => {
  try {
    const requestId = sanitize(req.params.requestId)
    const userId = sanitize(req.body.userId)
    
    const request = await FollowRequest.findById(requestId)
    
    if (!request) {
      return res.status(404).json('Follow request not found')
    }
    
    // Kiểm tra quyền
    if (request.toUser.toString() !== userId) {
      return res.status(403).json('Not authorized')
    }
    
    if (request.status !== 'pending') {
      return res.status(400).json('Request already processed')
    }
    
    // Lấy thông tin user để tạo thông báo
    const toUser = await User.findById(request.toUser)
    
    // Tạo thông báo cho người gửi yêu cầu
    const notification = await createNotification(
      request.toUser,
      request.fromUser,
      'follow_request_rejected',
      null,
      null,
      `${toUser.displayName || toUser.email} đã từ chối yêu cầu theo dõi của bạn`
    )
    
    // Emit WebSocket notification
    if (notification) {
      const io = req.app.get('io')
      if (io) {
        io.emitNewNotification(notification, request.fromUser)
      }
    }
    
    // Xóa request
    await FollowRequest.findByIdAndDelete(requestId)
    
    return res.status(200).json({ message: 'Follow request rejected' })
  } catch (err) {
    console.error('Reject follow request error:', err)
    return res.status(500).json(err)
  }
})

// CANCEL FOLLOW REQUEST (người gửi hủy yêu cầu)
router.delete('/:requestId/cancel', async (req, res) => {
  try {
    const requestId = sanitize(req.params.requestId)
    const userId = sanitize(req.body.userId)
    
    const request = await FollowRequest.findById(requestId)
    
    if (!request) {
      return res.status(404).json('Follow request not found')
    }
    
    // Kiểm tra quyền (chỉ người gửi mới có thể hủy)
    if (request.fromUser.toString() !== userId) {
      return res.status(403).json('Not authorized')
    }
    
    if (request.status !== 'pending') {
      return res.status(400).json('Request already processed')
    }
    
    await FollowRequest.findByIdAndDelete(requestId)
    
    return res.status(200).json({ message: 'Follow request cancelled' })
  } catch (err) {
    console.error('Cancel follow request error:', err)
    return res.status(500).json(err)
  }
})

module.exports = router
