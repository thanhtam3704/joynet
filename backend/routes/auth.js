const router = require("express").Router();
const User = require("../models/User.js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const xoauth2 = require("xoauth2");
const sanitize = require("mongo-sanitize");
const mongoose = require("mongoose");
const passport = require('../config/passport');
require("dotenv").config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "phannam10102004@gmail.com",
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

    const url = `http://localhost:3000/api/auth/confirmation/${emailToken}`;

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

//UPLOAD
router.post("/upload", (req, res) => {
  const file = req.files.file;
  file.mv("uploads/user/" + file.name, function (err) {
    if (err) {
      console.log(err);
    } else {
      console.log("uploaded");
    }
  });
  return res.json({ file: req.body.file });
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
    return res.redirect("http://localhost:8080/login");
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
    failureRedirect: 'http://localhost:8080/#/login?error=google_auth_failed' 
  }),
  async (req, res) => {
    try {
      console.log('Google callback successful, user:', req.user?.email);
      
      if (!req.user) {
        console.error('No user found in request after authentication');
        return res.redirect('http://localhost:8080/#/login?error=no_user');
      }
      
      // Tạo JWT token cho user
      const token = jwt.sign(
        { userId: req.user._id },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: '7d' }
      );
      
      
      // Redirect về frontend với token - sử dụng hash route
      res.redirect(`http://localhost:8080/#/login?token=${token}&success=google_login`);
    } catch (error) {
      res.redirect('http://localhost:8080/#/login?error=google_auth_failed');
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
    
    if (!user) {
      // Kiểm tra user với email đã tồn tại chưa
      user = await User.findOne({ email });
      
      if (user) {
        // Link Google account
        user.googleId = googleId;
        user.confirmed = true;
        if (!user.displayName) user.displayName = name;
        if (!user.profilePicture) user.profilePicture = picture;
      } else {
        // Tạo user mới
        user = new User({
          googleId,
          email,
          displayName: name,
          profilePicture: picture,
          confirmed: true,
          password: 'GOOGLE_AUTH'
        });
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

module.exports = router;
