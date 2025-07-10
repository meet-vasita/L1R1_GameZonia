const express = require('express');
const fs = require('fs');
const csv = require('csv-parser');
const { format } = require('fast-csv');
const moment = require('moment');
const router = express.Router();

const SESSIONS_FILE = './data/sessions.csv';
const SETTINGS_FILE = './data/settings.csv';
const ACTIVE_ADMINS_FILE = './data/active_admins.csv'; // New file to track active admins

const getSettings = async () => {
  const settings = {};
  return new Promise((resolve, reject) => {
    fs.createReadStream(SETTINGS_FILE)
      .pipe(csv())
      .on('data', (row) => {
        settings[row.key] = row.value; // Keep as string initially
      })
      .on('end', () => {
        // Convert relevant values to numbers with debug
        settings.coldDrinkPrice = parseInt(settings.coldDrinkPrice) || 0;
        settings.waterPrice = parseInt(settings.waterPrice) || 0;
        settings.snackPrice = parseInt(settings.snackPrice) || 0;
        global.console.log('Settings loaded:', settings);
        resolve(settings);
      })
      .on('error', (err) => reject(err));
  });
};

// Helper function to read active admins
const readActiveAdmins = () => {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(ACTIVE_ADMINS_FILE)) {
      fs.writeFileSync(ACTIVE_ADMINS_FILE, '');
      resolve([]);
    }
    const admins = [];
    fs.createReadStream(ACTIVE_ADMINS_FILE)
      .pipe(csv())
      .on('data', (row) => admins.push(row.userId))
      .on('end', () => resolve(admins))
      .on('error', (err) => reject(err));
  });
};

// Helper function to write active admins
const writeActiveAdmins = (admins) => {
  return new Promise((resolve, reject) => {
    const ws = fs.createWriteStream(ACTIVE_ADMINS_FILE);
    const csvStream = format({ headers: ['userId'] });
    csvStream.pipe(ws);
    admins.forEach((userId) => csvStream.write({ userId }));
    csvStream.end();
    ws.on('finish', () => resolve());
    ws.on('error', (err) => reject(err));
  });
};

// Helper function to find active session for a console
const findActiveSession = (sessions, consoleName) => {
  return sessions.find((session) => {
    if (session.console !== consoleName) return false;
    const now = moment();
    const endTime = moment(session.endTime);
    return endTime.isAfter(now);
  });
};

// Helper function to write sessions to CSV
const writeSessionsToCSV = (sessions) => {
  return new Promise((resolve, reject) => {
    const ws = fs.createWriteStream(SESSIONS_FILE);
    const csvStream = format({ headers: true });
    csvStream.pipe(ws);
    sessions.forEach((session) => csvStream.write(session));
    csvStream.end();
    ws.on('finish', () => resolve());
    ws.on('error', (err) => reject(err));
  });
};

// Helper function to read all sessions
const readAllSessions = () => {
  return new Promise((resolve, reject) => {
    const sessions = [];
    fs.createReadStream(SESSIONS_FILE)
      .pipe(csv())
      .on('data', (row) => sessions.push(row))
      .on('end', () => resolve(sessions))
      .on('error', (err) => reject(err));
  });
};

