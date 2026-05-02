"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
let mainWindow = null;
let serverProcess = null;
function startServer() {
    const isDev = !electron_1.app.isPackaged;
    const projectRoot = isDev
        ? path.join(__dirname, '..')
        : path.dirname(electron_1.app.getPath('exe'));
    const tsxPath = path.join(projectRoot, 'node_modules', '.bin', 'tsx');
    const serverFile = path.join(projectRoot, 'server', 'index.ts');
    const isWin = process.platform === 'win32';
    const cmd = isWin ? 'node' : tsxPath;
    const args = isWin
        ? [path.join(projectRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs'), serverFile]
        : [serverFile];
    serverProcess = (0, child_process_1.spawn)(cmd, args, {
        cwd: projectRoot,
        env: { ...process.env },
        stdio: 'pipe',
        shell: isWin,
    });
    serverProcess.stdout?.on('data', (data) => {
        console.log('[Server]', data.toString().trim());
    });
    serverProcess.stderr?.on('data', (data) => {
        console.error('[Server]', data.toString().trim());
    });
}
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
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
    const isDev = !electron_1.app.isPackaged;
    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
    }
    else {
        mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
    }
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
electron_1.app.whenReady().then(() => {
    const isDev = !electron_1.app.isPackaged;
    if (!isDev) {
        startServer();
    }
    setTimeout(() => {
        createWindow();
    }, isDev ? 1000 : 3000);
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('before-quit', () => {
    if (serverProcess) {
        serverProcess.kill();
        if (process.platform === 'win32') {
            (0, child_process_1.spawn)('taskkill', ['/pid', String(serverProcess.pid), '/f', '/t']);
        }
    }
});
