const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let pythonProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // For simple apps; use preload for production
    },
  });

  // Load your frontend
  mainWindow.loadFile('frontend/index.html');

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

function startPythonServer() {
  // Adjust 'python' to 'python3' for Mac/Linux if needed
  // Pointing to the backend folder
  const backendPath = path.join(__dirname, 'backend');
  
  console.log("Starting Python Server...");
  
  pythonProcess = spawn('python', ['server.py'], {
    cwd: backendPath, // Set working directory to backend
  });

  pythonProcess.stdout.on('data', (data) => {
    console.log(`Python: ${data}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`Python Error: ${data}`);
  });
}

app.on('ready', () => {
  startPythonServer();
  // Give Python a second to boot up before opening window
  setTimeout(createWindow, 1000);
});

app.on('window-all-closed', () => {
  // Kill Python process on exit
  if (pythonProcess) pythonProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});