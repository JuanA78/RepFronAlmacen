// =====================================================
// 🧩 IMPORTACIONES
// =====================================================
const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { SerialPort } = require('serialport');

// =====================================================
// 🔧 VARIABLES GLOBALES
// =====================================================
let mainWindow;
let ticketsDir;

// =====================================================
// 🪟 VENTANA PRINCIPAL
// =====================================================
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('src/Pages/Login.html');
}

// =====================================================
// 🪟 VENTANA DE TICKETS
// =====================================================
function abrirTickets() {
  const winTicket = new BrowserWindow({
    width: 800,
    height: 600,
    title: 'Tickets',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  winTicket.loadFile('src/Pages/Tickes.html');
}

// =====================================================
// 🧠 APP READY
// =====================================================
app.whenReady().then(() => {

  // 📁 Carpeta en DOCUMENTOS
  ticketsDir = path.join(app.getPath('documents'), 'TicketsPOS');
  if (!fs.existsSync(ticketsDir)) fs.mkdirSync(ticketsDir);

  createMainWindow();

  const menu = Menu.buildFromTemplate([
    {
      label: 'Archivo',
      submenu: [
        { role: 'reload' },
        { role: 'toggledevtools' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Tickets',
      submenu: [
        {
          label: 'Abrir Tickets',
          click: () => abrirTickets()
        }
      ]
    }
  ]);

  Menu.setApplicationMenu(menu);
});

// =====================================================
// 🖨️ UTILIDAD: IMPRIMIR RAW ESC/POS (CORREGIDO)
// =====================================================
async function imprimirRaw(raw) {

  const puertos = await SerialPort.list();

  console.log('================================');
  console.log('PUERTOS COM DETECTADOS:');
  console.log(puertos);
  console.log('================================');

  if (!puertos.length) {
    throw new Error('No hay puertos COM disponibles');
  }

  for (const puerto of puertos) {

    console.log('Intentando imprimir en:', puerto.path);

    try {

      await new Promise((resolve, reject) => {

        const port = new SerialPort({
          path: puerto.path,
          baudRate: 9600,
          autoOpen: false
        });

        port.open(err => {

          if (err) {
            console.log(`No se pudo abrir ${puerto.path}:`, err.message);
            return reject(err);
          }

          console.log(`Puerto ${puerto.path} abierto correctamente`);

          port.write(Buffer.from(raw, 'ascii'), err => {

            if (err) {
              console.log(`Error escribiendo en ${puerto.path}:`, err.message);
              port.close();
              return reject(err);
            }

            console.log(`Datos enviados correctamente a ${puerto.path}`);

            setTimeout(() => {

              port.close(() => {
                console.log(`Puerto ${puerto.path} cerrado`);
                resolve();

              });

            }, 400);
          });
        });

        port.on('error', err => {
          console.log(`Error en ${puerto.path}:`, err.message);
          reject(err);
        });

      });

      return { success: true };

    } catch (err) {

      console.log(`Falló ${puerto.path}, intentando siguiente...`);

    }
  }

  throw new Error('No se pudo imprimir en ningún puerto disponible');
}
// =====================================================
// 🧾 GUARDAR TICKET
// =====================================================
function guardarTicket(folio, raw) {
  const file = path.join(ticketsDir, `${folio}.ticket`);
  fs.writeFileSync(file, JSON.stringify({
    folio,
    raw,
    fecha: Date.now()
  }));
}

// =====================================================
// 🖨️ IPC → IMPRIMIR TICKET
// =====================================================
ipcMain.handle('imprimir-ticket', async (e, salida) => {
  try {

    let raw = '\x1B\x40'; // Reset
    raw += '\x1B\x61\x01'; // Centrar

    raw += 'COMERCIALIZADORA DE REFACCIONES TEPEJI\n';
    raw += '--------------------------------\n';
    raw += `FOLIO: ${salida.FolioSalida}\n`;

    // =====================================================
    // 🕒 FECHA Y HORA LOCAL
    // =====================================================
    const fecha = new Date().toLocaleString('es-MX', {
      hour12: false
    });

    raw += `${fecha}\n`;
    raw += `CLIENTE: ${salida.Cliente}\n`;
    raw += `VENTA: ${salida.TipoVenta}\n`;
    raw += `PAGO: ${salida.EstatusPago}\n`;
    raw += '--------------------------------\n';

    // =====================================================
    // 📦 PRODUCTOS
    // =====================================================
    raw += '\x1B\x61\x00'; // Alinear izquierda

    let subtotal = 0;

    salida.Productos.forEach(p => {

      const cantidad = p.CantidadVendida || p.Cantidad || 0;
      const precio = Number(p.PrecioVenta) || 0;

      const sub = cantidad * precio;

      subtotal += sub;

      raw += `${p.NombreProducto}\n`;
      raw += `NP: ${p.NoParte}\n`;
      raw += `${cantidad} x $${precio.toFixed(2)} = $${sub.toFixed(2)}\n`;
      raw += '--------------------------------\n';
    });

    // =====================================================
    // 💰 DESCUENTO
    // =====================================================
    const descuento = Number(salida.Descuento) || 0;

    // Evitamos que el total sea negativo
    const totalFinal = Math.max(0, subtotal - descuento);

    // =====================================================
    // 💵 DESGLOSE
    // =====================================================
    raw += `SUBTOTAL: $${subtotal.toFixed(2)}\n`;

    if (descuento > 0) {
      raw += `DESCUENTO: -$${descuento.toFixed(2)}\n`;
    }

    // =====================================================
    // 🔥 TOTAL EN NEGRITAS
    // =====================================================
    raw += '\x1B\x45\x01'; // Negrita ON

    raw += `TOTAL: $${totalFinal.toFixed(2)}\n`;

    raw += '\x1B\x45\x00'; // Negrita OFF

    raw += '--------------------------------\n';

    // =====================================================
    // 🛡️ GARANTÍAS
    // =====================================================
    raw += 'GARANTIAS:\n';
    raw += 'Partes electricas: SIN garantia.\n';
    raw += 'Bombas gasolina: 15 dias.\n';
    raw += 'Resto piezas: 30 dias.\n';

    // Espacio antes del corte
    raw += '\n\n\n';

    // =====================================================
    // ✂️ CORTE DE PAPEL
    // =====================================================
    raw += '\x1D\x56\x41';

    // =====================================================
    // 💾 GUARDAR TICKET
    // =====================================================
    guardarTicket(salida.FolioSalida, raw);

    // =====================================================
    // 🖨️ IMPRIMIR
    // =====================================================
    await imprimirRaw(raw);

    return {
      success: true
    };

  } catch (err) {

    console.error('❌ Error al imprimir ticket:', err);

    return {
      success: false,
      message: err.message
    };
  }
});

// =====================================================
// 🔁 IPC → REIMPRIMIR TICKET
// =====================================================
ipcMain.handle('reimprimir-ticket', async (e, folio) => {
  try {

    if (!folio) {
      return { success: false, message: 'Folio inválido' };
    }

    const file = path.join(ticketsDir, `${folio}.ticket`);

    if (!fs.existsSync(file)) {
      return { success: false, message: 'Ticket no encontrado' };
    }

    const data = JSON.parse(fs.readFileSync(file, 'utf8'));

   let raw = '\x1B\x40';
raw += '\x1B\x61\x01';
raw += '*** REIMPRESION ***\n\n';
raw += data.raw;


    // 🖨️ Primera impresión
    await imprimirRaw(raw);

    return { success: true };

  } catch (err) {
    console.error("Error reimpresión:", err);
    return { success: false, message: err.message };
  }
});


// =====================================================
// 📂 IPC → ABRIR VENTANA TICKETS
// =====================================================
ipcMain.handle('abrir-ventana-tickets', () => {
  abrirTickets();
  return { success: true };
});

// =====================================================
// 🚪 CIERRE APP
// =====================================================
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
