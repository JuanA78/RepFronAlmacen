 function mostrarToast(mensaje, tipo = 'danger') {
      const toast = document.getElementById('mainToast');
      const toastMessage = document.getElementById('toastMessage');
      const iconClass = tipo === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill';
      
      toastMessage.innerHTML = `<i class="bi ${iconClass} me-3 fs-5"></i><span>${mensaje}</span>`;
      toast.className = `toast toast-custom text-bg-${tipo} border-0`;
      
      const toastInstance = new bootstrap.Toast(toast);
      toastInstance.show();
    }

    // Función para validar código de barras con diferentes formatos
    function validarCodigoBarras(codigo) {
      // Eliminar espacios en blanco al inicio y final
      codigo = codigo.trim();
      
      // OPCIÓN 1: Alfanumérico (letras, números, guiones) - 8 a 20 caracteres
      const regexAlfanumerico = /^[A-Za-z0-9\-_]{8,20}$/;
      
      // OPCIÓN 2: Solo números (compatibilidad con EAN/UPC) - 8 a 13 dígitos
      const regexNumerico = /^[0-9]{8,25}$/;
      
      // OPCIÓN 3: Más flexible - permite guiones, puntos y espacios
      const regexFlexible = /^[A-Za-z0-9\-\s\.]{5,30}$/;
      
      // Elegir el patrón que prefieras:
      // return regexAlfanumerico.test(codigo); // Para alfanumérico estricto
      // return regexNumerico.test(codigo); // Para solo números (original)
      return regexFlexible.test(codigo); // Para formato más flexible
    }

    document.getElementById('productForm').addEventListener('submit', async e => {
      e.preventDefault();

      const codigo = document.getElementById('barcode').value;
      
      // Validar código de barras con la función que elijas
      if (!validarCodigoBarras(codigo)) {
        mostrarToast('Código de barras inválido. Debe contener entre 5 y 30 caracteres (letras, números, guiones, puntos o espacios).');
        document.getElementById('barcode').focus();
        return;
      }

      const precio = parseFloat(document.getElementById('price').value);
      if (precio < 0 || isNaN(precio)) {
        mostrarToast('Por favor, ingrese un precio válido mayor o igual a 0.');
        document.getElementById('price').focus();
        return;
      }

      const producto = {
        NombreProducto: document.getElementById('productName').value.trim(),
        Marca: document.getElementById('brand').value.trim(),
        Proveedor: document.getElementById('provider').value.trim(),
        UnidadMedida: document.getElementById('unit').value.trim(),
        NoParte: document.getElementById('partNumber').value.trim(),
        CodigoBarras: codigo.trim(), // Limpiar espacios
        PrecioVenta: precio,
        Estante: document.getElementById('state').value,
        Nivel: document.getElementById('level').value
      };

      try {
        // Mostrar indicador de carga
        const submitBtn = document.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Procesando...';
        submitBtn.disabled = true;




const userSession = JSON.parse(localStorage.getItem('userSession'));
const token = userSession?.token;

if (!token) {
    mostrarToast('No hay una sesión activa. Inicia sesión nuevamente.');
    return;
}

const response = await fetch('https://apisalmacenht.onrender.com/api/productos', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(producto)
});
        // Restaurar botón
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;

        if (response.ok) {
          mostrarToast('Producto registrado correctamente en el inventario', 'success');
          e.target.reset();
          document.getElementById('productName').focus();
        } else {
          const err = await response.json();
          mostrarToast(err.error || 'Error al guardar el producto. Verifique los datos.');
        }
      } catch (error) {
        // Restaurar botón en caso de error
        const submitBtn = document.querySelector('button[type="submit"]');
        submitBtn.innerHTML = '<i class="bi bi-check-circle me-2"></i>Registrar Producto';
        submitBtn.disabled = false;
        
        mostrarToast('Error de conexión con el servidor. Verifique su conexión a internet.');
      }
    });

    // Enfocar el primer campo al cargar la página
    document.addEventListener('DOMContentLoaded', function() {
      document.getElementById('productName').focus();
    });
    
    // Validación en tiempo real del código de barras
    document.getElementById('barcode').addEventListener('input', function(e) {
      const codigo = e.target.value;
      const formatoValido = validarCodigoBarras(codigo);
      
      if (codigo.length > 0) {
        if (formatoValido) {
          e.target.classList.remove('is-invalid');
          e.target.classList.add('is-valid');
        } else {
          e.target.classList.remove('is-valid');
          e.target.classList.add('is-invalid');
        }
      } else {
        e.target.classList.remove('is-valid', 'is-invalid');
      }
    });