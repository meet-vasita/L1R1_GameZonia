import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/Navbar.css';

function Navbar({ user, onLogout }) {
  const [sidebarActive, setSidebarActive] = useState(false);

  return (
    <div className="navbar">
      <h2>L1 R1 GameZonia 🎮</h2>
      <button 
        className="toggle-btn" 
        onClick={() => setSidebarActive(!sidebarActive)}
      >
        ☰
      </button>
      <div className="nav-links">
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/console-management">Console Management</Link>
        <Link to="/session-history">Session History</Link>
        <Link to="/settings">Settings</Link>
      </div>
      <div className="nav-right">
        <span className="welcome-msg">Welcome, {user}</span>
        <button className="logout-btn" onClick={onLogout}>Logout</button>
      </div>
    </div>
  );
}

export default Navbar;