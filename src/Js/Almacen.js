const API = 'https://apisalmacenht.onrender.com/api';

// Variables de estado global para la paginación
let paginaActual = 1;
let totalPaginas = 1;
let totalProductos = 0;
let productosActuales = [];

/* ================= CARGAR PRODUCTOS PAGINADOS ================= */
async function cargarProductos(pagina = 1) {
  try {
    paginaActual = pagina;
    
    // Mostrar estado de carga en la interfaz
    document.getElementById('infoTabla').innerHTML =
      '<div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>Cargando productos...';

    // Obtener valores de los filtros y ordenamiento para pasarlos a la URL
    const busqueda = document.getElementById('busquedaGeneral').value.trim();
    const estante = document.getElementById('filtroEstante').value.trim();
    const [sortBy, sortOrder] = (document.getElementById('ordenarPor')?.value || 'nombre-asc').split('-');

    // Construcción de la URL con Query Parameters
    let url = `${API}/productos?page=${paginaActual}&limit=100&sortBy=${sortBy}&sortOrder=${sortOrder}`;
    if (busqueda) url += `&search=${encodeURIComponent(busqueda)}`;
    if (estante) url += `&estante=${encodeURIComponent(estante)}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error('No se pudieron cargar productos');

    const respuesta = await res.json();

    // Manejo adaptativo de la respuesta paginada
    if (Array.isArray(respuesta)) {
      productosActuales = respuesta;
      totalProductos = respuesta.length;
      totalPaginas = 1;
    } else {
      productosActuales = respuesta.data || [];
      totalProductos = respuesta.totalProductos || respuesta.total || productosActuales.length;
      totalPaginas = respuesta.totalPaginas || Math.ceil(totalProductos / 100) || 1;
    }

    renderizarProductos();
    actualizarControlesPaginacion();

  } catch (err) {
    document.getElementById('productosTable').innerHTML = `
      <tr>
        <td colspan="12" class="text-center py-4 text-danger">
          <i class="fas fa-exclamation-triangle fa-2x mb-2"></i><br>
          Error al cargar los productos: ${err.message}
        </td>
      </tr>`;
    document.getElementById('infoTabla').innerHTML =
      `<span class="text-danger">Error: ${err.message}</span>`;
    console.error(err);
  }
}

/* ================= RENDERIZAR PRODUCTOS ================= */
function renderizarProductos() {
  const tbody = document.getElementById('productosTable');

  if (productosActuales.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="12" class="text-center py-5">
          <i class="fas fa-box-open fa-2x text-muted mb-3"></i>
          <p class="text-muted mb-0">No se encontraron productos registrados</p>
        </td>
      </tr>`;

    document.getElementById('infoTabla').innerHTML = 'No hay datos para mostrar';
    return;
  }

  let html = '';

  productosActuales.forEach(p => {
    let existenciaClass = 'bg-success';
    if (p.ExistenciaTotal <= 5) existenciaClass = 'bg-danger';
    else if (p.ExistenciaTotal <= 15) existenciaClass = 'bg-warning text-dark';

    html += `
      <tr>
        <td class="fw-semibold">${p.NombreProducto || '-'}</td>
        <td><span class="badge bg-secondary">${p.Marca || '-'}</span></td>
        <td>${p.Proveedor || '-'}</td>
        <td><span class="badge bg-light text-dark border">${p.UnidadMedida || '-'}</span></td>
        <td><code>${p.NoParte || '-'}</code></td>
        <td><small class="text-muted">${p.CodigoBarras || '-'}</small></td>
        <td>
          <span class="badge ${existenciaClass} px-2 py-1">${p.ExistenciaTotal || 0}</span>
        </td>
        <td class="fw-bold text-primary">$${(p.PrecioVenta || 0).toFixed(2)}</td>
        <td><span class="badge bg-dark">${p.Estante || '-'}</span></td>
        <td><span class="badge bg-info text-dark">${p.Nivel || '-'}</span></td>
        <td class="text-center">
          <button class="btn btn-success btn-sm btn-action btn-entrada"
             data-noparte="${p.NoParte || ''}"
             data-nombre="${p.NombreProducto || ''}"
             title="Registrar Entrada">
            <i class="fas fa-plus"></i>
          </button>
        </td>
        <td>
          <div class="d-flex justify-content-center gap-1">
            <button class="btn btn-warning btn-sm btn-precio"
              data-id="${p._id}"
              data-precio="${p.PrecioVenta || 0}"
              data-noparte="${p.NoParte || ''}"
              data-nombre="${p.NombreProducto || ''}"
              title="Actualizar precio">
              <i class="fas fa-dollar-sign"></i>
            </button>

            <button class="btn btn-primary btn-sm btn-editar"
              data-id="${p._id}"
              title="Editar producto">
              <i class="fas fa-edit"></i>
            </button>

            <button class="btn btn-danger btn-sm btn-eliminar"
              data-id="${p._id}"
              title="Eliminar producto">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>`;
  });

  tbody.innerHTML = html;

  // Asignar listeners a los botones generados dinámicamente
  document.querySelectorAll('.btn-entrada').forEach(btn => {
    btn.addEventListener('click', () => abrirModalEntrada(btn.dataset.noparte, btn.dataset.nombre));
  });

  document.querySelectorAll('.btn-precio').forEach(btn => {
    btn.addEventListener('click', () => abrirModalPrecio(btn.dataset.id, Number(btn.dataset.precio), btn.dataset.noparte, btn.dataset.nombre));
  });

  document.querySelectorAll('.btn-editar').forEach(btn => {
    btn.addEventListener('click', () => abrirModalEditar(btn.dataset.id));
  });

  document.querySelectorAll('.btn-eliminar').forEach(btn => {
    btn.addEventListener('click', () => abrirModalEliminar(btn.dataset.id));
  });
}

