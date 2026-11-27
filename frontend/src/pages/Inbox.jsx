import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getSocket } from '../socket';
import './Panel.css';

function Inbox() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    let active = true;

    const load = async () => {
      try {
        const res = await axios.get('/api/messages/contacts', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (active) setContacts(res.data);
      } catch {
        if (active) setError('Failed to load your conversations');
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    // Refresh the list whenever a message arrives or is sent
    const socket = getSocket();
    socket?.on('message:new', load);

    return () => {
      active = false;
      socket?.off('message:new', load);
    };
  }, [token, navigate]);

  return (
    <div className="panel-page">
      <div className="panel-container">
        <div className="panel-header">
          <h2>Inbox</h2>
          <button className="back-btn" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </button>
        </div>

        {error && <p className="error">{error}</p>}

        {loading && (
          <div className="loading-row"><span className="spinner" />Loading conversations…</div>
        )}

        {!loading && contacts.length === 0 && !error && (
          <p style={{ color: '#9ca3af' }}>
            No conversations yet. Message someone from Find a Mentor or a project page.
          </p>
        )}

        {contacts.map((contact) => (
          <div
            key={contact._id}
            className="panel-card clickable"
            onClick={() => navigate(`/chat/${contact._id}`)}
          >
            <div className="panel-card-info">
              <h4>{contact.name}</h4>
              <p className="panel-preview">{contact.lastMessage}</p>
            </div>
            <span className="panel-meta">{new Date(contact.lastMessageAt).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Inbox;