router.post('/start', async (req, res) => {
  // Inside router.post('/start', async (req, res) => { ... })
  try {
    const { console: consoleName, duration, addOns, totalPrice, playerName, controllerCount = 0 } = req.body;
    global.console.log('Received start request:', { consoleName, duration, addOns, totalPrice, playerName, controllerCount });
    if (!consoleName || !duration || !playerName) {
      return res.status(400).json({ error: 'Console name, duration, and player name are required' });
    }

    const settings = await getSettings();
    const sessions = await readAllSessions();

    const existingActive = findActiveSession(sessions, consoleName);
    if (existingActive) {
      return res.status(400).json({ error: 'Console already has an active session' });
    }

    const currentTime = moment();
    const hour = currentTime.hour();
    const isHappyHour = hour >= 13 && hour < 17;
    const isEvening = hour >= 17 && hour < 24;
    const playerCount = parseInt(controllerCount) + 1;
    global.console.log('Calculated playerCount:', playerCount);
    let baseCost;
    if (isHappyHour) {
      if (playerCount === 2) {
        baseCost = duration === 30 ? 40 : 60; // Special rate for 2 players
      } else {
        baseCost = playerCount * (duration === 30 ? 20 : duration === 60 ? 30 : (duration / 60) * 30);
      }
    } else if (isEvening) {
      if (playerCount === 1) {
        baseCost = duration === 30 ? 20 : 60;
      } else if (playerCount === 2) {
        baseCost = duration === 30 ? 40 : 60;
      } else {
        baseCost = playerCount * (duration === 30 ? 20 : duration === 60 ? 30 : (duration / 60) * 30);
      }
    } else {
      baseCost = playerCount * (duration === 30 ? 20 : duration === 60 ? 30 : (duration / 60) * 30);
    }
    global.console.log('Base Cost Calculation - Hour:', hour, 'PlayerCount:', playerCount, 'Duration:', duration, 'BaseCost:', baseCost);

    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      const decoded = JSON.parse(atob(token.split('.')[1]));
      if (decoded.isAdmin) {
        const activeAdmins = await readActiveAdmins();
        if (activeAdmins.length >= 2) {
          return res.status(403).json({ error: 'Maximum limit of 2 admins reached' });
        }
        await writeActiveAdmins([...activeAdmins, decoded.userId]);
      }
    }

    const newTotalAmount =
      baseCost +
      (addOns.coldDrinkCount || 0) * settings.coldDrinkPrice +
      (addOns.waterCount || 0) * settings.waterPrice +
      (addOns.snackCount || 0) * settings.snackPrice;
    global.console.log('Total Amount Calculation - BaseCost:', baseCost, 'AddOns:', addOns, 'Settings:', settings, 'NewTotalAmount:', newTotalAmount);

    const session = {
      id: Date.now().toString(),
      console: consoleName,
      playerName: playerName || 'Unknown',
      startTime: currentTime.format('YYYY-MM-DD HH:mm:ss'),
      endTime: currentTime.add(duration, 'minutes').format('YYYY-MM-DD HH:mm:ss'),
      duration: parseInt(duration),
      baseCost: baseCost.toFixed(2),
      addOns: JSON.stringify(addOns || {}),
      totalAmount: newTotalAmount.toFixed(2),
      controllerCount: parseInt(controllerCount),
    };

    sessions.push(session);
    await writeSessionsToCSV(sessions);

    global.console.log('Session started:', session.id, 'Total Amount:', newTotalAmount, 'Settings:', settings);
    res.json(session);
  } catch (error) {
    global.console.error('Start session error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/extend', async (req, res) => {
  try {
    const { console: consoleName, extraMinutes } = req.body;
    if (!consoleName || !extraMinutes) {
      return res.status(400).json({ error: 'Console name and extra minutes are required' });
    }

    const settings = await getSettings();
    const sessions = await readAllSessions();

    const activeSession = findActiveSession(sessions, consoleName);
    if (!activeSession) {
      return res.status(404).json({ error: 'No active session found for this console' });
    }

    const sessionIndex = sessions.findIndex((s) => s.id === activeSession.id);
    if (sessionIndex === -1) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const currentTime = moment();
    const hour = currentTime.hour();
    const isHappyHour = hour >= 13 && hour < 17;
    const isEvening = hour >= 17 && hour < 24;
    const playerCount = parseInt(activeSession.controllerCount) + 1;
    const updatedDuration = parseInt(activeSession.duration) + parseInt(extraMinutes);
    let newBaseCost;
    if (isHappyHour) {
      if (playerCount === 2) {
        newBaseCost = 40; // Flat ₹40 for 2 players
      } else {
        newBaseCost = (updatedDuration === 30 ? 20 : updatedDuration === 60 ? 30 : (updatedDuration / 60) * 30);
      }
    } else if (isEvening) {
      if (playerCount === 1) {
        newBaseCost = (updatedDuration === 30 ? 20 : updatedDuration === 60 ? 30 : (updatedDuration / 60) * 30);
      } else if (playerCount === 2) {
        newBaseCost = (updatedDuration === 30 ? 40 : updatedDuration === 60 ? 60 : (updatedDuration / 30) * 40);
      } else {
        newBaseCost = playerCount * (updatedDuration === 30 ? 20 : updatedDuration === 60 ? 30 : (updatedDuration / 60) * 30);
      }
    } else {
      newBaseCost = playerCount * (updatedDuration === 30 ? 20 : updatedDuration === 60 ? 30 : (updatedDuration / 60) * 30);
    }
    global.console.log('Extend Base Cost Calculation - Hour:', hour, 'PlayerCount:', playerCount, 'UpdatedDuration:', updatedDuration, 'NewBaseCost:', newBaseCost);

    const addOns = JSON.parse(activeSession.addOns || '{}');

    const newTotalAmount =
      newBaseCost +
      (addOns.coldDrinkCount || 0) * settings.coldDrinkPrice +
      (addOns.waterCount || 0) * settings.waterPrice +
      (addOns.snackCount || 0) * settings.snackPrice;
    global.console.log('Extend Total Amount Calculation - NewBaseCost:', newBaseCost, 'AddOns:', addOns, 'Settings:', settings, 'NewTotalAmount:', newTotalAmount);

    sessions[sessionIndex] = {
      ...activeSession,
      duration: updatedDuration,
      endTime: moment(activeSession.startTime).add(updatedDuration, 'minutes').format('YYYY-MM-DD HH:mm:ss'),
      baseCost: newBaseCost.toFixed(2),
      totalAmount: newTotalAmount.toFixed(2),
    };

    await writeSessionsToCSV(sessions);

    global.console.log('Session extended:', activeSession.id);
    res.json({ message: 'Session extended', session: sessions[sessionIndex] });
  } catch (error) {
    global.console.error('Extend session error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/stop', async (req, res) => {
  try {
    const { console: consoleName } = req.body;
    if (!consoleName) {
      return res.status(400).json({ error: 'Console name is required' });
    }

    const settings = await getSettings();
    const sessions = await readAllSessions();

    const activeSession = findActiveSession(sessions, consoleName);
    if (!activeSession) {
      return res.status(404).json({ error: 'No active session found for this console' });
    }

    const sessionIndex = sessions.findIndex((s) => s.id === activeSession.id);
    if (sessionIndex === -1) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const now = moment();
    const startTime = moment(activeSession.startTime);
    const actualDuration = now.diff(startTime, 'minutes');
    const playerCount = parseInt(activeSession.controllerCount) + 1;
    let finalBaseCost;
    const hour = now.hour();
    const isHappyHour = hour >= 13 && hour < 17;
    const isEvening = hour >= 17 && hour < 24;
    if (isHappyHour) {
      if (playerCount === 2) {
        finalBaseCost = 40;
      } else {
        finalBaseCost = (actualDuration === 30 ? 20 : actualDuration === 60 ? 30 : (actualDuration / 60) * 30);
      }
    } else if (isEvening) {
      if (playerCount === 1) {
        finalBaseCost = (actualDuration === 30 ? 20 : actualDuration === 60 ? 30 : (actualDuration / 60) * 30);
      } else if (playerCount === 2) {
        finalBaseCost = (actualDuration === 30 ? 40 : actualDuration === 60 ? 60 : (actualDuration / 30) * 40);
      } else {
        finalBaseCost = playerCount * (actualDuration === 30 ? 20 : actualDuration === 60 ? 30 : (actualDuration / 60) * 30);
      }
    } else {
      finalBaseCost = playerCount * (actualDuration === 30 ? 20 : actualDuration === 60 ? 30 : (actualDuration / 60) * 30);
    }
    global.console.log('Stop Base Cost Calculation - Hour:', hour, 'PlayerCount:', playerCount, 'ActualDuration:', actualDuration, 'FinalBaseCost:', finalBaseCost);

    const addOns = JSON.parse(activeSession.addOns || '{}');

    const finalTotalAmount =
      finalBaseCost +
      (addOns.coldDrinkCount || 0) * settings.coldDrinkPrice +
      (addOns.waterCount || 0) * settings.waterPrice +
      (addOns.snackCount || 0) * settings.snackPrice;
    global.console.log('Stop Total Amount Calculation - FinalBaseCost:', finalBaseCost, 'AddOns:', addOns, 'Settings:', settings, 'FinalTotalAmount:', finalTotalAmount);

    sessions[sessionIndex] = {
      ...activeSession,
      endTime: now.format('YYYY-MM-DD HH:mm:ss'),
      duration: actualDuration,
      baseCost: finalBaseCost.toFixed(2),
      totalAmount: finalTotalAmount.toFixed(2),
    };

    await writeSessionsToCSV(sessions);

    global.console.log('Session stopped:', activeSession.id);
    res.json({ message: 'Session stopped', session: sessions[sessionIndex] });
  } catch (error) {
    global.console.error('Stop session error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/add-ons', async (req, res) => {
  try {
    const { console: consoleName, addOns, controllerCount } = req.body;
    if (!consoleName || !addOns) {
      return res.status(400).json({ error: 'Console name and add-ons are required' });
    }

    const settings = await getSettings();
    const sessions = await readAllSessions();

    const activeSession = findActiveSession(sessions, consoleName);
    if (!activeSession) {
      return res.status(404).json({ error: 'No active session found for this console' });
    }

    const sessionIndex = sessions.findIndex((s) => s.id === activeSession.id);
    if (sessionIndex === -1) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const sanitizedAddOns = {
      coldDrinkCount: parseInt(addOns.coldDrinkCount) || 0,
      waterCount: parseInt(addOns.waterCount) || 0,
      snackCount: parseInt(addOns.snackCount) || 0,
    };

    const currentTime = moment();
    const hour = currentTime.hour();
    const isHappyHour = hour >= 13 && hour < 17;
    const isEvening = hour >= 17 && hour < 24;
    const playerCount = controllerCount !== undefined ? controllerCount + 1 : parseInt(activeSession.controllerCount) + 1;
    let baseCost = parseFloat(activeSession.baseCost); // Use existing baseCost unless controllerCount changes
    // Fixed section in the /add-ons endpoint
    if (controllerCount !== undefined) { // Recalculate only if controller count changes
      const duration = parseInt(activeSession.duration);
      global.console.log('Add-ons Debug - Duration:', activeSession.duration, 'Parsed Duration:', duration);
      if (isHappyHour) {
        if (playerCount === 2) {
          baseCost = 40;
        } else {
          baseCost = (duration === 30 ? 20 : duration === 60 ? 30 : (duration / 60) * 30);
        }
      } else if (isEvening) {
        if (playerCount === 1) {
          baseCost = (duration === 30 ? 20 : duration === 60 ? 30 : (duration / 60) * 30);
        } else if (playerCount === 2) {
          baseCost = (duration === 30 ? 40 : duration === 60 ? 60 : (duration / 30) * 40);
        } else {
          baseCost = playerCount * (duration === 30 ? 20 : duration === 60 ? 30 : (duration / 60) * 30);
        }
      } else {
        baseCost = playerCount * (duration === 30 ? 20 : duration === 60 ? 30 : (duration / 60) * 30);
      }
    }
    global.console.log('Add-ons Base Cost Calculation - Hour:', hour, 'PlayerCount:', playerCount, 'Duration:', activeSession.duration, 'ControllerChange:', controllerCount !== undefined, 'BaseCost:', baseCost);

    const newTotalAmount =
      baseCost +
      sanitizedAddOns.coldDrinkCount * settings.coldDrinkPrice +
      sanitizedAddOns.waterCount * settings.waterPrice +
      sanitizedAddOns.snackCount * settings.snackPrice;
    global.console.log('Add-ons Total Amount Calculation - BaseCost:', baseCost, 'SanitizedAddOns:', sanitizedAddOns, 'Settings:', settings, 'NewTotalAmount:', newTotalAmount);

    sessions[sessionIndex] = {
      ...activeSession,
      addOns: JSON.stringify(sanitizedAddOns),
      totalAmount: newTotalAmount.toFixed(2),
      controllerCount: controllerCount !== undefined ? controllerCount : activeSession.controllerCount,
    };

    await writeSessionsToCSV(sessions);

    global.console.log('Add-ons updated for session:', activeSession.id, 'AddOns:', sanitizedAddOns);
    res.json({
      message: 'Add-ons updated',
      session: sessions[sessionIndex],
      addOns: sanitizedAddOns,
    });
  } catch (error) {
    global.console.error('Add-ons update error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const sessions = await readAllSessions();

    const filteredSessions = sessions.filter((row) => row.id !== id);

    if (sessions.length === filteredSessions.length) {
      return res.status(404).json({ error: 'Session not found' });
    }

    await writeSessionsToCSV(filteredSessions);

    global.console.log('Session deleted:', id);
    res.json({ message: 'Session deleted' });
  } catch (error) {
    global.console.error('Delete session error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/history', async (req, res) => {
  try {
    const { date, month, console: consoleName } = req.query;
    const sessions = await readAllSessions();

    const filteredSessions = sessions.filter((row) => {
      if (date && !row.startTime.startsWith(date)) return false;
      if (month && !row.startTime.startsWith(month)) return false;
      if (consoleName && row.console !== consoleName) return false;
      return true;
    });

    res.json(filteredSessions);
  } catch (error) {
    global.console.error('History fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/daily', async (req, res) => {
  try {
    const { date } = req.query;
    const sessions = await readAllSessions();

    let totalEarnings = 0,
      totalSessions = 0,
      coldDrinks = 0,
      water = 0,
      snacks = 0,
      totalPlaytime = 0;

    const dailySessions = sessions.filter((row) => {
      if (row.startTime.startsWith(date)) {
        totalEarnings += parseFloat(row.totalAmount || 0);
        totalSessions++;

        try {
          const addOns = JSON.parse(row.addOns || '{}');
          coldDrinks += addOns.coldDrinkCount || 0;
          water += addOns.waterCount || 0;
          snacks += addOns.snackCount || 0;
        } catch (e) {
          global.console.error('Error parsing addOns:', e);
        }

        totalPlaytime += parseInt(row.duration || 0);
        return true;
      }
      return false;
    });

    res.json({
      totalEarnings: totalEarnings.toFixed(2),
      totalSessions,
      coldDrinks,
      water,
      snacks,
      totalPlaytime,
      sessions: dailySessions,
    });
  } catch (error) {
    global.console.error('Daily report error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/monthly', async (req, res) => {
  try {
    const { month } = req.query;
    const sessions = await readAllSessions();

    let totalEarnings = 0,
      totalSessions = 0,
      coldDrinks = 0,
      water = 0,
      snacks = 0;

    const monthlySessions = sessions.filter((row) => {
      if (row.startTime.startsWith(month)) {
        totalEarnings += parseFloat(row.totalAmount || 0);
        totalSessions++;

        try {
          const addOns = JSON.parse(row.addOns || '{}');
          coldDrinks += addOns.coldDrinkCount || 0;
          water += addOns.waterCount || 0;
          snacks += addOns.snackCount || 0;
        } catch (e) {
          global.console.error('Error parsing addOns:', e);
        }

        return true;
      }
      return false;
    });

    res.json({
      totalEarnings: totalEarnings.toFixed(2),
      totalSessions,
      coldDrinks,
      water,
      snacks,
      sessions: monthlySessions,
    });
  } catch (error) {
    global.console.error('Monthly report error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/active', async (req, res) => {
  try {
    global.console.log('Fetching active sessions at:', moment().format('HH:mm:ss'));
    const sessions = await readAllSessions();
    const now = moment();

    const activeSessions = sessions
      .filter((row) => {
        const endTime = moment(row.endTime);
        return endTime.isAfter(now);
      })
      .map((row) => ({
        id: row.console,
        sessionId: row.id,
        playerName: row.playerName,
        startTime: row.startTime,
        duration: parseInt(row.duration),
        remainingTime: Math.max(0, moment(row.endTime).diff(now, 'seconds')),
        addOns: JSON.parse(row.addOns || '{}'),
        totalAmount: row.totalAmount,
        controllerCount: parseInt(row.controllerCount) || 0,
      }));

    global.console.log('Active sessions found:', activeSessions.length);
    res.json(activeSessions);
  } catch (error) {
    global.console.error('Active sessions fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;