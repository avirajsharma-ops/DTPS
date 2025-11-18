const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getVersion: () => ipcRenderer.invoke('app-version'),
  
  // Notifications
  showNotification: (title, body) => ipcRenderer.invoke('show-notification', title, body),
  
  // Platform info
  platform: process.platform,
  
  // Check if running in Electron
  isElectron: true,
  
  // App events
  onAppReady: (callback) => ipcRenderer.on('app-ready', callback),
  onAppUpdate: (callback) => ipcRenderer.on('app-update-available', callback),
  
  // Window controls (for custom title bar if needed)
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
});

// Expose a limited API for PWA features
contextBridge.exposeInMainWorld('pwaAPI', {
  // Check if app is installed (always true for Electron)
  isInstalled: true,
  
  // Check if running standalone (always true for Electron)
  isStandalone: true,
  
  // Platform detection
  isMobile: false,
  isDesktop: true,
  
  // Electron-specific features
  isElectronApp: true,
});
