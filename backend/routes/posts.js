const router = require("express").Router();
const Post = require("../models/Post.js");
const User = require("../models/User.js");
const Comment = require("../models/Comment.js");
const Notification = require("../models/Notification.js");
const { createNotification } = require("./notifications.js");
const mongoSanitize = require("express-mongo-sanitize");
const sanitize = require("mongo-sanitize");
const multer = require('multer');
const cloudinary = require('../config/cloudinary');

// Cấu hình Multer memory storage
const postStorage = multer.memoryStorage();

const uploadPost = multer({ 
  storage: postStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

// Tạo post mới với description, isTextPost, isImagePost, userId, file
router.post("/", async (req, res) => {
  const sanitizedDesc = sanitize(req.sanitize(req.body.description));
  const sanitizedisText = sanitize(req.sanitize(req.body.isTextPost));
  const sanitizedisImage = sanitize(req.sanitize(req.body.isImagePost));
  const sanitizedUserId = sanitize(req.sanitize(req.body.userId));
  const sanitizedFile = sanitize(req.sanitize(req.body.file));
  const sanitizedPrivacy = sanitize(req.sanitize(req.body.privacy)) || 'public';

  const newPost = await new Post({
    description: sanitizedDesc,
    isTextPost: sanitizedisText,
    isImagePost: sanitizedisImage,
    userId: sanitizedUserId,
    file: sanitizedFile,
    privacy: sanitizedPrivacy,
  });

  try {
    const createPost = await newPost.save();
    return res.status(200).json({ createPost });
  } catch (err) {
    return res.status(500).json(err);
  }
});

// Upload ảnh/video cho bài viết lên Cloudinary
router.post("/upload", uploadPost.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Vui lòng chọn file' });
    }
    
    // Xác định resource type
    const resourceType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
    
    // Upload lên Cloudinary từ buffer
    const uploadStream = () => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'social-web/posts',
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
      resourceType: resourceType
    });
  } catch (err) {
    console.error('Upload post file error:', err);
    return res.status(500).json({ error: 'Lỗi upload file' });
  }
});

//COMMENT POST
router.put("/:id/comment", async (req, res) => {
  try {
    const sanitizedUserId = sanitize(req.sanitize(req.body.userId));
    const sanitizedPostId = sanitize(req.sanitize(req.params.id));
    const sanitizedComment = sanitize(req.sanitize(req.body.comment));
    const sanitizedDisplayName = sanitize(req.sanitize(req.body.displayName));
    const sanitizedFile = sanitize(req.sanitize(req.body.file));
    const sanitizedisText = sanitize(req.sanitize(req.body.isTextComment));

    const post = await Post.findById(req.params.id);

    const comment = await new Comment({
      userId: sanitizedUserId,
      postId: sanitizedPostId,
      comment: sanitizedComment,
      isTextComment: sanitizedisText,
      displayName: sanitizedDisplayName,
      file: sanitizedFile,
    });
    await post.updateOne({ $push: { comments: req.body } });
    const addComment = await comment.save();

    // Tạo thông báo cho chủ bài viết (nếu không phải tự comment bài viết của mình)
    if (sanitizedUserId !== post.userId) {
      await createNotification(
        sanitizedUserId, // người comment
        post.userId,     // chủ bài viết
        'comment',       // loại thông báo
        sanitizedPostId, // ID bài viết
        addComment._id   // ID comment để scroll đến
      );
    }

    return res.status(200).json(addComment);
  } catch (err) {
    return res.status(500).json(err);
  }
});

//GET POSTS COMMENTS
router.get("/:id/comments", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    const comment = await Comment.find({ postId: post._id });
    return res.status(200).json(comment);
  } catch (err) {
    return res.status(500).json(err);
  }
});

