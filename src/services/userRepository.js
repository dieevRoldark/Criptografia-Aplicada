import { crearHashSha256 } from './cryptoService.js'

const USERS_KEY = 'contabilidad.usuarios'
const PENDING_REGISTER_EMAIL_KEY = 'contabilidad.registroPendiente.email'

export function normalizarEmail(email) {
    return email.trim().toLowerCase()
}

export function esEmailValido(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizarEmail(email))
}

export function validarPassword(password) {
    if (password.length < 8) {
        return { ok: false, mensaje: 'La contrasena debe tener minimo 8 caracteres.' }
    }

    if (!/[A-Z]/.test(password)) {
        return { ok: false, mensaje: 'La contrasena debe incluir una mayuscula.' }
    }

    if (!/[a-z]/.test(password)) {
        return { ok: false, mensaje: 'La contrasena debe incluir una minuscula.' }
    }

    if (!/[0-9]/.test(password)) {
        return { ok: false, mensaje: 'La contrasena debe incluir un numero.' }
    }

    return { ok: true }
}

export async function buscarUsuarioPorEmail(email) {
    const emailNormalizado = normalizarEmail(email)
    const usuario = leerUsuarios().find((item) => item.email === emailNormalizado)

    return usuario ? mapearUsuarioPublico(usuario) : null
}

export async function registrarUsuario({ nombre, email, password }) {
    const emailNormalizado = normalizarEmail(email)
    const usuarios = leerUsuarios()
    const existeUsuario = usuarios.some((usuario) => usuario.email === emailNormalizado)

    if (existeUsuario) {
        return {
            ok: false,
            motivo: 'USUARIO_EXISTENTE',
            mensaje: 'Este correo ya esta registrado.'
        }
    }

    const usuario = {
        id: crearIdUsuario(),
        nombre: nombre.trim(),
        email: emailNormalizado,
        passwordHash: await crearHashSha256(password),
        creadoEn: new Date().toISOString(),
        pendienteSincronizar: true
    }

    usuarios.push(usuario)
    guardarUsuarios(usuarios)

    return {
        ok: true,
        usuario: mapearUsuarioPublico(usuario)
    }
}

export async function validarCredenciales(email, password) {
    const emailNormalizado = normalizarEmail(email)
    const usuario = leerUsuarios().find((item) => item.email === emailNormalizado)

    if (!usuario) {
        return {
            ok: false,
            motivo: 'NO_REGISTRADO',
            mensaje: 'Este correo no esta registrado.'
        }
    }

    const passwordHash = await crearHashSha256(password)

    if (passwordHash !== usuario.passwordHash) {
        return {
            ok: false,
            motivo: 'PASSWORD_INVALIDA',
            mensaje: 'La contrasena no coincide con este correo.'
        }
    }

    return {
        ok: true,
        usuario: mapearUsuarioPublico(usuario)
    }
}

export function guardarEmailRegistroPendiente(email) {
    localStorage.setItem(PENDING_REGISTER_EMAIL_KEY, normalizarEmail(email))
}

export function obtenerEmailRegistroPendiente() {
    return localStorage.getItem(PENDING_REGISTER_EMAIL_KEY) || ''
}

export function limpiarRegistroPendiente() {
    localStorage.removeItem(PENDING_REGISTER_EMAIL_KEY)
}

function leerUsuarios() {
    const usuariosGuardados = localStorage.getItem(USERS_KEY)

    if (!usuariosGuardados) {
        return []
    }

    try {
        const usuarios = JSON.parse(usuariosGuardados)
        return Array.isArray(usuarios) ? usuarios : []
    } catch (error) {
        localStorage.removeItem(USERS_KEY)
        return []
    }
}

function guardarUsuarios(usuarios) {
    localStorage.setItem(USERS_KEY, JSON.stringify(usuarios))
}

function crearIdUsuario() {
    if (globalThis.crypto?.randomUUID) {
        return globalThis.crypto.randomUUID()
    }

    return `user-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function mapearUsuarioPublico(usuario) {
    return {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        creadoEn: usuario.creadoEn,
        pendienteSincronizar: usuario.pendienteSincronizar
    }
}
