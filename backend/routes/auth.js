const router = require("express").Router();
const User = require("../models/User.js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const xoauth2 = require("xoauth2");
const sanitize = require("mongo-sanitize");
const mongoose = require("mongoose");
const passport = require('../config/passport');
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
require("dotenv").config();

// Cấu hình Multer memory storage
const avatarStorage = multer.memoryStorage();

const uploadAvatar = multer({ 
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.AUTH_USER_EMAIL,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

//REGISTER
router.post("/register", async (req, res) => {
  try {
    const sanitizedEmail = sanitize(req.sanitize(req.body.email));
    const sanitizedPassword = sanitize(req.sanitize(req.body.password));
    const sanitizedDisplayName = sanitize(req.sanitize(req.body.displayName));

    // Check if user already exists
    const existingUser = await User.findOne({ email: sanitizedEmail });
    if (existingUser) {
      return res.status(400).json({ error: "Tài khoản đã tồn tại" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPass = await bcrypt.hash(sanitizedPassword, salt);

    // Create user object but don't save yet
    const newUser = new User({
      email: sanitizedEmail,
      password: hashedPass,
      displayName: sanitizedDisplayName,
    });

    // Generate a temporary ID for the verification link
    const tempId = new mongoose.Types.ObjectId();

    // Create email token with the user email and ID
    const emailToken = jwt.sign(
      {
        email: sanitizedEmail,
        userId: tempId,
      },
      process.env.EMAIL_SECRET,
      {
        expiresIn: "1d",
      }
    );

    const backendUrl = process.env.BACKEND_URL || 'https://social-backend-tfha.onrender.com';
    const url = `${backendUrl}/api/auth/confirmation/${emailToken}`;

    // Try to send email first
    try {
      await transporter.sendMail({
        from: "Social Web <phannam10102004@gmail.com>",
        to: sanitizedEmail,
        subject: "Xác nhận email",
        html: `Vui lòng nhấp vào liên kết này để xác thực email của bạn: <a href="${url}">${url}</a>`,
      });

      // Email sent successfully, now save the user
      const user = await newUser.save();
      return res.status(200).json({
        user: user,
        message:
          "Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản của bạn.",
      });
    } catch (emailErr) {
      return res.status(500).json({
        error: "Không thể gửi email xác thực",
        details: emailErr.message,
      });
    }
  } catch (err) {
    return res.status(500).json(err);
  }
});

//UPLOAD AVATAR - Cloudinary
router.post("/upload", uploadAvatar.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Vui lòng chọn ảnh' });
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
    
    return res.status(200).json({ 
      url: result.secure_url,
      publicId: result.public_id
    });
  } catch (err) {
    console.error('Upload avatar error:', err);
    return res.status(500).json({ error: 'Lỗi upload ảnh' });
  }
});

let refreshTokens = [];

//REFRESH TOKENS
router.post("/token", async (req, res) => {
  const refreshToken = req.body.token;
  if (refreshToken == null) return res.sendStatus(401);
  if (!refreshTokens.includes(refreshToken)) return res.sendStatus(403);
  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err) => {
    if (err) return res.sendStatus(403);
    const accessToken = jwt.sign(
      { userId: userLogin._id },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "1d" }
    );
    res.status(200).json({ token: accessToken });
  });
});

//LOGIN
router.post("/login", async (req, res) => {
  try {
    const userLogin = await User.findOne({
      email: req.body.email,
    });

    if (!userLogin)
      return res.status(404).json({ error: "Tài khoản không tồn tại" });

    if (!userLogin.confirmed)
      return res.status(400).json({ error: "Email chưa được xác thực" });

    const validPassword = await bcrypt.compare(
      req.body.password,
      userLogin.password
    );
    if (!validPassword)
      return res.status(400).json({ error: "Mật khẩu không đúng" });

    const accessToken = jwt.sign(
      { userId: userLogin._id },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "1d" }
    );

    const refreshToken = jwt.sign(
      { userId: userLogin._id },
      process.env.REFRESH_TOKEN_SECRET
    );

    refreshTokens.push(refreshToken);

    return res.status(200).json({
      user: userLogin,
      token: accessToken,
      refreshToken: refreshToken,
    });
  } catch (err) {
    return res.status(500).json(err);
  }
});

router.get("/user", async (req, res) => {
  let token = req.headers.token;
  
  console.log('GET /user - Token received:', token ? 'Yes' : 'No');

  if (!token) {
    return res.status(401).json({
      message: "No token provided",
    });
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, decoded) => {
    if (err) {
      console.error('JWT verification error:', err.message);
      return res.status(401).json({
        message: "unauthorized",
        error: err.message
      });
    }

    console.log('Token verified, userId:', decoded.userId);

    await User.findOne({ _id: decoded.userId }, (err, user) => {
      if (err) {
        console.error('Find user error:', err);
        return res.status(500).json({ message: "Database error" });
      }
      return res.status(200).json({
        title: "user grabbed",
        user: user,
      });
    });
  });
});

