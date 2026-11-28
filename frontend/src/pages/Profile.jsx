import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Avatar from '../components/Avatar';
import TagInput from '../components/TagInput';
import './Profile.css';

// Accept "github.com/me" as well as full links
const toLink = (value) => {
  const v = value.trim();
  if (!v) return '';
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
};

function Profile() {
  const [form, setForm] = useState({
    email: '',
    name: '',
    headline: '',
    location: '',
    bio: '',
    github: '',
    linkedin: '',
    website: '',
    openToCollab: true,
  });
  const [userId, setUserId] = useState('');
  const [skills, setSkills] = useState([]);
  const [skillsOffered, setSkillsOffered] = useState([]);
  const [skillsWanted, setSkillsWanted] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    const fetchProfile = async () => {
      try {
        const res = await axios.get('/api/users/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const u = res.data;
        setUserId(u._id);
        setForm({
          email: u.email,
          name: u.name,
          headline: u.headline || '',
          location: u.location || '',
          bio: u.bio || '',
          github: u.github || '',
          linkedin: u.linkedin || '',
          website: u.website || '',
          openToCollab: u.openToCollab !== false,
        });
        setSkills(u.skills || []);
        setSkillsOffered(u.skillsOffered || []);
        setSkillsWanted(u.skillsWanted || []);
      } catch {
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [token, navigate]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (form.name.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }

    setSaving(true);
    try {
      await axios.put(
        '/api/users/me',
        {
          name: form.name,
          headline: form.headline,
          location: form.location,
          bio: form.bio,
          github: toLink(form.github),
          linkedin: toLink(form.linkedin),
          website: toLink(form.website),
          openToCollab: form.openToCollab,
          skills,
          skillsOffered,
          skillsWanted,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess('Profile updated successfully');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-header">
          <h2>Edit Profile</h2>
          <div className="profile-header-actions">
            {userId && (
              <button className="back-btn" onClick={() => navigate(`/portfolio/${userId}`)}>
                View my profile
              </button>
            )}
            <button className="back-btn" onClick={() => navigate('/dashboard')}>Dashboard</button>
          </div>
        </div>

        <div className="profile-box">
          {error && <p className="error">{error}</p>}
          {success && <p className="success-msg">{success}</p>}

          {loading && (
            <div className="loading-row"><span className="spinner" />Loading your profile…</div>
          )}

          <form onSubmit={handleSave} style={loading ? { display: 'none' } : undefined}>
            <div className="profile-preview">
              <Avatar id={userId} name={form.name || '?'} size={64} />
              <div>
                <strong>{form.name || 'Your name'}</strong>
                <span>{form.headline || 'Add a headline so people know what you do'}</span>
              </div>
            </div>

            <h3 className="profile-section">About you</h3>
            <label>Email (cannot be changed)</label>
            <input type="email" value={form.email} disabled />

            <div className="profile-two">
              <div>
                <label>Name</label>
                <input type="text" value={form.name} onChange={set('name')} />
              </div>
              <div>
                <label>Location</label>
                <input type="text" value={form.location} maxLength={60} onChange={set('location')} placeholder="e.g. Rajkot, India" />
              </div>
            </div>

            <label>Headline</label>
            <input
              type="text"
              value={form.headline}
              maxLength={80}
              onChange={set('headline')}
              placeholder="e.g. Computer Engineering student · Frontend developer"
            />

            <label>Bio</label>
            <textarea
              value={form.bio}
              maxLength={500}
              onChange={set('bio')}
              placeholder="Tell others about yourself, what you're building and what you're looking for"
            />

            <h3 className="profile-section">Skills</h3>
            <p className="profile-hint">Type a skill and press Enter to add it. Pick from the suggestions or write your own.</p>

            <label>My skills</label>
            <TagInput value={skills} onChange={setSkills} listId="skills-list" placeholder="e.g. React, Node.js" />

            <label>Skills I can teach / mentor</label>
            <TagInput value={skillsOffered} onChange={setSkillsOffered} listId="offered-list" placeholder="Adding any makes you show up as a mentor" />

            <label>Skills I want to learn</label>
            <TagInput value={skillsWanted} onChange={setSkillsWanted} listId="wanted-list" placeholder="e.g. Machine Learning" />

            <h3 className="profile-section">Links</h3>
            <label>GitHub</label>
            <input type="text" value={form.github} onChange={set('github')} placeholder="github.com/your-username" />
            <label>LinkedIn</label>
            <input type="text" value={form.linkedin} onChange={set('linkedin')} placeholder="linkedin.com/in/your-name" />
            <label>Website / portfolio</label>
            <input type="text" value={form.website} onChange={set('website')} placeholder="yourname.dev" />

            <h3 className="profile-section">Collaboration</h3>
            <label className="profile-toggle">
              <input
                type="checkbox"
                checked={form.openToCollab}
                onChange={(e) => setForm((f) => ({ ...f, openToCollab: e.target.checked }))}
              />
              <span className="toggle-track"><span className="toggle-thumb" /></span>
              <span>I&apos;m open to collaboration requests</span>
            </label>

            <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Profile;
