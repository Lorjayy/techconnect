import { useEffect, useState } from 'react';
import axios from 'axios';
import './components.css';

// Ask someone to collaborate, optionally inviting them into one of my projects
function CollabModal({ user, onClose, onSent }) {
  const token = localStorage.getItem('token');
  const myUserId = localStorage.getItem('userId');

  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get('/api/projects');
        // Projects I'm on that they aren't on yet
        const mine = res.data.filter((p) => {
          const team = [p.createdBy?._id, ...(p.members || []).map((m) => m._id)];
          return team.includes(myUserId) && !team.includes(user._id);
        });
        setProjects(mine);
      } catch {
        setProjects([]);
      }
    };
    load();
  }, [myUserId, user._id]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSend = async (e) => {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      await axios.post(
        '/api/collabs',
        { to: user._id, projectId: projectId || undefined, message },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onSent?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send the request');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal-card" onSubmit={handleSend}>
        <h3>Collaborate with {user.name}</h3>
        <p className="modal-sub">They'll see your request on their Requests page and can accept or decline.</p>

        {error && <p className="error">{error}</p>}

        <label>Invite them to a project (optional)</label>
        <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          <option value="">No project — just connect</option>
          {projects.map((p) => (
            <option key={p._id} value={p._id}>{p.title}</option>
          ))}
        </select>

        <label>Message</label>
        <textarea
          value={message}
          maxLength={500}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={`Hi ${user.name.split(' ')[0]}, I'd love to work with you on…`}
        />

        <div className="modal-actions">
          <button type="button" className="modal-cancel" onClick={onClose}>Cancel</button>
          <button type="submit" className="modal-send" disabled={sending}>
            {sending ? 'Sending…' : 'Send request'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CollabModal;
