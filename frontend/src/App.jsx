import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ConsoleManagement from './components/ConsoleManagement';
import SessionHistory from './components/SessionHistory';
import Settings from './components/Settings';
import Navbar from './components/Navbar';
import HomePage from './components/HomePage';

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = !!localStorage.getItem('token');
  return isAuthenticated ? children : <Navigate to="/login" />;
};

// Component to conditionally render navbar based on route
const ConditionalNavbar = ({ user, onLogout }) => {
  const location = useLocation();
  const isAuthenticated = !!localStorage.getItem('token');
  
  // Don't show navbar on home page, login page, or when not authenticated
  const hideNavbarRoutes = ['/', '/login'];
  const shouldShowNavbar = isAuthenticated && !hideNavbarRoutes.includes(location.pathname);
  
  return shouldShowNavbar ? <Navbar user={user} onLogout={onLogout} /> : null;
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  const [user, setUser] = useState('');
  const [sidebarActive] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = JSON.parse(atob(token.split('.')[1]));
        // Use username instead of userId - this is the key change!
        setUser(decoded.username || 'Admin');
        setIsAuthenticated(true);
      } catch (err) {
        console.error('Invalid token:', err);
        localStorage.removeItem('token');
        setIsAuthenticated(false);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('activeSessions');
    setIsAuthenticated(false);
    window.location.href = '/';
  };

  return (
    <Router>
      <div className="app-container">
        <ConditionalNavbar user={user} onLogout={handleLogout} />
        <div className={`content ${sidebarActive ? 'sidebar-active' : ''}`}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route
              path="/login"
              element={<Login setIsAuthenticated={setIsAuthenticated} />}
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/console-management"
              element={
                <ProtectedRoute>
                  <ConsoleManagement onLogout={handleLogout} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/session-history"
              element={
                <ProtectedRoute>
                  <SessionHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
        <div className={`sidebar ${sidebarActive ? 'active' : ''}`}>
          {/* Sidebar content can be added here if needed */}
        </div>
      </div>
    </Router>
  );
}

export default App;