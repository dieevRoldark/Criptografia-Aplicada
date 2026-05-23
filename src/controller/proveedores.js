import { cifrarHibrido, descifrarHibrido, esPaqueteCifrado } from '../services/cryptoService.js'
import { mostrarNotificacionCriptografica } from '../services/cryptoNotification.js'

const PROVEEDORES_KEY = 'contabilidad.proveedores'
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

let proveedores = []

export async function init() {
    proveedores = await leerProveedores()

    configurarFormularioProveedor()
    configurarTablaProveedores()
    cargarTablaProveedores()
}

function configurarFormularioProveedor() {
    const btnNuevo = document.getElementById('btn-nuevo-proveedor')
    const btnCancelar = document.getElementById('btn-cancelar-proveedor')
    const form = document.getElementById('proveedor-form')

    btnNuevo?.addEventListener('click', () => abrirFormularioProveedor())
    btnCancelar?.addEventListener('click', cerrarFormularioProveedor)
    form?.addEventListener('submit', guardarProveedorDesdeFormulario)
}

function configurarTablaProveedores() {
    const tbody = document.querySelector('#tabla-proveedores tbody')

    tbody?.addEventListener('click', (event) => {
        if (!(event.target instanceof Element)) {
            return
        }

        const boton = event.target.closest('button[data-action]')

        if (!boton) {
            return
        }

        const id = boton.dataset.id

        if (boton.dataset.action === 'editar') {
            editarProveedor(id)
        }

        if (boton.dataset.action === 'eliminar') {
            eliminarProveedor(id)
        }
    })
}

async function guardarProveedorDesdeFormulario(event) {
    event.preventDefault()

    const form = event.currentTarget
    const proveedor = obtenerProveedorDesdeFormulario(form)

    if (!proveedor.ok) {
        mostrarMensaje(proveedor.mensaje, 'error')
        return
    }

    const proveedorExistente = proveedores.find((item) => item.nit === proveedor.data.nit && item.id !== proveedor.data.id)

    if (proveedorExistente) {
        mostrarMensaje('Ya existe un proveedor con este nit.', 'error')
        return
    }

    if (proveedor.data.id) {
        proveedores = proveedores.map((item) => item.id === proveedor.data.id ? { ...item, ...proveedor.data } : item)
        await guardarProveedores(proveedores)
        cargarTablaProveedores()
        cerrarFormularioProveedor()
        mostrarMensaje('Proveedor actualizado correctamente.', 'success')
        await notificarProveedorCifrado(proveedor.data, 'Proveedor actualizado con cifrado')
    } else {
        const nuevoProveedor = {
            ...proveedor.data,
            id: crearIdProveedor(),
            creadoEn: new Date().toISOString()
        }

        proveedores.push(nuevoProveedor)
        await guardarProveedores(proveedores)
        cargarTablaProveedores()
        cerrarFormularioProveedor()
        mostrarMensaje('Proveedor guardado correctamente.', 'success')
        await notificarProveedorCifrado(nuevoProveedor, 'Proveedor guardado con cifrado')
    }
}

function obtenerProveedorDesdeFormulario(form) {
    const formData = new FormData(form)
    const id = obtenerTextoFormulario(formData, 'id')
    const nit = obtenerTextoFormulario(formData, 'nit')
    const nombre = obtenerTextoFormulario(formData, 'nombre')
    const telefono = obtenerTextoFormulario(formData, 'telefono')
    const correo = obtenerTextoFormulario(formData, 'correo')
    const direccion = obtenerTextoFormulario(formData, 'direccion')

    if (!nit || !nombre) {
        return { ok: false, mensaje: 'Ingresa el nit y el nombre del proveedor.' }
    }

    if (correo && !EMAIL_REGEX.test(correo)) {
        return { ok: false, mensaje: 'Ingresa un correo valido.' }
    }

    return {
        ok: true,
        data: {
            id,
            nit,
            nombre,
            telefono,
            correo,
            direccion,
            actualizadoEn: new Date().toISOString()
        }
    }
}

