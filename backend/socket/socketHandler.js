const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Store active user connections
const userSockets = new Map(); // userId -> socketId
const socketUsers = new Map(); // socketId -> userId

module.exports = (io) => {
  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.token;
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (err) {
      console.error('Socket authentication error:', err);
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    console.log(`User ${userId} connected via WebSocket`);

    // Store user connection
    userSockets.set(userId, socket.id);
    socketUsers.set(socket.id, userId);

    // Update user online status
    User.findByIdAndUpdate(userId, {
      isOnline: true,
      lastSeen: new Date()
    }).catch(err => console.error('Update online status error:', err));

    // Join user to their personal room for notifications
    socket.join(`user_${userId}`);

    // Handle joining conversation rooms
    socket.on('join_conversation', (conversationId) => {
      console.log(`User ${userId} joined conversation ${conversationId}`);
      socket.join(`conversation_${conversationId}`);
    });

    // Handle leaving conversation rooms
    socket.on('leave_conversation', (conversationId) => {
      console.log(`User ${userId} left conversation ${conversationId}`);
      socket.leave(`conversation_${conversationId}`);
    });

    // Handle typing indicators
    socket.on('typing_start', (data) => {
      const { conversationId } = data;
      socket.to(`conversation_${conversationId}`).emit('user_typing', {
        userId,
        userName: socket.user.displayName,
        conversationId
      });
    });

    socket.on('typing_stop', (data) => {
      const { conversationId } = data;
      socket.to(`conversation_${conversationId}`).emit('user_stop_typing', {
        userId,
        conversationId
      });
    });

    // Handle user activity updates
    socket.on('user_activity', () => {
      User.findByIdAndUpdate(userId, {
        lastSeen: new Date(),
        isOnline: true
      }).catch(err => console.error('Activity update error:', err));
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User ${userId} disconnected from WebSocket`);
      
      // Remove from maps
      userSockets.delete(userId);
      socketUsers.delete(socket.id);
      
      // Update offline status with delay to handle quick reconnections
      setTimeout(() => {
        if (!userSockets.has(userId)) {
          User.findByIdAndUpdate(userId, {
            isOnline: false,
            lastSeen: new Date()
          }).catch(err => console.error('Update offline status error:', err));
        }
      }, 5000); // 5 second delay
    });
  });

  // Utility functions to emit events from routes
  io.emitNewNotification = (notification, userId) => {
    console.log(`🔔 [SocketHandler] Emitting notification to user_${userId}:`, {
      notificationId: notification._id,
      type: notification.type,
      fromUser: notification.fromUser?.displayName || notification.fromUser,
      message: notification.message,
      fullNotification: notification
    });
    io.to(`user_${userId}`).emit('new_notification', notification);
  };

  // Get online users
  io.getOnlineUsers = () => {
    return Array.from(userSockets.keys());
  };

  // Check if user is online
  io.isUserOnline = (userId) => {
    return userSockets.has(userId);
  };

  // Emit new message to conversation room
  io.emitNewMessage = (message, conversationId) => {
    console.log(`🔔 [SocketHandler] Emitting new message to room conversation_${conversationId}:`, {
      messageId: message._id,
      sender: message.sender?.displayName,
      senderAvatar: message.sender?.profilePicture,
      content: message.content?.substring(0, 50) + '...',
      fullMessage: message
    });
    
    // Emit with conversationId included for frontend validation
    io.to(`conversation_${conversationId}`).emit('newMessage', {
      conversationId: conversationId,
      message: message
    });
  };

  // Emit new message to participant's personal rooms (for unread count updates)
  io.emitNewMessageToParticipants = (message, conversationId, participantIds, senderId) => {
    console.log(`📬 [SocketHandler] Emitting new message notification to participants:`, {
      messageId: message._id,
      conversationId: conversationId,
      participants: participantIds,
      sender: senderId
    });
    
    // Emit to each participant's personal room (except sender)
    participantIds.forEach(participantId => {
      const participantIdStr = participantId._id ? participantId._id.toString() : participantId.toString();
      if (participantIdStr !== senderId.toString()) {
        console.log(`  → Emitting to user_${participantIdStr}`);
        io.to(`user_${participantIdStr}`).emit('newMessageNotification', {
          conversationId: conversationId,
          message: message
        });
      }
    });
  };

  // Emit conversation update to participants
  io.emitConversationUpdate = (conversation, participantIds) => {
    console.log(`🔄 [SocketHandler] Emitting conversation update to participants:`, {
      conversationId: conversation._id,
      participants: participantIds
    });
    participantIds.forEach(userId => {
      io.to(`user_${userId}`).emit('conversationUpdate', conversation);
    });
  };

  // GROUP CHAT SOCKET EVENTS

  // Emit group created event
  io.emitGroupCreated = (group, participantIds) => {
    console.log(`👥 [SocketHandler] Emitting group created to participants:`, {
      groupId: group._id,
      groupName: group.groupName,
      participants: participantIds
    });
    participantIds.forEach(userId => {
      io.to(`user_${userId}`).emit('groupCreated', group);
    });
  };

  // Emit member added event
  io.emitMemberAdded = (conversationId, newMemberIds, allParticipants) => {
    console.log(`➕ [SocketHandler] Emitting member added to group ${conversationId}:`, {
      newMembers: newMemberIds
    });
    // Notify existing members
    allParticipants.forEach(participant => {
      const userId = participant._id ? participant._id.toString() : participant.toString();
      io.to(`user_${userId}`).emit('memberAdded', {
        conversationId,
        newMemberIds,
        allParticipants
      });
    });
  };

  // Emit member removed event
  io.emitMemberRemoved = (conversationId, removedMemberId, remainingParticipants) => {
    console.log(`➖ [SocketHandler] Emitting member removed from group ${conversationId}:`, {
      removedMember: removedMemberId
    });
    // Notify removed member
    io.to(`user_${removedMemberId}`).emit('memberRemoved', {
      conversationId,
      removedMemberId
    });
    // Notify remaining members
    remainingParticipants.forEach(participant => {
      const userId = participant._id ? participant._id.toString() : participant.toString();
      io.to(`user_${userId}`).emit('memberRemoved', {
        conversationId,
        removedMemberId,
        remainingParticipants
      });
    });
  };

  // Emit group updated event
  io.emitGroupUpdated = (group, participantIds) => {
    console.log(`🔄 [SocketHandler] Emitting group updated:`, {
      groupId: group._id,
      groupName: group.groupName
    });
    participantIds.forEach(participant => {
      const userId = participant._id ? participant._id.toString() : participant.toString();
      io.to(`user_${userId}`).emit('groupUpdated', group);
    });
  };
};