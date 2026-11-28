import { HashRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import Signup from './pages/Signup';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import ProjectDetail from './pages/ProjectDetail';
import VerifyOTP from './pages/VerifyOTP';
import Messages from './pages/Messages';
import People from './pages/People';
import Requests from './pages/Requests';
import Portfolio from './pages/Portfolio';
import Admin from './pages/Admin';

// Old chat links (/chat/:userId) open the same conversation in Messages
function ChatRedirect() {
  const { userId } = useParams();
  return <Navigate to={`/messages/dm/${userId}`} replace />;
}

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/project/:id" element={<ProjectDetail />} />
        <Route path="/verify-otp" element={<VerifyOTP />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/messages/dm/:userId" element={<Messages />} />
        <Route path="/messages/project/:projectId" element={<Messages />} />
        <Route path="/people" element={<People />} />
        <Route path="/requests" element={<Requests />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/portfolio/:userId" element={<Portfolio />} />
        <Route path="/chat/:userId" element={<ChatRedirect />} />
        <Route path="/inbox" element={<Navigate to="/messages" replace />} />
        <Route path="/mentors" element={<Navigate to="/people?mentors=1" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
