'use strict';
const { app, BrowserWindow, session, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

app.commandLine.appendSwitch('enable-speech-api');
app.commandLine.appendSwitch('enable-media-stream');

let mainWindow = null;
let tray = null;
let serverStarted = false;
let isQuitting = false;

const LOADING_HTML = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Smart POS</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    background:#0f172a;
    color:#f1f5f9;
    font-family:'Segoe UI',Tahoma,Arial,sans-serif;
    display:flex;
    flex-direction:column;
    align-items:center;
    justify-content:center;
    height:100vh;
    gap:20px;
    user-select:none;
    -webkit-app-region:drag;
  }
  .icon {
    font-size:64px;
    filter:drop-shadow(0 0 24px #6366f1aa);
    animation:pulse 2s ease-in-out infinite;
  }
  .title {
    font-size:26px;
    font-weight:700;
    color:#e2e8f0;
    letter-spacing:0.5px;
  }
  .subtitle {
    font-size:13px;
    color:#64748b;
  }
  .bar-wrap {
    width:220px;
    height:4px;
    background:#1e293b;
    border-radius:4px;
    overflow:hidden;
    margin-top:8px;
  }
  .bar {
    height:100%;
    width:40%;
    background:linear-gradient(90deg,#6366f1,#818cf8);
    border-radius:4px;
    animation:slide 1.4s ease-in-out infinite;
  }
  .dots {
    display:flex;
    gap:8px;
    margin-top:4px;
  }
  .dot {
    width:7px;
    height:7px;
    background:#6366f1;
    border-radius:50%;
    animation:bounce 1.2s ease-in-out infinite;
  }
  .dot:nth-child(2){animation-delay:.2s}
  .dot:nth-child(3){animation-delay:.4s}
  @keyframes pulse{
    0%,100%{transform:scale(1);opacity:.9}
    50%{transform:scale(1.08);opacity:1}
  }
  @keyframes slide{
    0%{transform:translateX(-100%)}
    50%{transform:translateX(200%)}
    100%{transform:translateX(200%)}
  }
  @keyframes bounce{
    0%,80%,100%{transform:scale(.6);opacity:.4}
    40%{transform:scale(1);opacity:1}
  }
</style>
</head>
<body>
  <div class="icon">\uD83C\uDFEA</div>
  <div class="title">\u0646\u0642\u0637\u0629 \u0627\u0644\u0628\u064A\u0639 \u0627\u0644\u0630\u0643\u064A\u0629</div>
  <div class="subtitle">\u062C\u0627\u0631\u064A \u062A\u062D\u0636\u064A\u0631 \u0627\u0644\u0646\u0638\u0627\u0645\u2026</div>
  <div class="bar-wrap"><div class="bar"></div></div>
  <div class="dots">
    <div class="dot"></div>
    <div class="dot"></div>
    <div class="dot"></div>
  </div>
</body>
</html>`;

function checkServerRunning() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:3001/api/health', (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1500, () => { req.destroy(); resolve(false); });
  });
}

function startServer() {
  if (serverStarted) return;
  serverStarted = true;
  process.env.DATA_DIR = path.join(app.getPath('userData'), 'data');

  const envPath = path.join(__dirname, '..', '.env');
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.substring(0, eqIdx).trim();
        const val = trimmed.substring(eqIdx + 1).trim();
        if (!process.env[key]) process.env[key] = val;
      }
    }
  } catch {}

  const serverFile = path.join(__dirname, '..', 'server-build', 'index.js');
  try {
    require(serverFile);
  } catch (err) {
    console.error('[Server] failed:', err.message);
  }
}

function waitForServer(onReady, retries) {
  retries = retries || 0;
  const MAX = 80;
  http.get('http://localhost:3001/api/health', function(res) {
    if (res.statusCode === 200) {
      onReady();
    } else {
      if (retries < MAX) setTimeout(function() { waitForServer(onReady, retries + 1); }, 100);
      else onReady();
    }
  }).on('error', function() {
    if (retries < MAX) setTimeout(function() { waitForServer(onReady, retries + 1); }, 100);
    else onReady();
  });
}

function loadApp(win) {
  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

function createTray() {
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip('Smart POS');
  const contextMenu = Menu.buildFromTemplate([
    { label: '\u0641\u062A\u062D \u0646\u0642\u0637\u0629 \u0627\u0644\u0628\u064A\u0639', click: function() { createOrShowWindow(); } },
    { type: 'separator' },
    { label: '\u0625\u0646\u0647\u0627\u0621', click: function() { isQuitting = true; app.quit(); } },
  ]);
  tray.setContextMenu(contextMenu);
}

function createOrShowWindow() {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    title: '\u0646\u0642\u0637\u0629 \u0627\u0644\u0628\u064A\u0639 \u0627\u0644\u0630\u0643\u064A\u0629',
    show: false,
    backgroundColor: '#0f172a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
  });

  session.defaultSession.setPermissionRequestHandler(function(webContents, permission, callback) {
    callback(true);
  });

  mainWindow.once('ready-to-show', function() { if (mainWindow) mainWindow.show(); });
  mainWindow.on('closed', function() { mainWindow = null; });

  if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
    return;
  }

  checkServerRunning().then(function(running) {
    if (running) {
      if (mainWindow) loadApp(mainWindow);
    } else {
      startServer();
      if (mainWindow) {
        mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(LOADING_HTML));
      }
      waitForServer(function() {
        if (mainWindow) loadApp(mainWindow);
      });
    }
  });
}

app.whenReady().then(function() {
  if (app.isPackaged) {
    app.requestSingleInstanceLock();
    createTray();
    createOrShowWindow();
  } else {
    createOrShowWindow();
  }

  app.on('activate', function() {
    createOrShowWindow();
  });
});

app.on('second-instance', function() {
  createOrShowWindow();
});

app.on('before-quit', function() {
  isQuitting = true;
});

app.on('window-all-closed', function() {
  if (isQuitting) {
    app.quit();
  }
});
