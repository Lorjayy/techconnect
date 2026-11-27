import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Panel.css';

function Admin() {
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tab, setTab] = useState('users');
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);

  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const myUserId = localStorage.getItem('userId');
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    const load = async () => {
      try {
        const [usersRes, projectsRes] = await Promise.all([
          axios.get('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('/api/projects'),
        ]);
        setUsers(usersRes.data);
        setProjects(projectsRes.data);
      } catch (err) {
        if (err.response?.status === 403) {
          setDenied(true);
        } else {
          setError('Failed to load admin data');
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [token, navigate, refresh]);

  const handleChangeRole = async (user) => {
    const role = user.role === 'admin' ? 'user' : 'admin';
    try {
      await axios.put(`/api/admin/users/${user._id}/role`, { role }, authHeaders);
      setRefresh((n) => n + 1);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change role');
    }
  };

  const handleDeleteUser = async (user) => {
    const warning = `Delete ${user.name}? Their projects and messages will also be deleted. This cannot be undone.`;
    if (!window.confirm(warning)) return;

    try {
      await axios.delete(`/api/admin/users/${user._id}`, authHeaders);
      setRefresh((n) => n + 1);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete user');
    }
  };

  const handleDeleteProject = async (project) => {
    if (!window.confirm(`Delete "${project.title}" with all its tasks and files? This cannot be undone.`)) return;

    try {
      await axios.delete(`/api/projects/${project._id}`, authHeaders);
      setRefresh((n) => n + 1);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete project');
    }
  };

  if (denied) {
    return (
      <div className="panel-page">
        <div className="panel-container">
          <p className="error">You need an admin account to view this page.</p>
          <button className="back-btn" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="panel-page">
      <div className="panel-container">
        <div className="panel-header">
          <h2>Admin Panel</h2>
          <button className="back-btn" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </button>
        </div>

        <div className="panel-tabs">
          <button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>
            Users ({users.length})
          </button>
          <button className={tab === 'projects' ? 'active' : ''} onClick={() => setTab('projects')}>
            Projects ({projects.length})
          </button>
        </div>

        {error && <p className="error">{error}</p>}

        {loading && (
          <div className="loading-row"><span className="spinner" />Loading…</div>
        )}

        {tab === 'users' && users.map((user) => (
          <div key={user._id} className="panel-card">
            <div className="panel-card-info">
              <h4>
                {user.name}
                {user.role === 'admin' && <span className="panel-badge">Admin</span>}
                {!user.isVerified && <span className="panel-badge muted">Unverified</span>}
              </h4>
              <p className="panel-preview">{user.email}</p>
            </div>
            {user._id === myUserId ? (
              <span className="panel-meta">You</span>
            ) : (
              <div className="panel-actions">
                <button className="small-btn" onClick={() => handleChangeRole(user)}>
                  {user.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                </button>
                <button className="small-btn danger" onClick={() => handleDeleteUser(user)}>Delete</button>
              </div>
            )}
          </div>
        ))}

        {tab === 'projects' && projects.map((project) => (
          <div key={project._id} className="panel-card">
            <div className="panel-card-info">
              <h4>{project.title}</h4>
              <p className="panel-preview">
                By {project.createdBy?.name || 'Deleted user'} · {project.status} · {project.members?.length || 0} members
              </p>
            </div>
            <div className="panel-actions">
              <button className="small-btn" onClick={() => navigate(`/project/${project._id}`)}>Open</button>
              <button className="small-btn danger" onClick={() => handleDeleteProject(project)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Admin;
