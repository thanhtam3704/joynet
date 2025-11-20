const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const path = require('path');
const cloudinary = require('cloudinary').v2;
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const passport = require('passport');

// Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // Upload ảnh Google lên Cloudinary
        let cloudinaryAvatarUrl = '';
        if (profile.photos && profile.photos[0]) {
            try {
                const uploadResult = await cloudinary.uploader.upload(profile.photos[0].value, {
                    folder: 'social-web/avatars',
                    transformation: [{ width: 500, height: 500, crop: 'fill' }]
                });
                cloudinaryAvatarUrl = uploadResult.secure_url;
            } catch (uploadError) {
                console.error('Failed to upload Google avatar:', uploadError);
                // Fallback to Google URL nếu upload thất bại
                cloudinaryAvatarUrl = profile.photos[0].value;
            }
        }
        
        // Tìm user với Google ID
        let existingUser = await User.findOne({ googleId: profile.id });
        
        if (existingUser) {
            // User đã tồn tại, cập nhật avatar nếu cần
            if (!existingUser.profilePicture || existingUser.profilePicture.includes('googleusercontent.com')) {
                existingUser.profilePicture = cloudinaryAvatarUrl;
            }
            existingUser.lastSeen = new Date();
            existingUser.isOnline = true;
            await existingUser.save();
            return done(null, existingUser);
        }
        
        // Kiểm tra user với email đã tồn tại chưa
        let userWithEmail = await User.findOne({ email: profile.emails[0].value });
        
        if (userWithEmail) {
            // Link Google account với user hiện tại
            userWithEmail.googleId = profile.id;
            userWithEmail.confirmed = true; // Auto confirm vì Google đã verify email
            userWithEmail.lastSeen = new Date();
            userWithEmail.isOnline = true;
            
            // Cập nhật thông tin nếu chưa có
            if (!userWithEmail.displayName) {
                userWithEmail.displayName = profile.displayName;
            }
            if (!userWithEmail.profilePicture) {
                userWithEmail.profilePicture = cloudinaryAvatarUrl;
            }
            
            await userWithEmail.save();
            return done(null, userWithEmail);
        }
        
        // Tạo user mới
        const newUser = new User({
            googleId: profile.id,
            email: profile.emails[0].value,
            displayName: profile.displayName,
            profilePicture: cloudinaryAvatarUrl,
            confirmed: true, // Auto confirm
            password: 'GOOGLE_AUTH', // Placeholder password
            lastSeen: new Date(),
            isOnline: true
        });
        
        const savedUser = await newUser.save();
        return done(null, savedUser);
        
    } catch (error) {
        return done(error, null);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

module.exports = passport;