import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './../css/LoginPage.css';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [lockoutEndTime, setLockoutEndTime] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showForgot, setShowForgot] = useState(false);

  // Forgot password states
  const [fpStep, setFpStep] = useState(1); // 1: enter emails, 2: enter OTP, 3: reset password
  const [fpEmail, setFpEmail] = useState('');
  const [fpBackup, setFpBackup] = useState('');
  const [fpOtp, setFpOtp] = useState('');
  const [fpNewPass, setFpNewPass] = useState('');
  const [fpConfirmPass, setFpConfirmPass] = useState('');
  const [fpMsg, setFpMsg] = useState('');
  const [fpLoading, setFpLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const savedLockout = localStorage.getItem('lockoutEndTime');
    if (savedLockout) {
      const endTime = new Date(savedLockout);
      if (new Date() < endTime) setLockoutEndTime(endTime);
      else localStorage.removeItem('lockoutEndTime');
    }
  }, []);

  useEffect(() => {
    let timer;
    if (lockoutEndTime) {
      timer = setInterval(() => {
        const now = new Date();
        const diff = Math.max(0, lockoutEndTime - now);
        setTimeLeft(Math.ceil(diff / 1000));

        if (diff <= 0) {
          setLockoutEndTime(null);
          setTimeLeft(0);
          localStorage.removeItem('lockoutEndTime');
          clearInterval(timer);
        }
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [lockoutEndTime]);

  const handleLogin = async () => {
    if (lockoutEndTime && new Date() < lockoutEndTime) {
      setError(`Too many attempts. Try again in ${timeLeft} seconds`);
      return;
    }

    try {
      await axios.post('http://localhost:8080/api/auth/login',
        { email, password },
        { withCredentials: true });

      const res = await axios.get('http://localhost:8080/api/auth/profile', {
        withCredentials: true,
      });

      const { role } = res.data;
      if (role === 'DOCTOR') navigate('/doctor');
      else if (role === 'PATIENT') navigate('/patient');
      else if (role === 'ADMIN') navigate('/admin');
      else setError('Unknown role');
    } catch (err) {
      const msg = err.response?.data;
      if (typeof msg === 'string' && msg.includes('Too many attempts')) {
        setError(msg);
        const lockoutUntil = new Date(Date.now() + 5 * 60 * 1000);
        setLockoutEndTime(lockoutUntil);
        localStorage.setItem('lockoutEndTime', lockoutUntil.toISOString());
      } else {
        setError(msg || 'Invalid credentials');
      }
    }
  };

  // --- Forgot Password Handlers ---
  const handleForgotSendOtp = async () => {
    setFpMsg('');
    if (!fpEmail || !fpBackup) {
      setFpMsg('Please enter both hospital email and backup email.');
      return;
    }
    setFpLoading(true);
    try {
      await axios.post('http://localhost:8080/auth/forgot-password', {
        email: fpEmail,
        backupEmail: fpBackup,
      });
      setFpMsg('OTP sent to your backup email.');
      setFpStep(2);
    } catch (err) {
      setFpMsg(err.response?.data || 'Failed to send OTP');
    }
    setFpLoading(false);
  };

  const handleForgotVerifyOtp = async () => {
    setFpMsg('');
    if (!fpOtp) {
      setFpMsg('Enter the OTP sent to your backup email.');
      return;
    }
    setFpLoading(true);
    try {
      await axios.post('http://localhost:8080/auth/verify-otp', {
        email: fpEmail,
        otp: fpOtp,
      });
      setFpMsg('OTP verified. Please set your new password.');
      setFpStep(3);
    } catch (err) {
      setFpMsg(err.response?.data || 'Invalid OTP');
    }
    setFpLoading(false);
  };

  const handleForgotResetPassword = async () => {
    setFpMsg('');
    if (!fpNewPass || !fpConfirmPass) {
      setFpMsg('Enter and confirm your new password.');
      return;
    }
    if (fpNewPass !== fpConfirmPass) {
      setFpMsg('Passwords do not match.');
      return;
    }
    setFpLoading(true);
    try {
      await axios.post('http://localhost:8080/auth/reset-password', {
        email: fpEmail,
        newPassword: fpNewPass,
      });
      setFpMsg('Password reset successful. You can now login.');
      setTimeout(() => {
        setShowForgot(false);
        setFpStep(1);
        setFpEmail('');
        setFpBackup('');
        setFpOtp('');
        setFpNewPass('');
        setFpConfirmPass('');
        setFpMsg('');
      }, 2000);
    } catch (err) {
      setFpMsg(err.response?.data || 'Failed to reset password');
    }
    setFpLoading(false);
  };

  // --- UI ---
  return (
    <div className="login-page" onContextMenu={e => e.preventDefault()}>
      {!showForgot ? (
        <form className="login-form" onSubmit={e => e.preventDefault()}>
          <h2>Welcome to MediTrack</h2>
          {error && <p className="error-msg">{error}</p>}

          <input
            type="email"
            placeholder="Enter Email"
            value={email}
            id="email"
            onChange={e => setEmail(e.target.value)}
            disabled={lockoutEndTime && new Date() < lockoutEndTime}
            autoComplete="username"
          />

          <input
            type="password"
            placeholder="Enter Password"
            value={password}
            id="password"
            onChange={e => setPassword(e.target.value)}
            disabled={lockoutEndTime && new Date() < lockoutEndTime}
            autoComplete="current-password"
          />

          <button
            type="button"
            className="login-button"
            id="login-button"
            onClick={handleLogin}
            disabled={lockoutEndTime && new Date() < lockoutEndTime}
          >
            {lockoutEndTime ? `Locked (${timeLeft}s)` : 'Login'}
            <span className="curtain"></span>
          </button>
          <div style={{ marginTop: 12, textAlign: "center" }}>
            <button
              type="button"
              className="forgot-link"
              style={{
                background: "none",
                border: "none",
                color: "#1976d2",
                cursor: "pointer",
                textDecoration: "underline",
                fontSize: "1rem",
                padding: 0,
              }}
              onClick={() => {
                setShowForgot(true);
                setError('');
              }}
            >
              Forgot Password?
            </button>
          </div>
        </form>
      ) : (
        <div className="forgot-form" style={{
          maxWidth: 370,
          margin: "40px auto",
          background: "#fff",
          borderRadius: 10,
          boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
          padding: "32px 28px"
        }}>
          <h2 style={{ textAlign: "center", marginBottom: 24 }}>Forgot Password</h2>
          {fpMsg && (
            <div
              style={{
                marginBottom: 18,
                color: fpMsg.includes('success') || fpMsg.includes('verified') ? "#388e3c" : "#d32f2f",
                background: fpMsg.includes('success') || fpMsg.includes('verified') ? "#e8f5e9" : "#ffebee",
                borderRadius: 6,
                padding: "8px 12px",
                textAlign: "center",
                fontWeight: 500,
                fontSize: 15,
              }}
            >
              {fpMsg}
            </div>
          )}

          {fpStep === 1 && (
            <form
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
              onSubmit={e => { e.preventDefault(); handleForgotSendOtp(); }}
            >
              <label style={{ fontWeight: 500 }}>Hospital Email</label>
              <input
                type="email"
                placeholder="Enter your hospital email"
                value={fpEmail}
                onChange={e => setFpEmail(e.target.value)}
                disabled={fpLoading}
                autoComplete="username"
                style={{ padding: 10, borderRadius: 5, border: "1px solid #ccc" }}
              />
              <label style={{ fontWeight: 500 }}>Backup Email</label>
              <input
                type="email"
                placeholder="Enter your backup email"
                value={fpBackup}
                onChange={e => setFpBackup(e.target.value)}
                disabled={fpLoading}
                autoComplete="off"
                style={{ padding: 10, borderRadius: 5, border: "1px solid #ccc" }}
              />
              <button
                type="submit"
                className="login-button"
                style={{ marginTop: 10 }}
                disabled={fpLoading}
              >
                {fpLoading ? "Sending OTP..." : "Send OTP"}
              </button>
              <button
                type="button"
                className="forgot-link"
                style={{
                  background: "none",
                  border: "none",
                  color: "#1976d2",
                  cursor: "pointer",
                  textDecoration: "underline",
                  fontSize: "1rem",
                  padding: 0,
                  marginTop: 8,
                }}
                onClick={() => {
                  setShowForgot(false);
                  setFpStep(1);
                  setFpEmail('');
                  setFpBackup('');
                  setFpOtp('');
                  setFpNewPass('');
                  setFpConfirmPass('');
                  setFpMsg('');
                }}
              >
                Back to Login
              </button>
            </form>
          )}

          {fpStep === 2 && (
            <form
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
              onSubmit={e => { e.preventDefault(); handleForgotVerifyOtp(); }}
            >
              <label style={{ fontWeight: 500 }}>OTP</label>
              <input
                type="text"
                placeholder="Enter OTP"
                value={fpOtp}
                onChange={e => setFpOtp(e.target.value)}
                disabled={fpLoading}
                maxLength={6}
                style={{ padding: 10, borderRadius: 5, border: "1px solid #ccc", letterSpacing: 4, fontSize: 18, textAlign: "center" }}
              />
              <button
                type="submit"
                className="login-button"
                style={{ marginTop: 10 }}
                disabled={fpLoading}
              >
                {fpLoading ? "Verifying..." : "Verify OTP"}
              </button>
              <button
                type="button"
                className="forgot-link"
                style={{
                  background: "none",
                  border: "none",
                  color: "#1976d2",
                  cursor: "pointer",
                  textDecoration: "underline",
                  fontSize: "1rem",
                  padding: 0,
                  marginTop: 8,
                }}
                onClick={() => {
                  setFpStep(1);
                  setFpOtp('');
                  setFpMsg('');
                }}
              >
                Back
              </button>
            </form>
          )}

          {fpStep === 3 && (
            <form
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
              onSubmit={e => { e.preventDefault(); handleForgotResetPassword(); }}
            >
              <label style={{ fontWeight: 500 }}>New Password</label>
              <input
                type="password"
                placeholder="Enter new password"
                value={fpNewPass}
                onChange={e => setFpNewPass(e.target.value)}
                disabled={fpLoading}
                autoComplete="new-password"
                style={{ padding: 10, borderRadius: 5, border: "1px solid #ccc" }}
              />
              <label style={{ fontWeight: 500 }}>Confirm New Password</label>
              <input
                type="password"
                placeholder="Confirm new password"
                value={fpConfirmPass}
                onChange={e => setFpConfirmPass(e.target.value)}
                disabled={fpLoading}
                autoComplete="new-password"
                style={{ padding: 10, borderRadius: 5, border: "1px solid #ccc" }}
              />
              <button
                type="submit"
                className="login-button"
                style={{ marginTop: 10 }}
                disabled={fpLoading}
              >
                {fpLoading ? "Resetting..." : "Reset Password"}
              </button>
              <button
                type="button"
                className="forgot-link"
                style={{
                  background: "none",
                  border: "none",
                  color: "#1976d2",
                  cursor: "pointer",
                  textDecoration: "underline",
                  fontSize: "1rem",
                  padding: 0,
                  marginTop: 8,
                }}
                onClick={() => {
                  setFpStep(1);
                  setFpNewPass('');
                  setFpConfirmPass('');
                  setFpMsg('');
                }}
              >
                Back
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

export default LoginPage;