// EDIT COMMENT
router.put("/:postId/comment/:commentId", async (req, res) => {
  try {
    const sanitizedPostId = sanitize(req.sanitize(req.params.postId));
    const sanitizedCommentId = sanitize(req.sanitize(req.params.commentId));
    const sanitizedUserId = sanitize(req.sanitize(req.body.userId));
    const sanitizedComment = sanitize(req.sanitize(req.body.comment));

    const comment = await Comment.findById(sanitizedCommentId);

    if (!comment) {
      return res.status(404).json({ error: "Bình luận không tồn tại" });
    }

    // Kiểm tra quyền sở hữu - chỉ người comment mới được sửa
    if (comment.userId !== sanitizedUserId) {
      return res.status(403).json({ error: "Bạn không có quyền sửa bình luận này" });
    }

    // Cập nhật comment
    comment.comment = sanitizedComment;
    comment.updatedAt = new Date();
    await comment.save();

    // Cập nhật trong mảng comments của post
    const post = await Post.findById(sanitizedPostId);
    if (post) {
      const commentIndex = post.comments.findIndex(c => c._id && c._id.toString() === sanitizedCommentId);
      if (commentIndex !== -1) {
        post.comments[commentIndex].comment = sanitizedComment;
        await post.save();
      }
    }

    return res.status(200).json({
      message: "Đã cập nhật bình luận thành công",
      comment: comment
    });
  } catch (err) {
    console.error("Edit comment error:", err);
    return res.status(500).json({ error: "Lỗi server khi sửa bình luận" });
  }
});

// DELETE COMMENT
router.delete("/:postId/comment/:commentId", async (req, res) => {
  try {
    const sanitizedPostId = sanitize(req.sanitize(req.params.postId));
    const sanitizedCommentId = sanitize(req.sanitize(req.params.commentId));
    const sanitizedUserId = sanitize(req.sanitize(req.body.userId));

    const comment = await Comment.findById(sanitizedCommentId);

    if (!comment) {
      return res.status(404).json({ error: "Bình luận không tồn tại" });
    }

    // Kiểm tra quyền sở hữu - chỉ người comment mới được xóa
    if (comment.userId !== sanitizedUserId) {
      return res.status(403).json({ error: "Bạn không có quyền xóa bình luận này" });
    }

    // Xóa comment khỏi collection Comment
    await Comment.findByIdAndDelete(sanitizedCommentId);

    // Xóa comment khỏi mảng comments của post
    const post = await Post.findById(sanitizedPostId);
    if (post) {
      post.comments = post.comments.filter(c => c._id && c._id.toString() !== sanitizedCommentId);
      await post.save();
    }

    // Xóa notifications liên quan đến comment này
    await Notification.deleteMany({ commentId: sanitizedCommentId });

    return res.status(200).json({
      message: "Đã xóa bình luận thành công",
      commentId: sanitizedCommentId
    });
  } catch (err) {
    console.error("Delete comment error:", err);
    return res.status(500).json({ error: "Lỗi server khi xóa bình luận" });
  }
});

//GET COMMENTERS (unique users who commented)
router.get("/:id/commenters", async (req, res) => {
  try {
    const sanitizedPostId = sanitize(req.sanitize(req.params.id));
    
    console.log('🔍 Getting commenters for post:', sanitizedPostId);
    
    // Get all comments for this post
    const comments = await Comment.find({ postId: sanitizedPostId })
      .sort({ createdAt: -1 });
    
    console.log('📝 Found comments:', comments.length);
    
    // Get unique user IDs
    const uniqueUserIds = [...new Set(comments.map(c => c.userId))];
    console.log('👥 Unique user IDs:', uniqueUserIds);
    
    // Fetch user details for each unique userId
    const User = require('../models/User');
    const users = await User.find({ _id: { $in: uniqueUserIds } })
      .select('displayName email profilePicture');
    
    console.log('✅ Users found:', users);
    
    // Map users to commenter format
    const commenters = users.map(user => ({
      _id: user._id,
      username: user.displayName || user.email,
      displayName: user.displayName,
      profilePicture: user.profilePicture
    }));
    
    console.log('📤 Sending response:', {
      commenters,
      count: commenters.length,
      totalComments: comments.length
    });
    
    return res.status(200).json({
      commenters,
      count: commenters.length,
      totalComments: comments.length
    });
  } catch (err) {
    console.error('❌ Get commenters error:', err);
    return res.status(500).json(err);
  }
});

