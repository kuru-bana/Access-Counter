const express = require('express');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 5000;
const DATA_FILE = path.join(__dirname, 'counter.json');

const GITHUB_OWNER = 'kuru-bana';
const GITHUB_REPO = 'Access-Counter';
const GITHUB_FILE = 'Choco-tube-plus.json';

function today() {
  return new Date().toISOString().slice(0, 10);
}

function loadCounter() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ count: 0, daily: {} }));
  }
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  if (!data.daily) data.daily = {};
  return data;
}

function saveCounter(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function githubRequest(method, urlPath, body, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: urlPath,
      method,
      headers: {
        'Authorization': `token ${token}`,
        'User-Agent': 'access-counter-backup',
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
    };
    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch (e) { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function backupToGitHub() {
  const token = process.env.GITHUB_PAT;
  if (!token) {
    console.log('[backup] GITHUB_PAT が未設定のためスキップします');
    return;
  }

  const data = loadCounter();
  const date = today();
  const todayCount = data.daily[date] || 0;

  const payload = {
    total: data.count,
    last_updated: date,
    today: todayCount,
    history: data.daily,
  };

  const apiPath = `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_FILE}`;

  try {
    const getRes = await githubRequest('GET', apiPath, null, token);
    const sha = getRes.status === 200 ? getRes.body.sha : undefined;

    const content = Buffer.from(JSON.stringify(payload, null, 2)).toString('base64');
    const putBody = {
      message: `[backup] ${date} — total: ${data.count}, today: ${todayCount}`,
      content,
      ...(sha ? { sha } : {}),
    };

    const putRes = await githubRequest('PUT', apiPath, putBody, token);
    if (putRes.status === 200 || putRes.status === 201) {
      console.log(`[backup] GitHub へのバックアップ成功 (${date})`);
    } else {
      console.error(`[backup] 失敗: ${putRes.status}`, putRes.body);
    }
  } catch (err) {
    console.error('[backup] エラー:', err.message);
  }
}

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/count', (req, res) => {
  const data = loadCounter();
  data.count += 1;
  const date = today();
  data.daily[date] = (data.daily[date] || 0) + 1;
  saveCounter(data);
  res.json({ count: data.count });
});

app.get('/api/count/current', (req, res) => {
  const data = loadCounter();
  res.json({ count: data.count, today: data.daily[today()] || 0 });
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

  cron.schedule('0 0 * * *', () => {
    console.log('[cron] 日次バックアップ開始');
    backupToGitHub();
  }, { timezone: 'Asia/Tokyo' });

  console.log('[cron] 毎日 0:00 (JST) に GitHub バックアップを実行します');
});
