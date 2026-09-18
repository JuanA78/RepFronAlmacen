const API = 'https://apisalmacenht.onrender.com/api';
let salidasClienteActual = [];
let clienteActual = null;
let numeroServicio = '';

/* ================= UTILIDADES ================= */
function toast(msg, tipo = 'primary') {
  const toastEl = document.getElementById('toast');
  const toastMsg = document.getElementById('toastMsg');

  let iconClass = 'bi-check-circle-fill';
  if (tipo === 'danger') iconClass = 'bi-x-circle-fill';
  if (tipo === 'warning') iconClass = 'bi-exclamation-triangle-fill';
  if (tipo === 'success') iconClass = 'bi-check-circle-fill';

  toastMsg.innerHTML = `
    <i class="bi ${iconClass} me-3 fs-5 text-${tipo}"></i>
    <span>${msg}</span>
  `;

  toastEl.className = `toast border-0 bg-${tipo} text-white`;
  const toastInstance = new bootstrap.Toast(toastEl);
  toastInstance.show();

  setTimeout(() => toastInstance.hide(), 5000);
}

function moneda(v) {
  return `$${parseFloat(v).toFixed(2)}`;
}

function formatearFecha(fecha) {
  if (!fecha) return '-';
  const date = new Date(fecha);
  return date.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/* ================= OBTENER CLIENTES ================= */
async function obtenerClientes() {
  const tbody = document.getElementById('clientesTabla');
  const contador = document.getElementById('contadorClientes');
  
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="5" class="text-center py-5">
        <div class="spinner-border spinner-border-sm text-primary me-2" role="status">
          <span class="visually-hidden">Cargando...</span>
        </div>
        Cargando clientes...
      </td>
    </tr>`;

  try {
    const res = await fetch(`${API}/clientes`);
    if (!res.ok) throw new Error('Error al cargar clientes');

    const clientes = await res.json();

    if (!clientes || clientes.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center py-5 text-muted">
            <i class="bi bi-inbox fs-1 d-block mb-3"></i>
            No hay clientes registrados
          </td>
        </tr>`;
      if (contador) contador.textContent = '0 clientes';
      return;
    }

    // Usamos un buffer de texto para construir todo en memoria antes de tocar el DOM
    let htmlBuffer = '';

    clientes.forEach(c => {
      const empresaNombre = c.empresa?.nombre || 'Sin empresa';
      const operador = c.operador || '-';
      const unidad = c.unidad || '-';
      const kilometraje = c.kilometraje || '0';

      htmlBuffer += `
        <tr>
          <td class="fw-semibold">${operador}</td>
          <td>${unidad}</td>
          <td class="text-center">${kilometraje}</td>
          <td>
            <span class="badge bg-dark">${empresaNombre}</span>
          </td>
          <td class="text-center">
            <button class="btn btn-sm btn-primary me-1"
              onclick="verProductosCliente('${c._id}','${operador}')">
              <i class="bi bi-eye"></i>
            </button>
            <button class="btn btn-sm btn-warning me-1"
              onclick="editarCliente('${c._id}')">
              <i class="bi bi-pencil"></i>
            </button>
          </td>
        </tr>`;
    });

    // Inyección única en el DOM
    tbody.innerHTML = htmlBuffer;

    if (contador) {
      contador.textContent = `${clientes.length} cliente${clientes.length !== 1 ? 's' : ''}`;
    }

  } catch (err) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center py-5 text-danger">
          <i class="bi bi-exclamation-triangle me-2"></i>
          Error: ${err.message}
        </td>
      </tr>`;
    if (typeof toast === 'function') toast(`Error: ${err.message}`, 'danger');
    console.error(err);
  }
}

/* ================= OBTENER EMPRESAS ================= */
async function obtenerEmpresas() {
  const tbody = document.getElementById('empresasTabla');
  const contador = document.getElementById('contadorEmpresas');

  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="5" class="text-center py-5">
        <div class="spinner-border spinner-border-sm text-primary me-2" role="status">
          <span class="visually-hidden">Cargando...</span>
        </div>
        Cargando empresas...
      </td>
    </tr>`;

  try {
    const res = await fetch(`${API}/empresas`);
    if (!res.ok) throw new Error('Error al cargar empresas');

    const empresas = await res.json();

    if (!empresas || empresas.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center py-5 text-muted">
            <i class="bi bi-inbox fs-1 d-block mb-3"></i>
            No hay empresas registradas
          </td>
        </tr>`;
      if (contador) contador.textContent = '0 empresas';
      return;
    }

    // Acumular HTML en memoria
    let htmlBuffer = '';

    empresas.forEach(e => {
      htmlBuffer += `
        <tr>
          <td class="fw-semibold">${e.nombre || '-'}</td>
          <td><code>${e.rfc || '-'}</code></td>
          <td>${e.regimenFiscal || '-'}</td>
          <td>${e.usoCFDI || '-'}</td>
          <td class="text-center">
            <button class="btn btn-sm btn-warning me-1"
              onclick="editarEmpresa('${e._id}')">
              <i class="bi bi-pencil"></i>
            </button>
          </td>
        </tr>`;
    });

    // Inyección única en el DOM
    tbody.innerHTML = htmlBuffer;

    if (contador) {
      contador.textContent = `${empresas.length} empresa${empresas.length !== 1 ? 's' : ''}`;
    }

    // Cargar empresas en el select del modal cliente
    if (typeof cargarEmpresasEnSelect === 'function') {
      await cargarEmpresasEnSelect();
    }

  } catch (err) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center py-5 text-danger">
          <i class="bi bi-exclamation-triangle me-2"></i>
          Error: ${err.message}
        </td>
      </tr>`;
    if (typeof toast === 'function') toast(`Error: ${err.message}`, 'danger');
    console.error(err);
  }
}

