const router = require('express').Router()
const User = require('../models/User.js')
const Notification = require('../models/Notification.js')
const sanitize = require('mongo-sanitize')

//GET ALL USERS
router.get('/', async (req, res) => {
  try {
    const getUsers = await User.find() //find all
    return res.status(200).json(getUsers)
  } catch (err) {
    return res.status(500).json(err)
  }
})

//GET USER
router.get('/:userId', async (req, res) => {
  try {
    const userId = sanitize(req.sanitize(req.params.userId))
    
    // Validate ObjectId format
    if (!userId || !userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid user ID format' })
    }

    const getUser = await User.findById(userId) //findById by params
    
    if (!getUser) {
      return res.status(404).json({ error: 'User not found' })
    }
    
    const { password, updatedAt, ...other } = getUser._doc //do not show password and upadtedAt datas
    return res.status(200).json(other)
  } catch (err) {
    console.error('Get user error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

//FOLLOW A USER
router.put('/:id/follow', async (req, res) => {
  if (req.body.userId !== req.params.id) {
    try {
      const user = await User.findById(req.params.id)
      const currentUser = await User.findById(req.body.userId)
      if (!user.followers.includes(req.body.userId)) {
        await user.updateOne({ $push: { followers: req.body.userId } }) //add current user to user's followers
        await currentUser.updateOne({ $push: { followings: req.params.id } }) //add user to current user's followings
        
        // Tạo thông báo follow
        const newNotification = new Notification({
          fromUser: req.body.userId,
          toUser: req.params.id,
          type: 'follow',
          message: `${currentUser.displayName || currentUser.email} đã theo dõi bạn`
        })
        await newNotification.save()

        // Emit WebSocket notification
        const io = req.app.get('io');
        if (io) {
          await newNotification.populate('fromUser', 'displayName profilePicture email');
          io.emitNewNotification(newNotification, req.params.id);
        }
        
        return res.status(200).json('user has been followed')
      } else {
        return res.status(403).json('you already follow this user')
      }
    } catch (err) {
      return res.status(500).json(err)
    }
  } else {
    return res.status(403).json('you cant follow yourself')
  }
})

//UNFOLLOW A USER
router.put('/:id/unfollow', async (req, res) => {
  if (req.body.userId !== req.params.id) {
    try {
      const user = await User.findById(req.params.id)
      const currentUser = await User.findById(req.body.userId)
      if (user.followers.includes(req.body.userId)) {
        await user.updateOne({ $pull: { followers: req.body.userId } }) //delete current user from user's followers
        await currentUser.updateOne({ $pull: { followings: req.params.id } }) //delete user from current user's followings
        
        // Xóa thông báo follow cũ
        await Notification.deleteOne({
          fromUser: req.body.userId,
          toUser: req.params.id,
          type: 'follow'
        })
        
        return res.status(200).json('user has been unfollowed')
      } else {
        return res.status(403).json('you dont follow this user')
      }
    } catch (err) {
      return res.status(500).json(err)
    }
  } else {
    return res.status(403).json('you cant unfollow yourself')
  }
})

//UPDATE A USER
router.put('/:id/edit', async (req, res) => {
  try {
    const sanitizedDisplayName = sanitize(req.sanitize(req.body.displayName))
    const sanitizedDesc = sanitize(req.sanitize(req.body.description))
    const sanitizedBirthDate = sanitize(req.sanitize(req.body.birthDate))
    const sanitizedHobbies = sanitize(req.sanitize(req.body.hobbies))
    const sanitizedProfilePicture = sanitize(
      req.sanitize(req.body.profilePicture)
    )

    const getUser = await User.findById(req.params.id)

    // Chuẩn bị object update
    const updateData = {
      displayName: sanitizedDisplayName,
      description: sanitizedDesc,
      birthDate: sanitizedBirthDate,
      hobbies: sanitizedHobbies,
    }

    // Chỉ cập nhật profilePicture nếu có giá trị mới
    if (sanitizedProfilePicture) {
      updateData.profilePicture = sanitizedProfilePicture
    }

    await getUser.updateOne({ $set: updateData })
    return res.status(200).json({ msg: 'user has been updated' })
  } catch (err) {
    return res.status(500).json(err)
  }
})

//CHANGE PASSWORD
router.put('/:id/change-password', async (req, res) => {
  try {
    const bcrypt = require('bcrypt')
    const userId = sanitize(req.sanitize(req.params.id))
    const sanitizedCurrentPassword = sanitize(req.sanitize(req.body.currentPassword))
    const sanitizedNewPassword = sanitize(req.sanitize(req.body.newPassword))

    // Validate input
    if (!sanitizedCurrentPassword || !sanitizedNewPassword) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ thông tin' })
    }

    if (sanitizedNewPassword.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự' })
    }

    // Find user
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ error: 'Người dùng không tồn tại' })
    }

    // Check if user logged in with Google
    if (user.password === 'GOOGLE_AUTH') {
      return res.status(400).json({ error: 'Tài khoản Google không thể đổi mật khẩu' })
    }

    // Verify current password
    const validPassword = await bcrypt.compare(sanitizedCurrentPassword, user.password)
    if (!validPassword) {
      return res.status(400).json({ error: 'Mật khẩu hiện tại không đúng' })
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(sanitizedNewPassword, salt)

    // Update password
    await user.updateOne({ $set: { password: hashedPassword } })

    return res.status(200).json({ message: 'Đổi mật khẩu thành công' })
  } catch (err) {
    console.error('Change password error:', err)
    return res.status(500).json({ error: 'Lỗi server' })
  }
})

module.exports = router
