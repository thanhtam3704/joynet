const router = require('express').Router();
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const sanitize = require('mongo-sanitize');

// Middleware để verify token
const verifyToken = (req, res, next) => {
  const token = req.headers.token;
  if (!token) {
    return res.status(401).json({ error: 'Access denied' });
  }

  try {
    const jwt = require('jsonwebtoken');
    const verified = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    req.user = { id: verified.userId };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// GET - Lấy danh sách conversations của user
router.get('/conversations', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const conversations = await Conversation.find({
      participants: userId,
      isActive: true
    })
    .populate('participants', 'displayName profilePicture email lastSeen isOnline')
    .populate('lastMessage')
    .populate('createdBy', 'displayName')
    .populate('admins', 'displayName')
    .sort({ lastMessageTime: -1 })
    .limit(20);

    // Format data với unread count cho mỗi conversation
    const formattedConversations = await Promise.all(conversations.map(async conv => {
      // Tính số tin nhắn chưa đọc trong conversation này
      // Dùng readBy thay vì isRead để mỗi user có unread count riêng
      const unreadCount = await Message.countDocuments({
        conversationId: conv._id,
        sender: { $ne: userId }, // Không phải tin nhắn của mình
        'readBy.user': { $ne: userId } // User chưa đọc
      });
      
      // Xử lý group chat
      if (conv.isGroup) {
        return {
          _id: conv._id,
          isGroup: true,
          groupName: conv.groupName,
          groupAvatar: conv.groupAvatar,
          participants: conv.participants,
          admins: conv.admins,
          createdBy: conv.createdBy,
          lastMessage: conv.lastMessage || null,
          lastMessageTime: conv.lastMessageTime || conv.createdAt,
          unread: unreadCount,
          createdAt: conv.createdAt
        };
      }
      
      // Xử lý 1-1 chat
      const otherParticipant = conv.participants && conv.participants.find(p => p && p._id && p._id.toString() !== userId);
      
      return {
        _id: conv._id,
        isGroup: false,
        participant: otherParticipant || { displayName: 'Unknown User', profilePicture: null, email: '' },
        lastMessage: conv.lastMessage || null,
        lastMessageTime: conv.lastMessageTime || conv.createdAt,
        unread: unreadCount,
        createdAt: conv.createdAt
      };
    }));

    res.status(200).json(formattedConversations || []);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET - Lấy messages trong một conversation
router.get('/conversations/:conversationId/messages', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationId = sanitize(req.params.conversationId);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Kiểm tra user có quyền truy cập conversation này không
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId
    });

    if (!conversation) {
      return res.status(403).json({ error: 'Access denied to this conversation' });
    }

    const messages = await Message.find({
      conversationId,
      isDeleted: false,
      deletedBy: { $ne: userId }
    })
    .populate('sender', 'displayName profilePicture')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

    res.status(200).json({
      messages: (messages || []).reverse(), // Reverse để hiển thị từ cũ đến mới
      hasMore: messages && messages.length === limit,
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST - Gửi message mới
router.post('/conversations/:conversationId/messages', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationId = sanitize(req.params.conversationId);
    
    console.log('📨 Received message request:', {
      hasFiles: !!req.files,
      filesKeys: req.files ? Object.keys(req.files) : [],
      bodyContent: req.body.content,
      bodyMessageType: req.body.messageType
    });
    
    let content = '';
    let messageType = 'text';
    let fileName = null;
    
    // Xử lý file upload
    if (req.files && req.files.file) {
      const uploadedFile = req.files.file;
      
      console.log('📁 Processing file:', {
        name: uploadedFile.name,
        size: uploadedFile.size,
        mimetype: uploadedFile.mimetype
      });
      
      // Tạo tên file unique
      const timestamp = Date.now();
      const originalName = uploadedFile.name;
      const extension = originalName.split('.').pop();
      fileName = `${timestamp}-${Math.random().toString(36).substring(2)}.${extension}`;
      
      // Xác định messageType dựa trên file type
      if (uploadedFile.mimetype.startsWith('image/')) {
        messageType = 'image';
      } else {
        messageType = 'file';
      }
      
      // Upload file
      const uploadPath = `./uploads/${fileName}`;
      await uploadedFile.mv(uploadPath);
    }
    
    // Lấy content từ body
    if (req.body.content) {
      content = sanitize(req.body.content);
    }
    
    if (req.body.messageType) {
      messageType = req.body.messageType;
    }

    if (!content.trim() && !fileName) {
      return res.status(400).json({ error: 'Message content or file is required' });
    }

    // Kiểm tra conversation exists và user có quyền
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId
    });

    if (!conversation) {
      return res.status(403).json({ error: 'Access denied to this conversation' });
    }

    // Tạo message mới
    const newMessage = new Message({
      conversationId,
      sender: userId,
      content: content || '', // Đảm bảo content có giá trị
      messageType,
      file: fileName
    });

    await newMessage.save();

    // Cập nhật conversation
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: newMessage._id,
      lastMessageTime: new Date()
    });

    // Populate thông tin sender để trả về
    await newMessage.populate('sender', 'displayName profilePicture email');

    // Fallback: Nếu populate không có displayName/profilePicture, lấy từ database trực tiếp
    let senderData = newMessage.sender;
    if (!senderData.displayName || !senderData.profilePicture) {
      const fullUser = await User.findById(userId).select('displayName profilePicture email');
      if (fullUser) {
        senderData = {
          _id: senderData._id,
          displayName: senderData.displayName || fullUser.displayName || fullUser.email?.split('@')[0] || 'Unknown User',
          profilePicture: senderData.profilePicture || fullUser.profilePicture || ''
        };
      }
    }

    // Emit WebSocket event for real-time messaging
    const io = req.app.get('io');
    if (io) {
      // Emit new message to conversation room với sender data đầy đủ
      io.emitNewMessage({
        _id: newMessage._id,
        content: newMessage.content,
        messageType: newMessage.messageType,
        file: newMessage.file,
        sender: senderData,
        senderAvatar: senderData.profilePicture,
        senderId: senderData._id, // Backup field
        senderName: senderData.displayName, // Backup field
        createdAt: newMessage.createdAt,
        conversationId
      }, conversationId);

      // Emit conversation update to participants
      const updatedConversation = await Conversation.findById(conversationId)
        .populate('participants', 'displayName profilePicture email lastSeen isOnline');
      
      if (updatedConversation) {
        // Emit to conversation room for users who have it open
        io.emitConversationUpdate(updatedConversation, updatedConversation.participants.map(p => p._id.toString()));
        
        // ALSO emit to each participant's personal room for unread count updates
        // This ensures TheHeader and SidebarLeft get notified even if popup is closed
        io.emitNewMessageToParticipants({
          _id: newMessage._id,
          content: newMessage.content,
          messageType: newMessage.messageType,
          file: newMessage.file,
          sender: senderData,
          createdAt: newMessage.createdAt,
          conversationId
        }, conversationId, updatedConversation.participants, userId);
      }
    }

    console.log('✅ Message created successfully:', {
      id: newMessage._id,
      content: newMessage.content,
      messageType: newMessage.messageType,
      file: newMessage.file,
      sender: newMessage.sender?.displayName
    });

    res.status(201).json(newMessage);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST - Tạo conversation mới hoặc tìm conversation đã tồn tại
router.post('/conversations', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { participantId } = req.body;

    if (!participantId) {
      return res.status(400).json({ error: 'Participant ID is required' });
    }

    if (participantId === userId) {
      return res.status(400).json({ error: 'Cannot create conversation with yourself' });
    }

    // Kiểm tra user tồn tại
    const participant = await User.findById(participantId);
    if (!participant) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Tìm conversation đã tồn tại
    let conversation = await Conversation.findOne({
      participants: { $all: [userId, participantId], $size: 2 }
    });

    if (!conversation) {
      // Tạo conversation mới
      conversation = new Conversation({
        participants: [userId, participantId]
      });
      await conversation.save();
    }

    // Populate thông tin participants
    await conversation.populate('participants', 'displayName profilePicture email lastSeen isOnline');

    res.status(200).json(conversation);
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET - Lấy danh sách bạn bè để chat (từ followings)
router.get('/friends', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId).select('followings');
    if (!user || !user.followings.length) {
      return res.status(200).json([]);
    }

    const friends = await User.find({
      _id: { $in: user.followings }
    }).select('displayName profilePicture email');

    res.status(200).json(friends);
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT - Đánh dấu messages đã đọc
router.put('/conversations/:conversationId/read', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationId = sanitize(req.params.conversationId);

    // Đánh dấu tất cả messages của người khác mà user chưa đọc
    await Message.updateMany(
      {
        conversationId,
        sender: { $ne: userId },
        'readBy.user': { $ne: userId } // Chỉ update messages mà user này chưa đọc
      },
      {
        $set: { isRead: true }, // Giữ lại cho backward compatibility
        $push: {
          readBy: {
            user: userId,
            readAt: new Date()
          }
        }
      }
    );

    res.status(200).json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Mark messages as read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET - Lấy số lượng tin nhắn chưa đọc
router.get('/unread-count', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const unreadCount = await Message.countDocuments({
      sender: { $ne: userId }, // Không phải tin nhắn của mình
      isRead: false,
      conversationId: { 
        $in: await Conversation.find({ 
          participants: userId 
        }).distinct('_id') 
      }
    });

    res.status(200).json({ count: unreadCount });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========== GROUP CHAT ROUTES ==========

// POST - Tạo nhóm chat mới
router.post('/groups', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { groupName, memberIds } = req.body;

    if (!groupName || !groupName.trim()) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length < 2) {
      return res.status(400).json({ error: 'At least 2 members are required' });
    }

    // Thêm creator vào danh sách participants
    const allParticipants = [...new Set([userId, ...memberIds])];

    // Kiểm tra tất cả members có tồn tại không
    const existingUsers = await User.find({ _id: { $in: allParticipants } });
    if (existingUsers.length !== allParticipants.length) {
      return res.status(400).json({ error: 'Some users not found' });
    }

    // Tạo group conversation
    const newGroup = new Conversation({
      isGroup: true,
      groupName: groupName.trim(),
      participants: allParticipants,
      admins: [userId], // Creator là admin
      createdBy: userId
    });

    await newGroup.save();
    await newGroup.populate('participants', 'displayName profilePicture email');

    // Emit socket event
    const io = req.app.get('io');
    if (io && io.emitGroupCreated) {
      io.emitGroupCreated(newGroup, allParticipants);
    }

    res.status(201).json(newGroup);
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST - Thêm member vào nhóm
router.post('/groups/:conversationId/members', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationId = sanitize(req.params.conversationId);
    const { memberIds } = req.body;

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ error: 'Member IDs are required' });
    }

    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation || !conversation.isGroup) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Kiểm tra quyền admin
    if (!conversation.admins.includes(userId)) {
      return res.status(403).json({ error: 'Only admins can add members' });
    }

    // Thêm members mới (không trùng lặp)
    const newMembers = memberIds.filter(id => !conversation.participants.includes(id));
    conversation.participants.push(...newMembers);
    await conversation.save();

    await conversation.populate('participants', 'displayName profilePicture email');

    // Emit socket event
    const io = req.app.get('io');
    if (io && io.emitMemberAdded) {
      io.emitMemberAdded(conversationId, newMembers, conversation.participants);
    }

    res.status(200).json(conversation);
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE - Xóa member khỏi nhóm
router.delete('/groups/:conversationId/members/:memberId', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationId = sanitize(req.params.conversationId);
    const memberId = sanitize(req.params.memberId);

    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation || !conversation.isGroup) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Kiểm tra quyền (admin hoặc tự xóa mình)
    if (!conversation.admins.includes(userId) && userId !== memberId) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // Không cho xóa creator
    if (memberId === conversation.createdBy.toString()) {
      return res.status(400).json({ error: 'Cannot remove group creator' });
    }

    // Xóa member
    conversation.participants = conversation.participants.filter(p => p.toString() !== memberId);
    conversation.admins = conversation.admins.filter(a => a.toString() !== memberId);
    await conversation.save();

    // Emit socket event
    const io = req.app.get('io');
    if (io && io.emitMemberRemoved) {
      io.emitMemberRemoved(conversationId, memberId, conversation.participants);
    }

    res.status(200).json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT - Cập nhật thông tin nhóm
router.put('/groups/:conversationId', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationId = sanitize(req.params.conversationId);
    const { groupName, groupAvatar } = req.body;

    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation || !conversation.isGroup) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Kiểm tra quyền admin
    if (!conversation.admins.includes(userId)) {
      return res.status(403).json({ error: 'Only admins can update group info' });
    }

    if (groupName) conversation.groupName = groupName.trim();
    if (groupAvatar) conversation.groupAvatar = groupAvatar;
    
    await conversation.save();
    await conversation.populate('participants', 'displayName profilePicture email');

    // Emit socket event
    const io = req.app.get('io');
    if (io && io.emitGroupUpdated) {
      io.emitGroupUpdated(conversation, conversation.participants);
    }

    res.status(200).json(conversation);
  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST - Promote member to admin
router.post('/groups/:conversationId/admins/:memberId', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationId = sanitize(req.params.conversationId);
    const memberId = sanitize(req.params.memberId);

    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation || !conversation.isGroup) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Chỉ creator mới có thể promote admin
    if (userId !== conversation.createdBy.toString()) {
      return res.status(403).json({ error: 'Only group creator can promote admins' });
    }

    if (!conversation.participants.includes(memberId)) {
      return res.status(400).json({ error: 'User is not a member of this group' });
    }

    if (!conversation.admins.includes(memberId)) {
      conversation.admins.push(memberId);
      await conversation.save();
    }

    res.status(200).json({ message: 'Member promoted to admin successfully' });
  } catch (error) {
    console.error('Promote admin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST - Rời khỏi nhóm
router.post('/groups/:conversationId/leave', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationId = sanitize(req.params.conversationId);

    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation || !conversation.isGroup) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Creator không thể rời nhóm
    if (userId === conversation.createdBy.toString()) {
      return res.status(400).json({ error: 'Group creator cannot leave the group. Please transfer ownership first.' });
    }

    // Xóa user khỏi participants và admins
    conversation.participants = conversation.participants.filter(p => p.toString() !== userId);
    conversation.admins = conversation.admins.filter(a => a.toString() !== userId);
    await conversation.save();

    // Emit socket event
    const io = req.app.get('io');
    if (io && io.emitMemberRemoved) {
      io.emitMemberRemoved(conversationId, userId, conversation.participants);
    }

    res.status(200).json({ message: 'Left group successfully' });
  } catch (error) {
    console.error('Leave group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;