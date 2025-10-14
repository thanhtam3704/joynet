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
    .sort({ lastMessageTime: -1 })
    .limit(20);

    // Format data với unread count cho mỗi conversation
    const formattedConversations = await Promise.all(conversations.map(async conv => {
      const otherParticipant = conv.participants && conv.participants.find(p => p && p._id && p._id.toString() !== userId);
      
      // Tính số tin nhắn chưa đọc trong conversation này
      const unreadCount = await Message.countDocuments({
        conversationId: conv._id,
        sender: { $ne: userId }, // Không phải tin nhắn của mình
        isRead: false
      });
      
      return {
        _id: conv._id,
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
        io.emitConversationUpdate(updatedConversation, updatedConversation.participants.map(p => p._id.toString()));
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

    // Đánh dấu tất cả messages chưa đọc trong conversation
    await Message.updateMany(
      {
        conversationId,
        sender: { $ne: userId },
        isRead: false
      },
      {
        $set: { isRead: true },
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

module.exports = router;