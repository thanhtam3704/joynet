const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

// Store active user connections
const userSockets = new Map(); // userId -> socketId
const socketUsers = new Map(); // socketId -> userId

// Store ongoing video calls: conversationId -> { callerId, callerName, callerAvatar, participants: [userId1, userId2, ...], startTime, isGroupCall, joinedUsers: Set<userId>, callStartTime }
const ongoingCalls = new Map();

// Store call timeouts for missed call detection
const callTimeouts = new Map(); // conversationId -> timeoutId

// Helper function to create and emit message
async function createAndEmitMessage(io, conversationId, senderId, content, senderInfo = null) {
  try {
    const message = new Message({
      conversationId,
      sender: senderId,
      content: content,
      messageType: 'text'
    });
    await message.save();
    
    // Populate sender info
    if (senderInfo) {
      message.sender = senderInfo;
    } else {
      await message.populate('sender', 'displayName profilePicture email');
    }
    
    const messageObj = message.toObject();
    
    // Update conversation's lastMessage
    await Conversation.findByIdAndUpdate(
      conversationId,
      { lastMessage: message._id, updatedAt: new Date() },
      { new: true }
    );
    
    // Emit to conversation room
    io.to(`conversation_${conversationId}`).emit('newMessage', {
      conversationId: conversationId,
      message: messageObj
    });
    
    // Get participants and emit notifications
    const conversation = await Conversation.findById(conversationId).populate('participants', '_id');
    if (conversation && conversation.participants) {
      conversation.participants.forEach(participant => {
        const participantId = participant._id.toString();
        io.to(`user_${participantId}`).emit('newMessageNotification', {
          conversationId: conversationId,
          message: messageObj
        });
      });
    }
    
    console.log('✅ [VideoCall] Message created and emitted:', messageObj._id);
    return messageObj;
  } catch (error) {
    console.error('❌ [VideoCall] Error creating message:', error);
    throw error;
  }
}

// Helper function to create message without emitting (for personalized messages)
async function createMessage(conversationId, senderId, content) {
  try {
    const message = new Message({
      conversationId,
      sender: senderId,
      content: content,
      messageType: 'text'
    });
    await message.save();
    
    // Populate sender info
    await message.populate('sender', 'displayName profilePicture email');
    
    // Update conversation's lastMessage
    await Conversation.findByIdAndUpdate(
      conversationId,
      { lastMessage: message._id, updatedAt: new Date() },
      { new: true }
    );
    
    return message.toObject();
  } catch (error) {
    console.error('❌ [VideoCall] Error creating message:', error);
    throw error;
  }
}

// Helper function to emit different messages to caller vs receivers
async function emitMessageToParticipants(io, conversation, message, callerId) {
  try {
    const callerIdStr = callerId.toString();
    
    // Emit same message to all participants
    // Frontend will transform it based on viewer (caller vs receiver)
    conversation.participants.forEach(participant => {
      const participantId = participant._id.toString();
      const isCallerParticipant = participantId === callerIdStr;
      
      console.log(`📤 [VideoCall] Emitting to ${participantId} (${isCallerParticipant ? 'caller' : 'receiver'}):`, message.content);
      
      // Emit to user's room
      io.to(`user_${participantId}`).emit('newMessage', {
        conversationId: conversation._id.toString(),
        message: message
      });
    });
    
    console.log('✅ [VideoCall] Message sent to all participants');
  } catch (error) {
    console.error('❌ [VideoCall] Error emitting messages:', error);
    throw error;
  }
}

