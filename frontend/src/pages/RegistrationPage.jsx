import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './../css/RegistrationPage.css'; 

const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [backupmail, setBackupmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('PATIENT');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [specialization, setSpecialization] = useState('');
  const navigate = useNavigate();

  const handleRegister = async () => {
    if (!email.endsWith('@meditrack.local')) {
      setError('Email must end with @meditrack.local');
      setSuccess('');
      return;
    }
    if (!backupmail) {
      setError('Backup email is required');
      setSuccess('');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setSuccess('');
      return;
    }
    if (role === 'DOCTOR' && !specialization.trim()) {
      setError('Specialization is required for doctors');
      setSuccess('');
      return;
    }

    try {
      const payload = {
        name,
        email,
        password,
        role,
        specialization: role === 'DOCTOR' ? specialization : "PATIENT",
        backupmail
      };

      // Send registration request to the backend
      const res = await axios.post('http://localhost:8080/api/auth/register', payload);
      setSuccess(res.data);
      setError('');
      setTimeout(() => navigate('/login'), 2000); // Redirect to login after success
      
    } catch (err) {
      setError(err.response?.data || 'Registration failed');
      setSuccess('');
    }
  };

  return (
    <div className="register-page">
      <div className="register-card">
        <h2>MediTrack Registration</h2>
        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}

        <input
          placeholder="Full Name"
          value={name}
          onChange={e => setName(e.target.value)}
          onCopy={e => e.preventDefault()}
          onPaste={e => e.preventDefault()}
          onCut={e => e.preventDefault()}
        />
        <input
          placeholder="Email (must end with @meditrack.local)"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onCopy={e => e.preventDefault()}
          onPaste={e => e.preventDefault()}
          onCut={e => e.preventDefault()}
        />
        <input
          placeholder="Backup Email"
          type="email"
          value={backupmail}
          onChange={e => setBackupmail(e.target.value)}
          onCopy={e => e.preventDefault()}
          onPaste={e => e.preventDefault()}
          onCut={e => e.preventDefault()}
        />
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onCopy={e => e.preventDefault()}
          onPaste={e => e.preventDefault()}
          onCut={e => e.preventDefault()}
        />
        <input
          placeholder=" Confirm Password"
          type="password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          onCopy={e => e.preventDefault()}
          onPaste={e => e.preventDefault()}
          onCut={e => e.preventDefault()}
        /> 
        <select
          value={role}
          onChange={e => setRole(e.target.value)}
        >
          <option value="null">Select Role</option>
          <option value="PATIENT">Patient</option>
          <option value="DOCTOR">Doctor</option>
        </select>

        {role === 'DOCTOR' && (
          <input
            placeholder="Specialization"
            value={specialization}
            onChange={e => setSpecialization(e.target.value)}
            onCopy={e => e.preventDefault()}
            onPaste={e => e.preventDefault()}
            onCut={e => e.preventDefault()}
          />
        )}
        <button onClick={handleRegister}>Register</button>
        <p>Already have an account? <a href="/login">Login</a></p>
      </div>
    </div>
  );
};

export default RegisterPage;