import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getSocket } from '../socket';
import { downloadFile, formatFileSize } from '../fileUtils';
import './Chat.css';

function Chat() {
  const { userId: otherUserId } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const [messages, setMessages] = useState([]);
  const [otherName, setOtherName] = useState('');
  const [content, setContent] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const lastMessageIdRef = useRef(null);

  const myUserId = localStorage.getItem('userId');

  // Add a message, ignoring one we already have (REST reply and the socket
  // echo can both deliver the same message)
  const addMessage = (msg) =>
    setMessages((prev) => (prev.some((m) => m._id === msg._id) ? prev : [...prev, msg]));

  // Load history once, then let the socket stream in new messages
  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    let active = true;

    const loadHistory = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`/api/messages/conversation/${otherUserId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (active) setMessages(res.data);
      } catch {
        if (active) setError('Failed to load messages');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadHistory();

    const socket = getSocket();
    const onMessage = (msg) => {
      // Only messages for this conversation
      if (msg.sender === otherUserId || msg.receiver === otherUserId) addMessage(msg);
    };
    socket?.on('message:new', onMessage);

    return () => {
      active = false;
      socket?.off('message:new', onMessage);
    };
  }, [otherUserId, token, navigate]);

  useEffect(() => {
    const loadName = async () => {
      try {
        const res = await axios.get(`/api/users/${otherUserId}/portfolio`);
        setOtherName(res.data.user.name);
      } catch {
        setOtherName('');
      }
    };
    loadName();
  }, [otherUserId]);

  // Scroll down only when a new message actually arrives
  useEffect(() => {
    const lastId = messages[messages.length - 1]?._id;
    if (lastId !== lastMessageIdRef.current) {
      lastMessageIdRef.current = lastId;
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (sending) return;
    if (content.trim().length === 0 && !selectedFile) return;

    const headers = { Authorization: `Bearer ${token}` };
    setSending(true);

    try {
      let res;
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        if (content.trim()) formData.append('content', content);
        res = await axios.post(`/api/files/message/${otherUserId}`, formData, { headers });
      } else {
        res = await axios.post('/api/messages', { receiverId: otherUserId, content }, { headers });
      }

      addMessage(res.data);
      setContent('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleDownload = async (attachment) => {
    try {
      await downloadFile(attachment._id, attachment.filename);
    } catch {
      setError('Failed to download file');
    }
  };

  return (
    <div className="chat-page">
      <div className="chat-container">
        <div className="chat-header">
          <h2>{otherName || 'Chat'}</h2>
          <button className="back-btn" onClick={() => navigate(-1)}>
            Back
          </button>
        </div>

        {error && <p className="error">{error}</p>}

        <div className="chat-messages">
          {loading && (
            <div className="loading-row"><span className="spinner" />Loading messages…</div>
          )}
          {!loading && messages.length === 0 && (
            <p style={{ color: '#9ca3af', textAlign: 'center' }}>No messages yet. Say hi!</p>
          )}
          {messages.map((msg) => (
            <div
              key={msg._id}
              className={`chat-bubble ${msg.sender === myUserId ? 'sent' : 'received'}`}
            >
              {msg.attachment && (
                <button type="button" className="chat-file" onClick={() => handleDownload(msg.attachment)}>
                  {msg.attachment.filename} ({formatFileSize(msg.attachment.size)})
                </button>
              )}
              {msg.content}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {selectedFile && (
          <p className="chat-selected-file">
            Attaching: {selectedFile.name} ({formatFileSize(selectedFile.size)})
            <button
              type="button"
              onClick={() => {
                setSelectedFile(null);
                fileInputRef.current.value = '';
              }}
            >
              Remove
            </button>
          </p>
        )}

        <form className="chat-input-row" onSubmit={handleSend}>
          <label className="chat-attach-btn" title="Attach a file (max 10 MB)">
            Attach
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => setSelectedFile(e.target.files[0] || null)}
              hidden
            />
          </label>
          <input
            type="text"
            placeholder="Type a message..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <button type="submit" disabled={sending}>{sending ? 'Sending…' : 'Send'}</button>
        </form>
      </div>
    </div>
  );
}

export default Chat;