router.post("/logout", async (req, res) => {
  refreshTokens = refreshTokens.filter((token) => token !== req.body.token);

  res.cookie("jwt", "", {
    maxAge: 0,
  });

  res.send({
    message: "Đăng xuất thành công",
  });
});

router.get("/confirmation/:token", async (req, res) => {
  try {
    // Verify the token instead of just decoding it
    const decoded = jwt.verify(req.params.token, process.env.EMAIL_SECRET);

    // Find user by email since we're using a temporary ID before user creation
    const user = await User.findOne({ email: decoded.email });

    if (!user) {
      return res.status(401).json("Email confirmation failed: User not found");
    }

    // Update user confirmation status
    user.confirmed = true;
    await user.save();

    // Redirect to login page
    return res.redirect(process.env.FRONTEND_URL || "https://joynet.netlify.app/#/login");
  } catch (err) {
    console.error("Token verification failed:", err);
    return res.status(400).json({
      error: "Email confirmation failed: Invalid or expired token",
      details: err.message,
    });
  }
});

// PUT - Update user activity (lastSeen)
router.put("/update-activity", async (req, res) => {
  try {
    const token = req.headers.token;
    if (!token) {
      return res.status(401).json({ error: "Access denied" });
    }

    const verified = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const userId = verified.userId;

    await User.findByIdAndUpdate(userId, {
      lastSeen: new Date(),
      isOnline: true
    });

    res.status(200).json({ message: "Activity updated" });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Background job to set users offline after 5 minutes of inactivity
setInterval(async () => {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    await User.updateMany(
      {
        isOnline: true,
        lastSeen: { $lt: fiveMinutesAgo }
      },
      {
        isOnline: false
      }
    );
  } catch (error) {
    console.error("Auto-offline update error:", error);
  }
}, 60 * 1000); // Chạy mỗi phút

// Google OAuth Routes
// GET - Bắt đầu Google OAuth flow
router.get('/google', (req, res, next) => {
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })(req, res, next);
});

// GET - Google OAuth callback
router.get('/google/callback', 
  (req, res, next) => {
    next();
  },
  passport.authenticate('google', { 
    failureRedirect: (process.env.FRONTEND_URL || 'https://joynet.netlify.app') + '/#/login?error=google_auth_failed' 
  }),
  async (req, res) => {
    try {
      console.log('Google callback successful, user:', req.user?.email);
      
      if (!req.user) {
        console.error('No user found in request after authentication');
        return res.redirect((process.env.FRONTEND_URL || 'https://joynet.netlify.app') + '/#/login?error=no_user');
      }
      
      // Tạo JWT token cho user
      const token = jwt.sign(
        { userId: req.user._id },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: '7d' }
      );
      
      
      // Redirect về frontend với token - sử dụng hash route
      const frontendUrl = process.env.FRONTEND_URL || 'https://joynet.netlify.app';
      res.redirect(`${frontendUrl}/#/login?token=${token}&success=google_login`);
    } catch (error) {
      const frontendUrl = process.env.FRONTEND_URL || 'https://joynet.netlify.app';
      res.redirect(`${frontendUrl}/#/login?error=google_auth_failed`);
    }
  }
);

