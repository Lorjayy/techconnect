const http = require('http');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
require('dotenv').config();

const userRoutes = require('./routes/userRoutes');
const projectRoutes = require('./routes/projectRoutes');
const taskRoutes = require('./routes/taskRoutes');
const messageRoutes = require('./routes/messageRoutes');
const fileRoutes = require('./routes/fileRoutes');
const adminRoutes = require('./routes/adminRoutes');
const collabRoutes = require('./routes/collabRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('TechConnect backend is running');
});

app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/collabs', collabRoutes);

// Real-time chat: one Socket.IO server sharing the HTTP server
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Each connection must present a valid login token; the user then joins a room
// named by their own id, so a message can be pushed straight to them.
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch {
    next(new Error('unauthorized'));
  }
});

// Who is online: user id -> number of open connections (tabs, devices)
const onlineCounts = new Map();

io.on('connection', (socket) => {
  const { userId } = socket;
  socket.join(userId);

  const count = (onlineCounts.get(userId) || 0) + 1;
  onlineCounts.set(userId, count);
  if (count === 1) io.emit('presence', { userId, online: true });

  // The client asks which of the given users are online
  socket.on('presence:list', (ids, reply) => {
    if (!Array.isArray(ids) || typeof reply !== 'function') return;
    reply(ids.filter((id) => onlineCounts.has(String(id))));
  });

  socket.on('disconnect', () => {
    const left = (onlineCounts.get(userId) || 1) - 1;
    if (left > 0) {
      onlineCounts.set(userId, left);
    } else {
      onlineCounts.delete(userId);
      io.emit('presence', { userId, online: false });
    }
  });
});

// Routes use this to push a saved message to both people in the conversation
app.set('io', io);

if (process.env.DEV_MASTER_OTP) {
  console.warn('WARNING: DEV_MASTER_OTP is set — any account can be verified with this code. Do not use in production.');
}

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