// Helper function to handle missed call (timeout)
async function handleMissedCall(io, conversationId, callerId, isGroupCall) {
  const callInfo = ongoingCalls.get(conversationId);
  if (!callInfo) {
    console.log('⏭️ [VideoCall] Call not found, already cleaned up');
    return;
  }
  
  // Check if call was answered or cancelled
  if (callInfo.wasAnswered) {
    console.log('⏭️ [VideoCall] Call was answered, skipping missed call handling');
    return;
  }
  
  if (callInfo.isCancelled) {
    console.log('⏭️ [VideoCall] Call was cancelled, skipping missed call handling');
    return;
  }
  
  console.log('⏰ [VideoCall] Handling missed call for:', conversationId);
  
  try {
    const conversation = await Conversation.findById(conversationId).populate('participants', '_id displayName profilePicture email');
    if (!conversation) return;
    
    if (isGroupCall) {
      // GROUP MISSED: No one joined - everyone sees same message
      await createAndEmitMessage(
        io,
        conversationId,
        callerId,
        '📞 CALL_MISSED_GROUP'
      );
    } else {
      // 1-1 MISSED: Nobody answered within timeout
      // Create only 1 message with code CALL_NO_ANSWER
      // Caller sees: "Không có phản hồi"
      // Receiver sees: "Cuộc gọi nhỡ"
      const message = await createMessage(conversationId, callerId, '📞 CALL_NO_ANSWER');
      
      // Emit same message to all participants
      await emitMessageToParticipants(io, conversation, message, callerId);
    }
  } catch (error) {
    console.error('❌ [VideoCall] Error handling missed call:', error);
  } finally {
    ongoingCalls.delete(conversationId);
    callTimeouts.delete(conversationId);
  }
}

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
    socket.on('video-call:start', async ({ conversationId, participants, isGroupCall }) => {
      
      // ✅ Store ongoing call with joined users tracking
      ongoingCalls.set(conversationId, {
        callerId: userId,
        callerName: socket.user.displayName || 'Unknown',
        callerAvatar: socket.user.profilePicture || '',
        participants: participants,
        startTime: Date.now(),
        callStartTime: null, // Will be set when first person joins
        isGroupCall: isGroupCall,
        joinedUsers: new Set([userId]), // Caller is already "in" the call
        wasAnswered: false // Track if anyone answered
      });
      console.log('💾 [VideoCall] Stored ongoing call:', conversationId);
      
      // Set timeout for missed call (60 seconds)
      const timeoutId = setTimeout(async () => {
        await handleMissedCall(io, conversationId, userId, isGroupCall);
      }, 60000);
      callTimeouts.set(conversationId, timeoutId);
      console.log('⏰ [VideoCall] Set timeout for missed call detection');
      
      // Notify all participants except caller
      console.log(`📞 [VideoCall] Starting to notify ${participants.length} participants`);
      let notifiedCount = 0;
      
      participants.forEach((participant, index) => {
        const participantId = participant._id ? participant._id.toString() : participant.toString();
        console.log(`📞 [VideoCall] [${index + 1}/${participants.length}] Participant:`, participantId, 'vs Caller:', userId);
  
        if (participantId !== userId) {
          const targetSocketId = userSockets.get(participantId);
          console.log(`📞 [VideoCall] Socket lookup for ${participantId}:`, targetSocketId ? `Found: ${targetSocketId}` : 'NOT FOUND');
    
          if (targetSocketId) {
            // Emit to specific socket ID
            io.to(targetSocketId).emit('video-call:incoming', {
              conversationId,
              callerId: userId,
              callerName: socket.user.displayName || 'Unknown',
              callerAvatar: socket.user.profilePicture || '',
              isGroupCall
            });
            notifiedCount++;
            console.log(`✅ [VideoCall] [${notifiedCount}] Sent to ${targetSocketId} (user ${participantId})`);
          } else {
            console.log(`⚠️ [VideoCall] User ${participantId} is OFFLINE`);
          }
        } else {
          console.log(`⏭️ [VideoCall] Skipping caller ${participantId}`);
        }
      });
      
      console.log(`📊 [VideoCall] Summary: ${notifiedCount}/${participants.length - 1} notified (excluding caller)`);
      console.log(`📊 [VideoCall] Online users:`, Array.from(userSockets.keys()));
      
      // Join call room
      socket.join(`call_${conversationId}`);
      console.log(`✅ [VideoCall] User ${userId} joined room call_${conversationId}`);
    });

    // Call accepted by receiver
    socket.on('video-call:accept', ({ conversationId, callerId }) => {
      console.log(`✅ [VideoCall] User ${userId} accepted call from ${callerId}`);
      
      // Clear timeout since call was answered
      const timeoutId = callTimeouts.get(conversationId);
      if (timeoutId) {
        clearTimeout(timeoutId);
        callTimeouts.delete(conversationId);
        console.log('⏰ [VideoCall] Cleared missed call timeout');
      }
      
      // Mark call as answered and add to joined users
      const callInfo = ongoingCalls.get(conversationId);
      if (callInfo) {
        callInfo.wasAnswered = true;
        callInfo.joinedUsers.add(userId);
        if (!callInfo.callStartTime) {
          callInfo.callStartTime = Date.now();
        }
      }
      
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
      
      const callInfo = ongoingCalls.get(conversationId);
      if (!callInfo) {
        console.log(`⚠️ [VideoCall] Call ${conversationId} not found in ongoingCalls`);
        return;
      }
      
      const isGroupCall = callInfo.isGroupCall;
      
      // CRITICAL: Mark as cancelled FIRST to prevent race condition with timeout
      callInfo.isCancelled = true;
      console.log(`🏁 [VideoCall] Marked call ${conversationId} as cancelled`);
      
      // Clear timeout IMMEDIATELY
      const timeoutId = callTimeouts.get(conversationId);
      if (timeoutId) {
        clearTimeout(timeoutId);
        callTimeouts.delete(conversationId);
        console.log(`⏰ [VideoCall] Cleared timeout for conversation ${conversationId}`);
      }
      
      // Remove from ongoing calls immediately
      ongoingCalls.delete(conversationId);
      console.log(`🗑️ [VideoCall] Removed ongoing call ${conversationId}`);
      
      // Leave call room
      socket.leave(`call_${conversationId}`);
      
      try {
        const conversation = await Conversation.findById(conversationId).populate('participants', '_id displayName profilePicture email');
        if (!conversation) return;
        
        // CANCELLED: Caller hung up before anyone answered
        if (isGroupCall) {
          // Group: Everyone sees same message
          await createAndEmitMessage(io, conversationId, userId, '📞 CALL_CANCELLED_GROUP');
        } else {
          // 1-1: Create only 1 message, frontend will display differently based on viewer
          // Message code: CALL_CANCELLED
          // Caller sees: "Bạn đã hủy cuộc gọi"
          // Receiver sees: "Cuộc gọi nhỡ"
          const message = await createMessage(conversationId, userId, '📞 CALL_CANCELLED');
          
          // Emit same message to all participants
          await emitMessageToParticipants(io, conversation, message, userId);
        }
      } catch (error) {
        console.error('❌ [VideoCall] Error creating cancel message:', error);
      } finally {
        // Emit cancelled event to ALL participants (including caller for multi-device support)
        const participants = callInfo.participants || [];
        console.log(`📢 [VideoCall] Emitting video-call:cancelled to ${participants.length} participants`);
        
        participants.forEach(participant => {
          const participantId = participant._id ? participant._id.toString() : participant.toString();
          
          // Emit to user's personal room
          console.log(`📤 [VideoCall] Emitting cancelled to user_${participantId} for conversation ${conversationId}`);
          io.to(`user_${participantId}`).emit('video-call:cancelled', {
            conversationId
          });
          
          // Also emit directly to socket if user is online (more reliable)
          const participantSocket = userSockets.get(participantId);
          if (participantSocket) {
            io.to(participantSocket).emit('video-call:cancelled', {
              conversationId
            });
            console.log(`✅ [VideoCall] Sent cancelled event directly to socket ${participantSocket}`);
          } else {
            console.log(`⚠️ [VideoCall] User ${participantId} is OFFLINE`);
          }
        });
        
        // Also emit to conversation room as additional fallback
        io.to(`conversation_${conversationId}`).emit('video-call:cancelled', {
          conversationId
        });
        console.log('✅ [VideoCall] Cancelled event emitted to all participants + conversation room');
      }
    });

    // User joins video call (for group calls)
    socket.on('video-call:join', async ({ conversationId }) => {
      console.log(`📞 [VideoCall] User ${userId} joined call ${conversationId}`);
      
      // Clear timeout since someone joined
      const timeoutId = callTimeouts.get(conversationId);
      if (timeoutId) {
        clearTimeout(timeoutId);
        callTimeouts.delete(conversationId);
        console.log('⏰ [VideoCall] Cleared missed call timeout (user joined)');
      }
      
      // Mark as answered and add to joined users
      const callInfo = ongoingCalls.get(conversationId);
      if (callInfo) {
        callInfo.wasAnswered = true;
        callInfo.joinedUsers.add(userId);
        if (!callInfo.callStartTime) {
          callInfo.callStartTime = Date.now();
        }
        console.log(`📞 [VideoCall] Joined users: ${Array.from(callInfo.joinedUsers)}`);
      }
      
      // Get all users currently in the call room (before this user joins)
      const room = io.sockets.adapter.rooms.get(`call_${conversationId}`);
      const existingSocketIds = room ? Array.from(room) : [];
      
      console.log(`📞 [VideoCall] Existing socket IDs in room:`, existingSocketIds);
      
      // Get unique user IDs (avoid duplicates if user has multiple connections)
      const existingUserIds = new Set();
      for (const socketId of existingSocketIds) {
        const existingUserId = socketUsers.get(socketId);
        if (existingUserId && existingUserId !== userId) {
          existingUserIds.add(existingUserId);
        }
      }
      
      console.log(`📞 [VideoCall] Unique existing users:`, Array.from(existingUserIds));
      
      // Notify existing users about the new joiner
      socket.to(`call_${conversationId}`).emit('video-call:user-joined', {
        userId,
        userName: socket.user.displayName
      });
      
      // Join the room AFTER notifying others
      socket.join(`call_${conversationId}`);
      
      // Notify the new joiner about all existing UNIQUE users
      for (const existingUserId of existingUserIds) {
        const existingUser = await User.findById(existingUserId);
        if (existingUser) {
          console.log(`📞 [VideoCall] Notifying ${userId} about existing user: ${existingUserId} (${existingUser.displayName})`);
          io.to(socket.id).emit('video-call:user-joined', {
            userId: existingUserId,
            userName: existingUser.displayName
          });
        }
      }
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
      console.log(`🔚 [VideoCall] User ${userId} ending call ${conversationId}`);
      
      // Clear timeout if exists
      const timeoutId = callTimeouts.get(conversationId);
      if (timeoutId) {
        clearTimeout(timeoutId);
        callTimeouts.delete(conversationId);
      }
      
      const callInfo = ongoingCalls.get(conversationId);
      
      // Create system message if requested (when last person leaves)
      if (createSystemMessage && callInfo) {
        try {
          const isGroupCall = callInfo.isGroupCall;
          const callStartTime = callInfo.callStartTime;
          const wasAnswered = callInfo.wasAnswered;
          const joinedCount = callInfo.joinedUsers?.size || 0;
          
          console.log(`[DEBUG][VideoCall] Creating end message: wasAnswered=${wasAnswered}, callStartTime=${callStartTime}, joinedCount=${joinedCount}, joinedUsers=${Array.from(callInfo.joinedUsers || [])}`);
          
          // Calculate actual duration from call start time (hoặc từ startTime nếu không có callStartTime)
          const startTime = callStartTime || callInfo.startTime;
          const actualDuration = Math.floor((Date.now() - startTime) / 1000);
          const minutes = Math.floor(actualDuration / 60);
          const seconds = actualDuration % 60;
          
          let durationText = '';
          if (minutes > 0) {
            durationText = `${minutes} phút`;
            if (seconds > 0) {
              durationText += ` ${seconds} giây`;
            }
          } else {
            durationText = `${seconds} giây`;
          }
          
          if (isGroupCall) {
            // GROUP CALL
            // CRITICAL: If only caller joined (no one else), treat as MISSED
            if (joinedCount < 2) {
              console.log(`⚠️ [VideoCall] Group call ended but only ${joinedCount} user joined - treating as MISSED`);
              // Create MISSED message for all participants
              await createAndEmitMessage(io, conversationId, callInfo.callerId, '📞 CALL_MISSED_GROUP');
            } else {
              // Có người join → tạo ENDED message
              // Group call: Create ENDED message for joined users only
              const content = `🎥📞 CALL_ENDED_GROUP|${durationText}|${joinedCount}`;
              
              // LƯU message vào database với field visibleTo để chỉ người join thấy
              const Message = require('../models/Message');
              const joinedUserIds = Array.from(callInfo.joinedUsers);
              
              console.log(`🔵 [VideoCall] Creating CALL_ENDED_GROUP with visibleTo:`, joinedUserIds);
              
              const endMessage = new Message({
                conversationId: conversationId,
                sender: callInfo.callerId,
                content: content,
                messageType: 'text',
                visibleTo: joinedUserIds // CHỈ người join mới thấy
              });
              await endMessage.save();
              
              console.log(`🔵 [VideoCall] Message saved to DB:`, {
                messageId: endMessage._id,
                visibleTo: endMessage.visibleTo,
                visibleToLength: endMessage.visibleTo?.length
              });
              
              // Populate sender info
              await endMessage.populate('sender', 'displayName profilePicture');
              
              // Emit message ONLY to users who joined
              for (const joinedUserId of joinedUserIds) {
                io.to(`user_${joinedUserId}`).emit('newMessage', {
                  conversationId: conversationId,
                  message: endMessage
                });
                console.log(`📤 [VideoCall] Emitted message to user: ${joinedUserId}`);
              }
              
              console.log(`✅ [VideoCall] CALL_ENDED_GROUP message saved with visibleTo=${joinedUserIds.length} users`);
              
              // Create MISSED message for users who didn't join
              try {
                const conversation = await Conversation.findById(conversationId).populate('participants', '_id displayName');
                if (conversation) {
                  const allParticipants = conversation.participants;
                  const joinedUserIds = Array.from(callInfo.joinedUsers);
                  
                  // Find users who didn't join
                  const missedUsers = allParticipants.filter(p => 
                    !joinedUserIds.includes(p._id.toString())
                  );
                  
                  // Get caller info
                  const caller = allParticipants.find(p => p._id.toString() === callInfo.callerId.toString());
                  const callerName = caller?.displayName || 'Unknown';
                  
                  // Create MISSED message for each user who didn't join
                  if (missedUsers.length > 0) {
                    console.log(`📢 [VideoCall] Creating missed messages for ${missedUsers.length} users`);
                    
                    for (const missedUser of missedUsers) {
                      const missedUserId = missedUser._id.toString();
                      const missedUserName = missedUser.displayName;
                      
                      // Create message với content có callerName
                      const missedContent = `📞 CALL_MISSED_GROUP_USER|${callerName}`;
                      
                      const missedMessage = new Message({
                        conversationId: conversationId,
                        sender: callInfo.callerId,
                        content: missedContent,
                        messageType: 'text',
                        visibleTo: [missedUserId] // CHỈ user này thấy
                      });
                      await missedMessage.save();
                      
                      // Populate sender info
                      await missedMessage.populate('sender', 'displayName profilePicture');
                      
                      // Emit message to this specific user
                      io.to(`user_${missedUserId}`).emit('newMessage', {
                        conversationId: conversationId,
                        message: missedMessage
                      });
                      
                      console.log(`✅ [VideoCall] Sent missed message to ${missedUserId}: ${missedContent}`);
                    }
                  }
                }
              } catch (error) {
                console.error('❌ [VideoCall] Error creating missed messages:', error);
              }
            }
          } else {
            // 1-1 call: Same message for both showing duration
            const content = `🎥📞 CALL_ENDED|${durationText}`;
            await createAndEmitMessage(io, conversationId, callInfo.callerId, content);
          }
          
          console.log('✅ [VideoCall] Call end message sent to all participants');
        } catch (error) {
          console.error('❌ [VideoCall] Error creating call end message:', error);
        }
      }
      
      // Remove from ongoing calls when call ends
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
      
      const callInfo = ongoingCalls.get(conversationId);
      const isGroupCall = callInfo?.isGroupCall || false;
      
      if (isGroupCall) {
        // GROUP CALL: 1 người reject KHÔNG ảnh hưởng đến cuộc gọi
        // Cuộc gọi vẫn tiếp tục cho những người khác
        // KHÔNG tạo message, KHÔNG clear timeout, KHÔNG xóa ongoing call
        console.log(`📞 [VideoCall] Group call - User ${userId} rejected, call continues for others`);
        
        // Chỉ notify caller rằng user này đã reject
        const callerSocket = userSockets.get(callerId);
        if (callerSocket) {
          io.to(callerSocket).emit('video-call:rejected', {
            userId,
            userName: socket.user.displayName,
            conversationId
          });
        }
        
        // Không làm gì thêm, cuộc gọi vẫn tiếp tục
        return;
      }
      
      // 1-1 CALL: Reject = End call ngay
      if (callInfo) {
        // Mark as cancelled to prevent timeout from firing
        callInfo.isCancelled = true;
        console.log(`🏁 [VideoCall] Marked call ${conversationId} as cancelled (rejected)`);
      }
      
      // Clear timeout
      const timeoutId = callTimeouts.get(conversationId);
      if (timeoutId) {
        clearTimeout(timeoutId);
        callTimeouts.delete(conversationId);
      }
      
      // REJECT = Receiver declined the call
      try {
        const conversation = await Conversation.findById(conversationId).populate('participants', '_id displayName profilePicture email');
        if (!conversation) return;
        
        // 1-1: Create only 1 message, frontend displays differently
        // Message code: CALL_NO_ANSWER (reject = no answer from receiver)
        // Caller sees: "Không có phản hồi"
        // Receiver sees: "Cuộc gọi nhỡ"
        const message = await createMessage(conversationId, callerId, '📞 CALL_NO_ANSWER');
        
        // Emit same message to all participants
        await emitMessageToParticipants(io, conversation, message, callerId);
      } catch (error) {
        console.error('❌ [VideoCall] Error creating reject message:', error);
      } finally {
        // Remove from ongoing calls
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