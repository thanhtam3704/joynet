const router = require('express').Router()
const User = require('../models/User.js')
const Notification = require('../models/Notification.js')
const { createNotification } = require('./notifications.js')
const sanitize = require('mongo-sanitize')
const mongoose = require('mongoose')
const multer = require('multer')
const cloudinary = require('../config/cloudinary')

// Cấu hình Multer để lưu file vào memory
const storage = multer.memoryStorage()

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type'), false)
    }
  }
})

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

//GET FOLLOWING USERS
router.get('/following', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const currentUser = await User.findById(userId);
    
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // followings là array of user IDs, cần fetch từng user
    const followingIds = currentUser.followings || [];
    
    if (followingIds.length === 0) {
      return res.status(200).json([]);
    }
    
    const followingUsers = await User.find({
      _id: { $in: followingIds }
    }).select('displayName email profilePicture isOnline lastSeen');
    
    console.log('Following users found:', followingUsers.length);
    return res.status(200).json(followingUsers);
  } catch (err) {
    console.error('Get following users error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

//GET SUGGESTED USERS
router.get('/suggestions', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 30; // Default 30 để có đủ để random
    
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const following = currentUser.followings || [];
    const followingIds = following.map(id => id.toString());
    
    // Thêm current user vào list để exclude
    const excludeIds = [...followingIds, userId.toString()];
    
    const suggestedUsers = await User.find({
      _id: { $nin: excludeIds }
    })
    .select('displayName email profilePicture isOnline lastSeen followers')
    .limit(limit)
    .sort({ 'followers': -1 });
    
    console.log('Suggested users found:', suggestedUsers.length, 'for limit:', limit);
    return res.status(200).json(suggestedUsers);
  } catch (err) {
    console.error('Get suggested users error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

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
    }).populate('participants', '_id displayName profilePicture isOnline lastSeen').lean();
    
    const contactMap = new Map();
    
    // Lấy tất cả user IDs từ conversations và tin nhắn gần nhất
    const conversationIds = conversations.map(c => c._id);
    
    // Tìm tin nhắn gần nhất cho mỗi conversation (optimize query)
    const lastMessages = await Message.aggregate([
      { $match: { conversationId: { $in: conversationIds } } },
      { $sort: { createdAt: -1 } },
      { $group: {
          _id: '$conversationId',
          lastMessage: { $first: '$$ROOT' }
        }
      }
    ]);
    
    const lastMsgMap = new Map();
    lastMessages.forEach(item => {
      lastMsgMap.set(item._id.toString(), item.lastMessage.createdAt);
    });
    
    // Lấy tất cả user IDs từ conversations
    for (const conv of conversations) {
      const lastMsgTime = lastMsgMap.get(conv._id.toString()) || new Date(0);
      
      for (const p of conv.participants) {
        if (p._id.toString() !== userId) {
          const isFollowing = following.some(f => f.toString() === p._id.toString());
          
          // Chỉ lưu user với thời gian tin nhắn mới nhất
          if (!contactMap.has(p._id.toString()) || 
              contactMap.get(p._id.toString()).lastInteraction < lastMsgTime) {
            contactMap.set(p._id.toString(), {
              user: p,
              lastInteraction: lastMsgTime,
              isFollowing: isFollowing
            });
          }
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
            isFollowing: true
          });
        }
      }
    }
    
    // Sắp xếp theo thời gian tương tác (tin nhắn gần nhất trước)
    const sortedContacts = Array.from(contactMap.values()).sort((a, b) => {
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

//GET RECENT FOLLOWINGS (người đang theo dõi gần nhất)
router.get('/followers/recent', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 5;
    const offset = parseInt(req.query.offset) || 0;
    
    const currentUser = await User.findById(userId);
    if (!currentUser) return res.status(404).json({ error: 'User not found' });

    const followings = currentUser.followings || []; // Đổi từ followers sang followings
    
    if (followings.length === 0) {
      return res.status(200).json({
        users: [],
        total: 0,
        hasMore: false
      });
    }
    
    // Lấy thông tin người đang theo dõi
    const followingUsers = await User.find({
      _id: { $in: followings }
    }).select('displayName email profilePicture isOnline lastSeen');
    
    // Tìm notification follow của user này để biết thời gian follow
    const followNotifications = await Notification.find({
      fromUser: userId,
      type: 'follow',
      userId: { $in: followings }
    }).sort({ createdAt: -1 });
    
    // Map following với thời gian follow
    const followingMap = new Map();
    followingUsers.forEach(user => {
      followingMap.set(user._id.toString(), {
        user: user,
        followedAt: new Date(0) // Default nếu không tìm thấy notification
      });
    });
    
    // Update thời gian từ notifications
    followNotifications.forEach(notif => {
      const targetUserId = notif.userId.toString();
      if (followingMap.has(targetUserId)) {
        followingMap.get(targetUserId).followedAt = notif.createdAt;
      }
    });
    
    // Sắp xếp theo thời gian follow (mới nhất trước)
    const sortedFollowings = Array.from(followingMap.values()).sort((a, b) => {
      return b.followedAt - a.followedAt;
    });
    
    // Pagination
    const total = sortedFollowings.length;
    const paginatedFollowings = sortedFollowings.slice(offset, offset + limit);
    const result = paginatedFollowings.map(f => f.user);
    
    return res.status(200).json({
      users: result,
      total: total,
      hasMore: (offset + limit) < total
    });
  } catch (err) {
    console.error('Get recent followings error:', err);
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
      const user = await User.findById(req.params.id);
      const currentUser = await User.findById(req.body.userId);
      const FollowRequest = require('../models/FollowRequest.js');
      
      // Kiểm tra đã follow chưa
      if (user.followers.includes(req.body.userId)) {
        return res.status(403).json({ error: 'you already follow this user' });
      }
      
      // Nếu tài khoản là private
      if (user.isPrivate) {
        // Kiểm tra đã gửi request chưa
        const existingRequest = await FollowRequest.findOne({
          fromUser: req.body.userId,
          toUser: req.params.id,
          status: 'pending'
        });
        
        if (existingRequest) {
          return res.status(200).json({ 
            message: 'request already sent',
            isPrivate: true,
            requestSent: true
          });
        }
        
        // Tạo follow request mới
        const newRequest = new FollowRequest({
          fromUser: req.body.userId,
          toUser: req.params.id,
          status: 'pending'
        });
        
        await newRequest.save();
        
        // Tạo notification
        const notification = await createNotification(
          req.body.userId,
          req.params.id,
          'follow_request',
          null,
          null,
          `${currentUser.displayName || currentUser.email} đã gửi yêu cầu theo dõi bạn`
        );
        
        // Emit WebSocket notification
        if (notification) {
          const io = req.app.get('io');
          if (io) {
            io.emitNewNotification(notification, req.params.id);
          }
        }
        
        return res.status(200).json({ 
          message: 'follow request sent',
          isPrivate: true,
          requestSent: true
        });
      }
      
      // Tài khoản public - follow trực tiếp
      await user.updateOne({ $push: { followers: req.body.userId } });
      await currentUser.updateOne({ $push: { followings: req.params.id } });
      
      // Tạo notification follow
      const notification = await createNotification(
        req.body.userId,
        req.params.id,
        'follow',
        null,
        null,
        `${currentUser.displayName || currentUser.email} đã theo dõi bạn`
      );

      if (notification) {
        const io = req.app.get('io');
        if (io) {
          io.emitNewNotification(notification, req.params.id);
        }
      }
      
      return res.status(200).json({ 
        message: 'user has been followed',
        isPrivate: false,
        requestSent: false
      });
    } catch (err) {
      console.error('Follow error:', err);
      return res.status(500).json(err);
    }
  } else {
    return res.status(403).json({ error: 'you cant follow yourself' });
  }
});

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

