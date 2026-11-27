import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Portfolio.css';

function Portfolio() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const myUserId = localStorage.getItem('userId');

  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    const load = async () => {
      try {
        const res = await axios.get(
          `/api/users/${userId}/portfolio`
        );
        setData(res.data);
      } catch {
        setError('Failed to load portfolio');
      }
    };
    load();
  }, [userId, token, navigate]);

  if (!data) {
    return (
      <div className="portfolio-page">
        <div className="portfolio-container">
          {error ? (
            <p className="error">{error}</p>
          ) : (
            <p style={{ color: '#9ca3af' }}>Loading...</p>
          )}
        </div>
      </div>
    );
  }

  const { user, projects } = data;
  const isMe = user._id === myUserId;
  const created = projects.filter((p) => p.createdBy?._id === user._id);
  const joined = projects.filter((p) => p.createdBy?._id !== user._id);

  const renderProject = (p) => (
    <div key={p._id} className="pf-card">
      <h4 onClick={() => navigate(`/project/${p._id}`)}>{p.title}</h4>
      <p>{p.description}</p>
      <div>
        {p.skillsNeeded?.map((s) => (
          <span key={s} className="pf-tag">{s}</span>
        ))}
      </div>
      <p>
        <span className={`pf-status ${p.status === 'completed' ? 'completed' : ''}`}>
          {p.status}
        </span>
      </p>
    </div>
  );

  return (
    <div className="portfolio-page">
      <div className="portfolio-container">
        <div className="pf-top">
          <button className="pf-btn" onClick={() => navigate(-1)}>Back</button>
          {!isMe && (
            <button className="pf-btn" onClick={() => navigate(`/chat/${user._id}`)}>
              Message
            </button>
          )}
        </div>

        <div className="pf-card">
          <h2>{user.name}</h2>
          <p className="pf-since">
            Member since {new Date(user.createdAt).toLocaleDateString()}
          </p>
          {user.bio && <p>{user.bio}</p>}

          {user.skills?.length > 0 && (
            <>
              <p className="pf-label">Skills</p>
              {user.skills.map((s) => (
                <span key={s} className="pf-tag">{s}</span>
              ))}
            </>
          )}

          {user.skillsOffered?.length > 0 && (
            <>
              <p className="pf-label">Can mentor in</p>
              {user.skillsOffered.map((s) => (
                <span key={s} className="pf-tag">{s}</span>
              ))}
            </>
          )}
        </div>

        <p className="pf-section-title">Projects created ({created.length})</p>
        {created.length === 0 && <p style={{ color: '#9ca3af' }}>None yet.</p>}
        {created.map(renderProject)}

        <p className="pf-section-title">Projects joined ({joined.length})</p>
        {joined.length === 0 && <p style={{ color: '#9ca3af' }}>None yet.</p>}
        {joined.map(renderProject)}
      </div>
    </div>
  );
}

export default Portfolio;