/* ================= ACTUALIZAR NAVEGACIÓN Y PAGINACIÓN ================= */
function actualizarControlesPaginacion() {
  const infoTabla = document.getElementById('infoTabla');
  const indicadorPagina = document.getElementById('indicadorPagina');
  const btnAnterior = document.getElementById('btnPaginaAnterior');
  const btnSiguiente = document.getElementById('btnPaginaSiguiente');

  const inicio = totalProductos === 0 ? 0 : (paginaActual - 1) * 100 + 1;
  const fin = Math.min(paginaActual * 100, totalProductos);

  if (infoTabla) {
    infoTabla.innerHTML = `Mostrando <b>${inicio} - ${fin}</b> de <b>${totalProductos}</b> productos`;
  }

  if (indicadorPagina) {
    indicadorPagina.textContent = `Página ${paginaActual} de ${totalPaginas || 1}`;
  }

  if (btnAnterior) {
    btnAnterior.classList.toggle('disabled', paginaActual <= 1);
  }

  if (btnSiguiente) {
    btnSiguiente.classList.toggle('disabled', paginaActual >= totalPaginas);
  }
}

function cambiarPagina(nuevaPagina) {
  if (nuevaPagina >= 1 && nuevaPagina <= totalPaginas) {
    cargarProductos(nuevaPagina);
  }
}

/* ================= FILTROS Y BÚSQUEDA ================= */
let timeoutBusqueda;
function filtrarProductos() {
  clearTimeout(timeoutBusqueda);
  timeoutBusqueda = setTimeout(() => {
    cargarProductos(1);
  }, 300);
}

function limpiarFiltros() {
  document.getElementById('busquedaGeneral').value = '';
  document.getElementById('filtroEstante').value = '';
  document.getElementById('ordenarPor').value = 'nombre-asc';
  cargarProductos(1);
}

/* ================= ENTRADA ================= */
function abrirModalEntrada(noParte, nombreProducto) {
  document.getElementById('entradaForm').reset();
  document.getElementById('entradaNoParte').value = noParte;
  document.getElementById('entradaNoParteView').value = `${noParte} - ${nombreProducto}`;

  const hoy = new Date().toISOString().split('T')[0];
  document.getElementById('entradaFecha').value = hoy;

  const btn = document.getElementById('btnGuardarEntrada');
  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-save me-1"></i> Guardar Entrada';

  new bootstrap.Modal(document.getElementById('entradaModal')).show();
}