//GET A POST
router.get("/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    return res.status(200).json(post);
  } catch (err) {
    return res.status(500).json(err);
  }
});

//GET FRIENDS POSTS (with pagination)
router.get("/timeline/:userId", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 6;
    const skip = (page - 1) * limit;

    const currentUser = await User.findById(req.params.userId);
    
    // Lấy tất cả userId cần query (bản thân + followings)
    const userIds = [currentUser._id, ...currentUser.followings];
    
    // Query posts với pagination - lọc private posts (chỉ hiển thị public hoặc private của chính mình)
    const posts = await Post.find({ 
      userId: { $in: userIds },
      $or: [
        { privacy: 'public' },
        { privacy: { $exists: false } }, // Bài cũ không có field privacy - coi như public
        { privacy: 'private', userId: req.params.userId }
      ]
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Initialize reactionsCount for old posts if not exists
    const enrichedPosts = posts.map(post => {
      const postObj = post.toObject();
      
      // Convert reactions Map to Object
      if (postObj.reactions instanceof Map) {
        postObj.reactions = Object.fromEntries(postObj.reactions);
      } else if (!postObj.reactions) {
        postObj.reactions = {};
      }
      
      // Convert reactionsCount Map to Object and recalculate if needed
      if (postObj.reactionsCount instanceof Map) {
        postObj.reactionsCount = Object.fromEntries(postObj.reactionsCount);
      } else if (!postObj.reactionsCount) {
        postObj.reactionsCount = {};
      }
      
      // Recalculate reactionsCount from reactions if it's empty or invalid
      if (Object.keys(postObj.reactionsCount).length === 0 && Object.keys(postObj.reactions).length > 0) {
        const tempCount = {};
        
        Object.values(postObj.reactions).forEach(reactionType => {
          if (!tempCount[reactionType]) {
            tempCount[reactionType] = 0;
          }
          tempCount[reactionType]++;
        });
        
        postObj.reactionsCount = tempCount;
        
        console.log(`📊 Post ${postObj._id} recalculated:`, {
          reactions: postObj.reactions,
          reactionsCount: postObj.reactionsCount
        });
      }
      
      return postObj;
    });
    
    // Đếm tổng số posts để tính hasMore - chỉ đếm public và private của mình
    const totalPosts = await Post.countDocuments({ 
      userId: { $in: userIds },
      $or: [
        { privacy: 'public' },
        { privacy: { $exists: false } }, // Bài cũ không có field privacy
        { privacy: 'private', userId: req.params.userId }
      ]
    });
    const hasMore = skip + posts.length < totalPosts;
    
    // Debug log
    console.log('Timeline API:', {
      page,
      limit,
      skip,
      postsReturned: posts.length,
      totalPosts,
      hasMore,
      calculation: `${skip} + ${posts.length} < ${totalPosts} = ${hasMore}`
    });
    
    return res.json({
      posts: enrichedPosts,
      hasMore,
      currentPage: page,
      totalPages: Math.ceil(totalPosts / limit),
      totalPosts
    });
  } catch (err) {
    console.error('Timeline API Error:', err);
    return res.status(500).json(err);
  }
});

