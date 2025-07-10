import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import moment from 'moment';
import {
  Chart as ChartJS,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
  CategoryScale,
  LinearScale,
  BarElement,
  BarController
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import '../styles/Dashboard.css';

// Register the BarController along with other components
ChartJS.register(
  ChartTooltip,
  ChartLegend,
  CategoryScale,
  LinearScale,
  BarElement,
  BarController
);

function Dashboard() {
  const [dailyStats, setDailyStats] = useState({});
  const [monthlyStats, setMonthlyStats] = useState({});
  const [dailyData, setDailyData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [beverageData, setBeverageData] = useState([]);
  const [consoleStatus, setConsoleStatus] = useState([]);
  const [date, setDate] = useState(moment().format('YYYY-MM-DD'));
  const [month, setMonth] = useState(moment().format('YYYY-MM'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const earningsSessionsChartRef = useRef(null);
  const beverageChartRef = useRef(null);
  const monthlyChartRef = useRef(null);

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const COLORS = ['#1e3c72', '#2a5298', '#3b82f6', '#60a5fa', '#93c5fd'];

  const fetchDailyStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/sessions/daily?date=${date}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setDailyStats(res.data);
      const chartData = [
        { name: 'Earnings', value: res.data.totalEarnings || 0, color: '#1e3c72' },
        { name: 'Sessions', value: res.data.totalSessions || 0, color: '#2a5298' },
        { name: 'Playtime', value: Math.floor((res.data.totalPlaytime || 0) / 60), color: '#3b82f6' }
      ];
      setDailyData(chartData);
      const beverages = [
        { name: 'Cold Drinks', value: res.data.coldDrinks || 0, color: '#1e3c72' },
        { name: 'Water', value: res.data.water || 0, color: '#2a5298' },
        { name: 'Snacks', value: res.data.snacks || 0, color: '#3b82f6' }
      ].filter(item => item.value > 0);
      setBeverageData(beverages);
    } catch (err) {
      console.error('Error fetching daily stats:', err);
      setError('Failed to fetch daily statistics');
      setDailyStats({});
      setDailyData([]);
      setBeverageData([]);
    } finally {
      setLoading(false);
    }
  }, [date, API_BASE_URL]);

  const fetchMonthlyStats = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/sessions/monthly?month=${month}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setMonthlyStats(res.data);
      const daysInMonth = moment(month, 'YYYY-MM').daysInMonth();
      const dailyBreakdown = Array.from({ length: daysInMonth }, (_, i) => ({
        day: `${i + 1}`,
        earnings: 0
      }));
      if (Array.isArray(res.data.sessions)) {
        res.data.sessions.forEach(session => {
          const day = moment(session.startTime).date() - 1;
          dailyBreakdown[day].earnings += parseFloat(session.totalAmount);
        });
      }
      setMonthlyData(dailyBreakdown);
    } catch (err) {
      console.error('Error fetching monthly stats:', err);
      setMonthlyStats({});
      setMonthlyData([]);
    }
  }, [month, API_BASE_URL]);

  const fetchConsoleStatus = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/consoles`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setConsoleStatus(res.data);
    } catch (err) {
      console.error('Error fetching console status:', err);
      setError('Failed to fetch console status');
    }
  }, [API_BASE_URL]);

  useEffect(() => {
    fetchDailyStats();
    fetchMonthlyStats();
    fetchConsoleStatus();
    const interval = setInterval(fetchConsoleStatus, 2000);
    return () => clearInterval(interval);
  }, [fetchDailyStats, fetchMonthlyStats, fetchConsoleStatus]);

  useEffect(() => {
    if (earningsSessionsChartRef.current && dailyData.length > 0) {
      const ctx = earningsSessionsChartRef.current.getContext('2d');
      let chartInstance = ChartJS.getChart(ctx);
      if (chartInstance) {
        chartInstance.destroy();
      }
      new ChartJS(ctx, {
        type: 'bar',
        data: {
          labels: dailyData.map(item => item.name),
          datasets: [{
            label: 'Value',
            data: dailyData.map(item => item.value),
            backgroundColor: dailyData.map(item => item.color),
            borderRadius: 4,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (tooltipItem) => {
                  if (tooltipItem.label === 'Earnings') {
                    return `${tooltipItem.label}: ₹${tooltipItem.raw.toLocaleString('en-IN')}`;
                  }
                  return `${tooltipItem.label}: ${tooltipItem.raw}${tooltipItem.label === 'Sessions' ? '' : 'h'}`;
                }
              }
            },
          },
          scales: { y: { beginAtZero: true } },
        },
      });
    }
  }, [dailyData]);

  useEffect(() => {
    if (beverageChartRef.current && beverageData.length > 0) {
      const ctx = beverageChartRef.current.getContext('2d');
      let chartInstance = ChartJS.getChart(ctx);
      if (chartInstance) {
        chartInstance.destroy();
      }
      new ChartJS(ctx, {
        type: 'bar',
        data: {
          labels: beverageData.map(item => item.name),
          datasets: [{
            label: 'Quantity',
            data: beverageData.map(item => item.value),
            backgroundColor: beverageData.map(item => item.color),
            borderRadius: 4,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (tooltipItem) => `${tooltipItem.label}: ${tooltipItem.raw} units`
              }
            },
          },
          scales: { y: { beginAtZero: true } },
        },
      });
    }
  }, [beverageData]);

  useEffect(() => {
    if (monthlyChartRef.current && monthlyData.length > 0) {
      const ctx = monthlyChartRef.current.getContext('2d');
      let chartInstance = ChartJS.getChart(ctx);
      if (chartInstance) {
        chartInstance.destroy();
      }
      new ChartJS(ctx, {
        type: 'bar',
        data: {
          labels: monthlyData.map(item => item.day),
          datasets: [{
            label: 'Earnings',
            data: monthlyData.map(item => item.earnings),
            backgroundColor: '#1e3c72',
            borderRadius: 4,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top' },
            tooltip: {
              callbacks: {
                label: (tooltipItem) => `${tooltipItem.dataset.label}: ₹${tooltipItem.raw.toLocaleString('en-IN')}`
              }
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: (value) => `₹${value.toLocaleString('en-IN')}`
              }
            }
          },
        },
      });
    }
  }, [monthlyData]);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>L1 R1 GameZonia 🎮 Dashboard</h1>
        <div className="date-controls">
          <div className="date-input-group">
            <label>Daily View:</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="date-input"
            />
          </div>
          <div className="date-input-group">
            <label>Monthly View:</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="date-input"
            />
          </div>
        </div>
      </div>

      {loading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
        </div>
      )}

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>Daily Earnings</h3>
            <p className="stat-value">₹{(dailyStats.totalEarnings || 0).toLocaleString('en-IN')}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🎮</div>
          <div className="stat-content">
            <h3>Sessions Today</h3>
            <p className="stat-value">{dailyStats.totalSessions || 0}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏱️</div>
          <div className="stat-content">
            <h3>Playtime</h3>
            <p className="stat-value">{Math.floor((dailyStats.totalPlaytime || 0) / 60)}h {(dailyStats.totalPlaytime || 0) % 60}m</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🥤</div>
          <div className="stat-content">
            <h3>Beverages & Snacks</h3>
            <p className="stat-value">{((dailyStats.coldDrinks || 0) + (dailyStats.water || 0) + (dailyStats.snacks || 0))} units</p>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card full-width-chart">
          <h2>Monthly Earnings Trend</h2>
          <div className="chart-container">
            <div style={{ width: '100%', height: 500 }}>
              <canvas ref={monthlyChartRef} />
            </div>
          </div>
          <div className="monthly-stats">
            <p><strong>Monthly Earnings:</strong> ₹{(monthlyStats.totalEarnings || 0).toLocaleString('en-IN')}</p>
            <p><strong>Total Sessions:</strong> {monthlyStats.totalSessions || 0}</p>
            <p><strong>Beverages & Snacks Sold:</strong> {((monthlyStats.coldDrinks || 0) + (monthlyStats.water || 0) + (monthlyStats.snacks || 0))} units</p>
          </div>
        </div>

        <div className="chart-card">
          <h2>Earnings, Sessions, Playtime</h2>
          <div className="chart-container">
            <div style={{ width: '100%', height: 300 }}>
              <canvas ref={earningsSessionsChartRef} />
            </div>
          </div>
        </div>

        <div className="chart-card">
          <h2>Cold Drinks, Water, Snacks</h2>
          <div className="chart-container">
            <div style={{ width: '100%', height: 300 }}>
              <canvas ref={beverageChartRef} />
            </div>
          </div>
        </div>

        <div className="chart-card">
          <h2>Real-Time Console Status</h2>
          <div className="console-status-grid">
            {consoleStatus.map((console) => (
              <div key={console.id} className={`console-status-card ${console.status === 'Free' ? 'free' : 'in-use'}`}>
                <h3>{console.name}</h3>
                <p>Status: {console.status}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .dashboard-container {
          max-width: 1400px;
          margin: 2rem auto;
          padding: 2rem;
          background: linear-gradient(135deg, #f5f7fa 0%, #e4e7eb 100%);
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          color: #1a202c;
        }
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 2rem;
          padding: 1.5rem;
          background: #ffffff;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        }
        .dashboard-header h1 {
          margin: 0;
          font-size: 1.75rem;
          font-weight: 700;
          color: #1e3c72;
        }
        .date-controls {
          display: flex;
          gap: 1.5rem;
          flex-wrap: wrap;
        }
        .date-input-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .date-input-group label {
          font-weight: 600;
          color: #2d3748;
        }
        .date-input {
          padding: 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          background: #f7fafc;
          font-size: 0.95rem;
          color: #2d3748;
          transition: border-color 0.2s ease;
        }
        .date-input:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
        }
        .loading-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        .spinner {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #6366f1;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .error-message {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #fef2f2;
          color: #c53030;
          padding: 1rem;
          border-radius: 8px;
          margin: 1.5rem 0;
          font-weight: 500;
        }
        .error-message button {
          background: #c53030;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.2s ease;
        }
        .error-message button:hover {
          background: #b91c1c;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }
        .stat-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          background: #ffffff;
          padding: 1.5rem;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
          transition: transform 0.2s ease;
        }
        .stat-card:hover {
          transform: translateY(-5px);
        }
        .stat-icon {
          font-size: 2rem;
          color: #6366f1;
        }
        .stat-content h3 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 600;
          color: #2d3748;
        }
        .stat-value {
          margin: 0.5rem 0 0;
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e3c72;
        }
        .charts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 1.5rem;
        }
        .full-width-chart {
          grid-column: 1 / -1;
        }
        .chart-card {
          background: #ffffff;
          padding: 1.5rem;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
          transition: transform 0.2s ease;
        }
        .chart-card:hover {
          transform: translateY(-5px);
        }
        .chart-card h2 {
          margin: 0 0 1rem;
          font-size: 1.25rem;
          font-weight: 600;
          color: #1e3c72;
        }
        .chart-container {
          min-height: 300px;
        }
        .custom-tooltip {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          padding: 0.75rem;
          border-radius: 6px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        .custom-tooltip .label {
          font-weight: 600;
          color: #1a202c;
          margin-bottom: 0.5rem;
        }
        .custom-tooltip p {
          margin: 0.25rem 0;
          font-size: 0.9rem;
        }
        .monthly-stats {
          margin-top: 1rem;
          padding: 1rem;
          background: #edf2f7;
          border-radius: 6px;
        }
        .monthly-stats p {
          margin: 0.5rem 0;
          font-size: 0.95rem;
          color: #4a5568;
        }
        .monthly-stats p strong {
          color: #1a202c;
        }
        .console-status-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          padding: 1.5rem;
        }
        .console-status-card {
          padding: 1rem;
          border-radius: 10px;
          text-align: center;
          color: white;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          transition: transform 0.2s ease;
        }
        .console-status-card:hover {
          transform: translateY(-5px);
        }
        .console-status-card.free {
          background: #10b981;
        }
        .console-status-card.in-use {
          background: #f59e0b;
        }
        .console-status-card h3 {
          margin: 0 0 0.5rem;
          font-size: 1.1rem;
          font-weight: 600;
        }
        .console-status-card p {
          margin: 0;
          font-size: 0.95rem;
        }

        @media (max-width: 768px) {
          .dashboard-container {
            padding: 1rem;
          }

          .dashboard-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .date-controls {
            flex-direction: column;
            width: 100%;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .charts-grid {
            grid-template-columns: 1fr;
          }

          .full-width-chart {
            grid-column: 1;
          }

          .chart-card {
            padding: 1rem;
          }

          .console-status-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

export default Dashboard;