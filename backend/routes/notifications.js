const router = require('express').Router();
const Notification = require('../models/Notification');
const User = require('../models/User');
const Post = require('../models/Post');

// Middleware để verify token (tương thích với hệ thống auth hiện tại)
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
    console.error('Token verification error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// GET - Lấy danh sách thông báo của user hiện tại với pagination
router.get('/', verifyToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const notifications = await Notification.find({ toUser: req.user.id })
      .populate('fromUser', 'displayName profilePicture email')
      .populate('postId', 'description file userId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    // Kiểm tra xem còn thông báo nữa không
    const totalCount = await Notification.countDocuments({ toUser: req.user.id });
    const hasMore = skip + notifications.length < totalCount;

    res.status(200).json({
      notifications,
      hasMore,
      currentPage: page,
      totalCount
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET - Lấy số lượng thông báo chưa đọc
router.get('/unread-count', verifyToken, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      toUser: req.user.id,
      isRead: false
    });

    res.status(200).json({ count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT - Đánh dấu thông báo đã đọc
router.put('/:id/read', verifyToken, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, toUser: req.user.id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.status(200).json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT - Đánh dấu tất cả thông báo đã đọc
router.put('/mark-all-read', verifyToken, async (req, res) => {
  try {
    await Notification.updateMany(
      { toUser: req.user.id, isRead: false },
      { isRead: true }
    );

    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE - Xóa thông báo
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      toUser: req.user.id
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.status(200).json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST - Tạo thông báo mới (internal function, có thể được gọi từ các routes khác)
const createNotification = async (fromUserId, toUserId, type, postId = null, commentId = null, message = '', reactionType = null) => {
  try {
    // Không tự thông báo cho chính mình
    if (fromUserId.toString() === toUserId.toString()) {
      return null;
    }

    // Đối với like và follow: Kiểm tra xem thông báo đã tồn tại chưa (không giới hạn thời gian)
    // Nếu đã có thì chỉ cập nhật thời gian, reactionType và đánh dấu chưa đọc
    if (type === 'like' || type === 'follow') {
      const existingNotification = await Notification.findOne({
        fromUser: fromUserId,
        toUser: toUserId,
        type,
        postId: type === 'like' ? postId : null // Chỉ check postId cho like
      });

      if (existingNotification) {
        // Cập nhật thời gian, reactionType và đánh dấu chưa đọc thay vì tạo mới
        existingNotification.createdAt = new Date();
        existingNotification.isRead = false;
        
        // Cập nhật reactionType nếu là notification like
        if (type === 'like' && reactionType) {
          existingNotification.reactionType = reactionType;
        }
        
        await existingNotification.save();
        
        // Populate để trả về đầy đủ thông tin
        await existingNotification.populate('fromUser', 'displayName profilePicture email');
        if (postId) {
          await existingNotification.populate('postId', 'description file userId');
        }
        
        return existingNotification;
      }
    }

    // Đối với comment: Cho phép nhiều thông báo comment trên cùng 1 bài viết
    // (vì mỗi comment là nội dung khác nhau)
    
    const notification = new Notification({
      fromUser: fromUserId,
      toUser: toUserId,
      type,
      postId,
      commentId,
      message,
      reactionType: type === 'like' ? reactionType : null // Chỉ lưu reactionType cho like
    });

    await notification.save();
    
    // Populate thông tin user để trả về
    await notification.populate('fromUser', 'displayName profilePicture email');
    if (postId) {
      await notification.populate('postId', 'description file userId');
    }

    return notification;
  } catch (error) {
    console.error('Create notification error:', error);
    return null;
  }
};

// POST - API tạo thông báo (cho admin hoặc system)
router.post('/', verifyToken, async (req, res) => {
  try {
    const { toUserId, type, postId, message } = req.body;
    
    const notification = await createNotification(
      req.user.id,
      toUserId,
      type,
      postId,
      message
    );

    if (!notification) {
      return res.status(400).json({ error: 'Failed to create notification' });
    }

    res.status(201).json(notification);
  } catch (error) {
    console.error('Create notification API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export both router and createNotification function
module.exports = router;
module.exports.createNotification = createNotification;