//GET USER'S POSTS (with pagination)
router.get("/:userId/posts", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 6;
    const skip = (page - 1) * limit;
    const requestingUserId = req.query.requestingUserId; // User đang xem profile

    // Lọc posts: nếu là chính user thì hiển thị tất cả, còn không chỉ hiển thị public
    const query = { userId: req.params.userId };
    if (requestingUserId !== req.params.userId) {
      query.$or = [
        { privacy: 'public' },
        { privacy: { $exists: false } } // Bài cũ không có field privacy - coi như public
      ];
    }

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Initialize reactionsCount for old posts if not exists
    const enrichedPosts = posts.map(post => {
      const postObj = post.toObject();
      
      // Convert reactions Map to Object
      if (postObj.reactions instanceof Map) {
        postObj.reactions = Object.fromEntries(postObj.reactions);
      } else if (!postObj.reactions) {
        postObj.reactions = {};
      }
      
      // Convert reactionsCount Map to Object
      if (postObj.reactionsCount instanceof Map) {
        postObj.reactionsCount = Object.fromEntries(postObj.reactionsCount);
      } else if (!postObj.reactionsCount) {
        postObj.reactionsCount = {};
      }
      
      return postObj;
    });
    
    const totalPosts = await Post.countDocuments(query);
    const hasMore = skip + posts.length < totalPosts;

    return res.status(200).json({
      posts: enrichedPosts,
      hasMore,
      currentPage: page,
      totalPages: Math.ceil(totalPosts / limit),
      totalPosts
    });
  } catch (err) {
    return res.status(500).json(err);
  }
});

// LIKE/UNLIKE POST
// REACT TO POST (with emoji reactions)
router.put("/:id/react", async (req, res) => {
  try {
    const sanitizedPostId = sanitize(req.sanitize(req.params.id));
    const sanitizedUserId = sanitize(req.sanitize(req.body.userId));
    const sanitizedReactionType = sanitize(req.sanitize(req.body.reactionType)); // like, love, haha, wow, sad, angry

    const post = await Post.findById(sanitizedPostId);

    if (!post) {
      return res.status(404).json({ error: "Bài viết không tồn tại" });
    }

    // Validate reaction type
    const validReactions = ['like', 'love', 'haha', 'wow', 'sad', 'angry'];
    if (!validReactions.includes(sanitizedReactionType)) {
      return res.status(400).json({ error: "Loại cảm xúc không hợp lệ" });
    }

    // Initialize reactions and reactionsCount if not exists
    if (!post.reactions) {
      post.reactions = new Map();
    }
    if (!post.reactionsCount) {
      post.reactionsCount = new Map();
    }

    const currentReaction = post.reactions.get(sanitizedUserId);

    if (currentReaction === sanitizedReactionType) {
      // Nếu click vào reaction đang có -> bỏ reaction
      post.reactions.delete(sanitizedUserId);
      
      // Giảm count và xóa key nếu = 0
      const currentCount = post.reactionsCount.get(sanitizedReactionType) || 0;
      const newCount = Math.max(0, currentCount - 1);
      
      if (newCount === 0) {
        post.reactionsCount.delete(sanitizedReactionType);
      } else {
        post.reactionsCount.set(sanitizedReactionType, newCount);
      }
      
      // Cập nhật likes cũ để tương thích
      post.likes = Array.from(post.reactions.keys());
      post.likesCount = post.likes.length;
      
      await post.save();

      // KHÔNG xóa notification khi bỏ reaction
      // Giữ lại notification để khi react lại sẽ update thay vì tạo mới
      // Điều này tránh spam notification

      console.log('✅ Reaction removed:', {
        postId: sanitizedPostId,
        reactionsCount: Object.fromEntries(post.reactionsCount),
        reactions: Object.fromEntries(post.reactions)
      });

      return res.status(200).json({
        message: "Đã bỏ cảm xúc",
        userReaction: null,
        reactions: Object.fromEntries(post.reactions),
        reactionsCount: Object.fromEntries(post.reactionsCount),
        likesCount: post.likesCount,
      });
    } else {
      // Nếu có reaction khác -> giảm count reaction cũ
      if (currentReaction) {
        const oldCount = post.reactionsCount.get(currentReaction) || 0;
        const newOldCount = Math.max(0, oldCount - 1);
        
        if (newOldCount === 0) {
          post.reactionsCount.delete(currentReaction);
        } else {
          post.reactionsCount.set(currentReaction, newOldCount);
        }
      }

      // Thêm/đổi reaction mới
      post.reactions.set(sanitizedUserId, sanitizedReactionType);
      
      // Tăng count của reaction mới
      const newCount = (post.reactionsCount.get(sanitizedReactionType) || 0) + 1;
      post.reactionsCount.set(sanitizedReactionType, newCount);
      
      post.likes = Array.from(post.reactions.keys());
      post.likesCount = post.likes.length;
      
      await post.save();

      // Tạo/cập nhật thông báo với reactionType (emoji)
      // createNotification sẽ tự động:
      // - Tạo mới nếu chưa có
      // - Update reactionType nếu đã có (đổi emoji)
      if (sanitizedUserId !== post.userId) {
        await createNotification(
          sanitizedUserId,
          post.userId,
          'like',
          sanitizedPostId,
          null,
          '',
          sanitizedReactionType // Truyền reactionType để lưu emoji
        );
      }

      console.log('✅ Reaction added/changed:', {
        postId: sanitizedPostId,
        userReaction: sanitizedReactionType,
        reactionsCount: Object.fromEntries(post.reactionsCount),
        reactions: Object.fromEntries(post.reactions)
      });

      return res.status(200).json({
        message: "Đã thả cảm xúc",
        userReaction: sanitizedReactionType,
        reactions: Object.fromEntries(post.reactions),
        reactionsCount: Object.fromEntries(post.reactionsCount),
        likesCount: post.likesCount,
      });
    }
  } catch (err) {
    console.error("React error:", err);
    return res.status(500).json({ error: "Lỗi server khi xử lý cảm xúc" });
  }
});

