import { cifrarHibrido, descifrarHibrido, esPaqueteCifrado } from '../services/cryptoService.js'
import { mostrarNotificacionCriptografica } from '../services/cryptoNotification.js'

const CLIENTES_KEY = 'contabilidad.clientes'
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

let clientes = []

export async function init() {
    clientes = await leerClientes()

    configurarFormularioCliente()
    configurarTablaClientes()
    cargarTablaClientes()
}

function configurarFormularioCliente() {
    const btnNuevo = document.getElementById('btn-nuevo-cliente')
    const btnCancelar = document.getElementById('btn-cancelar-cliente')
    const form = document.getElementById('cliente-form')

    btnNuevo?.addEventListener('click', () => abrirFormularioCliente())
    btnCancelar?.addEventListener('click', cerrarFormularioCliente)
    form?.addEventListener('submit', guardarClienteDesdeFormulario)
}

function configurarTablaClientes() {
    const tbody = document.querySelector('#tabla-clientes tbody')

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
            editarCliente(id)
        }

        if (boton.dataset.action === 'eliminar') {
            eliminarCliente(id)
        }
    })
}

async function guardarClienteDesdeFormulario(event) {
    event.preventDefault()

    const form = event.currentTarget
    const cliente = obtenerClienteDesdeFormulario(form)

    if (!cliente.ok) {
        mostrarMensaje(cliente.mensaje, 'error')
        return
    }

    const clienteExistente = clientes.find((item) => item.cedula === cliente.data.cedula && item.id !== cliente.data.id)

    if (clienteExistente) {
        mostrarMensaje('Ya existe un cliente con esta cedula.', 'error')
        return
    }

    if (cliente.data.id) {
        clientes = clientes.map((item) => item.id === cliente.data.id ? { ...item, ...cliente.data } : item)
        await guardarClientes(clientes)
        cargarTablaClientes()
        cerrarFormularioCliente()
        mostrarMensaje('Cliente actualizado correctamente.', 'success')
        await notificarClienteCifrado(cliente.data, 'Cliente actualizado con cifrado')
    } else {
        const nuevoCliente = {
            ...cliente.data,
            id: crearIdCliente(),
            creadoEn: new Date().toISOString()
        }

        clientes.push(nuevoCliente)
        await guardarClientes(clientes)
        cargarTablaClientes()
        cerrarFormularioCliente()
        mostrarMensaje('Cliente guardado correctamente.', 'success')
        await notificarClienteCifrado(nuevoCliente, 'Cliente guardado con cifrado')
    }
}

function obtenerClienteDesdeFormulario(form) {
    const formData = new FormData(form)
    const id = obtenerTextoFormulario(formData, 'id')
    const cedula = obtenerTextoFormulario(formData, 'cedula')
    const nombre = obtenerTextoFormulario(formData, 'nombre')
    const telefono = obtenerTextoFormulario(formData, 'telefono')
    const correo = obtenerTextoFormulario(formData, 'correo')
    const direccion = obtenerTextoFormulario(formData, 'direccion')

    if (!cedula || !nombre) {
        return { ok: false, mensaje: 'Ingresa la cedula y el nombre del cliente.' }
    }

    if (correo && !EMAIL_REGEX.test(correo)) {
        return { ok: false, mensaje: 'Ingresa un correo valido.' }
    }

    return {
        ok: true,
        data: {
            id,
            cedula,
            nombre,
            telefono,
            correo,
            direccion,
            actualizadoEn: new Date().toISOString()
        }
    }
}

function abrirFormularioCliente(cliente = null) {
    const wrapper = document.getElementById('cliente-form-wrapper')
    const form = document.getElementById('cliente-form')
    const titulo = document.getElementById('cliente-form-titulo')
    const submitButton = document.getElementById('btn-guardar-cliente')

    if (!wrapper || !form || !titulo || !submitButton) {
        return
    }

    form.reset()
    limpiarMensaje()

    if (cliente) {
        form.elements.id.value = cliente.id || ''
        form.elements.cedula.value = cliente.cedula || ''
        form.elements.nombre.value = cliente.nombre || ''
        form.elements.telefono.value = cliente.telefono || ''
        form.elements.correo.value = cliente.correo || ''
        form.elements.direccion.value = cliente.direccion || ''
        titulo.textContent = 'Editar cliente'
        submitButton.textContent = 'Actualizar cliente'
    } else {
        form.elements.id.value = ''
        titulo.textContent = 'Nuevo cliente'
        submitButton.textContent = 'Guardar cliente'
    }

    wrapper.hidden = false
    form.elements.cedula.focus()
}

function cerrarFormularioCliente() {
    const wrapper = document.getElementById('cliente-form-wrapper')
    const form = document.getElementById('cliente-form')

    form?.reset()
    limpiarMensaje()

    if (wrapper) {
        wrapper.hidden = true
    }
}

function editarCliente(id) {
    const cliente = clientes.find((item) => item.id === id)

    if (!cliente) {
        mostrarMensaje('No se encontro el cliente seleccionado.', 'error')
        return
    }

    abrirFormularioCliente(cliente)
}

