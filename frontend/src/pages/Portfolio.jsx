import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Avatar from '../components/Avatar';
import CollabModal from '../components/CollabModal';
import '../components/components.css';
import './Portfolio.css';

// Public profile: who someone is, what they know, and what they've worked on
function Portfolio() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const myUserId = localStorage.getItem('userId');

  // Tagged with the profile it belongs to, so opening another profile shows loading
  const [loaded, setLoaded] = useState({ userId: '', data: null, error: '' });
  const data = loaded.userId === userId ? loaded.data : null;
  const error = loaded.userId === userId ? loaded.error : '';
  const [showCollab, setShowCollab] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    const load = async () => {
      try {
        const res = await axios.get(`/api/users/${userId}/portfolio`);
        setLoaded({ userId, data: res.data, error: '' });
      } catch {
        setLoaded({ userId, data: null, error: 'Failed to load this profile' });
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
            <div className="loading-row"><span className="spinner" />Loading profile…</div>
          )}
        </div>
      </div>
    );
  }

  const { user, projects } = data;
  const isMe = user._id === myUserId;
  const created = projects.filter((p) => p.createdBy?._id === user._id);
  const joined = projects.filter((p) => p.createdBy?._id !== user._id);
  const links = [
    ['GitHub', user.github],
    ['LinkedIn', user.linkedin],
    ['Website', user.website],
  ].filter(([, url]) => url);

  const renderSkills = (label, list, tone = '') => list?.length > 0 && (
    <div className="pf-skill-group">
      <p className="pf-label">{label}</p>
      {list.map((s) => <span key={s} className={`skill-pill ${tone}`}>{s}</span>)}
    </div>
  );

  const renderProject = (p) => (
    <div key={p._id} className="pf-project" onClick={() => navigate(`/project/${p._id}`)}>
      <div className="pf-project-top">
        <h4>{p.title}</h4>
        <span className={`pf-status ${p.status}`}>{p.status.replace('-', ' ')}</span>
      </div>
      <p>{p.description}</p>
      <div>
        {p.skillsNeeded?.slice(0, 5).map((s) => <span key={s} className="skill-pill">{s}</span>)}
      </div>
    </div>
  );

  return (
    <div className="portfolio-page">
      <div className="portfolio-container">
        <div className="pf-top">
          <button className="pf-btn" onClick={() => navigate(-1)}>← Back</button>
        </div>

        {notice && <p className="success-msg">{notice}</p>}

        <div className="pf-hero">
          <div className="pf-banner" />
          <div className="pf-hero-body">
            <div className="pf-avatar-ring">
              <Avatar id={user._id} name={user.name} size={96} />
            </div>

            <div className="pf-actions">
              {isMe ? (
                <button className="pf-btn primary" onClick={() => navigate('/profile')}>Edit profile</button>
              ) : (
                <>
                  <button className="pf-btn" onClick={() => navigate(`/messages/dm/${user._id}`)}>Message</button>
                  <button className="pf-btn primary" onClick={() => setShowCollab(true)}>Request collaboration</button>
                </>
              )}
            </div>

            <h2>{user.name}</h2>
            {user.headline && <p className="pf-headline">{user.headline}</p>}
            <p className="pf-meta">
              {user.location && <span>📍 {user.location}</span>}
              <span>Joined {new Date(user.createdAt).toLocaleDateString([], { month: 'long', year: 'numeric' })}</span>
            </p>

            <div className="pf-badges">
              {user.skillsOffered?.length > 0 && <span className="pf-badge mentor">Mentor</span>}
              {user.openToCollab !== false && <span className="pf-badge open">Open to collaborate</span>}
            </div>

            {links.length > 0 && (
              <div className="pf-links">
                {links.map(([label, url]) => (
                  <a key={label} href={url} target="_blank" rel="noopener noreferrer">{label} ↗</a>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="pf-stats">
          <div><strong>{created.length}</strong><span>Projects created</span></div>
          <div><strong>{joined.length}</strong><span>Projects joined</span></div>
          <div><strong>{(user.skills?.length || 0) + (user.skillsOffered?.length || 0)}</strong><span>Skills</span></div>
        </div>

        <div className="pf-card">
          <h3 className="pf-card-title">About</h3>
          <p className="pf-bio">{user.bio || (isMe ? 'Add a bio from Edit profile so people know you better.' : 'No bio yet.')}</p>
          {renderSkills('Skills', user.skills)}
          {renderSkills('Can mentor in', user.skillsOffered, 'amber')}
          {renderSkills('Wants to learn', user.skillsWanted, 'teal')}
          {isMe && !user.skills?.length && (
            <p className="pf-bio">You haven&apos;t added any skills yet. <button type="button" className="pf-inline" onClick={() => navigate('/profile')}>Add skills</button></p>
          )}
        </div>

        <h3 className="pf-section-title">Projects created ({created.length})</h3>
        {created.length === 0 && <p className="pf-none">None yet.</p>}
        <div className="pf-projects">{created.map(renderProject)}</div>

        <h3 className="pf-section-title">Projects joined ({joined.length})</h3>
        {joined.length === 0 && <p className="pf-none">None yet.</p>}
        <div className="pf-projects">{joined.map(renderProject)}</div>
      </div>

      {showCollab && (
        <CollabModal
          user={user}
          onClose={() => setShowCollab(false)}
          onSent={() => setNotice(`Collaboration request sent to ${user.name}.`)}
        />
      )}
    </div>
  );
}

export default Portfolio;
