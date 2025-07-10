const express = require('express');
const fs = require('fs');
const csv = require('csv-parser');
const { format } = require('fast-csv');
const router = express.Router();

const SETTINGS_FILE = './data/settings.csv';

router.get('/', (req, res) => {
  const settings = {};
  fs.createReadStream(SETTINGS_FILE)
    .pipe(csv())
    .on('data', (row) => {
      settings[row.key] = row.value;
    })
    .on('end', () => res.json(settings))
    .on('error', (err) => res.status(500).json({ error: err.message }));
});

router.post('/update', (req, res) => {
  const newSettings = req.body;
  const settingsArray = Object.entries(newSettings).map(([key, value]) => ({ key, value }));
  
  const ws = fs.createWriteStream(SETTINGS_FILE);
  const csvStream = format({ headers: true });
  
  csvStream.pipe(ws);
  settingsArray.forEach(setting => csvStream.write(setting));
  csvStream.end();
  
  ws.on('finish', () => res.json({ message: 'Settings updated' }));
  ws.on('error', (err) => res.status(500).json({ error: err.message }));
});

module.exports = router;