// GET REACTION STATUS
router.get("/:id/reaction-status/:userId", async (req, res) => {
  try {
    const sanitizedPostId = sanitize(req.sanitize(req.params.id));
    const sanitizedUserId = sanitize(req.sanitize(req.params.userId));

    const post = await Post.findById(sanitizedPostId);

    if (!post) {
      return res.status(404).json({ error: "Bài viết không tồn tại" });
    }

    const userReaction = post.reactions ? post.reactions.get(sanitizedUserId) : null;
    
    // Convert Map to Object, chỉ có những reactions có count > 0
    const reactionsCount = post.reactionsCount instanceof Map 
      ? Object.fromEntries(post.reactionsCount)
      : {};

    return res.status(200).json({
      userReaction,
      reactions: post.reactions ? Object.fromEntries(post.reactions) : {},
      reactionsCount,
      likesCount: post.likesCount || 0,
    });
  } catch (err) {
    console.error("Get reaction status error:", err);
    return res.status(500).json({ error: "Lỗi server" });
  }
});

// GET REACTORS BY TYPE (danh sách người đã react theo loại emoji)
router.get("/:id/reactors/:reactionType?", async (req, res) => {
  try {
    const sanitizedPostId = sanitize(req.sanitize(req.params.id));
    const reactionType = req.params.reactionType; // optional: like, love, haha, wow, sad, angry

    console.log('🔍 Get reactors request:', { postId: sanitizedPostId, reactionType });

    const post = await Post.findById(sanitizedPostId);

    if (!post) {
      return res.status(404).json({ error: "Bài viết không tồn tại" });
    }

    const reactions = post.reactions || new Map();
    const reactionsObj = reactions instanceof Map ? Object.fromEntries(reactions) : reactions;

    console.log('📊 Post reactions:', reactionsObj);

    // Nếu có reactionType, lọc theo type đó
    let filteredUserIds = [];
    if (reactionType) {
      filteredUserIds = Object.entries(reactionsObj)
        .filter(([_, type]) => type === reactionType)
        .map(([userId, _]) => userId);
      console.log(`🔎 Filtered for "${reactionType}":`, filteredUserIds);
    } else {
      // Nếu không có type, lấy tất cả
      filteredUserIds = Object.keys(reactionsObj);
      console.log('🔎 All reactors:', filteredUserIds);
    }

    // Lấy thông tin user
    const users = await User.find({ _id: { $in: filteredUserIds } })
      .select('_id displayName profilePicture')
      .lean();

    console.log('👥 Users found:', users);

    // Map với reaction type của từng user
    const reactors = users.map(user => ({
      _id: user._id,
      username: user.displayName || 'Người dùng',
      profilePicture: user.profilePicture,
      reactionType: reactionsObj[user._id.toString()]
    }));

    console.log('✅ Final reactors:', reactors);

    return res.status(200).json({
      reactors,
      count: reactors.length,
      reactionType: reactionType || 'all'
    });
  } catch (err) {
    console.error("Get reactors error:", err);
    return res.status(500).json({ error: "Lỗi server" });
  }
});