function abrirFormularioProveedor(proveedor = null) {
    const wrapper = document.getElementById('proveedor-form-wrapper')
    const form = document.getElementById('proveedor-form')
    const titulo = document.getElementById('proveedor-form-titulo')
    const submitButton = document.getElementById('btn-guardar-proveedor')

    if (!wrapper || !form || !titulo || !submitButton) {
        return
    }

    form.reset()
    limpiarMensaje()

    if (proveedor) {
        form.elements.id.value = proveedor.id || ''
        form.elements.nit.value = proveedor.nit || ''
        form.elements.nombre.value = proveedor.nombre || ''
        form.elements.telefono.value = proveedor.telefono || ''
        form.elements.correo.value = proveedor.correo || ''
        form.elements.direccion.value = proveedor.direccion || ''
        titulo.textContent = 'Editar proveedor'
        submitButton.textContent = 'Actualizar proveedor'
    } else {
        form.elements.id.value = ''
        titulo.textContent = 'Nuevo proveedor'
        submitButton.textContent = 'Guardar proveedor'
    }

    wrapper.hidden = false
    form.elements.nit.focus()
}

function cerrarFormularioProveedor() {
    const wrapper = document.getElementById('proveedor-form-wrapper')
    const form = document.getElementById('proveedor-form')

    form?.reset()
    limpiarMensaje()

    if (wrapper) {
        wrapper.hidden = true
    }
}

function editarProveedor(id) {
    const proveedor = proveedores.find((item) => item.id === id)

    if (!proveedor) {
        mostrarMensaje('No se encontro el proveedor seleccionado.', 'error')
        return
    }

    abrirFormularioProveedor(proveedor)
}

async function eliminarProveedor(id) {
    const proveedor = proveedores.find((item) => item.id === id)

    if (!proveedor) {
        mostrarMensaje('No se encontro el proveedor seleccionado.', 'error')
        return
    }

    const confirmaEliminar = confirm(`Deseas eliminar el proveedor "${proveedor.nombre}"?`)

    if (!confirmaEliminar) {
        return
    }

    proveedores = proveedores.filter((item) => item.id !== id)
    await guardarProveedores(proveedores)
    cargarTablaProveedores()
    cerrarFormularioProveedor()
    mostrarMensaje('Proveedor eliminado correctamente.', 'success')
}

function cargarTablaProveedores() {
    const tbody = document.querySelector('#tabla-proveedores tbody')

    if (!tbody) {
        return
    }

    tbody.innerHTML = ''

    if (proveedores.length === 0) {
        const filaVacia = document.createElement('tr')
        const celdaVacia = document.createElement('td')

        celdaVacia.colSpan = 7
        celdaVacia.textContent = 'No hay proveedores registrados.'
        filaVacia.append(celdaVacia)
        tbody.append(filaVacia)
        return
    }

    proveedores.forEach((proveedor) => {
        const fila = document.createElement('tr')

        agregarCelda(fila, proveedor.nit)
        agregarCelda(fila, proveedor.nombre)
        agregarCelda(fila, proveedor.telefono || '-')
        agregarCelda(fila, proveedor.correo || '-')
        agregarCelda(fila, proveedor.direccion || '-')
        agregarCeldaAccion(fila, 'editar', proveedor.id, 'Editar')
        agregarCeldaAccion(fila, 'eliminar', proveedor.id, 'Borrar')

        tbody.append(fila)
    })
}

function agregarCelda(fila, valor) {
    const celda = document.createElement('td')

    celda.textContent = valor
    fila.append(celda)
}

function agregarCeldaAccion(fila, accion, id, texto) {
    const celda = document.createElement('td')
    const boton = document.createElement('button')

    boton.className = `product__action-button product__action-button--${accion}`
    boton.type = 'button'
    boton.dataset.action = accion
    boton.dataset.id = id
    boton.textContent = texto
    boton.setAttribute('aria-label', `${texto} proveedor`)

    celda.append(boton)
    fila.append(celda)
}

