import { cifrarHibrido, descifrarHibrido, esPaqueteCifrado } from '../services/cryptoService.js'
import { mostrarNotificacionCriptografica } from '../services/cryptoNotification.js'

const PERFIL_KEY = 'contabilidad.perfil'
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const FOTO_DEFAULT = 'public/img/profile-img.jpg'

let perfil = null

export async function init() {
    perfil = await leerPerfil()
    poblarFormularios(perfil)
    configurarFormularios()
    configurarFoto()
}

function configurarFormularios() {
    const formPersonal = document.getElementById('form-info-personal')
    const formNegocio = document.getElementById('form-info-negocio')

    formPersonal?.addEventListener('submit', guardarInfoPersonal)
    formNegocio?.addEventListener('submit', guardarInfoNegocio)
}

function configurarFoto() {
    const btnCambiar = document.querySelector('.perfil__button button[aria-label="Cambiar foto de perfil"]')
    const btnRemover = document.querySelector('.perfil__button button[aria-label="Remover foto de perfil"]')
    const inputFoto = document.getElementById('perfil-foto-input')

    btnCambiar?.addEventListener('click', () => inputFoto?.click())
    btnRemover?.addEventListener('click', removerFoto)
    inputFoto?.addEventListener('change', cambiarFoto)
}

async function guardarInfoPersonal(event) {
    event.preventDefault()

    const form = event.currentTarget
    const datos = obtenerDatosFormulario(form, ['nombre', 'telefono', 'email', 'direccion'])

    if (!datos.nombre) {
        mostrarMensaje('Ingresa tu nombre.', 'error')
        return
    }

    if (datos.email && !EMAIL_REGEX.test(datos.email)) {
        mostrarMensaje('Ingresa un correo valido.', 'error')
        return
    }

    perfil = {
        ...perfil,
        personal: {
            ...perfil?.personal,
            ...datos,
            actualizadoEn: new Date().toISOString()
        }
    }

    await guardarPerfil(perfil)
    poblarEncabezado(perfil)
    mostrarMensaje('Informacion personal guardada correctamente.', 'success')
    await notificarPerfilCifrado(perfil.personal, 'Info personal guardada con cifrado')
}

async function guardarInfoNegocio(event) {
    event.preventDefault()

    const form = event.currentTarget
    const datos = obtenerDatosFormulario(form, ['nombre-negocio', 'tipo-negocio', 'ubicacion-negocio', 'fecha-creacion'])

    perfil = {
        ...perfil,
        negocio: {
            ...perfil?.negocio,
            ...datos,
            actualizadoEn: new Date().toISOString()
        }
    }

    await guardarPerfil(perfil)
    poblarEncabezado(perfil)
    mostrarMensaje('Informacion del negocio guardada correctamente.', 'success')
    await notificarPerfilCifrado(perfil.negocio, 'Info del negocio guardada con cifrado')
}

function poblarFormularios(perfil) {
    if (!perfil) return

    poblarFormulario('form-info-personal', perfil.personal)
    poblarFormulario('form-info-negocio', perfil.negocio)
    poblarEncabezado(perfil)

    if (perfil.foto) {
        const img = document.getElementById('perfil-foto-img')
        if (img) img.src = perfil.foto
    }
}

function poblarEncabezado(perfil) {
    if (!perfil) return

    const h3 = document.querySelector('.perfil-description h3')
    const p = document.querySelector('.perfil-description p')

    if (h3 && perfil.negocio?.['nombre-negocio']) {
        h3.textContent = perfil.negocio['nombre-negocio']
    }

    if (p && perfil.negocio?.['tipo-negocio']) {
        p.textContent = perfil.negocio['tipo-negocio']
    }
}

function poblarFormulario(formId, datos) {
    const form = document.getElementById(formId)
    if (!form || !datos) return

    for (const [nombre, valor] of Object.entries(datos)) {
        const input = form.elements.namedItem(nombre)
        if (input && !input.disabled) {
            input.value = valor ?? ''
        }
    }
}

function obtenerDatosFormulario(form, campos) {
    const formData = new FormData(form)
    const datos = {}

    for (const campo of campos) {
        const valor = formData.get(campo)
        datos[campo] = typeof valor === 'string' ? valor.trim() : ''
    }

    return datos
}

function cambiarFoto(event) {
    const archivo = event.target.files?.[0]
    if (!archivo) return

    const lector = new FileReader()
    lector.onload = async () => {
        const dataURL = lector.result
        const img = document.getElementById('perfil-foto-img')
        if (img) img.src = dataURL

        perfil = { ...perfil, foto: dataURL }
        await guardarPerfil(perfil)
        mostrarMensaje('Foto de perfil actualizada.', 'success')
    }
    lector.readAsDataURL(archivo)

    event.target.value = ''
}

async function removerFoto() {
    const img = document.getElementById('perfil-foto-img')
    if (img) img.src = FOTO_DEFAULT

    if (perfil) {
        delete perfil.foto
        await guardarPerfil(perfil)
    }

    mostrarMensaje('Foto de perfil removida.', 'success')
}

async function leerPerfil() {
    const perfilGuardado = localStorage.getItem(PERFIL_KEY)
    if (!perfilGuardado) return null

    try {
        const datos = JSON.parse(perfilGuardado)

        if (datos?.datos && esPaqueteCifrado(datos.datos)) {
            const datosDescifrados = await descifrarHibrido(datos.datos)
            return {
                personal: datosDescifrados.personal,
                negocio: datosDescifrados.negocio,
                foto: datos.foto || null
            }
        }

        return datos
    } catch (error) {
        console.error('No se pudo leer el perfil cifrado:', error)
        return null
    }
}

async function guardarPerfil(perfilActualizado) {
    const datosCifrados = await cifrarHibrido({
        personal: {
            nombre: perfilActualizado.personal?.nombre || '',
            telefono: perfilActualizado.personal?.telefono || '',
            email: perfilActualizado.personal?.email || '',
            direccion: perfilActualizado.personal?.direccion || ''
        },
        negocio: {
            'nombre-negocio': perfilActualizado.negocio?.['nombre-negocio'] || '',
            'tipo-negocio': perfilActualizado.negocio?.['tipo-negocio'] || '',
            'ubicacion-negocio': perfilActualizado.negocio?.['ubicacion-negocio'] || '',
            'fecha-creacion': perfilActualizado.negocio?.['fecha-creacion'] || ''
        }
    })

    localStorage.setItem(PERFIL_KEY, JSON.stringify({
        datos: datosCifrados,
        foto: perfilActualizado.foto || null
    }))
}

async function notificarPerfilCifrado(datos, titulo) {
    const paqueteCifrado = await cifrarHibrido(datos)
    const datosDescifrados = await descifrarHibrido(paqueteCifrado)

    const campos = Object.entries(datosDescifrados).map(([etiqueta, valor]) => ({
        etiqueta,
        valor: String(valor ?? '-')
    }))

    mostrarNotificacionCriptografica({
        titulo,
        descripcion: 'Los datos del perfil se guardan con AES-GCM y la clave AES queda protegida con RSA-OAEP.',
        campos: [
            { etiqueta: 'Datos cifrados', valor: paqueteCifrado.datosCifrados },
            { etiqueta: 'Clave AES cifrada con RSA', valor: paqueteCifrado.claveCifrada },
            ...campos
        ]
    })
}

function mostrarMensaje(mensaje, tipo) {
    const mensajeElemento = document.getElementById('perfil-mensaje')
    if (!mensajeElemento) return

    mensajeElemento.textContent = mensaje
    mensajeElemento.dataset.type = tipo
}
