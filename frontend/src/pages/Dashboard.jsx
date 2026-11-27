import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { disconnectSocket } from '../socket';
import './Dashboard.css';
import './CreateProject.css';

function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [refresh, setRefresh] = useState(0);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [skillsNeeded, setSkillsNeeded] = useState('');
  const [formError, setFormError] = useState('');
  const [creating, setCreating] = useState(false);

  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    const fetchProjects = async () => {
      try {
        const res = await axios.get('/api/projects');
        setProjects(res.data);
      } catch {
        setError('Failed to load projects');
      } finally {
        setLoading(false);
      }
    };

    const fetchRole = async () => {
      try {
        const res = await axios.get('/api/users/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setIsAdmin(res.data.role === 'admin');
      } catch {
        setIsAdmin(false);
      }
    };

    fetchProjects();
    fetchRole();
  }, [token, navigate, refresh]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    disconnectSocket();
    navigate('/login');
  };
  const handleJoin = async (projectId) => {
  try {
    await axios.post(
      `/api/projects/${projectId}/join`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setRefresh((n) => n + 1);
  } catch (err) {
    alert(err.response?.data?.error || 'Failed to join project');
  }
};
  const handleCreateProject = async (e) => {
    e.preventDefault();
    setFormError('');

    if (title.trim().length < 3) {
      setFormError('Title must be at least 3 characters');
      return;
    }
    if (description.trim().length < 10) {
      setFormError('Description must be at least 10 characters');
      return;
    }

    setCreating(true);
    try {
      const skillsArray = skillsNeeded
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      await axios.post(
        '/api/projects',
        { title, description, skillsNeeded: skillsArray },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setTitle('');
      setDescription('');
      setSkillsNeeded('');
      setShowForm(false);
      setRefresh((n) => n + 1);
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        <div className="dashboard-header">
  <h2>Welcome to TechConnect</h2>
  <div className="dashboard-nav">
    <button className="toggle-form-btn" onClick={() => navigate('/profile')}>
      My Profile
    </button>
    {isAdmin && (
      <button className="toggle-form-btn" onClick={() => navigate('/admin')}>
        Admin Panel
      </button>
    )}
    <button className="toggle-form-btn" onClick={() => navigate('/inbox')}>
      Inbox
    </button>
    <button className="toggle-form-btn" onClick={() => navigate('/mentors')}>
      Find a Mentor
    </button>
    <button className="toggle-form-btn" onClick={() => navigate(`/portfolio/${localStorage.getItem('userId')}`)}>
      My Portfolio
    </button>
    <button className="logout-btn" onClick={handleLogout}>Logout</button>
  </div>
</div>

        <button className="toggle-form-btn" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New Project'}
        </button>

        {showForm && (
          <div className="create-project-box">
            <h3>Post a New Project</h3>
            {formError && <p className="error">{formError}</p>}
            <form onSubmit={handleCreateProject}>
              <div>
                <label>Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Study Buddy App"
                />
              </div>
              <div>
                <label>Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this project about?"
                />
              </div>
              <div>
                <label>Skills Needed (comma-separated)</label>
                <input
                  type="text"
                  value={skillsNeeded}
                  onChange={(e) => setSkillsNeeded(e.target.value)}
                  placeholder="e.g. React, Node.js, MongoDB"
                />
              </div>
              <button type="submit" disabled={creating}>{creating ? 'Posting…' : 'Post Project'}</button>
            </form>
          </div>
        )}

        <h3>Available Projects</h3>
        {error && <p style={{ color: '#f87171' }}>{error}</p>}

        {loading && (
          <div className="loading-row"><span className="spinner" />Loading projects…</div>
        )}

        {!loading && projects.length === 0 && !error && <p style={{ color: '#9ca3af' }}>No projects yet.</p>}

        {projects.map((project) => {
  const userId = localStorage.getItem('userId');
  const isMember = project.members?.some((m) => m._id === userId);
  const isOwner = project.createdBy?._id === userId;

  return (
    <div key={project._id} className="project-card">
            <h4 style={{ cursor: 'pointer' }} onClick={() => navigate(`/project/${project._id}`)}>
        {project.title}
      </h4>
      <p>{project.description}</p>
      <p><strong>Skills needed:</strong> {project.skillsNeeded.join(', ')}</p>
      <p><strong>Posted by:</strong> {project.createdBy?.name}</p>
      <p><strong>Members:</strong> {project.members?.length > 0 ? project.members.map((m) => m.name).join(', ') : 'None yet'}</p>

      {!isOwner && !isMember && (
        <button className="toggle-form-btn" onClick={() => handleJoin(project._id)}>
          Join Project
        </button>
      )}
      {isMember && <p style={{ color: '#34d399' }}>You're a member of this project</p>}
      {isOwner && <p style={{ color: '#9ca3af' }}>You created this project</p>}
    </div>
  );
})}
      </div>
    </div>
  );
}

export default Dashboard;