async function eliminarCliente(id) {
    const cliente = clientes.find((item) => item.id === id)

    if (!cliente) {
        mostrarMensaje('No se encontro el cliente seleccionado.', 'error')
        return
    }

    const confirmaEliminar = confirm(`Deseas eliminar el cliente "${cliente.nombre}"?`)

    if (!confirmaEliminar) {
        return
    }

    clientes = clientes.filter((item) => item.id !== id)
    await guardarClientes(clientes)
    cargarTablaClientes()
    cerrarFormularioCliente()
    mostrarMensaje('Cliente eliminado correctamente.', 'success')
}

function cargarTablaClientes() {
    const tbody = document.querySelector('#tabla-clientes tbody')

    if (!tbody) {
        return
    }

    tbody.innerHTML = ''

    if (clientes.length === 0) {
        const filaVacia = document.createElement('tr')
        const celdaVacia = document.createElement('td')

        celdaVacia.colSpan = 7
        celdaVacia.textContent = 'No hay clientes registrados.'
        filaVacia.append(celdaVacia)
        tbody.append(filaVacia)
        return
    }

    clientes.forEach((cliente) => {
        const fila = document.createElement('tr')

        agregarCelda(fila, cliente.cedula)
        agregarCelda(fila, cliente.nombre)
        agregarCelda(fila, cliente.telefono || '-')
        agregarCelda(fila, cliente.correo || '-')
        agregarCelda(fila, cliente.direccion || '-')
        agregarCeldaAccion(fila, 'editar', cliente.id, 'Editar')
        agregarCeldaAccion(fila, 'eliminar', cliente.id, 'Borrar')

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
    boton.setAttribute('aria-label', `${texto} cliente`)

    celda.append(boton)
    fila.append(celda)
}

async function leerClientes() {
    const clientesGuardados = localStorage.getItem(CLIENTES_KEY)

    if (!clientesGuardados) {
        return []
    }

    try {
        const clientesParseados = JSON.parse(clientesGuardados)

        if (!Array.isArray(clientesParseados)) {
            return []
        }

        const clientesDescifrados = []
        let requiereMigracion = false

        for (const cliente of clientesParseados) {
            if (cliente?.datos && esPaqueteCifrado(cliente.datos)) {
                const datosDescifrados = await descifrarHibrido(cliente.datos)

                clientesDescifrados.push({
                    id: cliente.id,
                    creadoEn: cliente.creadoEn,
                    actualizadoEn: cliente.actualizadoEn,
                    ...datosDescifrados
                })
            } else {
                requiereMigracion = true
                clientesDescifrados.push(cliente)
            }
        }

        if (requiereMigracion) {
            await guardarClientes(clientesDescifrados)
        }

        return clientesDescifrados
    } catch (error) {
        console.error('No se pudieron leer los clientes cifrados:', error)
        return []
    }
}

async function guardarClientes(clientesActualizados) {
    const clientesCifrados = await Promise.all(
        clientesActualizados.map(async (cliente) => ({
            id: cliente.id,
            creadoEn: cliente.creadoEn,
            actualizadoEn: cliente.actualizadoEn,
            datos: await cifrarHibrido({
                cedula: cliente.cedula,
                nombre: cliente.nombre,
                telefono: cliente.telefono,
                correo: cliente.correo,
                direccion: cliente.direccion
            })
        }))
    )

    localStorage.setItem(CLIENTES_KEY, JSON.stringify(clientesCifrados))
}

async function notificarClienteCifrado(cliente, titulo) {
    const paqueteCifrado = await cifrarHibrido({
        cedula: cliente.cedula,
        nombre: cliente.nombre,
        telefono: cliente.telefono,
        correo: cliente.correo,
        direccion: cliente.direccion
    })
    const clienteDescifrado = await descifrarHibrido(paqueteCifrado)

    mostrarNotificacionCriptografica({
        titulo,
        descripcion: 'Los campos del cliente se guardan con AES-GCM y la clave AES queda protegida con RSA-OAEP.',
        campos: [
            { etiqueta: 'Datos cifrados', valor: paqueteCifrado.datosCifrados },
            { etiqueta: 'Clave AES cifrada con RSA', valor: paqueteCifrado.claveCifrada },
            { etiqueta: 'Cedula descifrada', valor: clienteDescifrado.cedula },
            { etiqueta: 'Nombre descifrado', valor: clienteDescifrado.nombre },
            { etiqueta: 'Telefono descifrado', valor: clienteDescifrado.telefono || '-' },
            { etiqueta: 'Correo descifrado', valor: clienteDescifrado.correo || '-' },
            { etiqueta: 'Direccion descifrada', valor: clienteDescifrado.direccion || '-' }
        ]
    })
}

function mostrarMensaje(mensaje, tipo) {
    const mensajeElemento = document.getElementById('cliente-form-mensaje')

    if (!mensajeElemento) {
        return
    }

    mensajeElemento.textContent = mensaje
    mensajeElemento.dataset.type = tipo
}

function limpiarMensaje() {
    const mensajeElemento = document.getElementById('cliente-form-mensaje')

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

function crearIdCliente() {
    if (globalThis.crypto?.randomUUID) {
        return globalThis.crypto.randomUUID()
    }

    return `cliente-${Date.now()}-${Math.random().toString(16).slice(2)}`
}
