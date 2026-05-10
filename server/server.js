const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cron = require('node-cron');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Models
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  avatar: { type: String, default: '' },
  status: { type: String, enum: ['online', 'offline', 'away'], default: 'offline' },
  theme: { type: String, default: 'dark' },
  createdAt: { type: Date, default: Date.now }
});

const messageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  type: { type: String, enum: ['text', 'voice', 'image'], default: 'text' },
  read: { type: Boolean, default: false },
  readAt: { type: Date },
  deleteAt: { type: Date },
  reactions: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

const chatRequestSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

const conversationSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Message = mongoose.model('Message', messageSchema);
const ChatRequest = mongoose.model('ChatRequest', chatRequestSchema);
const Conversation = mongoose.model('Conversation', conversationSchema);

// Online users tracking
const onlineUsers = new Map();

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.sendStatus(401);
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// REST API Routes
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const hashedPassword = await require('bcryptjs').hash(password, 10);
    const user = new User({ username, email, password: hashedPassword });
    await user.save();
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
    res.json({ token, userId: user._id, username: user.username });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }
    const validPassword = await require('bcryptjs').compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid password' });
    }
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
    res.json({ token, userId: user._id, username: user.username, avatar: user.avatar });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user.userId } })
      .select('username avatar status');
    res.json(users);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/conversations/:userId', authenticateToken, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.params.userId
    }).populate('participants', 'username avatar status').populate('lastMessage');
    res.json(conversations);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/messages/:conversationId', authenticateToken, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { senderId: req.params.userId, receiverId: req.params.otherUserId },
        { senderId: req.params.otherUserId, receiverId: req.params.userId }
      ]
    }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Socket.io Connection
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('user_connect', async (userId) => {
    onlineUsers.set(userId, socket.id);
    await User.findByIdAndUpdate(userId, { status: 'online' });
    io.emit('user_status', { userId, status: 'online' });
  });

  socket.on('send_message', async (data) => {
    const { senderId, receiverId, content, type } = data;
    const message = new Message({
      senderId,
      receiverId,
      content,
      type: type || 'text',
      deleteAt: null
    });
    await message.save();

    // Update or create conversation
    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] }
    });
    if (!conversation) {
      conversation = new Conversation({
        participants: [senderId, receiverId],
        lastMessage: message._id
      });
    } else {
      conversation.lastMessage = message._id;
      conversation.updatedAt = Date.now();
    }
    await conversation.save();

    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('receive_message', message);
    }
    socket.emit('message_sent', message);
  });

  socket.on('mark_as_read', async (data) => {
    const { messageId, userId } = data;
    const message = await Message.findByIdAndUpdate(
      messageId,
      { read: true, readAt: Date.now(), deleteAt: Date.now() + 30 * 60 * 1000 },
      { new: true }
    );
    
    if (message) {
      const senderSocketId = onlineUsers.get(message.senderId);
      if (senderSocketId) {
        io.to(senderSocketId).emit('message_read', { messageId, deleteAt: message.deleteAt });
      }
    }
  });

  socket.on('typing', (data) => {
    const { senderId, receiverId } = data;
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('user_typing', { senderId });
    }
  });

  socket.on('send_chat_request', async (data) => {
    const { senderId, receiverId } = data;
    const existingRequest = await ChatRequest.findOne({
      senderId,
      receiverId,
      status: 'pending'
    });
    
    if (!existingRequest) {
      const request = new ChatRequest({ senderId, receiverId });
      await request.save();
      
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('chat_request', request);
      }
    }
  });

  socket.on('accept_chat_request', async (data) => {
    const { requestId } = data;
    const request = await ChatRequest.findByIdAndUpdate(
      requestId,
      { status: 'accepted' },
      { new: true }
    ).populate('senderId').populate('receiverId');
    
    if (request) {
      const senderSocketId = onlineUsers.get(request.senderId._id);
      if (senderSocketId) {
        io.to(senderSocketId).emit('request_accepted', request);
      }
    }
  });

  socket.on('reject_chat_request', async (data) => {
    const { requestId } = data;
    await ChatRequest.findByIdAndUpdate(requestId, { status: 'rejected' });
  });

  socket.on('add_reaction', async (data) => {
    const { messageId, emoji, userId } = data;
    const message = await Message.findByIdAndUpdate(
      messageId,
      { $addToSet: { reactions: emoji } },
      { new: true }
    );
    
    if (message) {
      const receiverSocketId = onlineUsers.get(message.receiverId);
      const senderSocketId = onlineUsers.get(message.senderId);
      
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('reaction_added', { messageId, emoji });
      }
      if (senderSocketId) {
        io.to(senderSocketId).emit('reaction_added', { messageId, emoji });
      }
    }
  });

  socket.on('disconnect', async () => {
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        await User.findByIdAndUpdate(userId, { status: 'offline' });
        io.emit('user_status', { userId, status: 'offline' });
        break;
      }
    }
    console.log('User disconnected:', socket.id);
  });
});

// Cron job to delete expired messages
cron.schedule('* * * * *', async () => {
  const now = Date.now();
  const deletedMessages = await Message.deleteMany({
    deleteAt: { $lte: now }
  });
  if (deletedMessages.deletedCount > 0) {
    console.log(`Deleted ${deletedMessages.deletedCount} expired messages`);
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
