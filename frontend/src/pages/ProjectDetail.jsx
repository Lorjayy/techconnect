import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { downloadFile, formatFileSize } from '../fileUtils';
import './ProjectDetail.css';
import './CreateProject.css';
import './Panel.css';

function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('userId');

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [files, setFiles] = useState([]);
  const [filesLoaded, setFilesLoaded] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editSkills, setEditSkills] = useState('');
  const [editStatus, setEditStatus] = useState('open');

  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState('');

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
  const reload = () => setRefresh((n) => n + 1);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };

    const load = async () => {
      try {
        const res = await axios.get(`/api/projects/${id}`);
        setProject(res.data);
      } catch {
        setError('Failed to load project');
      }

      try {
        const res = await axios.get(`/api/tasks/project/${id}`);
        setTasks(res.data);
      } catch {
        setError('Failed to load tasks');
      }

      try {
        const res = await axios.get('/api/users/me', { headers });
        setIsAdmin(res.data.role === 'admin');
      } catch {
        setIsAdmin(false);
      }

      // Files are only visible to the team, so a refusal here is normal
      try {
        const res = await axios.get(`/api/files/project/${id}`, { headers });
        setFiles(res.data);
      } catch {
        setFiles([]);
      } finally {
        setFilesLoaded(true);
      }
    };

    load();
  }, [id, token, navigate, refresh]);

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (newTaskTitle.trim().length < 3) return;

    try {
      await axios.post('/api/tasks', { title: newTaskTitle, projectId: id }, authHeaders);
      setNewTaskTitle('');
      reload();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add task');
    }
  };

  const toggleTaskStatus = async (task) => {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    try {
      await axios.put(`/api/tasks/${task._id}`, { status: newStatus }, authHeaders);
      reload();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update task');
    }
  };

  const startEditingTask = (task) => {
    setEditingTaskId(task._id);
    setEditingTaskTitle(task.title);
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    if (editingTaskTitle.trim().length < 3) {
      setError('Task title must be at least 3 characters');
      return;
    }

    try {
      await axios.put(`/api/tasks/${editingTaskId}`, { title: editingTaskTitle.trim() }, authHeaders);
      setEditingTaskId(null);
      setError('');
      reload();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update task');
    }
  };

  const handleDeleteTask = async (task) => {
    if (!window.confirm(`Delete the task "${task.title}"?`)) return;

    try {
      await axios.delete(`/api/tasks/${task._id}`, authHeaders);
      reload();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete task');
    }
  };

  const startEditingProject = () => {
    setEditTitle(project.title);
    setEditDescription(project.description);
    setEditSkills(project.skillsNeeded.join(', '));
    setEditStatus(project.status);
    setEditing(true);
  };

  const handleSaveProject = async (e) => {
    e.preventDefault();
    setError('');

    if (editTitle.trim().length < 3) {
      setError('Title must be at least 3 characters');
      return;
    }
    if (editDescription.trim().length < 10) {
      setError('Description must be at least 10 characters');
      return;
    }

    try {
      const skillsArray = editSkills
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      await axios.put(
        `/api/projects/${id}`,
        { title: editTitle, description: editDescription, skillsNeeded: skillsArray, status: editStatus },
        authHeaders
      );
      setEditing(false);
      reload();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save project');
    }
  };

  const handleDeleteProject = async () => {
    if (!window.confirm(`Delete "${project.title}" with all its tasks and files? This cannot be undone.`)) return;

    try {
      await axios.delete(`/api/projects/${id}`, authHeaders);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete project');
    }
  };

  const handleLeaveProject = async () => {
    if (!window.confirm(`Leave "${project.title}"?`)) return;

    try {
      await axios.post(`/api/projects/${id}/leave`, {}, authHeaders);
      reload();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to leave project');
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;

    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      await axios.post(`/api/files/project/${id}`, formData, authHeaders);
      reload();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload file');
    }
  };

  const handleDownload = async (file) => {
    try {
      await downloadFile(file._id, file.filename);
    } catch {
      setError('Failed to download file');
    }
  };

  const handleDeleteFile = async (file) => {
    if (!window.confirm(`Delete the file "${file.filename}"?`)) return;

    try {
      await axios.delete(`/api/files/${file._id}`, authHeaders);
      reload();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete file');
    }
  };

  if (!project) {
    return (
      <div className="detail-page">
        <div className="detail-container">
          {error ? <p className="error">{error}</p> : <p style={{ color: '#9ca3af' }}>Loading...</p>}
        </div>
      </div>
    );
  }

  const isOwner = project.createdBy?._id === userId;
  const isMember = project.members?.some((m) => m._id === userId);
  const isTeam = isOwner || isMember;
  const canManageProject = isOwner || isAdmin;
  const canManageTasks = isTeam || isAdmin;

  return (
    <div className="detail-page">
      <div className="detail-container">
        <div className="detail-header">
          <h2>{project.title}</h2>
          <button className="back-btn" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </button>
        </div>

        {error && <p className="error">{error}</p>}

        {editing ? (
          <div className="create-project-box">
            <h3>Edit Project</h3>
            <form onSubmit={handleSaveProject}>
              <div>
                <label>Title</label>
                <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
              </div>
              <div>
                <label>Description</label>
                <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
              </div>
              <div>
                <label>Skills Needed (comma-separated)</label>
                <input type="text" value={editSkills} onChange={(e) => setEditSkills(e.target.value)} />
              </div>
              <div>
                <label>Status</label>
                <select className="status-select" value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                  <option value="open">Open</option>
                  <option value="in-progress">In progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <button type="submit">Save Changes</button>
              <button type="button" className="cancel-btn" onClick={() => setEditing(false)}>Cancel</button>
            </form>
          </div>
        ) : (
          <div className="info-box">
            <p>{project.description}</p>
            <p><strong>Skills needed:</strong> {project.skillsNeeded.join(', ')}</p>
            <p><strong>Posted by:</strong> {project.createdBy?.name}</p>
            <p><strong>Status:</strong> {project.status}</p>
            <p>
              <strong>Members:</strong>{' '}
              {project.members?.length > 0 ? (
                project.members.map((m, idx) => (
                  <span key={m._id}>
                    {m._id === userId ? (
                      <span>{m.name} (you)</span>
                    ) : (
                      <span
                        style={{ cursor: 'pointer', color: '#a855f7' }}
                        onClick={() => navigate(`/messages/dm/${m._id}`)}
                      >
                        {m.name}
                      </span>
                    )}
                    {idx < project.members.length - 1 ? ', ' : ''}
                  </span>
                ))
              ) : (
                'None yet'
              )}
            </p>

            {(canManageProject || isTeam) && (
              <div className="project-actions">
                {(isTeam || isAdmin) && (
                  <button className="small-btn group-chat-btn" onClick={() => navigate(`/messages/project/${project._id}`)}>
                    # Open group chat
                  </button>
                )}
                {canManageProject && (
                  <>
                    <button className="small-btn" onClick={startEditingProject}>Edit Project</button>
                    <button className="small-btn danger" onClick={handleDeleteProject}>Delete Project</button>
                  </>
                )}
                {isMember && (
                  <button className="small-btn danger" onClick={handleLeaveProject}>Leave Project</button>
                )}
              </div>
            )}
          </div>
        )}

        <p className="section-title">Tasks</p>

        {tasks.length === 0 && <p style={{ color: '#9ca3af' }}>No tasks yet.</p>}

        {tasks.map((task) => (
          <div key={task._id} className={`task-item ${task.status === 'done' ? 'done' : ''}`}>
            {editingTaskId === task._id ? (
              <form className="task-edit-form" onSubmit={handleSaveTask}>
                <input
                  type="text"
                  value={editingTaskTitle}
                  onChange={(e) => setEditingTaskTitle(e.target.value)}
                />
                <button type="submit" className="small-btn">Save</button>
                <button type="button" className="small-btn" onClick={() => setEditingTaskId(null)}>Cancel</button>
              </form>
            ) : (
              <>
                <span className="task-title">{task.title}</span>
                {canManageTasks && (
                  <div className="task-actions">
                    <button
                      className={`task-status-btn ${task.status === 'done' ? 'done' : ''}`}
                      onClick={() => toggleTaskStatus(task)}
                    >
                      {task.status === 'done' ? 'Done' : 'Mark Done'}
                    </button>
                    <button className="small-btn" onClick={() => startEditingTask(task)}>Edit</button>
                    <button className="small-btn danger" onClick={() => handleDeleteTask(task)}>Delete</button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}

        {isTeam && (
          <form className="add-task-form" onSubmit={handleAddTask}>
            <input
              type="text"
              placeholder="Add a new task..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
            />
            <button type="submit">Add</button>
          </form>
        )}

        {(isTeam || isAdmin) && (
          <>
            <p className="section-title">Shared Files</p>

            {filesLoaded && files.length === 0 && <p style={{ color: '#9ca3af' }}>No files shared yet.</p>}

            {files.map((file) => (
              <div key={file._id} className="task-item">
                <span className="file-info">
                  <span className="task-title">{file.filename}</span>
                  <span className="file-meta">
                    {formatFileSize(file.size)} · {file.uploadedBy?.name || 'Former member'}
                  </span>
                </span>
                <div className="task-actions">
                  <button className="small-btn" onClick={() => handleDownload(file)}>Download</button>
                  {(canManageProject || file.uploadedBy?._id === userId) && (
                    <button className="small-btn danger" onClick={() => handleDeleteFile(file)}>Delete</button>
                  )}
                </div>
              </div>
            ))}

            {isTeam && (
              <label className="upload-btn">
                Share a File (max 10 MB)
                <input type="file" onChange={handleUpload} hidden />
              </label>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default ProjectDetail;