// POST - Google Login từ frontend (alternative method)
router.post('/google/login', async (req, res) => {
  try {
    const { credential, access_token } = req.body;
    
    let userInfo;
    
    if (credential) {
      // Xử lý ID token
      const { OAuth2Client } = require('google-auth-library');
      const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
      
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID
      });
      
      const payload = ticket.getPayload();
      userInfo = {
        googleId: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture
      };
    } else if (access_token) {
      // Xử lý access token
      const axios = require('axios');
      const response = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${access_token}`
        }
      });
      
      userInfo = {
        googleId: response.data.id,
        email: response.data.email,
        name: response.data.name,
        picture: response.data.picture
      };
    } else {
      return res.status(400).json({ error: 'Missing Google token' });
    }
    
    const { googleId, email, name, picture } = userInfo;
    
    // Tìm hoặc tạo user
    let user = await User.findOne({ googleId });
    
    // Download và upload ảnh Google lên Cloudinary nếu cần
    let cloudinaryAvatarUrl = picture;
    if (picture && picture.startsWith('http')) {
      try {
        // Upload ảnh từ URL lên Cloudinary
        const uploadResult = await cloudinary.uploader.upload(picture, {
          folder: 'social-web/avatars',
          transformation: [{ width: 500, height: 500, crop: 'fill' }]
        });
        cloudinaryAvatarUrl = uploadResult.secure_url;
      } catch (uploadError) {
        console.error('Failed to upload Google avatar to Cloudinary:', uploadError);
        // Giữ nguyên URL Google nếu upload thất bại
      }
    }
    
    if (!user) {
      // Kiểm tra user với email đã tồn tại chưa
      user = await User.findOne({ email });
      
      if (user) {
        // Link Google account
        user.googleId = googleId;
        user.confirmed = true;
        if (!user.displayName) user.displayName = name;
        if (!user.profilePicture) user.profilePicture = cloudinaryAvatarUrl;
      } else {
        // Tạo user mới
        user = new User({
          googleId,
          email,
          displayName: name,
          profilePicture: cloudinaryAvatarUrl,
          confirmed: true,
          password: 'GOOGLE_AUTH'
        });
      }
    } else {
      // User đã tồn tại, cập nhật avatar nếu chưa có hoặc vẫn là Google URL
      if (!user.profilePicture || (user.profilePicture.includes('googleusercontent.com'))) {
        user.profilePicture = cloudinaryAvatarUrl;
      }
    }
    
    // Cập nhật activity
    user.lastSeen = new Date();
    user.isOnline = true;
    await user.save();
    
    // Tạo JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(200).json({ 
      token,
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
        profilePicture: user.profilePicture
      }
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Google authentication failed' });
  }
});

// ============ FORGOT PASSWORD FLOW ============

// Step 1: Request OTP
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email là bắt buộc" });
    }

    // Kiểm tra user tồn tại
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Email không tồn tại trong hệ thống" });
    }

    // Tạo OTP 6 số
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Lưu OTP vào database (expire sau 10 phút)
    user.resetPasswordOTP = otp;
    user.resetPasswordOTPExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    // Gửi email OTP
    const mailOptions = {
      from: process.env.AUTH_USER_EMAIL,
      to: email,
      subject: "Mã xác thực đặt lại mật khẩu - Joynet",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px;">
          <div style="background: white; padding: 30px; border-radius: 8px;">
            <h2 style="color: #667eea; text-align: center; margin-bottom: 20px;">🔐 Đặt lại mật khẩu</h2>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">Xin chào,</p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản Joynet của mình.</p>
            <div style="background: #f3f4f6; border-left: 4px solid #667eea; padding: 20px; margin: 25px 0; border-radius: 4px;">
              <p style="color: #1f2937; font-size: 14px; margin-bottom: 10px; font-weight: 600;">Mã xác thực của bạn:</p>
              <p style="color: #667eea; font-size: 32px; font-weight: bold; text-align: center; letter-spacing: 8px; margin: 15px 0;">${otp}</p>
              <p style="color: #6b7280; font-size: 13px; margin-top: 10px;">⏱️ Mã này có hiệu lực trong <strong>10 phút</strong></p>
            </div>
            <p style="color: #374151; font-size: 14px; line-height: 1.6;">Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">© 2025 Joynet. All rights reserved.</p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ 
      message: "Mã xác thực đã được gửi đến email của bạn",
      email: email 
    });

  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Lỗi server. Vui lòng thử lại sau." });
  }
});

// Step 2: Verify OTP
router.post("/verify-reset-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email và OTP là bắt buộc" });
    }

    // Tìm user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Email không tồn tại" });
    }

    // Kiểm tra OTP
    if (!user.resetPasswordOTP || !user.resetPasswordOTPExpires) {
      return res.status(400).json({ message: "Không tìm thấy mã xác thực. Vui lòng yêu cầu lại." });
    }

    // Kiểm tra OTP hết hạn
    if (Date.now() > user.resetPasswordOTPExpires) {
      return res.status(410).json({ message: "Mã xác thực đã hết hạn" });
    }

    // Kiểm tra OTP đúng
    if (user.resetPasswordOTP !== otp) {
      return res.status(400).json({ message: "Mã xác thực không đúng" });
    }

    // Tạo reset token
    const resetToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: '15m' }
    );

    res.status(200).json({ 
      message: "Xác thực thành công",
      resetToken: resetToken
    });

  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({ message: "Lỗi server. Vui lòng thử lại sau." });
  }
});

// Step 3: Reset Password
router.post("/reset-password", async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;

    if (!email || !resetToken || !newPassword) {
      return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });
    }

    // Verify reset token
    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.ACCESS_TOKEN_SECRET);
    } catch (err) {
      return res.status(400).json({ message: "Token không hợp lệ hoặc đã hết hạn" });
    }

    // Kiểm tra email khớp
    if (decoded.email !== email) {
      return res.status(400).json({ message: "Email không khớp" });
    }

    // Tìm user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    // Hash password mới
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Cập nhật password
    user.password = hashedPassword;
    user.resetPasswordOTP = undefined;
    user.resetPasswordOTPExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Đổi mật khẩu thành công" });

  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Lỗi server. Vui lòng thử lại sau." });
  }
});

module.exports = router;
