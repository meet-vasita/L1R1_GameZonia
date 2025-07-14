import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/Navbar.css';

function Navbar({ user, onLogout }) {
  const [sidebarActive, setSidebarActive] = useState(false);
  
  const toggleSidebar = () => {
    setSidebarActive(!sidebarActive);
  };

  return (
    <div className="navbar">
      <div className="nav-brand">
        <h2>L1 R1 GameZonia 🎮</h2>
      </div>
      
      <button
        className="toggle-btn"
        onClick={toggleSidebar}
        aria-label="Toggle menu"
      >
        ☰
      </button>

      <div className={`nav-links ${sidebarActive ? 'active' : ''}`}>
        <Link to="/dashboard" onClick={() => setSidebarActive(false)}>Dashboard</Link>
        <Link to="/console-management" onClick={() => setSidebarActive(false)}>Console Management</Link>
        <Link to="/session-history" onClick={() => setSidebarActive(false)}>Session History</Link>
        <Link to="/settings" onClick={() => setSidebarActive(false)}>Settings</Link>
      </div>

      <div className="nav-right">
        <span className="welcome-msg">Welcome, {user}</span>
        <button className="logout-btn" onClick={onLogout}>Logout</button>
      </div>
    </div>
  );
}

export default Navbar;
