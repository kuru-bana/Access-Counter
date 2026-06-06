const express = require('express');
const fs = require('fs');
const path = require('path');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 5000;
const DATA_FILE = path.join(__dirname, 'counter.json');

function loadCounter() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ count: 0 }));
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveCounter(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data));
}

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/count', (req, res) => {
  const data = loadCounter();
  data.count += 1;
  saveCounter(data);
  res.json({ count: data.count });
});

app.get('/api/count/current', (req, res) => {
  const data = loadCounter();
  res.json({ count: data.count });
});

app.get('/ping', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);

  setInterval(() => {
    http.get(`http://localhost:${PORT}/ping`, (res) => {
      console.log(`[self-ping] status=${res.statusCode} at ${new Date().toISOString()}`);
    }).on('error', (err) => {
      console.error(`[self-ping] error: ${err.message}`);
    });
  }, 5 * 60 * 1000);
});