router.put("/:id/like", async (req, res) => {
  try {
    const sanitizedPostId = sanitize(req.sanitize(req.params.id));
    const sanitizedUserId = sanitize(req.sanitize(req.body.userId));

    const post = await Post.findById(sanitizedPostId);

    if (!post) {
      return res.status(404).json({ error: "Bài viết không tồn tại" });
    }

    // Kiểm tra xem user đã like chưa
    const isLiked = post.likes.includes(sanitizedUserId);

    if (isLiked) {
      // Nếu đã like thì unlike (bỏ thích)
      post.likes = post.likes.filter((id) => id !== sanitizedUserId);
      post.likesCount = Math.max(0, post.likesCount - 1);
      await post.save();

      // Xóa notification nếu có
      if (sanitizedUserId !== post.userId) {
        await Notification.findOneAndDelete({
          fromUser: sanitizedUserId,
          toUser: post.userId,
          type: 'like',
          postId: sanitizedPostId
        });
      }

      return res.status(200).json({
        message: "Đã bỏ bày tỏ cảm xúc bài viết",
        isLiked: false,
        likesCount: post.likesCount,
      });
    } else {
      // Nếu chưa like thì like (thích)
      post.likes.push(sanitizedUserId);
      post.likesCount += 1;
      await post.save();

      // Tạo thông báo cho chủ bài viết (nếu không phải tự like bài viết của mình)
      if (sanitizedUserId !== post.userId) {
        await createNotification(
          sanitizedUserId, // người like
          post.userId,     // chủ bài viết
          'like',          // loại thông báo
          sanitizedPostId  // ID bài viết
        );
      }

      return res.status(200).json({
        message: "Đã bày tỏ cảm xúc bài viết",
        isLiked: true,
        likesCount: post.likesCount,
      });
    }
  } catch (err) {
    console.error("Like/Unlike error:", err);
    return res.status(500).json({ error: "Lỗi server khi xử lý like" });
  }
});

// GET LIKES OF A POST
router.get("/:id/likes", async (req, res) => {
  try {
    const sanitizedPostId = sanitize(req.sanitize(req.params.id));

    const post = await Post.findById(sanitizedPostId);

    if (!post) {
      return res.status(404).json({ error: "Bài viết không tồn tại" });
    }

    // Lấy thông tin chi tiết của những người đã like
    const likedUsers = await User.find({ _id: { $in: post.likes } }).select(
      "_id displayName email"
    ); // Chỉ lấy thông tin cần thiết

    return res.status(200).json({
      likesCount: post.likesCount,
      likedUsers: likedUsers,
    });
  } catch (err) {
    console.error("Get likes error:", err);
    return res
      .status(500)
      .json({ error: "Lỗi server khi lấy danh sách likes" });
  }
});

// GET LIKES COUNT ONLY (Chỉ lấy số lượng lượt thích)
router.get("/:id/likes-count", async (req, res) => {
  try {
    const sanitizedPostId = sanitize(req.sanitize(req.params.id));
    
    const post = await Post.findById(sanitizedPostId);
    
    if (!post) {
      return res.status(404).json({ error: "Bài viết không tồn tại" });
    }

    return res.status(200).json({
      postId: post._id,
      likesCount: post.likesCount,
    });
  } catch (err) {
    console.error("Get likes count error:", err);
    return res.status(500).json({ error: "Lỗi server khi lấy số lượng likes" });
  }
});

