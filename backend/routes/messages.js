const router = require('express').Router();
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const sanitize = require('mongo-sanitize');
const multer = require('multer');
const cloudinary = require('../config/cloudinary');

// Cấu hình Multer memory storage
const messageStorage = multer.memoryStorage();

const uploadMessage = multer({ 
  storage: messageStorage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const conversations = await Conversation.find({
      participants: userId,
      isActive: true
    })
    .populate('participants', 'displayName profilePicture email lastSeen isOnline')
    .populate('lastMessage')
    .populate('createdBy', 'displayName')
    .populate('admins', 'displayName')
    .sort({ lastMessageTime: -1 })
    .skip(skip)
    .limit(limit);

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

    // Nếu là temp conversation (chưa tạo), trả về mảng rỗng
    if (conversationId.startsWith('temp_')) {
      return res.status(200).json({
        messages: [],
        hasMore: false,
        currentPage: 1
      });
    }

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
      deletedBy: { $ne: userId },
      // Chỉ lấy messages mà:
      // - Không có visibleTo (message thường) HOẶC
      // - visibleTo có chứa userId (message giới hạn như group call ended)
      $or: [
        { visibleTo: { $exists: false } },
        { visibleTo: { $size: 0 } },
        { visibleTo: userId }
      ]
    })
    .populate('sender', 'displayName profilePicture')
    .populate('reactions.user', 'displayName profilePicture email')
    .populate('readBy.user', '_id displayName')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

    console.log(`🔍 [Messages API] User ${userId} fetched ${messages.length} messages from conversation ${conversationId}`);
    
    // Debug: Log messages with visibleTo
    const messagesWithVisibleTo = messages.filter(m => m.visibleTo && m.visibleTo.length > 0);
    if (messagesWithVisibleTo.length > 0) {
      console.log(`🔍 [Messages API] Found ${messagesWithVisibleTo.length} messages with visibleTo restrictions:`);
      messagesWithVisibleTo.forEach(m => {
        console.log(`  - Message ${m._id}: visibleTo=${JSON.stringify(m.visibleTo)}`);
      });
    }

    res.status(200).json({
      messages: (messages || []).reverse(), // Reverse để hiển thị từ cũ đến mới
      hasMore: messages && messages.length === limit,
      currentPage: page
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST - Gửi message mới
router.post('/conversations/:conversationId/messages', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationId = sanitize(req.params.conversationId);
    
    let content = '';
    let messageType = 'text';
    let fileUrl = null;
    let originalFileName = null;
    
    // Lấy content và file URL từ body (file đã upload trước qua /upload endpoint)
    if (req.body.content) {
      content = sanitize(req.body.content);
    }
    
    if (req.body.fileUrl) {
      fileUrl = sanitize(req.body.fileUrl);
      messageType = req.body.messageType || 'file';
    }
    
    if (req.body.originalFileName) {
      originalFileName = sanitize(req.body.originalFileName);
    }

    if (!content.trim() && !fileUrl) {
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
      content: content || '',
      messageType,
      file: fileUrl, // Lưu Cloudinary URL
      originalFileName: originalFileName,
      readBy: [{
        user: userId,
        readAt: new Date()
      }]
    });

    await newMessage.save();

    // Cập nhật conversation
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: newMessage._id,
      lastMessageTime: new Date()
    });

    // Populate thông tin sender và readBy để trả về
    await newMessage.populate('sender', 'displayName profilePicture email');
    await newMessage.populate('readBy.user', '_id displayName');

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
        originalFileName: newMessage.originalFileName,
        sender: senderData,
        senderAvatar: senderData.profilePicture,
        senderId: senderData._id, // Backup field
        senderName: senderData.displayName, // Backup field
        readBy: newMessage.readBy || [],
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
          originalFileName: newMessage.originalFileName,
          sender: senderData,
          createdAt: newMessage.createdAt,
          conversationId
        }, conversationId, updatedConversation.participants, userId);
      }
    }

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

    // Format response giống GET /conversations để frontend nhận được cấu trúc nhất quán
    const otherParticipant = conversation.participants.find(p => p._id.toString() !== userId);
    const formattedConversation = {
      _id: conversation._id,
      isGroup: false,
      participant: otherParticipant || { displayName: 'Unknown User', profilePicture: null, email: '' },
      lastMessage: null,
      lastMessageTime: conversation.createdAt,
      unread: 0,
      createdAt: conversation.createdAt
    };

    res.status(200).json(formattedConversation);
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET - Lấy danh sách bạn bè để chat (từ followings)
router.get('/friends', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    
    const user = await User.findById(userId).select('followings');
    console.log('📋 Get friends - user:', userId, 'limit:', limit, 'offset:', offset);
    
    if (!user || !user.followings.length) {
      console.log('⚠️ No followings');
      return res.status(200).json({
        users: [],
        total: 0,
        hasMore: false
      });
    }

    const total = user.followings.length;
    const friends = await User.find({
      _id: { $in: user.followings }
    })
    .select('displayName profilePicture email')
    .skip(offset)
    .limit(limit);

    console.log('✅ Returned:', friends.length, 'of', total);
    res.status(200).json({
      users: friends,
      total: total,
      hasMore: (offset + friends.length) < total
    });
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
    const result = await Message.updateMany(
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

    // Emit socket event để cập nhật realtime
    if (result.modifiedCount > 0) {
      const io = req.app.get('io');
      if (io) {
        // Lấy các messages đã được cập nhật để emit
        const updatedMessages = await Message.find({
          conversationId,
          sender: { $ne: userId },
          'readBy.user': userId
        })
        .populate('readBy.user', '_id displayName')
        .select('_id readBy');

        // Emit đến conversation room
        io.emitMessagesRead(conversationId, userId, updatedMessages);
      }
    }

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

// POST - Thêm member vào nhóm (Thành viên thường cũng có thể thêm)
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

    // Kiểm tra người dùng có phải là thành viên của nhóm không
    if (!conversation.participants.includes(userId)) {
      return res.status(403).json({ error: 'Only group members can add new members' });
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

// POST - Chuyển quyền trưởng nhóm
router.post('/groups/:conversationId/transfer-ownership', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationId = sanitize(req.params.conversationId);
    const { newOwnerId } = req.body;

    if (!newOwnerId) {
      return res.status(400).json({ error: 'New owner ID is required' });
    }

    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation || !conversation.isGroup) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Chỉ creator mới có thể chuyển quyền
    if (userId !== conversation.createdBy.toString()) {
      return res.status(403).json({ error: 'Only group creator can transfer ownership' });
    }

    // Kiểm tra người nhận có phải là thành viên không
    if (!conversation.participants.some(p => p.toString() === newOwnerId)) {
      return res.status(400).json({ error: 'New owner must be a group member' });
    }

    // Chuyển quyền
    const oldOwnerId = conversation.createdBy.toString();
    conversation.createdBy = newOwnerId;
    
    // Thêm người mới vào admin nếu chưa có
    if (!conversation.admins.some(a => a.toString() === newOwnerId)) {
      conversation.admins.push(newOwnerId);
    }

    // Xóa người cũ khỏi danh sách admin (trở thành thành viên thường)
    conversation.admins = conversation.admins.filter(a => a.toString() !== oldOwnerId);

    await conversation.save();
    await conversation.populate('participants', 'displayName profilePicture email');
    await conversation.populate('createdBy', 'displayName profilePicture email');

    // Emit socket event
    const io = req.app.get('io');
    if (io && io.emitGroupUpdated) {
      io.emitGroupUpdated(conversation, conversation.participants);
    }

    res.status(200).json({ 
      message: 'Ownership transferred successfully',
      conversation 
    });
  } catch (error) {
    console.error('Transfer ownership error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE - Giải tán nhóm (chỉ creator)
router.delete('/groups/:conversationId/disband', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationId = sanitize(req.params.conversationId);

    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation || !conversation.isGroup) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Chỉ creator mới có thể giải tán nhóm
    if (userId !== conversation.createdBy.toString()) {
      return res.status(403).json({ error: 'Only group creator can disband the group' });
    }

    // Lưu danh sách participants để emit socket
    const participants = conversation.participants.map(p => p.toString());

    // Đánh dấu conversation là không active thay vì xóa hẳn
    conversation.isActive = false;
    await conversation.save();

    // Emit socket event đến tất cả thành viên
    const io = req.app.get('io');
    if (io) {
      participants.forEach(participantId => {
        io.to(`user_${participantId}`).emit('groupDisbanded', {
          conversationId,
          message: 'Group has been disbanded by the creator'
        });
      });
    }

    res.status(200).json({ message: 'Group disbanded successfully' });
  } catch (error) {
    console.error('Disband group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST - Thêm/sửa/xóa reaction vào message
router.post('/messages/:messageId/reaction', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const messageId = sanitize(req.params.messageId);
    const { emoji } = req.body; // null để xóa reaction

    const message = await Message.findById(messageId)
      .populate('sender', 'displayName profilePicture email');
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Kiểm tra user có quyền react không (phải là thành viên conversation)
    const conversation = await Conversation.findById(message.conversationId);
    if (!conversation || !conversation.participants.includes(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!message.reactions) {
      message.reactions = [];
    }

    const existingReactionIndex = message.reactions.findIndex(
      r => r.user.toString() === userId
    );

    let action = '';
    
    if (emoji) {
      // Thêm hoặc update reaction
      if (existingReactionIndex !== -1) {
        // Update existing reaction
        message.reactions[existingReactionIndex].emoji = emoji;
        message.reactions[existingReactionIndex].createdAt = new Date();
        action = 'updated';
      } else {
        // Add new reaction
        message.reactions.push({
          user: userId,
          emoji: emoji
        });
        action = 'added';
      }
    } else {
      // Xóa reaction
      if (existingReactionIndex !== -1) {
        message.reactions.splice(existingReactionIndex, 1);
        action = 'removed';
      }
    }

    await message.save();

    // Populate reactions để trả về đầy đủ thông tin CHO CẢ API VÀ SOCKET
    await message.populate('reactions.user', 'displayName profilePicture email');

    console.log('🔍 [Reaction] After populate, reactions:', JSON.stringify(message.reactions, null, 2));

    // Emit socket event đến tất cả người trong conversation
    const io = req.app.get('io');
    if (io) {
      // Đảm bảo reactions đã được populate và lấy thông tin user đầy đủ
      const populatedReactions = await Promise.all(message.reactions.map(async r => {
        let user = r.user;
        
        // Nếu populate thất bại hoặc thiếu thông tin, query lại từ DB
        if (!user || !user._id || !user.displayName) {
          console.log('⚠️ [Reaction] User not populated properly, fetching from DB:', r.user);
          const userId = typeof r.user === 'string' ? r.user : r.user?._id;
          user = await User.findById(userId).select('displayName profilePicture email');
          console.log('✅ [Reaction] User fetched from DB:', user);
        }
        
        return {
          user: {
            _id: user._id,
            displayName: user.displayName || user.email?.split('@')[0] || 'Unknown User',
            profilePicture: user.profilePicture || null,
            email: user.email
          },
          emoji: r.emoji,
          createdAt: r.createdAt
        };
      }));
      
      console.log('🔍 [Reaction] Emitting to socket:', JSON.stringify(populatedReactions, null, 2));
      
      conversation.participants.forEach(participantId => {
        io.to(`user_${participantId}`).emit('messageReactionUpdated', {
          messageId: message._id,
          reactions: populatedReactions,
          action,
          userId
        });
      });
    }

    res.status(200).json({ 
      message: 'Reaction updated successfully',
      reactions: message.reactions 
    });
  } catch (error) {
    console.error('Add reaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET - Download file
router.get('/download/:filename', verifyToken, async (req, res) => {
  try {
    const filename = req.params.filename;
    const path = require('path');
    const fs = require('fs');
    
    // Tìm message có file này để lấy originalFileName
    const message = await Message.findOne({ file: filename });
    
    if (!message) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const filePath = path.join(__dirname, '..', 'uploads', filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on server' });
    }
    
    // Set headers để tải file với tên gốc
    const originalFileName = message.originalFileName || filename;
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(originalFileName)}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    
    // Stream file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ error: 'Error downloading file' });
  }
});

// PUT - Edit message (only before read by others)
router.put('/messages/:messageId', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const messageId = sanitize(req.params.messageId);
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if user is the sender
    if (message.sender.toString() !== userId) {
      return res.status(403).json({ error: 'You can only edit your own messages' });
    }

    // Check if message has been read by others
    const hasBeenReadByOthers = message.readBy.some(read => read.user.toString() !== userId);
    if (hasBeenReadByOthers) {
      return res.status(403).json({ error: 'Cannot edit message that has been read by others' });
    }

    // Update message
    message.content = sanitize(content.trim());
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    await message.populate('sender', 'displayName profilePicture email');

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      const conversation = await Conversation.findById(message.conversationId);
      if (conversation) {
        io.to(`conversation_${message.conversationId}`).emit('messageEdited', {
          messageId: message._id,
          content: message.content,
          isEdited: true,
          editedAt: message.editedAt
        });
      }
    }

    res.json(message);
  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE - Delete message
router.delete('/messages/:messageId', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const messageId = sanitize(req.params.messageId);

    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if user is the sender
    if (message.sender.toString() !== userId) {
      return res.status(403).json({ error: 'You can only delete your own messages' });
    }

    // Soft delete - just mark as deleted
    message.isDeleted = true;
    message.deletedBy = [userId];
    message.content = 'Tin nhắn đã bị xóa';
    await message.save();

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`conversation_${message.conversationId}`).emit('messageDeleted', {
        messageId: message._id,
        conversationId: message.conversationId
      });
    }

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST - Upload file cho message (Cloudinary)
router.post('/upload', verifyToken, uploadMessage.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Vui lòng chọn file' });
    }
    
    const isImage = req.file.mimetype.startsWith('image/');
    const folder = isImage ? 'social-web/messages/images' : 'social-web/messages/files';
    const resourceType = isImage ? 'image' : 'raw';
    
    // Upload lên Cloudinary từ buffer
    const uploadStream = () => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: folder,
            resource_type: resourceType
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
    
    return res.status(200).json({ 
      url: result.secure_url,
      publicId: result.public_id,
      fileName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      messageType: isImage ? 'image' : 'file'
    });
  } catch (err) {
    console.error('Upload message file error:', err);
    return res.status(500).json({ error: 'Lỗi upload file' });
  }
});

module.exports = router;