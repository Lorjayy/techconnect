import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Avatar from '../components/Avatar';
import CollabModal from '../components/CollabModal';
import '../components/components.css';
import './People.css';

function People() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const [params, setParams] = useSearchParams();

  const query = params.get('q') || '';
  const mentorsOnly = params.get('mentors') === '1';

  const [search, setSearch] = useState(query);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [collabWith, setCollabWith] = useState(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await axios.get('/api/users/search', {
          params: { q: query || undefined, mentors: mentorsOnly ? '1' : undefined },
          headers: { Authorization: `Bearer ${token}` },
        });
        if (active) {
          setPeople(res.data);
          setError('');
        }
      } catch {
        if (active) setError('Failed to load people');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [query, mentorsOnly, token, navigate]);

  const update = (next) => {
    const merged = { q: query, mentors: mentorsOnly ? '1' : '', ...next };
    setParams(Object.fromEntries(Object.entries(merged).filter(([, v]) => v)));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    update({ q: search.trim() });
  };

  return (
    <div className="people-page">
      <div className="people-container">
        <div className="people-header">
          <div>
            <h2>Find People</h2>
            <p className="people-sub">Search by name or skill, then message them or ask to collaborate.</p>
          </div>
          <button className="back-btn" onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
        </div>

        <form className="people-search" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Try “React”, “Python” or a name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit">Search</button>
        </form>

        <div className="people-filters">
          <button type="button" className={!mentorsOnly ? 'on' : ''} onClick={() => update({ mentors: '' })}>
            Everyone
          </button>
          <button type="button" className={mentorsOnly ? 'on' : ''} onClick={() => update({ mentors: '1' })}>
            Mentors only
          </button>
          {query && (
            <button type="button" className="clear" onClick={() => { setSearch(''); update({ q: '' }); }}>
              Clear “{query}” ×
            </button>
          )}
        </div>

        {notice && <p className="success-msg">{notice}</p>}
        {error && <p className="error">{error}</p>}
        {loading && <div className="loading-row"><span className="spinner" />Finding people…</div>}
        {!loading && !error && people.length === 0 && (
          <p className="people-empty">No one matches that yet. Try another skill or name.</p>
        )}

        <div className="people-grid">
          {people.map((person) => (
            <div key={person._id} className="person-card">
              <div className="person-top" onClick={() => navigate(`/portfolio/${person._id}`)}>
                <Avatar id={person._id} name={person.name} size={52} />
                <div className="person-id">
                  <h4>{person.name}</h4>
                  {person.headline && <p className="person-headline">{person.headline}</p>}
                  {person.location && <p className="person-location">{person.location}</p>}
                </div>
              </div>

              <div className="person-badges">
                {person.skillsOffered?.length > 0 && <span className="person-badge mentor">Mentor</span>}
                {person.openToCollab !== false && <span className="person-badge open">Open to collaborate</span>}
              </div>

              {person.bio && <p className="person-bio">{person.bio}</p>}

              <div className="person-skills">
                {[...(person.skills || []), ...(person.skillsOffered || [])]
                  .filter((s, i, all) => all.indexOf(s) === i)
                  .slice(0, 6)
                  .map((s) => <span key={s} className="skill-pill">{s}</span>)}
              </div>

              <div className="person-actions">
                <button type="button" onClick={() => navigate(`/messages/dm/${person._id}`)}>Message</button>
                <button type="button" className="primary" onClick={() => setCollabWith(person)}>Collaborate</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {collabWith && (
        <CollabModal
          user={collabWith}
          onClose={() => setCollabWith(null)}
          onSent={() => setNotice(`Collaboration request sent to ${collabWith.name}.`)}
        />
      )}
    </div>
  );
}

export default People;
