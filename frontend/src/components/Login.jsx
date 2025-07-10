import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/Login.css';

function Login({ setIsAuthenticated }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [adminStatus, setAdminStatus] = useState({ 
    adminCount: 0, 
    canAddAdmin: true, 
    maxAdmins: 2 
  });

  // Get API base URL with fallback
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001';

  // Check admin status on component mount
  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/auth/admin-status`);
      setAdminStatus(response.data);
    } catch (err) {
      console.error('Error checking admin status:', err);
      // Set default values if API call fails
      setAdminStatus({ adminCount: 0, canAddAdmin: true, maxAdmins: 2 });
    }
  };

  const handleLogin = async () => {
    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        username,
        password,
      });

      if (res.data.token) {
        localStorage.setItem('token', res.data.token);
        setIsAuthenticated(true);
        window.location.href = '/dashboard';
      } else {
        setError('No token received from server');
      }
    } catch (err) {
      if (err.response) {
        setError(err.response.data?.message || `Server error: ${err.response.status}`);
      } else if (err.request) {
        setError('Cannot connect to server. Please check if the server is running.');
      } else {
        setError(`Request failed: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdmin.username || !newAdmin.password) {
      setError('Please fill in both username and password for new admin');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/register-public`, newAdmin);
      
      setError('');
      alert('New admin created successfully!');
      setNewAdmin({ username: '', password: '' });
      setShowAddAdmin(false);
      
      // Refresh admin status after successful creation
      await checkAdminStatus();
    } catch (err) {
      if (err.response) {
        setError(err.response.data?.message || `Server error: ${err.response.status}`);
      } else if (err.request) {
        setError('Cannot connect to server. Please check if the server is running.');
      } else {
        setError(`Request failed: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>L1 R1 GameZonia 🎮 Login</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <div>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
          />
          <button 
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </div>
        
        {/* Show admin count info */}
        <div className="admin-info">
          <p>Current Admins: {adminStatus.adminCount} / {adminStatus.maxAdmins}</p>
          {!adminStatus.canAddAdmin && (
            <p className="warning-message">
              Maximum number of admins ({adminStatus.maxAdmins}) reached. Cannot add more admins.
            </p>
          )}
        </div>
        
        <button
          onClick={() => {
            if (adminStatus.canAddAdmin) {
              setShowAddAdmin(!showAddAdmin);
              setError('');
            }
          }}
          disabled={loading || !adminStatus.canAddAdmin}
          className={!adminStatus.canAddAdmin ? 'disabled-button' : ''}
        >
          {showAddAdmin ? 'Cancel' : 'Add New Admin'}
        </button>
        
        {showAddAdmin && adminStatus.canAddAdmin && (
          <div className="add-admin-section">
            <h3>Add New Admin</h3>
            <input
              type="text"
              placeholder="Admin Username"
              value={newAdmin.username}
              onChange={(e) => setNewAdmin({ ...newAdmin, username: e.target.value })}
              disabled={loading}
            />
            <input
              type="password"
              placeholder="Admin Password"
              value={newAdmin.password}
              onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
              disabled={loading}
            />
            <button 
              onClick={handleAddAdmin}
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Admin'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Login;