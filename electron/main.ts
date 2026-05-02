import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { spawn } from 'child_process';

let mainWindow: BrowserWindow | null = null;
let serverProcess: any = null;

function startServer() {
  const isDev = !app.isPackaged;
  const projectRoot = isDev
    ? path.join(__dirname, '..')
    : path.dirname(app.getPath('exe'));

  const tsxPath = path.join(projectRoot, 'node_modules', '.bin', 'tsx');
  const serverFile = path.join(projectRoot, 'server', 'index.ts');

  const isWin = process.platform === 'win32';
  const cmd = isWin ? 'node' : tsxPath;
  const args = isWin
    ? [path.join(projectRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs'), serverFile]
    : [serverFile];

  serverProcess = spawn(cmd, args, {
    cwd: projectRoot,
    env: { ...process.env },
    stdio: 'pipe',
    shell: isWin,
  });

  serverProcess.stdout?.on('data', (data: Buffer) => {
    console.log('[Server]', data.toString().trim());
  });
  serverProcess.stderr?.on('data', (data: Buffer) => {
    console.error('[Server]', data.toString().trim());
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    title: 'نقطة البيع الذكية',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  const isDev = !app.isPackaged;
  if (!isDev) {
    startServer();
  }

  setTimeout(() => {
    createWindow();
  }, isDev ? 1000 : 3000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(serverProcess.pid), '/f', '/t']);
    }
  }
});
