const router = require('express').Router()
const User = require('../models/User.js')
const Notification = require('../models/Notification.js')
const { createNotification } = require('./notifications.js')
const sanitize = require('mongo-sanitize')
const mongoose = require('mongoose')

// Middleware verify token
const verifyToken = (req, res, next) => {
  const token = req.headers.token;
  if (!token) return res.status(401).json({ error: 'Access denied' });
  
  try {
    const jwt = require('jsonwebtoken');
    const verified = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    req.user = { id: verified.userId };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

//GET SUGGESTED CONTACTS (following + recent contacts)
router.get('/suggested/contacts', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 5; // Mặc định 5 người
    const offset = parseInt(req.query.offset) || 0; // Offset cho pagination
    const Message = require('../models/Message.js');
    const Conversation = require('../models/Conversation.js');
    
    const currentUser = await User.findById(userId);
    if (!currentUser) return res.status(404).json({ error: 'User not found' });

    const following = currentUser.followings || [];
    
    // Tìm conversations để biết đã nhắn tin với ai
    const conversations = await Conversation.find({
      participants: userId,
      isActive: true
    }).populate('participants', '_id displayName profilePicture isOnline lastSeen');
    
    const contactMap = new Map();
    
    // Lấy tất cả user IDs từ conversations
    for (const conv of conversations) {
      for (const p of conv.participants) {
        if (p._id.toString() !== userId) {
          // Tìm tin nhắn gần nhất trong conversation này
          const lastMsg = await Message.findOne({
            conversationId: conv._id
          }).sort({ createdAt: -1 });
          
          const isFollowing = following.some(f => f.toString() === p._id.toString());
          
          contactMap.set(p._id.toString(), {
            user: p,
            lastInteraction: lastMsg?.createdAt || new Date(0),
            isFollowing: isFollowing,
            score: isFollowing ? 100 : 50
          });
        }
      }
    }
    
    // Thêm những người đang follow nhưng chưa nhắn tin
    for (const followingId of following) {
      const idStr = followingId.toString();
      if (!contactMap.has(idStr)) {
        const user = await User.findById(followingId)
          .select('displayName profilePicture isOnline lastSeen');
        if (user) {
          contactMap.set(idStr, {
            user: user,
            lastInteraction: new Date(0),
            isFollowing: true,
            score: 100
          });
        }
      }
    }
    
    // Sắp xếp: Following trước, sau đó theo thời gian tương tác
    const sortedContacts = Array.from(contactMap.values()).sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return b.lastInteraction - a.lastInteraction;
    });
    
    // Áp dụng pagination
    const total = sortedContacts.length;
    const paginatedContacts = sortedContacts.slice(offset, offset + limit);
    const result = paginatedContacts.map(c => c.user);
    
    return res.status(200).json({
      users: result,
      total: total,
      hasMore: (offset + limit) < total
    });
  } catch (err) {
    console.error('Get suggested contacts error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

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
        
        // Tạo/cập nhật thông báo follow (sử dụng createNotification để tránh spam)
        const notification = await createNotification(
          req.body.userId,      // fromUser
          req.params.id,        // toUser
          'follow',             // type
          null,                 // postId
          null,                 // commentId
          `${currentUser.displayName || currentUser.email} đã theo dõi bạn`
        );

        // Emit WebSocket notification nếu có notification mới hoặc updated
        if (notification) {
          const io = req.app.get('io');
          if (io) {
            io.emitNewNotification(notification, req.params.id);
          }
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
  console.log('🔴 UNFOLLOW REQUEST:', {
    targetUserId: req.params.id,
    currentUserId: req.body.userId
  });
  
  if (req.body.userId !== req.params.id) {
    try {
      const user = await User.findById(req.params.id)
      const currentUser = await User.findById(req.body.userId)
      
      // Convert to string for comparison
      const followersAsStrings = user.followers.map(f => f.toString());
      const isFollowing = followersAsStrings.includes(req.body.userId);
      
      console.log('📊 Current state:', {
        targetUserFollowers: user.followers,
        currentUserFollowings: currentUser.followings,
        isCurrentUserInFollowers: isFollowing,
        targetUserIsPrivate: user.isPrivate
      });
      
      if (isFollowing) {
        console.log('✅ Proceeding with unfollow...');
        
        // Pull using both string and ObjectId to handle both cases
        // Some users have followers as strings, others as ObjectIds
        const currentUserObjectId = new mongoose.Types.ObjectId(req.body.userId);
        const targetUserObjectId = new mongoose.Types.ObjectId(req.params.id);
        
        await user.updateOne({ 
          $pull: { 
            followers: { $in: [req.body.userId, currentUserObjectId] } 
          } 
        })
        await currentUser.updateOne({ 
          $pull: { 
            followings: { $in: [req.params.id, targetUserObjectId] } 
          } 
        })
        
        // Verify the update
        const updatedUser = await User.findById(req.params.id);
        const stillFollowing = updatedUser.followers.map(f => f.toString()).includes(req.body.userId);
        
        console.log('✅ Updated followers/followings arrays', {
          stillFollowing: stillFollowing,
          newFollowersCount: updatedUser.followers.length,
          updatedFollowers: updatedUser.followers
        });
        
        // Nếu là tài khoản riêng tư, xóa cả follow request record
        if (user.isPrivate) {
          const FollowRequest = require('../models/FollowRequest.js')
          
          console.log('🔍 Searching for follow request to delete:', {
            fromUser: req.body.userId,
            toUser: req.params.id,
            status: 'accepted'
          });
          
          // Tìm tất cả requests liên quan để debug
          const allRequests = await FollowRequest.find({
            fromUser: req.body.userId,
            toUser: req.params.id
          });
          
          console.log('📋 All requests found:', allRequests);
          
          const deletedRequest = await FollowRequest.findOneAndDelete({
            fromUser: req.body.userId,
            toUser: req.params.id,
            status: 'accepted'
          })
          console.log('✅ Deleted follow request record for private account:', deletedRequest);
        }
        
        // KHÔNG xóa thông báo follow - giữ lại để khi follow lại sẽ update thay vì tạo mới
        // Điều này tránh spam notification khi follow/unfollow nhiều lần
        
        return res.status(200).json('user has been unfollowed')
      } else {
        console.log('❌ Current user not in followers list');
        return res.status(403).json('you dont follow this user')
      }
    } catch (err) {
      console.error('❌ Unfollow error:', err);
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

//UPDATE PRIVACY SETTINGS
router.put('/:id/privacy', async (req, res) => {
  try {
    const userId = sanitize(req.sanitize(req.params.id))
    const isPrivate = req.body.isPrivate
    
    if (typeof isPrivate !== 'boolean') {
      return res.status(400).json({ error: 'isPrivate must be a boolean' })
    }
    
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ error: 'Người dùng không tồn tại' })
    }
    
    await user.updateOne({ $set: { isPrivate } })
    
    return res.status(200).json({ 
      message: 'Privacy settings updated successfully',
      isPrivate 
    })
  } catch (err) {
    console.error('Update privacy error:', err)
    return res.status(500).json({ error: 'Lỗi server' })
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
