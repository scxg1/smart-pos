'use strict';
const { app, BrowserWindow, session, Tray, Menu, nativeImage, shell } = require('electron');
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
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#0f172a;color:#f1f5f9;font-family:'Segoe UI',Tahoma,Arial,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;gap:24px;user-select:none;-webkit-app-region:drag}
  .logo{width:80px;height:80px;border-radius:20px;background:linear-gradient(135deg,#4f46e5,#7c3aed);display:flex;align-items:center;justify-content:center;box-shadow:0 0 50px rgba(99,102,241,0.4);animation:pulse 2s ease-in-out infinite}
  .logo svg{width:40px;height:40px;fill:none;stroke:#fff;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round}
  .title{font-size:28px;font-weight:700;color:#e2e8f0;letter-spacing:.5px}
  .subtitle{font-size:14px;color:#64748b}
  .bar-wrap{width:240px;height:4px;background:#1e293b;border-radius:4px;overflow:hidden;margin-top:8px}
  .bar{height:100%;width:40%;background:linear-gradient(90deg,#4f46e5,#818cf8);border-radius:4px;animation:slide 1.4s ease-in-out infinite}
  .status{font-size:12px;color:#475569;margin-top:12px}
  @keyframes pulse{0%,100%{transform:scale(1);box-shadow:0 0 50px rgba(99,102,241,0.4)}50%{transform:scale(1.05);box-shadow:0 0 70px rgba(99,102,241,0.6)}}
  @keyframes slide{0%{transform:translateX(-100%)}50%{transform:translateX(200%)}100%{transform:translateX(200%)}}
</style>
</head>
<body>
  <div class="logo">
    <svg viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
  </div>
  <div class="title">نقطة البيع الذكية</div>
  <div class="subtitle">جاري تحضير النظام…</div>
  <div class="bar-wrap"><div class="bar"></div></div>
  <div class="status">يرجى الانتظار</div>
  <script>
    let dots=0;
    setInterval(function(){
      dots=(dots+1)%4;
      var s=document.querySelector('.status');
      if(s)s.textContent='يرجى الانتظار'+'.'.repeat(dots);
    },500);
  </script>
</body>
</html>`;

function checkServerRunning() {
  return new Promise(function(resolve) {
    var req = http.get('http://localhost:3001/api/health', function(res) {
      resolve(res.statusCode === 200);
    });
    req.on('error', function() { resolve(false); });
    req.setTimeout(1500, function() { req.destroy(); resolve(false); });
  });
}

function startServer() {
  if (serverStarted) return;
  serverStarted = true;

  var userDataDir = app.getPath('userData');
  var dataDir = path.join(userDataDir, 'data');
  process.env.DATA_DIR = dataDir;

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  var envPath = path.join(__dirname, '..', '.env');
  try {
    var envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(function(line) {
      var trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      var eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        var key = trimmed.substring(0, eqIdx).trim();
        var val = trimmed.substring(eqIdx + 1).trim();
        if (!process.env[key]) process.env[key] = val;
      }
    });
  } catch (e) {}

  var serverFile = path.join(__dirname, '..', 'server-build', 'index.js');
  try {
    require(serverFile);
  } catch (err) {
    console.error('[Server] failed:', err.message);
  }
}

function waitForServer(onReady, retries) {
  retries = retries || 0;
  var MAX = 100;
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
  var icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip('Smart POS - نقطة البيع الذكية');
  var contextMenu = Menu.buildFromTemplate([
    { label: 'فتح نقطة البيع', click: function() { createOrShowWindow(); } },
    { type: 'separator' },
    { label: 'إنهاء', click: function() { isQuitting = true; app.quit(); } },
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
    title: 'نقطة البيع الذكية',
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

  mainWindow.once('ready-to-show', function() {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  mainWindow.on('closed', function() { mainWindow = null; });

  mainWindow.webContents.setWindowOpenHandler(function(details) {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

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
