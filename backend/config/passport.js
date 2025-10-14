const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const passport = require('passport');

// Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // Tìm user với Google ID
        let existingUser = await User.findOne({ googleId: profile.id });
        
        if (existingUser) {
            // User đã tồn tại, cập nhật thông tin
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
            if (!userWithEmail.profilePicture && profile.photos[0]) {
                userWithEmail.profilePicture = profile.photos[0].value;
            }
            
            await userWithEmail.save();
            return done(null, userWithEmail);
        }
        
        // Tạo user mới
        const newUser = new User({
            googleId: profile.id,
            email: profile.emails[0].value,
            displayName: profile.displayName,
            profilePicture: profile.photos[0]?.value || '',
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