/* ================= CARGAR EMPRESAS EN SELECT ================= */
async function cargarEmpresasEnSelect() {
  try {
    const res = await fetch(`${API}/empresas`);
    if (!res.ok) throw new Error('Error al cargar empresas');

    const empresas = await res.json();
    const select = document.getElementById('clienteEmpresaSelect');

    if (!select) return;

    select.innerHTML = '<option value="">Seleccione una empresa</option>';

    empresas.forEach(e => {
      select.innerHTML += `<option value="${e._id}">${e.nombre} (${e.rfc})</option>`;
    });
  } catch (err) {
    console.error('Error al cargar empresas en select:', err);
  }
}

/* ================= MOSTRAR MODAL CLIENTE ================= */
function mostrarModalCliente() {
  document.getElementById('clienteModalTitle').textContent = 'Nuevo Cliente';
  document.getElementById('clienteId').value = '';
  document.getElementById('clienteOperadorInput').value = '';
  document.getElementById('clienteUnidadInput').value = '';
  document.getElementById('clienteKilometrajeInput').value = '';
  document.getElementById('clienteEmpresaSelect').value = '';

  const modal = new bootstrap.Modal(document.getElementById('clienteModal'));
  modal.show();
}

/* ================= EDITAR CLIENTE ================= */
async function editarCliente(id) {
  try {
    const res = await fetch(`${API}/clientes/${id}`);
    if (!res.ok) throw new Error('Error al cargar cliente');

    const cliente = await res.json();

    document.getElementById('clienteModalTitle').textContent = 'Editar Cliente';
    document.getElementById('clienteId').value = cliente._id;
    document.getElementById('clienteOperadorInput').value = cliente.operador;
    document.getElementById('clienteUnidadInput').value = cliente.unidad;
    document.getElementById('clienteKilometrajeInput').value = cliente.kilometraje;
    document.getElementById('clienteEmpresaSelect').value = cliente.empresa?._id || '';

    const modal = new bootstrap.Modal(document.getElementById('clienteModal'));
    modal.show();

  } catch (err) {
    toast(`Error: ${err.message}`, 'danger');
  }
}

/* ================= GUARDAR CLIENTE ================= */
async function guardarCliente() {
  const id = document.getElementById('clienteId').value;
  const operador = document.getElementById('clienteOperadorInput').value.trim();
  const unidad = document.getElementById('clienteUnidadInput').value.trim();
  const kilometraje = document.getElementById('clienteKilometrajeInput').value;
  const empresa = document.getElementById('clienteEmpresaSelect').value;

  if (!operador || !unidad || !kilometraje || !empresa) {
    toast('Todos los campos son obligatorios', 'warning');
    return;
  }

  const clienteData = { operador, unidad, kilometraje: Number(kilometraje), empresa };

  try {
    let res;
    if (id) {
      res = await fetch(`${API}/clientes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clienteData)
      });
    } else {
      res = await fetch(`${API}/clientes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clienteData)
      });
    }

    if (!res.ok) throw new Error('Error al guardar cliente');

    toast(id ? 'Cliente actualizado' : 'Cliente creado', 'success');

    bootstrap.Modal.getInstance(document.getElementById('clienteModal')).hide();
    obtenerClientes();

  } catch (err) {
    toast(`Error: ${err.message}`, 'danger');
  }
}

