const { contextBridge, ipcRenderer } = require('electron');

console.log('✅ preload cargado');

contextBridge.exposeInMainWorld('electronAPI', {
  imprimirTicket: (salida) => ipcRenderer.invoke('imprimir-ticket', salida),
  reimprimirTicket: (folio) => ipcRenderer.invoke('reimprimir-ticket', folio)
});
