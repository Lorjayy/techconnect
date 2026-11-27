import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './VerifyOTP.css';

function VerifyOTP() {
  const location = useLocation();
  const navigate = useNavigate();
  const [email] = useState(location.state?.email || '');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    setVerifying(true);
    try {
      await axios.post('/api/users/verify-otp', { email, otp });
      setSuccess('Account verified! Redirecting to login...');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed');
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setSuccess('');
    setResending(true);
    try {
      await axios.post('/api/users/resend-otp', { email });
      setSuccess('A new code has been sent to your email.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="otp-page">
      <div className="otp-box">
        <h2>Verify Your Email</h2>
        <p>We sent a 6-digit code to<br /><strong>{email}</strong></p>

        {error && <p className="error">{error}</p>}
        {success && <p className="success-msg">{success}</p>}

        <form onSubmit={handleVerify}>
          <input
            type="text"
            maxLength="6"
            placeholder="000000"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />
          <button type="submit" disabled={verifying}>{verifying ? 'Verifying…' : 'Verify'}</button>
        </form>

        <button className="resend-btn" onClick={handleResend} disabled={resending}>
          {resending ? 'Sending…' : 'Resend Code'}
        </button>
      </div>
    </div>
  );
}

export default VerifyOTP;