import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import '../styles/SessionHistory.css';

function SessionHistory() {
  const [sessions, setSessions] = useState([]);
  const [date, setDate] = useState('');
  const [console, setConsole] = useState('');
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

  const fetchSessions = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/sessions/history`, {
        params: { date, console },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      // Sort sessions by startTime in descending order (newest first)
      const sortedSessions = res.data.sort((a, b) => {
        const dateA = new Date(a.startTime);
        const dateB = new Date(b.startTime);
        return dateB - dateA; // Newest first
      });
      setSessions(sortedSessions);
    } catch (err) {
      console.error('Error fetching sessions:', err);
      setSessions([]);
    }
  }, [date, console, API_BASE_URL]);

  const deleteSession = async (id) => {
    if (!window.confirm('Are you sure you want to delete this session?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/sessions/delete/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      alert('Session deleted successfully');
      fetchSessions();
    } catch (err) {
      console.error('Error deleting session:', err);
      alert('Failed to delete session');
    }
  };

  useEffect(() => {
    fetchSessions();

    const handleSessionUpdate = () => {
      fetchSessions();
    };
    window.addEventListener('sessionUpdated', handleSessionUpdate);

    return () => {
      window.removeEventListener('sessionUpdated', handleSessionUpdate);
    };
  }, [fetchSessions]);

  return (
    <div className="session-history-container">
      <h1>L1 R1 GameZonia 🎮 Session History</h1>
      <div className="filter-section">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <input
          type="text"
          placeholder="Console Name"
          value={console}
          onChange={(e) => setConsole(e.target.value)}
        />
      </div>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Console</th>
              <th>Player</th>
              <th>Start Time</th>
              <th>End Time</th>
              <th>Duration</th>
              <th>Base Cost</th>
              <th>Add-ons</th>
              <th>Total Amount</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id}>
                <td>{s.console}</td>
                <td>{s.playerName || 'Unknown'}</td>
                <td>{s.startTime}</td>
                <td>{s.endTime}</td>
                <td>{s.duration} mins</td>
                <td>₹{s.baseCost}</td>
                <td>
                  {[
                    JSON.parse(s.addOns).coldDrinkCount > 0
                      ? `${JSON.parse(s.addOns).coldDrinkCount} Cold Drink${JSON.parse(s.addOns).coldDrinkCount > 1 ? 's' : ''}`
                      : '',
                    JSON.parse(s.addOns).waterCount > 0
                      ? `${JSON.parse(s.addOns).waterCount} Water${JSON.parse(s.addOns).waterCount > 1 ? 's' : ''}`
                      : '',
                    JSON.parse(s.addOns).snackCount > 0
                      ? `${JSON.parse(s.addOns).snackCount} Snack${JSON.parse(s.addOns).snackCount > 1 ? 's' : ''}`
                      : '',
                  ]
                    .filter(Boolean)
                    .join(', ') || 'None'}
                </td>
                <td>₹{s.totalAmount}</td>
                <td>
                  <button className="delete-btn" onClick={() => deleteSession(s.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <style>{`
        .delete-btn {
          padding: 5px 10px;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        .delete-btn:hover {
          background: #dc2626;
        }
        .session-history-container {
          padding: 20px;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          min-height: 100vh;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        .filter-section {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
        }
        .filter-section input {
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        .card {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th, td {
          padding: 10px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }
        th {
          background: #1e3c72;
          color: white;
        }
        tr:hover {
          background: #f8f9fa;
        }
      `}</style>
    </div>
  );
}

export default SessionHistory;