async function leerProveedores() {
    const proveedoresGuardados = localStorage.getItem(PROVEEDORES_KEY)

    if (!proveedoresGuardados) {
        return []
    }

    try {
        const proveedoresParseados = JSON.parse(proveedoresGuardados)

        if (!Array.isArray(proveedoresParseados)) {
            return []
        }

        const proveedoresDescifrados = []
        let requiereMigracion = false

        for (const proveedor of proveedoresParseados) {
            if (proveedor?.datos && esPaqueteCifrado(proveedor.datos)) {
                const datosDescifrados = await descifrarHibrido(proveedor.datos)

                proveedoresDescifrados.push({
                    id: proveedor.id,
                    creadoEn: proveedor.creadoEn,
                    actualizadoEn: proveedor.actualizadoEn,
                    ...datosDescifrados
                })
            } else {
                requiereMigracion = true
                proveedoresDescifrados.push(proveedor)
            }
        }

        if (requiereMigracion) {
            await guardarProveedores(proveedoresDescifrados)
        }

        return proveedoresDescifrados
    } catch (error) {
        console.error('No se pudieron leer los proveedores cifrados:', error)
        return []
    }
}

async function guardarProveedores(proveedoresActualizados) {
    const proveedoresCifrados = await Promise.all(
        proveedoresActualizados.map(async (proveedor) => ({
            id: proveedor.id,
            creadoEn: proveedor.creadoEn,
            actualizadoEn: proveedor.actualizadoEn,
            datos: await cifrarHibrido({
                nit: proveedor.nit,
                nombre: proveedor.nombre,
                telefono: proveedor.telefono,
                correo: proveedor.correo,
                direccion: proveedor.direccion
            })
        }))
    )

    localStorage.setItem(PROVEEDORES_KEY, JSON.stringify(proveedoresCifrados))
}

async function notificarProveedorCifrado(proveedor, titulo) {
    const paqueteCifrado = await cifrarHibrido({
        nit: proveedor.nit,
        nombre: proveedor.nombre,
        telefono: proveedor.telefono,
        correo: proveedor.correo,
        direccion: proveedor.direccion
    })
    const proveedorDescifrado = await descifrarHibrido(paqueteCifrado)

    mostrarNotificacionCriptografica({
        titulo,
        descripcion: 'Los campos del proveedor se guardan con AES-GCM y la clave AES queda protegida con RSA-OAEP.',
        campos: [
            { etiqueta: 'Datos cifrados', valor: paqueteCifrado.datosCifrados },
            { etiqueta: 'Clave AES cifrada con RSA', valor: paqueteCifrado.claveCifrada },
            { etiqueta: 'Nit descifrado', valor: proveedorDescifrado.nit },
            { etiqueta: 'Nombre descifrado', valor: proveedorDescifrado.nombre },
            { etiqueta: 'Telefono descifrado', valor: proveedorDescifrado.telefono || '-' },
            { etiqueta: 'Correo descifrado', valor: proveedorDescifrado.correo || '-' },
            { etiqueta: 'Direccion descifrada', valor: proveedorDescifrado.direccion || '-' }
        ]
    })
}

function mostrarMensaje(mensaje, tipo) {
    const mensajeElemento = document.getElementById('proveedor-form-mensaje')

    if (!mensajeElemento) {
        return
    }

    mensajeElemento.textContent = mensaje
    mensajeElemento.dataset.type = tipo
}

function limpiarMensaje() {
    const mensajeElemento = document.getElementById('proveedor-form-mensaje')

    if (!mensajeElemento) {
        return
    }

    mensajeElemento.textContent = ''
    delete mensajeElemento.dataset.type
}

function obtenerTextoFormulario(formData, campo) {
    const valor = formData.get(campo)

    return typeof valor === 'string' ? valor.trim() : ''
}

function crearIdProveedor() {
    if (globalThis.crypto?.randomUUID) {
        return globalThis.crypto.randomUUID()
    }

    return `proveedor-${Date.now()}-${Math.random().toString(16).slice(2)}`
}