async function guardarEntrada() {
  const btn = document.getElementById('btnGuardarEntrada');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Guardando...';

  const payload = {
    NoParte: document.getElementById('entradaNoParte').value,
    FolioCompra: document.getElementById('entradaFolio').value,
    Cantidad: Number(document.getElementById('entradaCantidad').value),
    PrecioCompra: Number(document.getElementById('entradaPrecioCompra').value),
    FechaCompra: document.getElementById('entradaFecha').value
  };

  try {
    const res = await fetch(`${API}/entradas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error(await res.text());

    bootstrap.Modal.getInstance(document.getElementById('entradaModal')).hide();
    mostrarNotificacion('Entrada registrada exitosamente', 'success');
    await cargarProductos(paginaActual);

  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save me-1"></i> Guardar Entrada';
    mostrarNotificacion(`Error: ${err.message}`, 'danger');
  }
}

/* ================= PRECIO ================= */
function abrirModalPrecio(id, precio, noParte, nombreProducto) {
  document.getElementById('precioProductoId').value = id;
  document.getElementById('nuevoPrecio').value = precio;
  document.getElementById('precioActual').value = precio;
  document.getElementById('productoNoParteModal').textContent = noParte;
  document.getElementById('productoNombreModal').textContent = nombreProducto;

  new bootstrap.Modal(document.getElementById('precioModal')).show();
}

async function actualizarPrecio() {
  const nuevoPrecio = document.getElementById('nuevoPrecio').value;

  if (!nuevoPrecio || nuevoPrecio <= 0) {
    mostrarNotificacion('Ingrese un precio válido', 'warning');
    return;
  }

  try {
    const res = await fetch(`${API}/productos/${document.getElementById('precioProductoId').value}/precio`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nuevoPrecioVenta: Number(nuevoPrecio) })
    });

    if (!res.ok) throw new Error(await res.text());

    bootstrap.Modal.getInstance(document.getElementById('precioModal')).hide();
    mostrarNotificacion('Precio actualizado exitosamente', 'success');
    await cargarProductos(paginaActual);

  } catch (err) {
    mostrarNotificacion(`Error: ${err.message}`, 'danger');
  }
}

/* ================= EDITAR ================= */
function abrirModalEditar(id) {
  const producto = productosActuales.find(p => p._id === id);
  if (!producto) return;

  document.getElementById('editId').value = id;
  document.getElementById('editNombre').value = producto.NombreProducto || '';
  document.getElementById('editMarca').value = producto.Marca || '';
  document.getElementById('editProveedor').value = producto.Proveedor || '';
  document.getElementById('editUnidad').value = producto.UnidadMedida || '';
  document.getElementById('editNoParte').value = producto.NoParte || '';
  document.getElementById('editCodigo').value = producto.CodigoBarras || '';
  document.getElementById('editExistencia').value = producto.ExistenciaTotal || 0;
  document.getElementById('editPrecio').value = producto.PrecioVenta || 0;
  document.getElementById('editEstante').value = producto.Estante || '';
  document.getElementById('editNivel').value = producto.Nivel || '';

  new bootstrap.Modal(document.getElementById('editarModal')).show();
}

async function guardarEdicion() {
  const id = document.getElementById('editId').value;

  const data = {
    NombreProducto: document.getElementById('editNombre').value,
    Marca: document.getElementById('editMarca').value,
    Proveedor: document.getElementById('editProveedor').value,
    UnidadMedida: document.getElementById('editUnidad').value,
    CodigoBarras: document.getElementById('editCodigo').value,
    PrecioVenta: Number(document.getElementById('editPrecio').value),
    Estante: document.getElementById('editEstante').value,
    Nivel: document.getElementById('editNivel').value
  };

  try {
    const res = await fetch(`${API}/productos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!res.ok) throw new Error(await res.text());

    bootstrap.Modal.getInstance(document.getElementById('editarModal')).hide();
    mostrarNotificacion('Producto actualizado correctamente', 'success');
    await cargarProductos(paginaActual);

  } catch (err) {
    mostrarNotificacion(`Error: ${err.message}`, 'danger');
  }
}

/* ================= ELIMINAR ================= */
function abrirModalEliminar(id) {
  document.getElementById('deleteId').value = id;
  new bootstrap.Modal(document.getElementById('eliminarModal')).show();
}

async function confirmarEliminar() {
  const id = document.getElementById('deleteId').value;

  try {
    const res = await fetch(`${API}/productos/${id}`, { method: 'DELETE' });

    if (!res.ok) throw new Error(await res.text());

    bootstrap.Modal.getInstance(document.getElementById('eliminarModal')).hide();
    mostrarNotificacion('Producto eliminado correctamente', 'success');
    await cargarProductos(paginaActual);

  } catch (err) {
    mostrarNotificacion(`Error: ${err.message}`, 'danger');
  }
}

/* ================= NOTIFICACIONES ================= */
function mostrarNotificacion(mensaje, tipo = 'info') {
  const notificacion = document.createElement('div');
  notificacion.className = `alert alert-${tipo} alert-dismissible fade show position-fixed`;
  notificacion.style.cssText = `
    top: 20px;
    right: 20px;
    z-index: 9999;
    min-width: 300px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  `;

  notificacion.innerHTML = `
    ${mensaje}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;

  document.body.appendChild(notificacion);

  setTimeout(() => {
    if (notificacion.parentNode) {
      notificacion.parentNode.removeChild(notificacion);
    }
  }, 4000);
}

/* ================= INICIALIZACIÓN ================= */
document.addEventListener('DOMContentLoaded', function () {
  cargarProductos(1);

  document.getElementById('busquedaGeneral').addEventListener('keyup', function (e) {
    if (e.key === 'Enter') filtrarProductos();
  });

  const btnExportar = document.getElementById('btnExportarAlmacen');
  if (btnExportar) {
    btnExportar.addEventListener('click', exportarExcel);
  }
});

/* ================= EXPORTAR A EXCEL ================= */
function exportarExcel() {
  const tabla = document.getElementById('tableAlmacen');
  const filas = tabla.querySelectorAll('tr');
  const datos = [];

  filas.forEach(fila => {
    const row = [];
    const columnas = fila.querySelectorAll('th, td');

    columnas.forEach(col => {
      if (!col.classList.contains('no-exportar')) {
        row.push(col.innerText.trim());
      }
    });

    if (row.length > 0) datos.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(datos);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
  XLSX.writeFile(wb, `Inventario_${new Date().toISOString().slice(0, 10)}.xlsx`);
}