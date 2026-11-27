import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Mentors.css';

function Mentors() {
  const [mentors, setMentors] = useState([]);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const myUserId = localStorage.getItem('userId');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    const fetchMentors = async () => {
      setLoading(true);
      try {
        const url = query
          ? `/api/users/mentors/${encodeURIComponent(query)}`
          : '/api/users/mentors';
        const res = await axios.get(url);
        setMentors(res.data);
        setError('');
      } catch {
        setError('Failed to load mentors');
      } finally {
        setLoading(false);
      }
    };

    fetchMentors();
  }, [query, token, navigate]);

  const handleSearch = (e) => {
    e.preventDefault();
    setQuery(search.trim());
  };

  return (
    <div className="mentors-page">
      <div className="mentors-container">
        <div className="mentors-header">
          <h2>Find a Mentor</h2>
          <button className="back-btn" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </button>
        </div>

        <form className="search-row" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Search by skill (e.g. React)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit">Search</button>
        </form>

        {error && <p className="error">{error}</p>}

        {loading && (
          <div className="loading-row"><span className="spinner" />Loading mentors…</div>
        )}

        {!loading && mentors.length === 0 && !error && (
          <p style={{ color: '#9ca3af' }}>No mentors found yet.</p>
        )}

        {mentors
          .filter((m) => m._id !== myUserId)
          .map((mentor) => (
            <div key={mentor._id} className="mentor-card">
              <h4>{mentor.name}</h4>
              {mentor.bio && <p>{mentor.bio}</p>}
              <div>
                {mentor.skillsOffered?.map((skill) => (
                  <span key={skill} className="skill-tag">{skill}</span>
                ))}
              </div>
                            <button
                className="message-btn"
                onClick={() => navigate(`/portfolio/${mentor._id}`)}
                style={{ marginRight: '8px' }}
              >
                View Portfolio
              </button>
              <button
                className="message-btn"
                onClick={() => navigate(`/chat/${mentor._id}`)}
              >
                Message
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}

export default Mentors;