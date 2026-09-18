/* =======================
   VARIABLES GLOBALES
======================= */
let loteEliminar = null;
let paginaActual = 1;
const limitePorPagina = 100;
let totalPaginas = 1;
let debounceTimer = null;

/* =======================
   TOAST
======================= */
function mostrarToast(msg, tipo = 'success') {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toastMsg');

  const iconClass =
    tipo === 'success' ? 'bi-check-circle-fill' :
    tipo === 'danger' ? 'bi-exclamation-triangle-fill' :
    'bi-info-circle-fill';

  toastMsg.innerHTML = `<i class="bi ${iconClass} me-3 fs-5"></i><span>${msg}</span>`;
  toast.className = `toast toast-custom text-bg-${tipo} border-0`;

  new bootstrap.Toast(toast).show();
}

/* =======================
   FORMATOS
======================= */
function formatoMoneda(num) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(num);
}

function actualizarPaginador(totalEntradas, totalPags, pagActual, cantidadMostrada) {
  // Actualizar badges e indicadores
  document.getElementById('contadorRegistros').textContent = `${totalEntradas} registros`;
  document.getElementById('indicadorPagina').textContent = `Página ${pagActual} de ${totalPags || 1}`;

  const inicio = totalEntradas === 0 ? 0 : (pagActual - 1) * limitePorPagina + 1;
  const fin = (pagActual - 1) * limitePorPagina + cantidadMostrada;
  document.getElementById('infoTabla').textContent = `Mostrando ${inicio} - ${fin} de ${totalEntradas} entradas`;

  // Control de botones Anterior / Siguiente
  const btnAnt = document.getElementById('btnPaginaAnterior');
  const btnSig = document.getElementById('btnPaginaSiguiente');

  if (pagActual <= 1) {
    btnAnt.classList.add('disabled');
  } else {
    btnAnt.classList.remove('disabled');
  }

  if (pagActual >= totalPags || totalPags === 0) {
    btnSig.classList.add('disabled');
  } else {
    btnSig.classList.remove('disabled');
  }
}

