import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import moment from 'moment';
import RealTimeClock from './RealTimeClock';
import '../styles/ConsoleManagement.css';
import beepSound from './beep.mp3'

function ConsoleManagement() {
  const [consoles, setConsoles] = useState([]);
  const [settings, setSettings] = useState({
    pricePerHour: 60,
    coldDrinkPrice: 15,
    waterPrice: 10,
    snackPrice: 5,
    consoles: 'PS2 #1,PS2 #2',
  });
  const [duration, setDuration] = useState(30);
  const [controllerCount, setControllerCount] = useState(0);
  const [addOns, setAddOns] = useState({ coldDrinkCount: 0, waterCount: 0, snackCount: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeSessions, setActiveSessions] = useState(new Map());
  const [showStartModal, setShowStartModal] = useState(false);
  const [showAddOnModal, setShowAddOnModal] = useState(false);
  const [selectedConsole, setSelectedConsole] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const intervalRef = useRef(null);
  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const endingSessionsRef = useRef(new Set());

  useEffect(() => {
    initializeAudio();
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please log in to access console management');
      return;
    }

    initializeData();
    setupIntervals();

    return cleanup;
  }, []);

  const initializeAudio = () => {
    audioRef.current = new Audio(beepSound);
    audioRef.current.preload = 'auto';
    audioRef.current.volume = 0.5;
    audioRef.current.onerror = () => {
      audioRef.current = null; // Fallback will be used
    };
  };

  const initializeData = async () => {
    await Promise.all([fetchConsoles(), fetchSettings()]);
  };

  const setupIntervals = () => {
    intervalRef.current = setInterval(fetchConsoles, 30000);
    timerRef.current = setInterval(updateTimers, 1000);
  };

  const cleanup = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    activeSessions.forEach((session) => {
      if (session.timerId) {
        clearTimeout(session.timerId);
      }
    });
  };

  const playNotificationSound = () => {
    try {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => playFallbackSound());
      } else {
        playFallbackSound();
      }
    } catch (error) {
      playFallbackSound();
    }
  };

  const playFallbackSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      // Silent fallback
    }
  };

  const fetchConsoles = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please log in to access console management');
        return;
      }

      const [consolesRes, sessionsRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/consoles`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/sessions/active`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const psConsoles = consolesRes.data.filter((console) => console.name.includes('PS2'));
      setConsoles(psConsoles);

      const newActiveSessions = new Map();
      
      // Process active sessions from API
      sessionsRes.data.forEach((session) => {
        const targetConsole = psConsoles.find(c => c.id === session.console || c.name === session.console || c.id === session.id || c.name === session.id);
        const consoleName = targetConsole ? targetConsole.name : session.console || session.id;
        
        // Parse start time properly
        const startTime = moment(session.startTime);
        const endTime = startTime.clone().add(session.duration, 'minutes');
        const now = moment();
        const remainingTime = Math.max(0, Math.floor(endTime.diff(now) / 1000));
        
        console.log('Session data:', {
          sessionId: session.sessionId || session.id,
          consoleName,
          startTime: startTime.format(),
          endTime: endTime.format(),
          duration: session.duration,
          remainingTime,
          playerName: session.playerName,
          totalAmount: session.totalAmount
        });
        
        if (remainingTime > 0) {
          newActiveSessions.set(consoleName, {
            timerId: null,
            sessionId: session.sessionId || session.id,
            playerName: session.playerName || 'Unknown',
            startTime: startTime.format(),
            endTime: endTime.valueOf(),
            remainingTime,
            duration: session.duration,
            addOns: session.addOns || { coldDrinkCount: 0, waterCount: 0, snackCount: 0 },
            totalAmount: parseFloat(session.totalAmount) || 0,
            controllerCount: session.controllerCount || 0,
          });
        }
      });

      // Merge with existing sessions to preserve local state
      setActiveSessions(prevSessions => {
        const mergedSessions = new Map();
        
        // First add all API sessions
        newActiveSessions.forEach((session, consoleName) => {
          mergedSessions.set(consoleName, session);
        });
        
        // Then add any local sessions that aren't in API response but still have time
        prevSessions.forEach((session, consoleName) => {
          if (!mergedSessions.has(consoleName) && session.remainingTime > 0) {
            mergedSessions.set(consoleName, session);
          }
        });
        
        return mergedSessions;
      });

      setError(null);
    } catch (err) {
      console.error('Error fetching consoles:', err);
      const isUnauthorized = err.response?.status === 403;
      setError(isUnauthorized ? 'Unauthorized access. Please log in again.' : 'Failed to fetch consoles.');
      if (isUnauthorized) {
        handleLogout();
      }
    }
  };

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSettings(res.data);
    } catch (err) {
      const isUnauthorized = err.response?.status === 403;
      if (isUnauthorized) {
        handleLogout();
      }
    }
  };

  const calculatePrice = (currentTime = new Date()) => {
    const hour = currentTime.getHours();
    const isHappyHour = hour >= 13 && hour < 17;
    const isEvening = hour >= 17 && hour < 24;
    const playerCount = controllerCount + 1;
    const durationNum = parseInt(duration);
    let basePrice;

    if (isHappyHour) {
      if (playerCount === 2) {
        basePrice = durationNum === 30 ? 40 : durationNum === 60 ? 40 : (durationNum / 60) * 40;
      } else {
        basePrice = playerCount * (durationNum === 30 ? 20 : durationNum === 60 ? 30 : (durationNum / 60) * 30);
      }
    } else if (isEvening) {
      if (playerCount === 1) {
        basePrice = durationNum === 30 ? 20 : durationNum === 60 ? 30 : (durationNum / 60) * 30;
      } else if (playerCount === 2) {
        basePrice = durationNum === 30 ? 40 : durationNum === 60 ? 60 : (durationNum / 30) * 40;
      } else {
        basePrice = playerCount * (durationNum === 30 ? 20 : durationNum === 60 ? 30 : (durationNum / 60) * 30);
      }
    } else {
      basePrice = playerCount * (durationNum === 30 ? 20 : durationNum === 60 ? 30 : (durationNum / 60) * 30);
    }

    const coldDrinkPrice = addOns.coldDrinkCount * parseInt(settings.coldDrinkPrice || 15);
    const waterPrice = addOns.waterCount * parseInt(settings.waterPrice || 10);
    const snackPrice = addOns.snackCount * parseInt(settings.snackPrice || 5);
    return Math.max(0, basePrice + coldDrinkPrice + waterPrice + snackPrice);
  };

  const openStartModal = (consoleName) => {
    setSelectedConsole(consoleName);
    setPlayerName('');
    setControllerCount(0);
    setAddOns({ coldDrinkCount: 0, waterCount: 0, snackCount: 0 });
    setDuration(30);
    setShowStartModal(true);
  };

  const openAddOnModal = (consoleName) => {
    setSelectedConsole(consoleName);
    const session = activeSessions.get(consoleName);
    setAddOns(session ? { ...session.addOns } : { coldDrinkCount: 0, waterCount: 0, snackCount: 0 });
    setControllerCount(session ? session.controllerCount : 0);
    setShowAddOnModal(true);
  };

  const startSession = async () => {
    if (!playerName.trim()) {
      showNotification('Player name is required', 'error');
      return;
    }
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please log in to access console management');
        return;
      }

      const currentTime = moment();
      const targetConsole = consoles.find(c => c.name === selectedConsole || c.id === selectedConsole);
      const apiConsoleId = targetConsole ? targetConsole.id : selectedConsole;
      const totalPrice = calculatePrice();

      const sessionData = {
        console: apiConsoleId,
        duration: parseInt(duration),
        addOns,
        startTime: currentTime.format('YYYY-MM-DD HH:mm:ss'),
        totalPrice,
        playerName,
        controllerCount,
      };

      console.log('Starting session with data:', sessionData);

      const [sessionRes] = await Promise.all([
        axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/sessions/start`, sessionData, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/consoles/update`, {
          id: apiConsoleId, status: 'In Use'
        }, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const endTime = currentTime.clone().add(duration, 'minutes').valueOf();

      // Update local state immediately
      setActiveSessions((prev) => {
        const newMap = new Map(prev);
        newMap.set(selectedConsole, {
          sessionId: sessionRes.data.id || sessionRes.data.sessionId,
          playerName,
          startTime: currentTime.format(),
          endTime,
          remainingTime: duration * 60,
          duration: parseInt(duration),
          addOns: { ...addOns },
          totalAmount: totalPrice,
          controllerCount,
          timerId: null,
        });
        return newMap;
      });

      showNotification(`Session started for ${playerName} on ${selectedConsole}`, 'success');
      setShowStartModal(false);
      
      // Fetch updated data
      setTimeout(fetchConsoles, 1000);
    } catch (err) {
      console.error('Error starting session:', err);
      const isUnauthorized = err.response?.status === 403;
      showNotification(
        isUnauthorized ? 'Unauthorized access. Please log in again.' : 
        `Failed to start session: ${err.response?.data?.error || err.message}`,
        'error'
      );
      if (isUnauthorized) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  const endSession = async (consoleName) => {
    if (endingSessionsRef.current.has(consoleName)) {
      return;
    }
    endingSessionsRef.current.add(consoleName);

    try {
      const session = activeSessions.get(consoleName);
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please log in to access console management');
        return;
      }

      playNotificationSound();

      const targetConsole = consoles.find(c => c.name === consoleName);
      const apiConsoleId = targetConsole ? targetConsole.id : consoleName;

      // Try to stop the session
      if (session?.sessionId) {
        try {
          await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/sessions/stop`, {
            sessionId: session.sessionId
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (stopError) {
          console.error('Error stopping session by sessionId, trying by console:', stopError);
          // Try alternative approaches
          await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/sessions/stop`, {
            console: apiConsoleId
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
        }
      }

      // Update console status
      await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/consoles/update`, {
        id: apiConsoleId, status: 'Free'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Update local state
      setActiveSessions((prev) => {
        const newMap = new Map(prev);
        newMap.delete(consoleName);
        return newMap;
      });

      showNotification(`Session ended for ${session?.playerName || 'Unknown'} on ${consoleName}`, 'success');
      setTimeout(fetchConsoles, 1000);
    } catch (err) {
      console.error('Error ending session:', err);
      // Clean up local state even if API fails
      setActiveSessions((prev) => {
        const newMap = new Map(prev);
        newMap.delete(consoleName);
        return newMap;
      });

      const isUnauthorized = err.response?.status === 403;
      showNotification(
        isUnauthorized ? 'Unauthorized access. Please log in again.' : 
        'Session ended locally due to API error',
        'warning'
      );

      if (isUnauthorized) {
        handleLogout();
      }
      setTimeout(fetchConsoles, 1000);
    } finally {
      endingSessionsRef.current.delete(consoleName);
    }
  };

  const extendSession = async (consoleName, extraMinutes) => {
    const session = activeSessions.get(consoleName);
    if (!session) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please log in to access console management');
        return;
      }

      const targetConsole = consoles.find(c => c.name === consoleName || c.id === consoleName);
      const apiConsoleId = targetConsole ? targetConsole.id : consoleName;

      await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/sessions/extend`, {
        console: apiConsoleId,
        extraMinutes: parseInt(extraMinutes)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const newEndTime = moment(session.endTime).add(extraMinutes, 'minutes').valueOf();
      const newRemainingTime = Math.max(0, Math.floor((newEndTime - Date.now()) / 1000));

      setActiveSessions((prev) => {
        const newMap = new Map(prev);
        newMap.set(consoleName, {
          ...session,
          timerId: null,
          endTime: newEndTime,
          remainingTime: newRemainingTime,
          duration: session.duration + parseInt(extraMinutes),
        });
        return newMap;
      });

      showNotification(`Session extended by ${extraMinutes} minutes for ${session.playerName}`, 'success');
      setTimeout(fetchConsoles, 1000);
    } catch (err) {
      console.error('Error extending session:', err);
      const isUnauthorized = err.response?.status === 403;
      showNotification(
        isUnauthorized ? 'Unauthorized access. Please log in again.' : 
        `Failed to extend session: ${err.response?.data?.error || err.message}`,
        'error'
      );
      if (isUnauthorized) {
        handleLogout();
      }
    }
  };

  const updateAddOns = async (consoleName) => {
    const session = activeSessions.get(consoleName);
    if (!session) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please log in to access console management');
        return;
      }

      const targetConsole = consoles.find(c => c.name === consoleName || c.id === consoleName);
      const apiConsoleId = targetConsole ? targetConsole.id : consoleName;

      await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/sessions/add-ons`, {
        console: apiConsoleId,
        addOns,
        controllerCount
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Calculate new total price
      const playerCount = controllerCount + 1;
      const sessionDuration = session.duration;
      const currentTime = new Date();
      const hour = currentTime.getHours();
      const isHappyHour = hour >= 13 && hour < 17;
      const isEvening = hour >= 17 && hour < 24;

      let basePrice;
      if (isHappyHour) {
        if (playerCount === 2) {
          basePrice = sessionDuration === 30 ? 40 : sessionDuration === 60 ? 40 : (sessionDuration / 60) * 40;
        } else {
          basePrice = playerCount * (sessionDuration === 30 ? 20 : sessionDuration === 60 ? 30 : (sessionDuration / 60) * 30);
        }
      } else if (isEvening) {
        if (playerCount === 1) {
          basePrice = sessionDuration === 30 ? 20 : sessionDuration === 60 ? 30 : (sessionDuration / 60) * 30;
        } else if (playerCount === 2) {
          basePrice = sessionDuration === 30 ? 40 : sessionDuration === 60 ? 60 : (sessionDuration / 30) * 40;
        } else {
          basePrice = playerCount * (sessionDuration === 30 ? 20 : sessionDuration === 60 ? 30 : (sessionDuration / 60) * 30);
        }
      } else {
        basePrice = playerCount * (sessionDuration === 30 ? 20 : sessionDuration === 60 ? 30 : (sessionDuration / 60) * 30);
      }

      const coldDrinkPrice = addOns.coldDrinkCount * parseInt(settings.coldDrinkPrice || 15);
      const waterPrice = addOns.waterCount * parseInt(settings.waterPrice || 10);
      const snackPrice = addOns.snackCount * parseInt(settings.snackPrice || 5);
      const newTotalAmount = Math.max(0, basePrice + coldDrinkPrice + waterPrice + snackPrice);

      setActiveSessions((prev) => {
        const newMap = new Map(prev);
        newMap.set(consoleName, {
          ...session,
          addOns: { ...addOns },
          controllerCount,
          totalAmount: newTotalAmount,
        });
        return newMap;
      });

      showNotification(`Add-ons updated for ${session.playerName}`, 'success');
      setShowAddOnModal(false);
      setTimeout(fetchConsoles, 1000);
    } catch (err) {
      console.error('Error updating add-ons:', err);
      const isUnauthorized = err.response?.status === 403;
      showNotification(
        isUnauthorized ? 'Unauthorized access. Please log in again.' : 
        `Failed to update add-ons: ${err.response?.data?.error || err.message}`,
        'error'
      );
      if (isUnauthorized) {
        handleLogout();
      }
    }
  };

  const updateTimers = () => {
    setActiveSessions((prev) => {
      const newMap = new Map();
      let hasChanges = false;

      prev.forEach((session, consoleName) => {
        if (endingSessionsRef.current.has(consoleName)) {
          newMap.set(consoleName, session);
          return;
        }

        const newRemainingTime = Math.max(0, session.remainingTime - 1);

        // Play warning sounds
        if (newRemainingTime === 300 && session.remainingTime > 300) {
          playNotificationSound();
          showNotification(`⚠️ 5 minutes remaining for ${session.playerName} on ${consoleName}!`, 'warning');
        }

        if (newRemainingTime === 60 && session.remainingTime > 60) {
          playNotificationSound();
          showNotification(`⚠️ 1 minute remaining for ${session.playerName} on ${consoleName}!`, 'warning');
        }

        // End session when timer reaches 0
        if (newRemainingTime <= 0 && session.remainingTime > 0) {
          showNotification(`⏰ Time's up for ${session.playerName} on ${consoleName}!`, 'error');
          setTimeout(() => endSession(consoleName), 100);
          hasChanges = true;
          return;
        }

        if (newRemainingTime !== session.remainingTime) {
          hasChanges = true;
        }

        newMap.set(consoleName, {
          ...session,
          remainingTime: newRemainingTime,
        });
      });

      return hasChanges ? newMap : prev;
    });
  };

  const showNotification = (message, type) => {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 20px;
      border-radius: 5px;
      color: white;
      font-weight: bold;
      z-index: 1000;
      animation: slideIn 0.5s ease;
      max-width: 300px;
      word-wrap: break-word;
      ${type === 'error' ? 'background-color: #dc3545;' : ''}
      ${type === 'success' ? 'background-color: #28a745;' : ''}
      ${type === 'warning' ? 'background-color: #ffc107; color: #212529;' : ''}
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOut 0.5s ease forwards';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 500);
    }, 4000);
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('activeSessions');
    window.location.href = '/login';
  };

  const handleAddOnChange = (key, value) => {
    const numValue = Math.max(0, parseInt(value) || 0);
    setAddOns((prev) => ({ ...prev, [key]: numValue }));
  };
  
  return (
    <div className="console-management-container">
      <RealTimeClock onTimeUpdate={(time) => {
        setActiveSessions((prev) => {
          const newMap = new Map(prev);
          prev.forEach((session, consoleName) => {
            newMap.set(consoleName, { ...session, totalAmount: calculatePrice(time) });
          });
          return newMap;
        });
      }} />
      <h1>Console Management</h1>
      {error && (
        <div className="error-banner">
          <span>{error}</span>
          {error.includes('Unauthorized') && (
            <button onClick={handleLogout}>Log In</button>
          )}
          <button onClick={fetchConsoles}>Retry</button>
        </div>
      )}
      <div className="console-grid">
        {consoles.map((console) => (
          <div
            key={console.id}
            className={`console-card ${console.status === 'Free' ? 'free' : 'in-use'}`}
          >
            <div className="console-header-card">
              <h3>{console.name}</h3>
              <div className={`status-indicator ${console.status === 'Free' ? 'free' : 'in-use'}`}>
                <span className="status-dot"></span>
                {console.status}
              </div>
            </div>
            <div className="console-content">
              {console.status === 'Free' ? (
                <div className="free-console">
                  <p>Available</p>
                  <button onClick={() => openStartModal(console.name)} disabled={loading || error?.includes('Unauthorized')}>
                    Start Session
                  </button>
                </div>
              ) : (
                <div className="active-console">
                  <div className="time-display">
                    <div className="time-remaining">
                      <span>Time Remaining:</span>
                      <span className="time-value">
                        {formatTime(activeSessions.get(console.name)?.remainingTime || 0)}
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${((activeSessions.get(console.name)?.remainingTime || 0) /
                            (activeSessions.get(console.name)?.duration * 60 || 1)) * 100
                            }%`,
                        }}
                      ></div>
                    </div>
                  </div>
                  <div className="session-details">
                    <p><strong>Player:</strong> {activeSessions.get(console.name)?.playerName || 'Unknown'}</p>
                    <p>
                      <strong>Started:</strong>{' '}
                      {activeSessions.get(console.name)?.startTime ? 
                        moment(activeSessions.get(console.name).startTime).format('HH:mm:ss') : 
                        'N/A'}
                    </p>
                    <p>
                      <strong>Controllers:</strong> {activeSessions.get(console.name)?.controllerCount || 0}
                    </p>
                    <p>
                      <strong>Add-ons:</strong>{' '}
                      {[
                        activeSessions.get(console.name)?.addOns.coldDrinkCount > 0
                          ? `${activeSessions.get(console.name)?.addOns.coldDrinkCount} Cold Drinks`
                          : '',
                        activeSessions.get(console.name)?.addOns.waterCount > 0
                          ? `${activeSessions.get(console.name)?.addOns.waterCount} Water`
                          : '',
                        activeSessions.get(console.name)?.addOns.snackCount > 0
                          ? `${activeSessions.get(console.name)?.addOns.snackCount} Snacks`
                          : '',
                      ]
                        .filter(Boolean)
                        .join(', ') || 'None'}
                    </p>
                    <p>
                      <strong>Total:</strong> ₹{Number(activeSessions.get(console.name)?.totalAmount || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="session-controls">
                    <select
                      className="extend-select"
                      onChange={(e) => {
                        if (e.target.value) extendSession(console.name, parseInt(e.target.value));
                        e.target.value = '';
                      }}
                      disabled={error?.includes('Unauthorized')}
                    >
                      <option value="">Extend Session</option>
                      <option value="15">15 minutes</option>
                      <option value="30">30 minutes</option>
                      <option value="60">1 hour</option>
                    </select>
                    <button
                      className="add-on-btn"
                      onClick={() => openAddOnModal(console.name)}
                      disabled={error?.includes('Unauthorized')}
                    >
                      Add Items
                    </button>
                    <button
                      className="stop-btn"
                      onClick={() => endSession(console.name)}
                      disabled={error?.includes('Unauthorized')}
                    >
                      Stop Session
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {showStartModal && (
        <div className="modal">
          <div className="modal-content">
            <h2>Start Session on {selectedConsole}</h2>
            <div className="modal-form">
              <label>Player Name</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter player name"
              />
              <label>Controller Count</label>
              <input
                type="number"
                min="0"
                value={controllerCount}
                onChange={(e) => setControllerCount(Math.max(0, parseInt(e.target.value) || 0))}
                placeholder="0"
              />
              <label>Duration</label>
              <select value={duration} onChange={(e) => setDuration(e.target.value)}>
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">1 hour</option>
                <option value="90">1.5 hours</option>
                <option value="120">2 hours</option>
              </select>
              <label>Add-ons</label>
              <div className="addon-input">
                <span>Cold Drinks (₹{settings.coldDrinkPrice || 15} per bottle)</span>
                <input
                  type="number"
                  min="0"
                  value={addOns.coldDrinkCount}
                  onChange={(e) => handleAddOnChange('coldDrinkCount', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="addon-input">
                <span>Water (₹{settings.waterPrice || 10} each)</span>
                <input
                  type="number"
                  min="0"
                  value={addOns.waterCount}
                  onChange={(e) => handleAddOnChange('waterCount', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="addon-input">
                <span>Snacks (₹{settings.snackPrice || 5} each)</span>
                <input
                  type="number"
                  min="0"
                  value={addOns.snackCount}
                  onChange={(e) => handleAddOnChange('snackCount', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="total-price">Total: ₹{calculatePrice().toFixed(2)}</div>
            </div>
            <div className="modal-buttons">
              <button onClick={startSession} disabled={loading || error?.includes('Unauthorized')}>
                Start
              </button>
              <button onClick={() => setShowStartModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showAddOnModal && (
        <div className="modal">
          <div className="modal-content">
            <h2>Add Items to {selectedConsole}</h2>
            <div className="modal-form">
              <label>Controller Count</label>
              <input
                type="number"
                min="0"
                value={controllerCount}
                onChange={(e) => setControllerCount(Math.max(0, parseInt(e.target.value) || 0))}
                placeholder="0"
              />
              <label>Add-ons</label>
              <div className="addon-input">
                <span>Cold Drinks (₹{settings.coldDrinkPrice || 15} per bottle)</span>
                <input
                  type="number"
                  min="0"
                  value={addOns.coldDrinkCount}
                  onChange={(e) => handleAddOnChange('coldDrinkCount', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="addon-input">
                <span>Water (₹{settings.waterPrice || 10} each)</span>
                <input
                  type="number"
                  min="0"
                  value={addOns.waterCount}
                  onChange={(e) => handleAddOnChange('waterCount', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="addon-input">
                <span>Snacks (₹{settings.snackPrice || 5} each)</span>
                <input
                  type="number"
                  min="0"
                  value={addOns.snackCount}
                  onChange={(e) => handleAddOnChange('snackCount', e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="modal-buttons">
              <button onClick={() => updateAddOns(selectedConsole)} disabled={loading || error?.includes('Unauthorized')}>
                Update
              </button>
              <button onClick={() => setShowAddOnModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ConsoleManagement;
