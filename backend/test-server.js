const express = require('express')
const app = express()
const http = require('http')
const server = http.createServer(app)
const { Server } = require("socket.io")
const io = new Server(server, {
  cors: {
    origin: "http://localhost:8080", 
    credentials: true
  }
})
const mongoose = require('mongoose')
const dotenv = require('dotenv')
const cors = require('cors')

dotenv.config()

// Middleware
app.use(cors({
  origin: 'http://localhost:8080',
  credentials: true
}))
app.use(express.json())
app.use(express.static('uploads'))

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err))

// Simple test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is running!' })
})

// Make io available globally
app.set('io', io)

// Add message route (only the messages route)
const messageRoute = require('./routes/messages')
app.use('/api/messages', messageRoute)

// WebSocket Authentication & Events
require('./socket/socketHandler')(io)

server.listen(3000, () => {
  console.log('🚀 Test backend server is running on port 3000!')
})