const express = require('express');
const fs = require('fs');
const csv = require('csv-parser');
const { format } = require('fast-csv');
const router = express.Router();
const CONSOLES_FILE = './data/consoles.csv';

router.get('/', (req, res) => {
  const consoles = [];
  fs.createReadStream(CONSOLES_FILE)
    .pipe(csv())
    .on('data', (row) => {
      if (row.name.includes('PS2')) consoles.push(row);
    })
    .on('end', () => {
      res.json(consoles);
    })
    .on('error', (err) => {
      res.status(500).json({ error: err.message });
    });
});

router.post('/update', (req, res) => {
  const { id, status } = req.body;
  
  if (!id || !status) {
    return res.status(400).json({ error: 'ID and status are required' });
  }

  const consoles = [];
  let found = false;
  
  fs.createReadStream(CONSOLES_FILE)
    .pipe(csv())
    .on('data', (row) => {
      if (row.id === id || row.name === id) {
        row.status = status;
        found = true;
      }
      consoles.push(row);
    })
    .on('end', () => {
      if (!found) {
        return res.status(404).json({ error: `Console with ID or name ${id} not found` });
      }
      
      const ws = fs.createWriteStream(CONSOLES_FILE);
      const csvStream = format({ headers: true });
      csvStream.pipe(ws);
      consoles.forEach((console) => csvStream.write(console));
      csvStream.end();
      
      ws.on('finish', () => {
        res.json({ message: 'Console updated successfully' });
      });
      
      ws.on('error', (err) => {
        res.status(500).json({ error: err.message });
      });
    })
    .on('error', (err) => {
      res.status(500).json({ error: err.message });
    });
});

module.exports = router;