//UPLOAD AVATAR
router.post('/:id/upload-avatar', verifyToken, upload.single('avatar'), async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Kiểm tra quyền
    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Không có quyền cập nhật avatar' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'Vui lòng chọn ảnh' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Người dùng không tồn tại' });
    }
    
    // Xóa ảnh cũ trên Cloudinary nếu có
    if (user.profilePicture && user.profilePicture.includes('cloudinary.com')) {
      try {
        const publicId = user.profilePicture.split('/').slice(-2).join('/').split('.')[0];
        await cloudinary.uploader.destroy(publicId);
      } catch (deleteErr) {
        console.error('Error deleting old avatar:', deleteErr);
      }
    }
    
    // Upload lên Cloudinary từ buffer
    const uploadStream = () => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'social-web/avatars',
            transformation: [{ width: 500, height: 500, crop: 'fill' }]
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });
    };
    
    const result = await uploadStream();
    const avatarUrl = result.secure_url;
    
    // Cập nhật URL ảnh mới
    await user.updateOne({ $set: { profilePicture: avatarUrl } });
    
    return res.status(200).json({ 
      message: 'Upload avatar thành công',
      profilePicture: avatarUrl 
    });
  } catch (err) {
    console.error('Upload avatar error:', err);
    return res.status(500).json({ error: 'Lỗi upload avatar' });
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
