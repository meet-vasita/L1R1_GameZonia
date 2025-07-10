import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/Settings.css';

function Settings() {
  const [settings, setSettings] = useState({
    pricePerHour: 60,
    coldDrinkPrice: 20,
    waterPrice: 10,
    snackPrice: 15,
    consoles: 'PS2 #1,PS2 #2'
  });
  const [newAdmin, setNewAdmin] = useState({ username: '', password: '' });
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/settings`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setSettings(res.data);
      } catch (err) {
        console.error('Error fetching settings:', err);
      }
    };

    fetchSettings();
  }, [API_BASE_URL]);

  const handleUpdateSettings = async () => {
    try {
      await axios.post(`${API_BASE_URL}/api/settings/update`, settings, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      alert('Settings updated');
    } catch (err) {
      alert('Failed to update settings');
    }
  };

  const handleRegisterAdmin = async () => {
    try {
      await axios.post(`${API_BASE_URL}/api/auth/register`, newAdmin, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      alert('New admin registered successfully');
      setNewAdmin({ username: '', password: '' });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to register admin');
    }
  };

  return (
    <div className="settings-container">
      <h1>L1 R1 GameZonia 🎮 Settings</h1>
      <div className="card">
        <h2>Update Pricing and Consoles</h2>
        <label>Price per Hour:</label>
        <input
          type="number"
          value={settings.pricePerHour}
          onChange={(e) => setSettings({ ...settings, pricePerHour: e.target.value })}
        />
        <label>Cold Drink Price:</label>
        <input
          type="number"
          value={settings.coldDrinkPrice}
          onChange={(e) => setSettings({ ...settings, coldDrinkPrice: e.target.value })}
        />
        <label>Water Price:</label>
        <input
          type="number"
          value={settings.waterPrice}
          onChange={(e) => setSettings({ ...settings, waterPrice: e.target.value })}
        />
        <label>Snack Price:</label>
        <input
          type="number"
          value={settings.snackPrice}
          onChange={(e) => setSettings({ ...settings, snackPrice: e.target.value })}
        />
        <label>Consoles (comma-separated):</label>
        <input
          type="text"
          value={settings.consoles}
          onChange={(e) => setSettings({ ...settings, consoles: e.target.value })}
        />
        <button onClick={handleUpdateSettings}>Save Settings</button>
      </div>
      <div className="card">
        <h2>Add New Admin</h2>
        <label>Username:</label>
        <input
          type="text"
          value={newAdmin.username}
          onChange={(e) => setNewAdmin({ ...newAdmin, username: e.target.value })}
        />
        <label>Password:</label>
        <input
          type="password"
          value={newAdmin.password}
          onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
        />
        <button onClick={handleRegisterAdmin}>Register Admin</button>
      </div>
      <style>{`
        .settings-container {
          padding: 20px;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          min-height: 100vh;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        .card {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          margin-bottom: 20px;
        }
        h1 {
          color: #1e3c72;
          font-weight: 700;
        }
        h2 {
          color: #2d3748;
          font-weight: 600;
        }
        label {
          display: block;
          margin: 10px 0 5px;
          font-weight: 500;
        }
        input {
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 16px;
        }
        button {
          margin-top: 20px;
          padding: 10px 20px;
          background: #1e3c72;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
        }
        button:hover {
          background: #2a5298;
        }
      `}</style>
    </div>
  );
}

export default Settings;