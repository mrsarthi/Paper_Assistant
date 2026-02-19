const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let apiProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // Load frontend
  mainWindow.loadFile(path.join(__dirname, 'frontend', 'index.html'));

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

function startApi() {
  // Correct path for development vs production
  let scriptPath;
  
  if (app.isPackaged) {
    // In the final installed app, resources are moved
    // Typically: resources/bin/server.exe
    scriptPath = path.join(process.resourcesPath, 'bin', 'server.exe');
  } else {
    // In development (npm start)
    scriptPath = path.join(__dirname, 'bin', 'server.exe');
  }

  console.log("Launching API from:", scriptPath);

  apiProcess = spawn(scriptPath);

  apiProcess.stdout.on('data', (data) => {
    console.log(`API: ${data}`);
  });

  apiProcess.stderr.on('data', (data) => {
    console.error(`API Error: ${data}`);
  });
}

app.on('ready', () => {
  // startApi();
  // Wait 2s for Python to start before showing window
  setTimeout(createWindow, 2000);
});

app.on('window-all-closed', () => {
  if (apiProcess) apiProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});