/* ================= VALIDACIÓN DE RFC ================= */
function validarRFC(rfc) {
  rfc = rfc.trim().toUpperCase();

  if (!rfc) {
    return { valido: false, mensaje: 'El RFC no puede estar vacío' };
  }

  const rfcPattern = /^[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{2,3}$/;

  if (!rfcPattern.test(rfc)) {
    return {
      valido: false,
      mensaje: 'RFC inválido. Debe tener 12 o 13 caracteres alfanuméricos'
    };
  }

  if (rfc.length !== 12 && rfc.length !== 13) {
    return {
      valido: false,
      mensaje: 'El RFC debe tener exactamente 12 o 13 caracteres'
    };
  }

  return { valido: true, mensaje: 'RFC válido' };
}

/* ================= CONFIGURAR VALIDACIÓN RFC ================= */
function configurarValidacionRFC() {
  const rfcInput = document.getElementById('empresaRFCInput');

  if (!rfcInput) return;

  // Crear elemento de feedback si no existe
  let feedbackDiv = document.getElementById('rfcFeedback');
  if (!feedbackDiv) {
    feedbackDiv = document.createElement('div');
    feedbackDiv.className = 'invalid-feedback';
    feedbackDiv.id = 'rfcFeedback';
    rfcInput.parentNode.appendChild(feedbackDiv);
  }

  rfcInput.addEventListener('input', function () {
    const rfc = this.value;
    const resultado = validarRFC(rfc);

    if (rfc.length === 0) {
      this.classList.remove('is-valid', 'is-invalid');
      feedbackDiv.textContent = '';
    } else if (resultado.valido) {
      this.classList.add('is-valid');
      this.classList.remove('is-invalid');
      feedbackDiv.textContent = '✓ RFC válido';
      feedbackDiv.style.color = '#28a745';
    } else {
      this.classList.add('is-invalid');
      this.classList.remove('is-valid');
      feedbackDiv.textContent = resultado.mensaje;
      feedbackDiv.style.color = '#dc3545';
    }
  });
}

/* ================= GUARDAR EMPRESA ================= */
async function guardarEmpresa() {
  const id = document.getElementById('empresaId').value;
  const nombre = document.getElementById('empresaNombreInput').value.trim();
  const rfc = document.getElementById('empresaRFCInput').value.trim().toUpperCase();
  const domicilio = document.getElementById('empresaDomicilioInput').value.trim();
  const regimenFiscal = document.getElementById('empresaRegimenInput').value.trim();
  const usoCFDI = document.getElementById('empresaCFDIInput').value.trim();

  if (!nombre || !rfc || !domicilio || !regimenFiscal || !usoCFDI) {
    toast('Todos los campos son obligatorios', 'warning');
    return;
  }

  const validacionRFC = validarRFC(rfc);
  if (!validacionRFC.valido) {
    toast(validacionRFC.mensaje, 'warning');
    const rfcInput = document.getElementById('empresaRFCInput');
    rfcInput.classList.add('is-invalid');
    rfcInput.focus();
    return;
  }

  const empresaData = {
    nombre,
    rfc: rfc.toUpperCase(),
    domicilio,
    regimenFiscal,
    usoCFDI
  };

  try {
    let res;
    if (id) {
      res = await fetch(`${API}/empresas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(empresaData)
      });
    } else {
      res = await fetch(`${API}/empresas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(empresaData)
      });
    }

    if (!res.ok) throw new Error('Error al guardar empresa');

    toast(id ? 'Empresa actualizada' : 'Empresa creada', 'success');

    bootstrap.Modal.getInstance(document.getElementById('empresaModal')).hide();
    obtenerEmpresas();

  } catch (err) {
    toast(`Error: ${err.message}`, 'danger');
  }
}

