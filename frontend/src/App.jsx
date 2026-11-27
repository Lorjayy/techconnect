import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Signup from './pages/Signup';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import ProjectDetail from './pages/ProjectDetail';
import VerifyOTP from './pages/VerifyOTP';
import Chat from './pages/Chat';
import Mentors from './pages/Mentors';
import Portfolio from './pages/Portfolio';
import Inbox from './pages/Inbox';
import Admin from './pages/Admin';

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
        <Route path="/chat/:userId" element={<Chat />} />
        <Route path="/inbox" element={<Inbox />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/mentors" element={<Mentors />} />
        <Route path="/portfolio/:userId" element={<Portfolio />} />
      </Routes>
    </HashRouter>
  );
}

export default App;