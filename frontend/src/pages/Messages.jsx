import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { getSocket } from '../socket';
import { downloadFile, formatFileSize } from '../fileUtils';
import Avatar from '../components/Avatar';
import './Messages.css';

// Messages from the same person within this many minutes are shown as one block
const GROUP_WINDOW_MS = 5 * 60 * 1000;

const idOf = (value) => (value && typeof value === 'object' ? value._id : value);

const formatTime = (date) => new Date(date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

const formatDay = (date) => {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

const formatStamp = (date) => {
  const day = formatDay(date);
  return `${day === 'Today' || day === 'Yesterday' ? day : new Date(date).toLocaleDateString()} at ${formatTime(date)}`;
};

const Icon = ({ name }) => {
  const paths = {
    chat: 'M4 5h16v11H8l-4 4z',
    back: 'M15 5l-7 7 7 7',
    people: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7 0a2.5 2.5 0 1 0 0-5M3 19c0-3 3-5 6-5s6 2 6 5m2-5c2 0 4 1.5 4 4',
    clip: 'M16 7l-7 7a2 2 0 0 0 3 3l7-7a4 4 0 0 0-6-6l-7 7a6 6 0 0 0 8 8l6-6',
    send: 'M4 12l16-8-6 16-2-7z',
    members: 'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm8 0a3 3 0 1 0 0-6M2 20c0-3 3-5 6-5s6 2 6 5m2-5c3 0 6 2 6 5',
    folder: 'M3 6h6l2 2h10v11H3z',
  };
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
};

function Messages() {
  const { userId: dmId, projectId } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const myUserId = localStorage.getItem('userId');

  const active = projectId ? { type: 'project', id: projectId } : dmId ? { type: 'dm', id: dmId } : null;
  const activeKey = active ? `${active.type}:${active.id}` : '';

  const [me, setMe] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [listsVersion, setListsVersion] = useState(0);
  const [listsLoaded, setListsLoaded] = useState(false);
  const [online, setOnline] = useState(new Set());
  const [unread, setUnread] = useState({});

  // Everything about the open conversation, tagged with which conversation it belongs to,
  // so switching chats shows a fresh, loading view without resetting state by hand
  const [convo, setConvo] = useState({ key: '', messages: [], project: null, dmUser: null, error: '', loaded: false });
  const current = convo.key === activeKey
    ? convo
    : { key: activeKey, messages: [], project: null, dmUser: null, error: '', loaded: false };
  const { messages, project, dmUser } = current;
  const loading = Boolean(activeKey) && !current.loaded;

  const [membersFor, setMembersFor] = useState('');
  const showMembers = membersFor === activeKey;

  const [content, setContent] = useState('');
  const [draftFile, setDraftFile] = useState({ key: '', file: null });
  const selectedFile = draftFile.key === activeKey ? draftFile.file : null;
  const setSelectedFile = (file) => setDraftFile({ key: activeKey, file });
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState({ key: '', message: '' });
  const error = current.error || (sendError.key === activeKey ? sendError.message : '');
  const setError = (message) => setSendError({ key: activeKey, message });

  const activeKeyRef = useRef(activeKey);
  const listRef = useRef(null);
  const fileInputRef = useRef(null);
  const textRef = useRef(null);

  const authHeaders = useCallback(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);
  const refreshLists = () => setListsVersion((v) => v + 1);

  // Add a message to the open conversation, ignoring one we already have
  // (the REST reply and the socket echo can both deliver the same message)
  const addMessage = (msg, key) =>
    setConvo((c) => (c.key !== key || c.messages.some((m) => m._id === msg._id)
      ? c
      : { ...c, messages: [...c.messages, msg] }));

  // Unread counts don't apply to the conversation that's open
  const unreadFor = (key) => (key === activeKey ? 0 : unread[key] || 0);

  // Conversation list and project group list
  useEffect(() => {
    if (!token) return undefined;
    let live = true;
    const headers = { headers: { Authorization: `Bearer ${token}` } };
    Promise.all([axios.get('/api/messages/contacts', headers), axios.get('/api/messages/groups', headers)])
      .then(([contactsRes, groupsRes]) => {
        if (!live) return;
        setContacts(contactsRes.data);
        setGroups(groupsRes.data);
        setListsLoaded(true);
      })
      .catch(() => {
        // The lists just stay as they were
      });
    return () => {
      live = false;
    };
  }, [token, listsVersion]);

  // My own details and the live updates
  useEffect(() => {
    if (!token) {
      navigate('/login');
      return undefined;
    }

    axios.get('/api/users/me', authHeaders()).then((res) => setMe(res.data)).catch(() => {});

    const socket = getSocket();
    if (!socket) return undefined;

    const onDirect = (msg) => {
      const sender = idOf(msg.sender);
      const other = sender === myUserId ? idOf(msg.receiver) : sender;
      const key = `dm:${other}`;
      if (activeKeyRef.current === key) {
        addMessage(msg, key);
      } else if (sender !== myUserId) {
        setUnread((u) => ({ ...u, [key]: (u[key] || 0) + 1 }));
      }
      setListsVersion((v) => v + 1);
    };

    const onGroup = (msg) => {
      const key = `project:${idOf(msg.project)}`;
      if (activeKeyRef.current === key) {
        addMessage(msg, key);
      } else if (idOf(msg.sender) !== myUserId) {
        setUnread((u) => ({ ...u, [key]: (u[key] || 0) + 1 }));
      }
      setListsVersion((v) => v + 1);
    };

    const onPresence = ({ userId, online: isOnline }) => {
      setOnline((prev) => {
        const next = new Set(prev);
        if (isOnline) next.add(userId);
        else next.delete(userId);
        return next;
      });
    };

    socket.on('message:new', onDirect);
    socket.on('group:new', onGroup);
    socket.on('presence', onPresence);
    return () => {
      socket.off('message:new', onDirect);
      socket.off('group:new', onGroup);
      socket.off('presence', onPresence);
    };
  }, [token, navigate, myUserId, authHeaders]);

  // Load the open conversation
  useEffect(() => {
    activeKeyRef.current = activeKey;
    if (!activeKey) return undefined;

    let stillOpen = true;
    const [type, id] = activeKey.split(':');

    const load = async () => {
      const next = { key: activeKey, messages: [], project: null, dmUser: null, error: '', loaded: true };
      try {
        if (type === 'project') {
          const [proj, history] = await Promise.all([
            axios.get(`/api/projects/${id}`),
            axios.get(`/api/messages/project/${id}`, authHeaders()),
          ]);
          next.project = proj.data;
          next.messages = history.data;
        } else {
          const [person, history] = await Promise.all([
            axios.get(`/api/users/${id}/portfolio`),
            axios.get(`/api/messages/conversation/${id}`, authHeaders()),
          ]);
          next.dmUser = person.data.user;
          next.messages = history.data;
        }
      } catch (err) {
        next.error = err.response?.data?.error || 'Failed to load this conversation';
      }
      if (!stillOpen) return;
      setConvo(next);
      setUnread((u) => ({ ...u, [activeKey]: 0 }));
    };

    load();
    return () => {
      stillOpen = false;
    };
  }, [activeKey, authHeaders]);

  // Ask the server who is online among everyone on screen
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;
    const ids = new Set(contacts.map((c) => c._id));
    if (project) {
      ids.add(project.createdBy?._id);
      project.members?.forEach((m) => ids.add(m._id));
    }
    if (dmUser) ids.add(dmUser._id);
    const ask = () => socket.emit('presence:list', [...ids].filter(Boolean), (list) => setOnline(new Set(list)));
    ask();
    socket.on('connect', ask);
    return () => socket.off('connect', ask);
  }, [contacts, project, dmUser]);

  // Keep the newest message in view
  useLayoutEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages, loading]);

  const team = project ? [project.createdBy, ...(project.members || [])].filter(Boolean) : [];
  const isTeam = team.some((m) => m._id === myUserId);
  const canPost = active?.type === 'dm' || isTeam;

  const nameFor = (msg) => {
    if (msg.sender && typeof msg.sender === 'object') return msg.sender.name;
    if (msg.sender === myUserId) return me?.name || 'You';
    return dmUser?.name || 'Unknown';
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    if (sending || !active) return;
    if (!content.trim() && !selectedFile) return;

    setSending(true);
    try {
      let res;
      const isProject = active.type === 'project';
      if (selectedFile) {
        const form = new FormData();
        form.append('file', selectedFile);
        if (content.trim()) form.append('content', content.trim());
        const url = isProject ? `/api/files/project/${active.id}/chat` : `/api/files/message/${active.id}`;
        res = await axios.post(url, form, authHeaders());
      } else if (isProject) {
        res = await axios.post(`/api/messages/project/${active.id}`, { content: content.trim() }, authHeaders());
      } else {
        res = await axios.post('/api/messages', { receiverId: active.id, content: content.trim() }, authHeaders());
      }

      addMessage(res.data, activeKey);
      setContent('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setError('');
      refreshLists();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send message');
    } finally {
      setSending(false);
      textRef.current?.focus();
    }
  };

  // Enter sends, Shift+Enter starts a new line
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDownload = async (attachment) => {
    try {
      await downloadFile(attachment._id, attachment.filename);
    } catch {
      setError('Failed to download file');
    }
  };

  // A person I'm about to message for the first time isn't in my contacts yet
  const dmList = [...contacts];
  if (active?.type === 'dm' && dmUser && !contacts.some((c) => c._id === dmUser._id)) {
    dmList.unshift({ _id: dmUser._id, name: dmUser.name, lastMessage: 'New conversation' });
  }

  const totalDmUnread = Object.keys(unread)
    .filter((key) => key.startsWith('dm:'))
    .reduce((sum, key) => sum + unreadFor(key), 0);

  const renderMessages = () => {
    const rows = [];
    let prev = null;
    messages.forEach((msg) => {
      const senderId = idOf(msg.sender);
      const newDay = !prev || new Date(prev.createdAt).toDateString() !== new Date(msg.createdAt).toDateString();
      if (newDay) {
        rows.push(<div key={`day-${msg._id}`} className="msg-day"><span>{formatDay(msg.createdAt)}</span></div>);
      }
      const continued = !newDay && prev && idOf(prev.sender) === senderId
        && new Date(msg.createdAt) - new Date(prev.createdAt) < GROUP_WINDOW_MS;

      rows.push(
        <div key={msg._id} className={`msg-row ${continued ? 'continued' : ''} ${senderId === myUserId ? 'mine' : ''}`}>
          <div className="msg-gutter">
            {continued ? (
              <span className="msg-hover-time">{formatTime(msg.createdAt)}</span>
            ) : (
              <button type="button" className="msg-avatar-btn" onClick={() => navigate(`/portfolio/${senderId}`)}>
                <Avatar id={senderId} name={nameFor(msg)} size={40} />
              </button>
            )}
          </div>
          <div className="msg-body">
            {!continued && (
              <div className="msg-meta">
                <button type="button" className="msg-name" onClick={() => navigate(`/portfolio/${senderId}`)}>
                  {nameFor(msg)}
                </button>
                {project && senderId === project.createdBy?._id && <span className="msg-role">Owner</span>}
                <span className="msg-time">{formatStamp(msg.createdAt)}</span>
              </div>
            )}
            {msg.content && <div className="msg-text">{msg.content}</div>}
            {msg.attachment && (
              <button type="button" className="msg-file" onClick={() => handleDownload(msg.attachment)}>
                <span className="msg-file-icon"><Icon name="folder" /></span>
                <span className="msg-file-info">
                  <span className="msg-file-name">{msg.attachment.filename}</span>
                  <span className="msg-file-size">{formatFileSize(msg.attachment.size)} · Click to download</span>
                </span>
              </button>
            )}
          </div>
        </div>
      );
      prev = msg;
    });
    return rows;
  };

  const placeholder = active?.type === 'project'
    ? `Message #general in ${project?.title || 'this project'}`
    : `Message @${dmUser?.name || ''}`;

  return (
    <div className={`msg-app ${active ? 'has-active' : ''}`}>
      {/* Far left: home (direct messages) and one icon per project, like servers */}
      <nav className="msg-rail" aria-label="Chats">
        <button
          type="button"
          className={`rail-btn home ${!active || active.type === 'dm' ? 'active' : ''}`}
          onClick={() => navigate('/messages')}
          title="Direct messages"
        >
          <Icon name="chat" />
          {totalDmUnread > 0 && <span className="rail-badge">{totalDmUnread}</span>}
        </button>
        <div className="rail-sep" />
        {groups.map((g) => (
          <button
            key={g._id}
            type="button"
            className={`rail-btn ${active?.type === 'project' && active.id === g._id ? 'active' : ''}`}
            onClick={() => navigate(`/messages/project/${g._id}`)}
            title={g.title}
          >
            <Avatar id={g._id} name={g.title} size={44} square />
            {unreadFor(`project:${g._id}`) > 0 && <span className="rail-badge">{unreadFor(`project:${g._id}`)}</span>}
          </button>
        ))}
        <div className="rail-spacer" />
        <button type="button" className="rail-btn tool" onClick={() => navigate('/people')} title="Find people">
          <Icon name="people" />
        </button>
        <button type="button" className="rail-btn tool" onClick={() => navigate('/dashboard')} title="Back to dashboard">
          <Icon name="back" />
        </button>
      </nav>

      {/* Second column: conversations or the project's channels */}
      <aside className="msg-sidebar">
        {active?.type === 'project' ? (
          <>
            <div className="side-header">
              <span className="side-title">{project?.title || 'Loading…'}</span>
            </div>
            <div className="side-section">Text channels</div>
            <button type="button" className="side-item active">
              <span className="hash">#</span> general
            </button>
            <button type="button" className="side-item" onClick={() => navigate(`/project/${active.id}`)}>
              <span className="hash"><Icon name="folder" /></span> Project page &amp; files
            </button>
            <div className="side-section">Team</div>
            <p className="side-empty">
              {team.length} {team.length === 1 ? 'person' : 'people'}, {team.filter((m) => online.has(m._id)).length} online
            </p>
          </>
        ) : (
          <>
            <div className="side-header">
              <span className="side-title">Direct Messages</span>
              <button type="button" className="side-new" onClick={() => navigate('/people')} title="Start a new chat">+</button>
            </div>
            {groups.length > 0 && (
              <>
                <div className="side-section">Project group chats</div>
                {groups.map((g) => (
                  <button key={g._id} type="button" className="side-item person" onClick={() => navigate(`/messages/project/${g._id}`)}>
                    <Avatar id={g._id} name={g.title} size={32} square />
                    <span className="side-text">
                      <span className="side-name"># {g.title}</span>
                      <span className="side-preview">{g.lastMessage || `${g.memberCount} members`}</span>
                    </span>
                    {unreadFor(`project:${g._id}`) > 0 && <span className="side-badge">{unreadFor(`project:${g._id}`)}</span>}
                  </button>
                ))}
              </>
            )}
            <div className="side-section">Direct messages</div>
            {!listsLoaded && <div className="loading-row side-loading"><span className="spinner" />Loading chats…</div>}
            {listsLoaded && dmList.length === 0 && (
              <p className="side-empty">
                No conversations yet. <button type="button" onClick={() => navigate('/people')}>Find people</button> to message.
              </p>
            )}
            {dmList.map((c) => (
              <button
                key={c._id}
                type="button"
                className={`side-item person ${active?.type === 'dm' && active.id === c._id ? 'active' : ''}`}
                onClick={() => navigate(`/messages/dm/${c._id}`)}
              >
                <Avatar id={c._id} name={c.name} size={32} online={online.has(c._id)} />
                <span className="side-text">
                  <span className="side-name">{c.name}</span>
                  <span className="side-preview">{c.lastMessage}</span>
                </span>
                {unreadFor(`dm:${c._id}`) > 0 && <span className="side-badge">{unreadFor(`dm:${c._id}`)}</span>}
              </button>
            ))}
          </>
        )}
        {me && (
          <div className="side-me">
            <Avatar id={me._id} name={me.name} size={32} online />
            <span className="side-text">
              <span className="side-name">{me.name}</span>
              <span className="side-preview">Online</span>
            </span>
          </div>
        )}
      </aside>

      {/* The open conversation */}
      <main className="msg-main">
        {!active ? (
          <div className="msg-welcome">
            <div className="welcome-icon"><Icon name="chat" /></div>
            <h2>Your messages</h2>
            <p>Pick a conversation, open a project&apos;s group chat, or find someone new to talk to.</p>
            <button type="button" className="welcome-btn" onClick={() => navigate('/people')}>Find people</button>
          </div>
        ) : (
          <>
            <header className="msg-header">
              <button type="button" className="msg-back" onClick={() => navigate('/messages')} aria-label="Back to conversations">
                <Icon name="back" />
              </button>
              {active.type === 'project' ? (
                <>
                  <span className="hash big">#</span>
                  <span className="msg-header-title">general</span>
                  <span className="msg-header-sub">{project?.title}</span>
                  <button
                    type="button"
                    className={`msg-header-btn ${showMembers ? 'on' : ''}`}
                    onClick={() => setMembersFor(showMembers ? '' : activeKey)}
                    title="Show members"
                  >
                    <Icon name="members" />
                  </button>
                </>
              ) : (
                <>
                  {dmUser && <Avatar id={dmUser._id} name={dmUser.name} size={28} online={online.has(dmUser._id)} />}
                  <button type="button" className="msg-header-title link" onClick={() => navigate(`/portfolio/${active.id}`)}>
                    {dmUser?.name || '…'}
                  </button>
                  <span className="msg-header-sub">{dmUser && (online.has(dmUser._id) ? 'Online' : 'Offline')}</span>
                </>
              )}
            </header>

            <div className="msg-content-row">
              <div className="msg-column">
                <div className="msg-list" ref={listRef}>
                  {loading && <div className="loading-row msg-loading"><span className="spinner" />Loading messages…</div>}
                  {!loading && messages.length === 0 && !error && (
                    <div className="msg-intro">
                      {active.type === 'project' ? (
                        <>
                          <div className="intro-icon">#</div>
                          <h3>Welcome to #general</h3>
                          <p>This is the start of the {project?.title} group chat. Everyone on the team can see it.</p>
                        </>
                      ) : (
                        <>
                          {dmUser && <Avatar id={dmUser._id} name={dmUser.name} size={72} />}
                          <h3>{dmUser?.name}</h3>
                          <p>This is the beginning of your direct messages with {dmUser?.name}. Say hi!</p>
                        </>
                      )}
                    </div>
                  )}
                  {renderMessages()}
                </div>

                {error && <p className="error msg-error">{error}</p>}

                {canPost ? (
                  <form className="msg-composer" onSubmit={handleSend}>
                    {selectedFile && (
                      <div className="composer-file">
                        <Icon name="folder" />
                        <span>{selectedFile.name} ({formatFileSize(selectedFile.size)})</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFile(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                    <div className="composer-row">
                      <label className="composer-attach" title="Attach a file (max 10 MB)">
                        <Icon name="clip" />
                        <input
                          type="file"
                          ref={fileInputRef}
                          hidden
                          onChange={(e) => setSelectedFile(e.target.files[0] || null)}
                        />
                      </label>
                      <textarea
                        ref={textRef}
                        rows={1}
                        value={content}
                        placeholder={placeholder}
                        onChange={(e) => setContent(e.target.value)}
                        onKeyDown={handleKeyDown}
                      />
                      <button type="submit" className="composer-send" disabled={sending || (!content.trim() && !selectedFile)} title="Send">
                        {sending ? <span className="spinner" /> : <Icon name="send" />}
                      </button>
                    </div>
                  </form>
                ) : (
                  project && <p className="msg-readonly">Only team members can post here. You&apos;re viewing as an admin.</p>
                )}
              </div>

              {/* Members list on the right for project chats */}
              {active.type === 'project' && project && (
                <aside className={`msg-members ${showMembers ? 'open' : ''}`}>
                  <div className="side-section">Owner</div>
                  <button type="button" className="side-item person" onClick={() => navigate(`/portfolio/${project.createdBy?._id}`)}>
                    <Avatar id={project.createdBy?._id} name={project.createdBy?.name} size={32} online={online.has(project.createdBy?._id)} />
                    <span className="side-name">{project.createdBy?.name}</span>
                  </button>
                  <div className="side-section">Members — {project.members?.length || 0}</div>
                  {project.members?.map((m) => (
                    <button key={m._id} type="button" className="side-item person" onClick={() => navigate(`/portfolio/${m._id}`)}>
                      <Avatar id={m._id} name={m.name} size={32} online={online.has(m._id)} />
                      <span className="side-name">{m.name}</span>
                    </button>
                  ))}
                  {isTeam && (
                    <button type="button" className="members-invite" onClick={() => navigate('/people')}>
                      + Invite people
                    </button>
                  )}
                </aside>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default Messages;
