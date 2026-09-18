// Guardar el fetch original
const fetchOriginal = window.fetch;

// Sobrescribir fetch globalmente
window.fetch = async function (url, opciones = {}) {

    // Obtener sesión actual
    const userSession = JSON.parse(
        localStorage.getItem('userSession')
    );

    const token = userSession?.token;

    // Crear headers
    const headers = {
        ...(opciones.headers || {})
    };

    // Agregar token si existe
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // Ejecutar fetch original
    return fetchOriginal(url, {
        ...opciones,
        headers
    });
};