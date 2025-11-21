const express = require('express')
const app = express()
const http = require('http')
const server = http.createServer(app)
const { Server } = require("socket.io")
const io = new Server(server, {
  cors: {
    origin: [
      process.env.FRONTEND_URL || "http://localhost:8080",
      "https://joynet.netlify.app"
    ],
    credentials: true
  }
})
const mongoose = require('mongoose')
const dotenv = require('dotenv')
const helmet = require('helmet')
const morgan = require('morgan')
const cors = require('cors')
// const fileupload = require('express-fileupload') // Không cần nữa - dùng Cloudinary
const expressSanitizer = require('express-sanitizer')
const sanitize = require('mongo-sanitize')
const session = require('express-session')
const passport = require('./config/passport')

const userRoute = require('./routes/users')
const authRoute = require('./routes/auth')
const postRoute = require('./routes/posts')
const notificationRoute = require('./routes/notifications')
const messageRoute = require('./routes/messages')
const followRequestRoute = require('./routes/followRequests')

dotenv.config()
console.log("MONGO_URL after load:", process.env.MONGO_URL);

mongoose.connect(
  process.env.MONGO_URL,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
  () => {
    console.log('connected to mongodb')
  }
)

app.use(express.json())
app.use(helmet({
  crossOriginOpenerPolicy: false, // Disable COOP for Google OAuth compatibility
  crossOriginEmbedderPolicy: false, // Disable COEP for Google OAuth compatibility  
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://accounts.google.com"],
      frameSrc: ["'self'", "https://accounts.google.com"],
      connectSrc: ["'self'", "https://accounts.google.com"]
    }
  }
}))
app.use(morgan('common'))
app.use(cors({ 
  credentials: true, 
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:8080',
    'https://joynet.netlify.app'
  ],
  optionsSuccessStatus: 200
}))
// app.use(fileupload()) // Không cần nữa - dùng Cloudinary
app.use(expressSanitizer())

// Session & Passport middleware
app.use(session({
  secret: process.env.ACCESS_TOKEN_SECRET,
  resave: false,
  saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())

// Make io available globally
app.set('io', io)

app.use('/api/users', userRoute)
app.use('/api/auth', authRoute)
app.use('/api/posts', postRoute)
app.use('/api/notifications', notificationRoute)
app.use('/api/messages', messageRoute)
app.use('/api/follow-requests', followRequestRoute)

// WebSocket Authentication & Events
require('./socket/socketHandler')(io)

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`backend server is running on port ${PORT}!`)
})
