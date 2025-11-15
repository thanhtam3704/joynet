const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

// Store active user connections
const userSockets = new Map(); // userId -> socketId
const socketUsers = new Map(); // socketId -> userId

// Store ongoing video calls: conversationId -> { callerId, callerName, callerAvatar, participants: [userId1, userId2, ...], startTime, isGroupCall }
const ongoingCalls = new Map();

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

    // ✅ Check for ongoing calls that this user should receive (with delay)
    // Delay to ensure frontend has time to setup listeners
    setTimeout(() => {
      console.log('🔍 [Connection] Checking for ongoing calls for user:', userId);
      for (const [conversationId, callData] of ongoingCalls.entries()) {
        console.log('🔍 [Connection] Checking call:', conversationId, callData);
        // Check if this user is a participant in the call
        const isParticipant = callData.participants.some(p => {
          const participantId = p._id ? p._id.toString() : p.toString();
          return participantId === userId;
        });
        
        if (isParticipant && callData.callerId !== userId) {
          console.log('📞 [Connection] Found ongoing call for user, sending incoming call event');
          // Send incoming call event to this user
          io.to(socket.id).emit('video-call:incoming', {
            conversationId,
            callerId: callData.callerId,
            callerName: callData.callerName,
            callerAvatar: callData.callerAvatar,
            isGroupCall: callData.isGroupCall
          });
        }
      }
    }, 500); // 500ms delay to let frontend setup listeners

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

    // VIDEO CALL SOCKET EVENTS
    
    // Start video call
    socket.on('video-call:start', ({ conversationId, participants, isGroupCall }) => {
      console.log(`📞 [VideoCall] User ${userId} starting call in ${conversationId}`);
      console.log('📞 [VideoCall] Participants:', participants);
      console.log('📞 [VideoCall] IsGroupCall:', isGroupCall);
      console.log('📞 [VideoCall] Current userSockets:', Array.from(userSockets.keys()));
      console.log('📞 [VideoCall] Current userSockets Map:', Array.from(userSockets.entries()));
      
      // ✅ Store ongoing call
      ongoingCalls.set(conversationId, {
        callerId: userId,
        callerName: socket.user.displayName || 'Unknown',
        callerAvatar: socket.user.profilePicture || '',
        participants: participants,
        startTime: Date.now(),
        isGroupCall: isGroupCall
      });
      console.log('💾 [VideoCall] Stored ongoing call:', conversationId);
      
      // Notify all participants except caller
      participants.forEach(participant => {
        const participantId = participant._id ? participant._id.toString() : participant.toString();
        console.log(`📞 [VideoCall] Checking participant: ${participantId} vs caller: ${userId}`);
        console.log(`📞 [VideoCall] participantId type: ${typeof participantId}, userId type: ${typeof userId}`);
        
        if (participantId !== userId) {
          const targetSocketId = userSockets.get(participantId);
          console.log(`📞 [VideoCall] Target socket for ${participantId}:`, targetSocketId);
          console.log(`📞 [VideoCall] Checking in userSockets.has(${participantId}):`, userSockets.has(participantId));
          
          if (targetSocketId) {
            // Emit to specific socket ID
            io.to(targetSocketId).emit('video-call:incoming', {
              conversationId,
              callerId: userId,
              callerName: socket.user.displayName || 'Unknown',
              callerAvatar: socket.user.profilePicture || '',
              isGroupCall
            });
            console.log(`✅ [VideoCall] Sent incoming call to socket ${targetSocketId} (user ${participantId})`);
          } else {
            console.log(`⚠️ [VideoCall] User ${participantId} is not online`);
          }
        } else {
          console.log(`⏭️ [VideoCall] Skipping caller ${participantId}`);
        }
      });
      
      // Join call room
      socket.join(`call_${conversationId}`);
      console.log(`✅ [VideoCall] User ${userId} joined room call_${conversationId}`);
    });

    // Call accepted by receiver
    socket.on('video-call:accept', ({ conversationId, callerId }) => {
      console.log(`✅ [VideoCall] User ${userId} accepted call from ${callerId}`);
      const callerSocket = userSockets.get(callerId);
      if (callerSocket) {
        io.to(callerSocket).emit('video-call:accepted', {
          userId,
          userName: socket.user.displayName,
          conversationId
        });
      }
      // Both users join the call room
      socket.join(`call_${conversationId}`);
    });

    // Call cancelled by caller
    socket.on('video-call:cancel', async ({ conversationId }) => {
      console.log(`❌ [VideoCall] User ${userId} cancelled call ${conversationId}`);
      
      // Create system message for missed call
      try {
        const message = new Message({
          conversationId,
          sender: userId,
          content: '📞 Đã bỏ lỡ cuộc gọi video',
          messageType: 'text'
        });
        await message.save();
        
        // Populate sender info
        await message.populate('sender', 'displayName profilePicture email');
        
        console.log('📞 [VideoCall] Message created:', {
          messageId: message._id,
          sender: message.sender,
          content: message.content
        });
        
        // Convert to plain object
        const messageObj = message.toObject();
        
        // Update conversation's lastMessage and get participants
        const conversation = await Conversation.findByIdAndUpdate(
          conversationId,
          {
            lastMessage: message._id,
            updatedAt: new Date()
          },
          { new: true }
        ).populate('participants', '_id');
        
        // Emit message to conversation room (for users currently in chat)
        io.to(`conversation_${conversationId}`).emit('newMessage', {
          conversationId: conversationId,
          message: messageObj
        });
        
        // Emit to each participant's personal room (for notification updates)
        if (conversation && conversation.participants) {
          conversation.participants.forEach(participant => {
            const participantId = participant._id.toString();
            if (participantId !== userId.toString()) {
              io.to(`user_${participantId}`).emit('newMessageNotification', {
                conversationId: conversationId,
                message: messageObj
              });
            }
          });
        }
        
        console.log('✅ [VideoCall] Missed call message created and emitted:', messageObj._id);
      } catch (error) {
        console.error('❌ [VideoCall] Error creating missed call message:', error);
      }
      
      // ✅ Remove from ongoing calls
      ongoingCalls.delete(conversationId);
      console.log('🗑️ [VideoCall] Removed ongoing call:', conversationId);
      
      socket.to(`call_${conversationId}`).emit('video-call:cancelled', {
        conversationId
      });
      socket.leave(`call_${conversationId}`);
    });

    // User joins video call
    socket.on('video-call:join', ({ conversationId }) => {
      console.log(`📞 [VideoCall] User ${userId} joined call ${conversationId}`);
      socket.join(`call_${conversationId}`);
      
      // Notify others in call
      socket.to(`call_${conversationId}`).emit('video-call:user-joined', {
        userId,
        userName: socket.user.displayName
      });
    });

    // WebRTC Offer
    socket.on('video-call:offer', ({ to, offer, conversationId }) => {
      console.log(`📞 [VideoCall] Offer from ${userId} to ${to}`);
      const targetSocket = userSockets.get(to);
      if (targetSocket) {
        io.to(targetSocket).emit('video-call:offer', {
          from: userId,
          userName: socket.user.displayName,
          offer,
          conversationId
        });
      }
    });

    // WebRTC Answer
    socket.on('video-call:answer', ({ to, answer, conversationId }) => {
      console.log(`📞 [VideoCall] Answer from ${userId} to ${to}`);
      const targetSocket = userSockets.get(to);
      if (targetSocket) {
        io.to(targetSocket).emit('video-call:answer', {
          from: userId,
          answer,
          conversationId
        });
      }
    });

    // ICE Candidate
    socket.on('video-call:ice-candidate', ({ to, candidate, conversationId }) => {
      const targetSocket = userSockets.get(to);
      if (targetSocket) {
        io.to(targetSocket).emit('video-call:ice-candidate', {
          from: userId,
          candidate,
          conversationId
        });
      }
    });

    // Toggle media (mic/camera)
    socket.on('video-call:toggle-media', ({ conversationId, type, enabled }) => {
      socket.to(`call_${conversationId}`).emit('video-call:toggle-media', {
        userId,
        type,
        enabled
      });
    });

    // End call
    socket.on('video-call:end', async ({ conversationId, duration, createSystemMessage }) => {
      console.log(`📞 [VideoCall] User ${userId} ended call ${conversationId}`);
      console.log(`📞 [VideoCall] Duration: ${duration}s, Create message: ${createSystemMessage}`);
      
      // Create system message if requested (when last person leaves)
      if (createSystemMessage && duration > 0) {
        try {
          const minutes = Math.floor(duration / 60);
          const seconds = duration % 60;
          let durationText = '';
          
          if (minutes > 0) {
            durationText = `${minutes} phút`;
            if (seconds > 0) {
              durationText += ` ${seconds} giây`;
            }
          } else {
            durationText = `${seconds} giây`;
          }
          
          const message = new Message({
            conversationId,
            sender: userId,
            content: ` 🎥📞Cuộc gọi video\n${durationText}`,
            messageType: 'text'
          });
          await message.save();
          
          // Populate sender info
          await message.populate('sender', 'displayName profilePicture email');
          
          console.log('📞 [VideoCall] Call end message created:', {
            messageId: message._id,
            content: message.content
          });
          
          // Convert to plain object
          const messageObj = message.toObject();
          
          // Update conversation's lastMessage
          await Conversation.findByIdAndUpdate(
            conversationId,
            {
              lastMessage: message._id,
              updatedAt: new Date()
            },
            { new: true }
          );
          
          // Update conversation and get participants
          const conversation = await Conversation.findById(conversationId).populate('participants', '_id');
          
          // Emit message to conversation room
          io.to(`conversation_${conversationId}`).emit('newMessage', {
            conversationId: conversationId,
            message: messageObj
          });
          
          // Emit to each participant's personal room for notification
          if (conversation && conversation.participants) {
            conversation.participants.forEach(participant => {
              const participantId = participant._id.toString();
              io.to(`user_${participantId}`).emit('newMessageNotification', {
                conversationId: conversationId,
                message: messageObj
              });
            });
          }
          
          console.log('✅ [VideoCall] Call duration message sent to all participants');
        } catch (error) {
          console.error('❌ [VideoCall] Error creating call end message:', error);
        }
      }
      
      // ✅ Remove from ongoing calls when call ends
      ongoingCalls.delete(conversationId);
      console.log('🗑️ [VideoCall] Removed ongoing call on end:', conversationId);
      
      socket.to(`call_${conversationId}`).emit('video-call:user-left', {
        userId
      });
      socket.leave(`call_${conversationId}`);
    });

    // Call rejected
    socket.on('video-call:reject', async ({ conversationId, callerId }) => {
      console.log(`📞 [VideoCall] User ${userId} rejected call from ${callerId}`);
      
      // Create system message for missed call
      try {
        const message = new Message({
          conversationId,
          sender: callerId,
          content: '📞 Đã bỏ lỡ cuộc gọi video',
          messageType: 'text'
        });
        await message.save();
        
        // Populate sender info
        await message.populate('sender', 'displayName profilePicture email');
        
        console.log('📞 [VideoCall] Message created:', {
          messageId: message._id,
          sender: message.sender,
          content: message.content
        });
        
        // Convert to plain object
        const messageObj = message.toObject();
        
        // Update conversation's lastMessage and get participants
        const conversation = await Conversation.findByIdAndUpdate(
          conversationId,
          {
            lastMessage: message._id,
            updatedAt: new Date()
          },
          { new: true }
        ).populate('participants', '_id');
        
        // Emit message to conversation room (for users currently in chat)
        io.to(`conversation_${conversationId}`).emit('newMessage', {
          conversationId: conversationId,
          message: messageObj
        });
        
        // Emit to each participant's personal room (for notification updates)
        if (conversation && conversation.participants) {
          conversation.participants.forEach(participant => {
            const participantId = participant._id.toString();
            if (participantId !== callerId.toString()) {
              io.to(`user_${participantId}`).emit('newMessageNotification', {
                conversationId: conversationId,
                message: messageObj
              });
            }
          });
        }
        
        console.log('✅ [VideoCall] Missed call message created and emitted:', messageObj._id);
      } catch (error) {
        console.error('❌ [VideoCall] Error creating missed call message:', error);
      }
      
      // ✅ Remove from ongoing calls
      ongoingCalls.delete(conversationId);
      console.log('🗑️ [VideoCall] Removed ongoing call on reject:', conversationId);
      
      const callerSocket = userSockets.get(callerId);
      if (callerSocket) {
        io.to(callerSocket).emit('video-call:rejected', {
          userId,
          userName: socket.user.displayName,
          conversationId
        });
      }
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

  // Emit messages read event
  io.emitMessagesRead = (conversationId, readerId, messages) => {
    console.log(`👁️ [SocketHandler] Emitting messages read to conversation_${conversationId}:`, {
      readerId,
      messageCount: messages.length
    });
    io.to(`conversation_${conversationId}`).emit('messagesRead', {
      conversationId,
      readerId,
      messages
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