// CHECK IF USER LIKED POST (Kiểm tra user đã thích bài viết chưa)
router.get("/:id/like-status/:userId", async (req, res) => {
  try {
    const sanitizedPostId = sanitize(req.sanitize(req.params.id));
    const sanitizedUserId = sanitize(req.sanitize(req.params.userId));
    
    const post = await Post.findById(sanitizedPostId);
    
    if (!post) {
      return res.status(404).json({ error: "Bài viết không tồn tại" });
    }

    const isLiked = post.likes.includes(sanitizedUserId);

    return res.status(200).json({
      postId: post._id,
      userId: sanitizedUserId,
      isLiked: isLiked,
      likesCount: post.likesCount,
    });
  } catch (err) {
    console.error("Check like status error:", err);
    return res.status(500).json({ error: "Lỗi server khi kiểm tra trạng thái like" });
  }
});

// EDIT POST (Sửa bài viết)
router.put("/:id", async (req, res) => {
  try {
    const sanitizedPostId = sanitize(req.sanitize(req.params.id));
    const sanitizedUserId = sanitize(req.sanitize(req.body.userId));
    const sanitizedDescription = sanitize(req.sanitize(req.body.description));
    const sanitizedFile = sanitize(req.sanitize(req.body.file));
    const sanitizedPrivacy = sanitize(req.sanitize(req.body.privacy));

    const post = await Post.findById(sanitizedPostId);

    if (!post) {
      return res.status(404).json({ error: "Bài viết không tồn tại" });
    }

    // Kiểm tra quyền sở hữu - chỉ chủ bài viết mới được sửa
    if (post.userId !== sanitizedUserId) {
      return res.status(403).json({ error: "Bạn không có quyền sửa bài viết này" });
    }

    // Cập nhật thông tin bài viết
    const updateData = {};
    if (sanitizedDescription !== undefined) {
      updateData.description = sanitizedDescription;
    }
    if (sanitizedFile !== undefined) {
      updateData.file = sanitizedFile;
    }
    if (sanitizedPrivacy !== undefined) {
      updateData.privacy = sanitizedPrivacy;
    }
    updateData.updatedAt = new Date();

    const updatedPost = await Post.findByIdAndUpdate(
      sanitizedPostId,
      { $set: updateData },
      { new: true } // Trả về document sau khi đã cập nhật
    );

    return res.status(200).json({
      message: "Đã cập nhật bài viết thành công",
      post: updatedPost
    });
  } catch (err) {
    console.error("Edit post error:", err);
    return res.status(500).json({ error: "Lỗi server khi sửa bài viết" });
  }
});

// DELETE POST (Xóa bài viết)
router.delete("/:id", async (req, res) => {
  try {
    const sanitizedPostId = sanitize(req.sanitize(req.params.id));
    const sanitizedUserId = sanitize(req.sanitize(req.body.userId));

    const post = await Post.findById(sanitizedPostId);

    if (!post) {
      return res.status(404).json({ error: "Bài viết không tồn tại" });
    }

    // Kiểm tra quyền sở hữu - chỉ chủ bài viết mới được xóa
    if (post.userId !== sanitizedUserId) {
      return res.status(403).json({ error: "Bạn không có quyền xóa bài viết này" });
    }

    // Xóa tất cả comments liên quan đến bài viết này
    await Comment.deleteMany({ postId: sanitizedPostId });

    // Xóa tất cả notifications liên quan đến bài viết này
    await Notification.deleteMany({ postId: sanitizedPostId });

    // Xóa bài viết
    await Post.findByIdAndDelete(sanitizedPostId);

    return res.status(200).json({
      message: "Đã xóa bài viết thành công",
      postId: sanitizedPostId
    });
  } catch (err) {
    console.error("Delete post error:", err);
    return res.status(500).json({ error: "Lỗi server khi xóa bài viết" });
  }
});

module.exports = router;
