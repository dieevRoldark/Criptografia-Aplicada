const AUTH_KEY = 'contabilidad.usuarioActivo'

function leerUsuario(storage) {
    const usuarioGuardado = storage.getItem(AUTH_KEY)

    if (!usuarioGuardado) {
        return null
    }

    try {
        return JSON.parse(usuarioGuardado)
    } catch (error) {
        storage.removeItem(AUTH_KEY)
        return null
    }
}

export function obtenerUsuarioActivo() {
    return leerUsuario(sessionStorage) || leerUsuario(localStorage)
}

export function estaAutenticado() {
    return Boolean(obtenerUsuarioActivo())
}

export function iniciarSesion({ usuario, email, recordar }) {
    const emailSesion = usuario?.email || email || ''

    const usuarioSesion = {
        id: usuario?.id || null,
        email: emailSesion,
        nombre: usuario?.nombre || emailSesion.split('@')[0] || 'Usuario',
        fechaIngreso: new Date().toISOString()
    }

    cerrarSesion()

    const storage = recordar ? localStorage : sessionStorage
    storage.setItem(AUTH_KEY, JSON.stringify(usuarioSesion))

    return usuarioSesion
}

export function cerrarSesion() {
    localStorage.removeItem(AUTH_KEY)
    sessionStorage.removeItem(AUTH_KEY)
}
