// Push a saved message to both people in the conversation over Socket.IO.
// No-op if sockets aren't available, so the REST response still works on its own.
const emitMessage = (req, message) => {
  const io = req.app.get('io');
  if (!io) return;
  const payload = message.toJSON();
  io.to(message.receiver.toString())
    .to(message.sender.toString())
    .emit('message:new', payload);
};

// Push a project group-chat message to everyone on the team
const emitGroupMessage = (req, project, message) => {
  const io = req.app.get('io');
  if (!io) return;
  const team = [project.createdBy, ...project.members].map((id) => id.toString());
  io.to(team).emit('group:new', message.toJSON());
};

// Push any event to one user's private room
const emitToUser = (req, userId, event, payload) => {
  const io = req.app.get('io');
  if (!io) return;
  io.to(userId.toString()).emit(event, payload);
};

module.exports = { emitMessage, emitGroupMessage, emitToUser };
