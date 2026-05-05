import { app, BrowserWindow, session, Tray, Menu, nativeImage } from 'electron';
import * as path from 'path';
import * as http from 'http';
import * as fs from 'fs';

app.commandLine.appendSwitch('enable-speech-api');
app.commandLine.appendSwitch('enable-media-stream');

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let serverStarted = false;
let isQuitting = false;

const LOCK_FILE = path.join(app.getPath('userData'), 'smart-pos.lock');

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
  <div class="icon">🏪</div>
  <div class="title">نقطة البيع الذكية</div>
  <div class="subtitle">جاري تحضير النظام…</div>
  <div class="bar-wrap"><div class="bar"></div></div>
  <div class="dots">
    <div class="dot"></div>
    <div class="dot"></div>
    <div class="dot"></div>
  </div>
</body>
</html>`;

function checkServerRunning(): Promise<boolean> {
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
  } catch (err: any) {
    console.error('[Server] فشل التشغيل:', err.message);
  }
}

function waitForServer(onReady: () => void, retries = 0) {
  const MAX = 80;
  http.get('http://localhost:3001/api/health', (res) => {
    if (res.statusCode === 200) {
      onReady();
    } else {
      if (retries < MAX) setTimeout(() => waitForServer(onReady, retries + 1), 100);
      else onReady();
    }
  }).on('error', () => {
    if (retries < MAX) setTimeout(() => waitForServer(onReady, retries + 1), 100);
    else onReady();
  });
}

function loadApp(win: BrowserWindow) {
  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

function createTray() {
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip('Smart POS');
  const contextMenu = Menu.buildFromTemplate([
    { label: 'فتح نقطة البيع', click: () => { createOrShowWindow(); } },
    { type: 'separator' },
    { label: 'إنهاء', click: () => { isQuitting = true; app.quit(); } },
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

  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(true);
  });

  mainWindow.once('ready-to-show', () => mainWindow && mainWindow.show());
  mainWindow.on('closed', () => { mainWindow = null; });

  if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
    return;
  }

  checkServerRunning().then((running) => {
    if (running) {
      if (mainWindow) loadApp(mainWindow);
    } else {
      startServer();
      if (mainWindow) {
        mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(LOADING_HTML));
      }
      waitForServer(() => {
        if (mainWindow) loadApp(mainWindow);
      });
    }
  });
}

app.whenReady().then(() => {
  if (app.isPackaged) {
    const gotLock = app.requestSingleInstanceLock();
    createTray();
    createOrShowWindow();
  } else {
    createOrShowWindow();
  }

  app.on('activate', () => {
    createOrShowWindow();
  });
});

app.on('second-instance', () => {
  createOrShowWindow();
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  if (isQuitting) {
    app.quit();
  }
});
