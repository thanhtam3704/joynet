const router = require("express").Router();
const Post = require("../models/Post.js");
const User = require("../models/User.js");
const Comment = require("../models/Comment.js");
const Notification = require("../models/Notification.js");
const { createNotification } = require("./notifications.js");
const mongoSanitize = require("express-mongo-sanitize");
const sanitize = require("mongo-sanitize");

// Tạo post mới với description, isTextPost, isImagePost, userId, file
router.post("/", async (req, res) => {
  const sanitizedDesc = sanitize(req.sanitize(req.body.description));
  const sanitizedisText = sanitize(req.sanitize(req.body.isTextPost));
  const sanitizedisImage = sanitize(req.sanitize(req.body.isImagePost));
  const sanitizedUserId = sanitize(req.sanitize(req.body.userId));
  const sanitizedFile = sanitize(req.sanitize(req.body.file));

  const newPost = await new Post({
    description: sanitizedDesc,
    isTextPost: sanitizedisText,
    isImagePost: sanitizedisImage,
    userId: sanitizedUserId,
    file: sanitizedFile,
  });

  try {
    const createPost = await newPost.save();
    return res.status(200).json({ createPost });
  } catch (err) {
    return res.status(500).json(err);
  }
});

// Upload ảnh cho bài viết vào thư mục uploads/
router.post("/upload", (req, res) => {
  const file = req.files.file;
  file.mv("uploads/" + file.name, function (err) {
    if (err) {
      console.log(err);
    } else {
      console.log("uploaded");
    }
  });
  return res.json({ file: req.body.file });
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

//GET A POST
router.get("/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    return res.status(200).json(post);
  } catch (err) {
    return res.status(500).json(err);
  }
});

//GET FRIENDS POSTS
router.get("/timeline/:userId", async (req, res) => {
  try {
    const currentUser = await User.findById(req.params.userId);
    const userPosts = await Post.find({ userId: currentUser._id });
    const friendPosts = await Promise.all(
      currentUser.followings.map((friendId) => {
        return Post.find({ userId: friendId });
      })
    );
    return res.json(userPosts.concat(...friendPosts));
  } catch (err) {
    return res.status(500).json(err);
  }
});

//GET USER'S POSTS
router.get("/:userId/posts", async (req, res) => {
  try {
    const currentUser = await User.findById(req.params.userId);
    const userPosts = await Post.find({ userId: currentUser._id });

    return res.status(200).json(userPosts);
  } catch (err) {
    return res.status(500).json(err);
  }
});

// LIKE/UNLIKE POST
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
        message: "Đã bỏ thích bài viết",
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
        message: "Đã thích bài viết",
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