/* ================= MOSTRAR MODAL EMPRESA ================= */
function mostrarModalEmpresa() {
  document.getElementById('empresaModalTitle').textContent = 'Nueva Empresa';
  document.getElementById('empresaId').value = '';
  document.getElementById('empresaNombreInput').value = '';
  document.getElementById('empresaRFCInput').value = '';
  document.getElementById('empresaDomicilioInput').value = '';
  document.getElementById('empresaRegimenInput').value = '';
  document.getElementById('empresaCFDIInput').value = '';

  const rfcInput = document.getElementById('empresaRFCInput');
  rfcInput.classList.remove('is-valid', 'is-invalid');

  const feedbackDiv = document.getElementById('rfcFeedback');
  if (feedbackDiv) feedbackDiv.textContent = '';

  const modal = new bootstrap.Modal(document.getElementById('empresaModal'));
  modal.show();
}

/* ================= EDITAR EMPRESA ================= */
async function editarEmpresa(id) {
  try {
    const res = await fetch(`${API}/empresas/${id}`);
    if (!res.ok) throw new Error('Error al cargar empresa');

    const empresa = await res.json();

    document.getElementById('empresaModalTitle').textContent = 'Editar Empresa';
    document.getElementById('empresaId').value = empresa._id;
    document.getElementById('empresaNombreInput').value = empresa.nombre;
    document.getElementById('empresaRFCInput').value = empresa.rfc;
    document.getElementById('empresaDomicilioInput').value = empresa.domicilio;
    document.getElementById('empresaRegimenInput').value = empresa.regimenFiscal;
    document.getElementById('empresaCFDIInput').value = empresa.usoCFDI;

    const rfcInput = document.getElementById('empresaRFCInput');
    const validacion = validarRFC(empresa.rfc);

    if (validacion.valido) {
      rfcInput.classList.add('is-valid');
      rfcInput.classList.remove('is-invalid');
    } else {
      rfcInput.classList.add('is-invalid');
      rfcInput.classList.remove('is-valid');
    }

    const modal = new bootstrap.Modal(document.getElementById('empresaModal'));
    modal.show();

  } catch (err) {
    toast(`Error: ${err.message}`, 'danger');
  }
}