/* =======================
   RENDER TABLA
======================= */
function renderFilas(data) {
  const tbody = document.getElementById('entradasBody');
  const emptyState = document.getElementById('emptyState');
  const tablaContainer = document.querySelector('.table-container');

  tbody.innerHTML = '';

  if (!data || data.length === 0) {
    tablaContainer.parentElement.classList.add('d-none');
    emptyState.classList.remove('d-none');
    return;
  }

  tablaContainer.parentElement.classList.remove('d-none');
  emptyState.classList.add('d-none');

  data.forEach(lote => {
    // Fecha SIN zona horaria
    const fechaISO = lote.FechaCompra ? lote.FechaCompra.split('T')[0] : '';
    let fechaFormateada = 'N/A';
    if (fechaISO) {
      const [year, month, day] = fechaISO.split('-');
      fechaFormateada = `${day}/${month}/${year}`;
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="fw-semibold">${lote.producto?.NombreProducto || 'N/A'}</div>
        <small class="text-muted">${lote.producto?.Marca || ''}</small>
      </td>
      <td>
        <span class="badge bg-light text-dark border">
          ${lote.producto?.NoParte || 'N/A'}
        </span>
      </td>
      <td>
        <span class="fw-semibold">${lote.FolioCompra || '—'}</span>
      </td>
      <td>${fechaFormateada}</td>
      <td class="text-center">
        <span class="badge bg-primary">${lote.CantidadInicial}</span>
      </td>
      <td class="text-center">
        <span class="badge ${lote.CantidadDisponible > 0 ? 'bg-success' : 'bg-secondary'}">
          ${lote.CantidadDisponible}
        </span>
      </td>
      <td class="text-end fw-bold">
        ${formatoMoneda(lote.PrecioCompra)}
      </td>
      <td class="text-center no-exportar">
        <button class="btn btn-sm btn-eliminar"
          onclick="abrirEliminar('${lote._id}')"
          ${lote.CantidadDisponible === 0 ? '' : 'disabled'}
          title="${lote.CantidadDisponible === 0
            ? 'Eliminar lote'
            : 'No se puede eliminar mientras haya stock'}">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/* =======================
   CARGAR ENTRADAS (API)
======================= */
async function cargarEntradas(page = 1) {
  const tbody = document.getElementById('entradasBody');
  const filtroNombre = document.getElementById('buscarProducto').value.trim();

  tbody.innerHTML = `
    <tr>
      <td colspan="8" class="text-center">
        <div class="spinner-border text-primary my-4"></div>
      </td>
    </tr>
  `;

  try {
    // Construimos la URL con paginación y filtro de backend
    let url = `https://apisalmacenht.onrender.com/api/entradas?page=${page}&limit=${limitePorPagina}`;
    if (filtroNombre !== '') {
      url += `&nombre=${encodeURIComponent(filtroNombre)}`;
    }

    const res = await fetch(url);
    const responseData = await res.json();

    // Extraemos la información del objeto paginado
    const entradas = responseData.data || [];
    const totalEntradas = responseData.totalEntradas || 0;
    paginaActual = responseData.paginaActual || page;
    totalPaginas = responseData.totalPaginas || 1;

    renderFilas(entradas);
    actualizarPaginador(totalEntradas, totalPaginas, paginaActual, entradas.length);

  } catch (error) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-danger py-4">
          Error al cargar los datos
        </td>
      </tr>
    `;
    mostrarToast('Error al cargar entradas', 'danger');
  }
}

/* =======================
   FILTRO CON DEBOUNCE
======================= */
function manejarFiltroInput() {
  clearTimeout(debounceTimer);
  // Espera 350ms después de que el usuario deja de escribir para consultar al servidor
  debounceTimer = setTimeout(() => {
    cargarEntradas(1);
  }, 350);
}

function limpiarFiltros() {
  document.getElementById('buscarProducto').value = '';
  cargarEntradas(1);
}
/* =======================
   ELIMINAR LOTE
======================= */
function abrirEliminar(id) {
  loteEliminar = id;
  new bootstrap.Modal(document.getElementById('modalEliminar')).show();
}

document.getElementById('confirmarEliminar').addEventListener('click', async () => {
  try {
    const res = await fetch(`https://apisalmacenht.onrender.com/api/entradas/${loteEliminar}`, {
      method: 'DELETE'
    });

    if (res.ok) {
      mostrarToast('Entrada eliminada correctamente', 'success');
      cargarEntradas();
    } else {
      mostrarToast('Error al eliminar la entrada', 'danger');
    }
  } catch {
    mostrarToast('Error de conexión con el servidor', 'danger');
  }

  bootstrap.Modal.getInstance(document.getElementById('modalEliminar')).hide();
});

/* =======================
   EXPORTAR A EXCEL
======================= */
document.getElementById('btnExportar').addEventListener('click', () => {
  const tabla = document.getElementById('tablaEntradas');

  const headers = Array.from(tabla.querySelectorAll('thead th'))
    .filter(th => !th.classList.contains('no-exportar'))
    .map(th => th.innerText);

  const rows = Array.from(document.querySelectorAll('#entradasBody tr')).map(tr =>
    Array.from(tr.querySelectorAll('td'))
      .filter((td, i) => !tabla.querySelectorAll('thead th')[i].classList.contains('no-exportar'))
      .map(td => td.innerText)
  );

  rows.unshift(headers);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Entradas_Compras');

  XLSX.writeFile(
    wb,
    `Entradas_Compras_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
});
/* =======================
   INIT Y EVENTOS
======================= */
document.addEventListener('DOMContentLoaded', () => {
  cargarEntradas(1);

  // Escuchar el buscador con debounce
  document.getElementById('buscarProducto')?.addEventListener('input', manejarFiltroInput);

  // Botón para limpiar filtros (se añade la validación opcional ?.)
  document.getElementById('btnLimpiarFiltros')?.addEventListener('click', limpiarFiltros);

  // Controles de paginación
  document.getElementById('btnPaginaAnterior')?.addEventListener('click', () => {
    if (paginaActual > 1) {
      cargarEntradas(paginaActual - 1);
    }
  });

  document.getElementById('btnPaginaSiguiente')?.addEventListener('click', () => {
    if (paginaActual < totalPaginas) {
      cargarEntradas(paginaActual + 1);
    }
  });
});