import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Profile.css';

function Profile() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [skills, setSkills] = useState('');
  const [skillsOffered, setSkillsOffered] = useState('');
  const [skillsWanted, setSkillsWanted] = useState('');
  const [bio, setBio] = useState('');
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
        setEmail(res.data.email);
        setName(res.data.name);
        setSkills(res.data.skills.join(', '));
        setSkillsOffered((res.data.skillsOffered || []).join(', '));
        setSkillsWanted((res.data.skillsWanted || []).join(', '));
        setBio(res.data.bio || '');
      } catch {
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [token, navigate]);

  const toArray = (str) =>
    str.split(',').map((s) => s.trim()).filter((s) => s.length > 0);

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (name.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }

    setSaving(true);
    try {
      await axios.put(
        '/api/users/me',
        {
          name,
          skills: toArray(skills),
          skillsOffered: toArray(skillsOffered),
          skillsWanted: toArray(skillsWanted),
          bio,
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
          <h2>My Profile</h2>
          <button className="back-btn" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </button>
        </div>

        <div className="profile-box">
          {error && <p className="error">{error}</p>}
          {success && <p className="success-msg">{success}</p>}

          {loading && (
            <div className="loading-row"><span className="spinner" />Loading your profile…</div>
          )}

          <form onSubmit={handleSave} style={loading ? { display: 'none' } : undefined}>
            <div>
              <label>Email (cannot be changed)</label>
              <input type="email" value={email} disabled />
            </div>
            <div>
              <label>Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label>Skills (comma-separated)</label>
              <input
                type="text"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="e.g. React, Node.js, MongoDB"
              />
            </div>
            <div>
              <label>Skills I can teach/mentor (comma-separated)</label>
              <input
                type="text"
                value={skillsOffered}
                onChange={(e) => setSkillsOffered(e.target.value)}
                placeholder="e.g. React, MongoDB"
              />
            </div>
            <div>
              <label>Skills I want to learn (comma-separated)</label>
              <input
                type="text"
                value={skillsWanted}
                onChange={(e) => setSkillsWanted(e.target.value)}
                placeholder="e.g. Python, Machine Learning"
              />
            </div>
            <div>
              <label>Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell others about yourself"
              />
            </div>
            <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Profile;