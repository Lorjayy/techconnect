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

module.exports = { emitMessage };