/* ================= VER PRODUCTOS DEL CLIENTE ================= */
async function verProductosCliente(clienteId, operador) {
  const tbody = document.getElementById('productosClienteTabla');
  tbody.innerHTML = `
    <tr>
      <td colspan="8" class="text-center py-4">
        <div class="spinner-border spinner-border-sm text-primary me-2" role="status">
          <span class="visually-hidden">Cargando...</span>
        </div>
        Cargando productos...
      </td>
    </tr>`;

  const modal = new bootstrap.Modal(document.getElementById('productosModal'));
  modal.show();

  try {
    const clienteRes = await fetch(`${API}/clientes/${clienteId}`);
    if (!clienteRes.ok) throw new Error('Error al cargar datos del cliente');
    clienteActual = await clienteRes.json();

    const salidasRes = await fetch(`${API}/salidas/cliente/${clienteId}`);
    if (!salidasRes.ok) throw new Error('Error al cargar salidas del cliente');
    salidasClienteActual = await salidasRes.json();

    document.getElementById('productosTitulo').textContent = `Reporte de Ventas - ${clienteActual.operador}`;
    document.getElementById('clienteOperador').textContent = clienteActual.operador || '-';
    document.getElementById('clienteUnidad').textContent = clienteActual.unidad || '-';
    document.getElementById('clienteKilometraje').textContent = clienteActual.kilometraje || '0';
    document.getElementById('empresaNombre').textContent = clienteActual.empresa?.nombre || '-';
    document.getElementById('empresaRFC').textContent = clienteActual.empresa?.rfc || '-';
    document.getElementById('empresaDomicilio').textContent = clienteActual.empresa?.domicilio || '-';

    tbody.innerHTML = '';

    if (!salidasClienteActual.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center py-5 text-muted">
            <i class="bi bi-inbox me-2"></i>
            No hay productos vendidos para este cliente
          </td>
        </tr>`;
      document.getElementById('totalVentas').textContent = '$0.00';
      return;
    }

    let totalVentas = 0;
    let contador = 1;

    salidasClienteActual.forEach(s => {
      s.Productos.forEach(p => {
        // Usar CantidadVendida o Cantidad para compatibilidad
        const precio = p.PrecioVenta || 0;
        const cantidadVendida = p.CantidadVendida || p.Cantidad || 0;
        const cantidadDevuelta = p.CantidadDevuelta || 0;

        const cantidadReal = cantidadVendida - cantidadDevuelta;
        const subtotal = cantidadReal * precio;

        totalVentas += subtotal;
        tbody.innerHTML += `
          <tr>
            <td class="text-center">${contador++}</td>
            <td class="fw-semibold">${p.NombreProducto || '-'}</td>
            <td class="text-center"><code>${p.NoParte || '-'}</code></td>
            <td class="text-center">
            ${cantidadReal}
            ${cantidadDevuelta > 0 ? `<br><small class="text-danger">Dev: ${cantidadDevuelta}</small>` : ''}
            </td>
            <td class="text-center">${moneda(p.PrecioVenta || 0)}</td>
            <td class="text-center fw-bold">${moneda(subtotal)}</td>
            <td class="text-center"><small>${s.FolioSalida || 'Sin folio'}</small></td>
            <td class="text-center">${formatearFecha(s.FechaSalida)}</td>
          </tr>
        `;
      });
    });

    document.getElementById('totalVentas').textContent = moneda(totalVentas);

  } catch (err) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-5 text-danger">
          <i class="bi bi-exclamation-triangle me-2"></i>
          Error: ${err.message}
        </td>
      </tr>`;
    toast(`Error: ${err.message}`, 'danger');
    console.error(err);
  }
}

/* ================= MOSTRAR MODAL NÚMERO DE SERVICIO ================= */
function mostrarModalNumeroServicio() {
  document.getElementById('numeroServicioInput').value = '';
  const modal = new bootstrap.Modal(document.getElementById('numeroServicioModal'));
  modal.show();
}

/* ================= GENERAR PDF CON NÚMERO DE SERVICIO ================= */
function generarPDFConNumeroServicio() {
  numeroServicio = document.getElementById('numeroServicioInput').value.trim();
  bootstrap.Modal.getInstance(document.getElementById('numeroServicioModal')).hide();
  generarPDF();
}

/* ================= GENERAR PDF ================= */
function generarPDF() {
  if (!clienteActual || !salidasClienteActual.length) {
    toast('No hay datos para generar el PDF', 'warning');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  let y = 15;
  let total = 0;

  const colorPrimario = [200, 35, 51];
  const colorOscuro = [44, 62, 80];
  const colorExito = [39, 174, 96];

  // Encabezado
  doc.setFillColor(...colorPrimario);
  doc.rect(0, 0, 210, 15, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('REPORTE DE VENTAS', 105, 9, { align: 'center' });

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.text(`Fecha de impresión: ${new Date().toLocaleDateString()}`, 14, 25);

  if (numeroServicio) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colorPrimario);
    doc.text(`Número de Servicio: ${numeroServicio}`, 14, 32);
    doc.setTextColor(0, 0, 0);
    y = 40;
  } else {
    y = 35;
  }

  // Datos Empresa
doc.setFillColor(248, 249, 250);
doc.roundedRect(10, y, 190, 35, 3, 3, 'F');

doc.setFontSize(12);
doc.setFont('helvetica', 'bold');
doc.setTextColor(...colorOscuro);
doc.text('DATOS DE LA EMPRESA', 14, y + 6);

doc.setFont('helvetica', 'normal');
doc.setFontSize(10);
doc.setTextColor(0, 0, 0);

// 🔥 EMPRESA (MULTILÍNEA CONTROLADA)
const empresaNombre = doc.splitTextToSize(
  clienteActual.empresa?.nombre || '',
  80 // ancho máximo de la columna izquierda
);

doc.text(empresaNombre, 14, y + 12);

// RFC
doc.text(`RFC: ${clienteActual.empresa?.rfc || ''}`, 14, y + 12 + (empresaNombre.length * 5));

// DIRECCIÓN (también puede ser larga)
const domicilio = doc.splitTextToSize(
  clienteActual.empresa?.domicilio || '',
  80
);

doc.text(
  domicilio,
  14,
  y + 17 + (empresaNombre.length * 5)
);

// 🔥 COLUMNA DERECHA (FIJA)
doc.text(`Régimen Fiscal: ${clienteActual.empresa?.regimenFiscal || ''}`, 100, y + 12);
doc.text(`Uso CFDI: ${clienteActual.empresa?.usoCFDI || ''}`, 100, y + 17);

// 🔥 AJUSTAR ALTURA DINÁMICA
const alturaIzquierda =
  (empresaNombre.length * 5) +
  (domicilio.length * 5) + 10;

y += Math.max(35, alturaIzquierda);

  // Datos Cliente
  doc.setFillColor(233, 236, 239);
  doc.roundedRect(10, y, 190, 25, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colorOscuro);
  doc.text('DATOS DEL CLIENTE', 14, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`Operador: ${clienteActual.operador}`, 14, y + 12);
  doc.text(`Unidad: ${clienteActual.unidad}`, 14, y + 17);
  doc.text(`Kilometraje: ${clienteActual.kilometraje}`, 100, y + 12);
  y += 35;

  // Tabla
  doc.setFillColor(...colorOscuro);
  doc.rect(14, y, 182, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Producto', 16, y + 5);
  doc.text('No. Parte', 50, y + 5);
  doc.text('Cant.', 85, y + 5);
  doc.text('Precio', 105, y + 5);
  doc.text('Subtotal', 125, y + 5);
  doc.text('Folio', 150, y + 5);
  doc.text('Fecha', 175, y + 5);

  doc.setDrawColor(...colorPrimario);
  doc.setLineWidth(0.5);
  doc.line(14, y + 8, 196, y + 8);
  y += 12;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);

  let filaContador = 0;

  salidasClienteActual.forEach(s => {
    s.Productos.forEach(p => {
      const precio = p.PrecioVenta || 0;
      const cantidadVendida = p.CantidadVendida || p.Cantidad || 0;
      const cantidadDevuelta = p.CantidadDevuelta || 0;

      const cantidadReal = cantidadVendida - cantidadDevuelta;
      const subtotal = cantidadReal * precio;

      total += subtotal;

      if (filaContador % 2 === 0) {
        doc.setFillColor(245, 247, 250);
        doc.rect(14, y - 2, 182, 6, 'F');
      }

      const nombreProducto = doc.splitTextToSize(
  String(p.NombreProducto || ''),
  30 // ancho de la columna
);

const lineasProducto = nombreProducto.length;
const alturaFila = lineasProducto * 5;

// Fondo alterno
if (filaContador % 2 === 0) {
  doc.setFillColor(245, 247, 250);
  doc.rect(14, y - 2, 182, alturaFila + 2, 'F');
}
doc.text(nombreProducto, 16, y);

      doc.text(String(p.NoParte || '-'), 50, y);
      doc.text(String(cantidadReal), 88, y);
      if (cantidadDevuelta > 0) {
        doc.setFontSize(7);
        doc.setTextColor(220, 53, 69);
        doc.text(`Dev: ${cantidadDevuelta}`, 88, y + 3);
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
      }
      doc.text(`$${(p.PrecioVenta || 0).toFixed(2)}`, 108, y);
      doc.text(`$${subtotal.toFixed(2)}`, 128, y);
      doc.text(String(s.FolioSalida || 'Sin folio'), 152, y);
      doc.text(String(formatearFecha(s.FechaSalida)), 177, y);

     y += alturaFila + 2;
      filaContador++;

      if (y > 270) {
        doc.addPage();
        y = 20;
        filaContador = 0;
      }
    });
  });

  y += 8;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(14, y, 196, y);
  y += 8;

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colorExito);
  doc.text(`TOTAL: ${moneda(total)}`, 150, y);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(108, 117, 125);
  doc.text('Generado por Sistema de Ventas - Almacén HT', 105, 285, { align: 'center' });

  let fileName = `Reporte_${clienteActual.operador}_${new Date().toISOString().slice(0, 10)}`;
  if (numeroServicio) fileName = `${numeroServicio}_${clienteActual.operador}`;

  doc.save(`${fileName}.pdf`);
  toast('PDF generado correctamente', 'success');
  numeroServicio = '';
}

/* ================= INICIALIZACIÓN ================= */
document.addEventListener('DOMContentLoaded', () => {
  obtenerClientes();
  obtenerEmpresas();
  configurarValidacionRFC();
});