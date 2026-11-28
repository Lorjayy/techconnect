import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getSocket } from '../socket';
import Avatar from '../components/Avatar';
import '../components/components.css';
import './Panel.css';
import './Requests.css';

function Requests() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const [tab, setTab] = useState('incoming');
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return undefined;
    }

    let active = true;
    const load = async () => {
      try {
        const res = await axios.get('/api/collabs', { headers: { Authorization: `Bearer ${token}` } });
        if (!active) return;
        setIncoming(res.data.incoming);
        setOutgoing(res.data.outgoing);
      } catch {
        if (active) setError('Failed to load your requests');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();

    // New requests and answers show up without refreshing
    const socket = getSocket();
    const onChange = () => setVersion((v) => v + 1);
    socket?.on('collab:new', onChange);
    socket?.on('collab:update', onChange);
    return () => {
      active = false;
      socket?.off('collab:new', onChange);
      socket?.off('collab:update', onChange);
    };
  }, [token, navigate, version]);

  const act = async (request, action) => {
    setBusyId(request._id);
    setError('');
    setNotice('');
    try {
      const headers = { Authorization: `Bearer ${token}` };
      if (action === 'cancel') {
        await axios.delete(`/api/collabs/${request._id}`, { headers });
        setNotice('Request cancelled.');
      } else {
        await axios.post(`/api/collabs/${request._id}/${action}`, {}, { headers });
        if (action === 'accept') {
          setNotice(request.project
            ? `You joined ${request.project.title}. Say hi in its group chat!`
            : `You're now connected with ${request.from.name}.`);
        } else {
          setNotice('Request declined.');
        }
      }
      reload();
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setBusyId(null);
    }
  };

  const list = tab === 'incoming' ? incoming : outgoing;

  return (
    <div className="panel-page">
      <div className="panel-container">
        <div className="panel-header">
          <h2>Collaboration Requests</h2>
          <button className="back-btn" onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
        </div>

        <div className="panel-tabs">
          <button className={tab === 'incoming' ? 'active' : ''} onClick={() => setTab('incoming')}>
            Received ({incoming.length})
          </button>
          <button className={tab === 'outgoing' ? 'active' : ''} onClick={() => setTab('outgoing')}>
            Sent ({outgoing.length})
          </button>
          <button onClick={() => navigate('/people')}>+ Find people</button>
        </div>

        {notice && <p className="success-msg">{notice}</p>}
        {error && <p className="error">{error}</p>}
        {loading && <div className="loading-row"><span className="spinner" />Loading requests…</div>}

        {!loading && list.length === 0 && (
          <p className="req-empty">
            {tab === 'incoming'
              ? 'No new requests. When someone asks to collaborate with you, it shows up here.'
              : 'You haven’t sent any requests yet. Find people and click Collaborate.'}
          </p>
        )}

        {list.map((request) => {
          const other = tab === 'incoming' ? request.from : request.to;
          if (!other) return null;
          return (
            <div key={request._id} className="req-card">
              <div className="req-who" onClick={() => navigate(`/portfolio/${other._id}`)}>
                <Avatar id={other._id} name={other.name} size={44} />
                <div className="req-text">
                  <h4>{other.name}</h4>
                  {other.headline && <p className="req-headline">{other.headline}</p>}
                </div>
              </div>

              <p className="req-what">
                {tab === 'incoming' ? 'Wants to collaborate' : 'You asked to collaborate'}
                {request.project ? (
                  <> on <button type="button" className="req-project" onClick={() => navigate(`/project/${request.project._id}`)}>{request.project.title}</button></>
                ) : ''}
                <span className="req-date"> · {new Date(request.createdAt).toLocaleDateString()}</span>
              </p>
              {request.message && <p className="req-message">“{request.message}”</p>}

              <div className="req-actions">
                {tab === 'incoming' ? (
                  <>
                    <button className="small-btn req-accept" disabled={busyId === request._id} onClick={() => act(request, 'accept')}>
                      Accept
                    </button>
                    <button className="small-btn danger" disabled={busyId === request._id} onClick={() => act(request, 'decline')}>
                      Decline
                    </button>
                  </>
                ) : (
                  <>
                    <span className={`req-status ${request.status}`}>{request.status}</span>
                    {request.status === 'pending' && (
                      <button className="small-btn danger" disabled={busyId === request._id} onClick={() => act(request, 'cancel')}>
                        Cancel
                      </button>
                    )}
                  </>
                )}
                <button className="small-btn" onClick={() => navigate(`/messages/dm/${other._id}`)}>Message</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Requests;
