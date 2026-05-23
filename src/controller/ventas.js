import { cifrarHibrido, descifrarHibrido, esPaqueteCifrado } from '../services/cryptoService.js'
import { mostrarNotificacionCriptografica } from '../services/cryptoNotification.js'

const VENTAS_KEY = 'contabilidad.ventas'
const CLIENTE_POR_DEFECTO = {
    id: 'cliente-default',
    nombre: 'Cliente General',
    cedula: '0000000000'
}

let ventas = []
let ventaActual = null
let modoPendientes = true

export async function init() {
    ventas = await leerVentas()

    configurarFormularioVenta()
    configurarTablaItems()
    configurarTablaPendientes()
    configurarBotones()
    mostrarVentasPendientes()
}

function configurarBotones() {
    const btnNuevaVenta = document.getElementById('btn-nueva-venta')
    const btnPendientes = document.getElementById('btn-ventas-pendientes')

    btnNuevaVenta?.addEventListener('click', toggleFormularioVenta)
    btnPendientes?.addEventListener('click', mostrarVentasPendientes)
}

function configurarFormularioVenta() {
    const form = document.getElementById('venta-form')

    form?.addEventListener('submit', agregarProductoAVenta)
}

function configurarTablaItems() {
    const tbody = document.querySelector('#tabla-venta-items tbody')

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
            editarItem(id)
        }

        if (boton.dataset.action === 'eliminar') {
            eliminarItem(id)
        }
    })
}

function configurarTablaPendientes() {
    const tbody = document.querySelector('#tabla-ventas-pendientes tbody')

    tbody?.addEventListener('click', (event) => {
        if (!(event.target instanceof Element)) {
            return
        }

        const boton = event.target.closest('button[data-action]')

        if (!boton) {
            return
        }

        const id = boton.dataset.id

        if (boton.dataset.action === 'ver') {
            verVenta(id)
        }

        if (boton.dataset.action === 'anular') {
            anularVenta(id)
        }
    })
}

function toggleFormularioVenta() {
    const wrapper = document.getElementById('venta-form-wrapper')
    const btnPendientes = document.getElementById('btn-ventas-pendientes')
    const tablaItems = document.getElementById('tabla-venta-items')

    if (!wrapper) {
        return
    }

    const estaOculto = wrapper.hidden

    if (estaOculto) {
        nuevaVenta()
        wrapper.hidden = false

        if (tablaItems) {
            tablaItems.hidden = false
        }

        document.getElementById('venta-barcode')?.focus()

        ocultarPendientes()
        if (btnPendientes) {
            btnPendientes.style.backgroundColor = ''
            btnPendientes.ariaPressed = 'false'
        }
    } else {
        wrapper.hidden = true

        if (tablaItems) {
            tablaItems.hidden = true
        }

        ventaActual = null
        modoPendientes = true
        mostrarVentasPendientes()
    }
}

function ocultarPendientes() {
    const wrapper = document.getElementById('ventas-pendientes-wrapper')

    if (wrapper) {
        wrapper.hidden = true
    }

    modoPendientes = false
}

function nuevaVenta() {
    ventaActual = {
        id: crearIdVenta(),
        clienteId: CLIENTE_POR_DEFECTO.id,
        clienteNombre: CLIENTE_POR_DEFECTO.nombre,
        estado: 'pendiente',
        items: [],
        subtotal: 0,
        totalIva: 0,
        total: 0,
        creadoEn: new Date().toISOString(),
        actualizadoEn: new Date().toISOString()
    }

    const form = document.getElementById('venta-form')

    form?.reset()
    limpiarMensaje()
    cargarTablaItems()
}

async function agregarProductoAVenta(event) {
    event.preventDefault()

    if (!ventaActual) {
        mostrarMensaje('Debes iniciar una nueva venta primero.', 'error')
        return
    }

    const form = event.currentTarget
    const item = obtenerItemDesdeFormulario(form)

    if (!item.ok) {
        mostrarMensaje(item.mensaje, 'error')
        return
    }

    if (item.data.id) {
        ventaActual.items = ventaActual.items.map((i) => i.id === item.data.id ? { ...i, ...item.data } : i)
        mostrarMensaje('Producto actualizado en la venta.', 'success')
    } else {
        const nuevoItem = {
            ...item.data,
            id: crearIdVenta()
        }

        ventaActual.items.push(nuevoItem)
        mostrarMensaje('Producto agregado a la venta.', 'success')
    }

    ventaActual.actualizadoEn = new Date().toISOString()
    recalcularTotales()
    cargarTablaItems()
    form.reset()
    document.getElementById('venta-barcode')?.focus()
}

function obtenerItemDesdeFormulario(form) {
    const formData = new FormData(form)
    const id = formData.get('itemId')?.trim() || ''
    const barcode = formData.get('barcode')?.trim() || ''
    const productName = formData.get('productName')?.trim() || ''
    const quantity = parseInt(formData.get('quantity'), 10) || 1
    const unitPrice = normalizarNumero(formData.get('unitPrice'))

    if (!barcode && !productName) {
        return { ok: false, mensaje: 'Ingresa el codigo de barras o el nombre del producto.' }
    }

    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
        return { ok: false, mensaje: 'Ingresa un precio unitario valido.' }
    }

    if (quantity < 1) {
        return { ok: false, mensaje: 'Ingresa una cantidad valida.' }
    }

    const iva = 0.16
    const precioMasIva = unitPrice * (1 + iva)

    return {
        ok: true,
        data: {
            id,
            codigo: barcode || '—',
            nombre: productName,
            cantidad: quantity,
            precio: unitPrice,
            iva,
            precioMasIva: Math.round(precioMasIva * 100) / 100
        }
    }
}

function recalcularTotales() {
    if (!ventaActual) {
        return
    }

    let subtotal = 0
    let totalIva = 0

    for (const item of ventaActual.items) {
        const itemSubtotal = item.precio * item.cantidad
        const itemIva = (item.precioMasIva - item.precio) * item.cantidad

        subtotal += itemSubtotal
        totalIva += itemIva
    }

    ventaActual.subtotal = Math.round(subtotal * 100) / 100
    ventaActual.totalIva = Math.round(totalIva * 100) / 100
    ventaActual.total = Math.round((subtotal + totalIva) * 100) / 100
}

function editarItem(id) {
    if (!ventaActual) {
        return
    }

    const item = ventaActual.items.find((i) => i.id === id)

    if (!item) {
        mostrarMensaje('No se encontro el producto seleccionado.', 'error')
        return
    }

    const form = document.getElementById('venta-form')

    if (!form) {
        return
    }

    form.elements.itemId.value = item.id
    form.elements.barcode.value = item.codigo === '—' ? '' : item.codigo
    form.elements.productName.value = item.nombre
    form.elements.quantity.value = item.cantidad
    form.elements.unitPrice.value = item.precio
    document.getElementById('venta-barcode')?.focus()
    mostrarMensaje('Editando producto. Actualiza los campos y presiona Agregar Producto.', 'info')
}

function eliminarItem(id) {
    if (!ventaActual) {
        return
    }

    const item = ventaActual.items.find((i) => i.id === id)

    if (!item) {
        mostrarMensaje('No se encontro el producto seleccionado.', 'error')
        return
    }

    const confirmaEliminar = confirm(`Deseas eliminar "${item.nombre}" de la venta?`)

    if (!confirmaEliminar) {
        return
    }

    ventaActual.items = ventaActual.items.filter((i) => i.id !== id)
    ventaActual.actualizadoEn = new Date().toISOString()
    recalcularTotales()
    cargarTablaItems()
    mostrarMensaje('Producto eliminado de la venta.', 'success')
}

function cargarTablaItems() {
    const tbody = document.querySelector('#tabla-venta-items tbody')

    if (!tbody) {
        return
    }

    tbody.innerHTML = ''

    if (!ventaActual || ventaActual.items.length === 0) {
        const filaVacia = document.createElement('tr')
        const celdaVacia = document.createElement('td')

        celdaVacia.colSpan = 8
        celdaVacia.textContent = 'No hay productos agregados a esta venta.'
        filaVacia.append(celdaVacia)
        tbody.append(filaVacia)
        return
    }

    for (const item of ventaActual.items) {
        const fila = document.createElement('tr')

        agregarCelda(fila, item.codigo)
        agregarCelda(fila, item.nombre)
        agregarCelda(fila, String(item.cantidad))
        agregarCelda(fila, formatearMoneda(item.precio))
        agregarCelda(fila, `${(item.iva * 100).toFixed(0)}%`)
        agregarCelda(fila, formatearMoneda(item.precioMasIva))
        agregarCeldaAccion(fila, 'editar', item.id, 'Editar')
        agregarCeldaAccion(fila, 'eliminar', item.id, 'Borrar')

        tbody.append(fila)
    }

    if (ventaActual.items.length > 0) {
        const filaTotal = document.createElement('tr')
        const celdaLabel = document.createElement('td')

        celdaLabel.colSpan = 7
        celdaLabel.style.textAlign = 'right'
        celdaLabel.style.fontWeight = 'bold'
        celdaLabel.textContent = `Total: ${formatearMoneda(ventaActual.total)}`

        const celdaAccion = document.createElement('td')
        const btnFinalizar = document.createElement('button')

        btnFinalizar.className = 'main__button-all'
        btnFinalizar.style.backgroundColor = 'rgb(34, 167, 63)'
        btnFinalizar.type = 'button'
        btnFinalizar.textContent = 'Finalizar'
        btnFinalizar.addEventListener('click', finalizarVenta)

        celdaAccion.append(btnFinalizar)
        filaTotal.append(celdaLabel, celdaAccion)
        tbody.append(filaTotal)
    }
}

async function finalizarVenta() {
    if (!ventaActual || ventaActual.items.length === 0) {
        mostrarMensaje('Agrega al menos un producto antes de finalizar la venta.', 'error')
        return
    }

    const confirmaFinalizar = confirm(`Finalizar venta por ${formatearMoneda(ventaActual.total)}?`)

    if (!confirmaFinalizar) {
        return
    }

    ventaActual.estado = 'completada'
    ventaActual.actualizadoEn = new Date().toISOString()
    ventas.push(ventaActual)
    await guardarVentas(ventas)

    const ventaFinalizada = ventaActual

    ventaActual = null
    const wrapper = document.getElementById('venta-form-wrapper')

    if (wrapper) {
        wrapper.hidden = true
    }

    const tablaItems = document.getElementById('tabla-venta-items')

    if (tablaItems) {
        tablaItems.hidden = true
    }

    mostrarMensaje(`Venta finalizada por ${formatearMoneda(ventaFinalizada.total)}.`, 'success')
    await notificarVentaCifrada(ventaFinalizada, 'Venta finalizada con cifrado')

    modoPendientes = true
    mostrarVentasPendientes()
}

function mostrarVentasPendientes() {
    const wrapper = document.getElementById('venta-form-wrapper')
    const pendientesWrapper = document.getElementById('ventas-pendientes-wrapper')
    const tablaItems = document.getElementById('tabla-venta-items')
    const btnPendientes = document.getElementById('btn-ventas-pendientes')
    const btnNuevaVenta = document.getElementById('btn-nueva-venta')

    if (wrapper) {
        wrapper.hidden = true
    }

    if (tablaItems) {
        tablaItems.hidden = true
    }

    if (pendientesWrapper) {
        pendientesWrapper.hidden = false
    }

    if (btnPendientes) {
        btnPendientes.style.backgroundColor = 'rgb(34, 167, 63)'
        btnPendientes.ariaPressed = 'true'
    }

    if (btnNuevaVenta) {
        btnNuevaVenta.textContent = 'Nueva venta'
    }

    modoPendientes = true
    ventaActual = null

    const tbody = document.querySelector('#tabla-ventas-pendientes tbody')

    if (!tbody) {
        return
    }

    tbody.innerHTML = ''

    const pendientes = ventas.filter((v) => v.estado === 'pendiente')

    if (pendientes.length === 0) {
        const filaVacia = document.createElement('tr')
        const celdaVacia = document.createElement('td')

        celdaVacia.colSpan = 6
        celdaVacia.textContent = 'No hay ventas pendientes.'
        filaVacia.append(celdaVacia)
        tbody.append(filaVacia)
        return
    }

    for (const venta of pendientes) {
        const fila = document.createElement('tr')
        const fecha = new Date(venta.creadoEn).toLocaleDateString('es-CO')

        agregarCelda(fila, fecha)
        agregarCelda(fila, venta.clienteNombre)
        agregarCelda(fila, String(venta.items.length))
        agregarCelda(fila, formatearMoneda(venta.total))
        agregarCeldaAccion(fila, 'ver', venta.id, 'Ver')
        agregarCeldaAccion(fila, 'anular', venta.id, 'Anular')

        tbody.append(fila)
    }
}

function verVenta(id) {
    const venta = ventas.find((v) => v.id === id)

    if (!venta) {
        mostrarMensaje('No se encontro la venta seleccionada.', 'error')
        return
    }

    ventaActual = { ...venta, items: venta.items.map((i) => ({ ...i })) }

    const pendientesWrapper = document.getElementById('ventas-pendientes-wrapper')
    const tablaItems = document.getElementById('tabla-venta-items')
    const wrapper = document.getElementById('venta-form-wrapper')

    if (pendientesWrapper) {
        pendientesWrapper.hidden = true
    }

    if (tablaItems) {
        tablaItems.hidden = false
    }

    if (wrapper) {
        wrapper.hidden = false
    }

    const btnPendientes = document.getElementById('btn-ventas-pendientes')

    if (btnPendientes) {
        btnPendientes.style.backgroundColor = ''
        btnPendientes.ariaPressed = 'false'
    }

    modoPendientes = false
    cargarTablaItems()
    mostrarMensaje('Editando venta pendiente. Agrega o modifica productos.', 'info')
}

async function anularVenta(id) {
    const venta = ventas.find((v) => v.id === id)

    if (!venta) {
        mostrarMensaje('No se encontro la venta seleccionada.', 'error')
        return
    }

    const confirmaAnular = confirm(`Deseas anular la venta del ${new Date(venta.creadoEn).toLocaleDateString('es-CO')} por ${formatearMoneda(venta.total)}?`)

    if (!confirmaAnular) {
        return
    }

    venta.estado = 'anulada'
    venta.actualizadoEn = new Date().toISOString()
    await guardarVentas(ventas)
    mostrarVentasPendientes()
    mostrarMensaje('Venta anulada correctamente.', 'success')
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
    boton.setAttribute('aria-label', `${texto} venta`)

    celda.append(boton)
    fila.append(celda)
}

async function leerVentas() {
    const ventasGuardadas = localStorage.getItem(VENTAS_KEY)

    if (!ventasGuardadas) {
        return []
    }

    try {
        const ventasParseadas = JSON.parse(ventasGuardadas)

        if (!Array.isArray(ventasParseadas)) {
            return []
        }

        const ventasDescifradas = []
        let requiereMigracion = false

        for (const venta of ventasParseadas) {
            if (venta?.datos && esPaqueteCifrado(venta.datos)) {
                const datosDescifrados = await descifrarHibrido(venta.datos)

                ventasDescifradas.push({
                    id: venta.id,
                    creadoEn: venta.creadoEn,
                    actualizadoEn: venta.actualizadoEn,
                    ...datosDescifrados
                })
            } else {
                requiereMigracion = true
                ventasDescifradas.push(venta)
            }
        }

        if (requiereMigracion) {
            await guardarVentas(ventasDescifradas)
        }

        return ventasDescifradas
    } catch (error) {
        console.error('No se pudieron leer las ventas cifradas:', error)
        return []
    }
}

async function guardarVentas(ventasActualizadas) {
    const ventasCifradas = await Promise.all(
        ventasActualizadas.map(async (venta) => ({
            id: venta.id,
            creadoEn: venta.creadoEn,
            actualizadoEn: venta.actualizadoEn,
            datos: await cifrarHibrido({
                clienteId: venta.clienteId,
                clienteNombre: venta.clienteNombre,
                estado: venta.estado,
                items: venta.items,
                subtotal: venta.subtotal,
                totalIva: venta.totalIva,
                total: venta.total
            })
        }))
    )

    localStorage.setItem(VENTAS_KEY, JSON.stringify(ventasCifradas))
}

async function notificarVentaCifrada(venta, titulo) {
    const paqueteCifrado = await cifrarHibrido({
        clienteId: venta.clienteId,
        clienteNombre: venta.clienteNombre,
        estado: venta.estado,
        items: venta.items,
        subtotal: venta.subtotal,
        totalIva: venta.totalIva,
        total: venta.total
    })
    const ventaDescifrada = await descifrarHibrido(paqueteCifrado)

    mostrarNotificacionCriptografica({
        titulo,
        descripcion: 'Los datos de la venta se guardan con AES-GCM y la clave AES queda protegida con RSA-OAEP.',
        campos: [
            { etiqueta: 'Datos cifrados', valor: paqueteCifrado.datosCifrados },
            { etiqueta: 'Clave AES cifrada con RSA', valor: paqueteCifrado.claveCifrada },
            { etiqueta: 'Cliente', valor: ventaDescifrada.clienteNombre },
            { etiqueta: 'Estado', valor: ventaDescifrada.estado },
            { etiqueta: 'Items', valor: String(ventaDescifrada.items.length) },
            { etiqueta: 'Subtotal', valor: formatearMoneda(ventaDescifrada.subtotal) },
            { etiqueta: 'Total IVA', valor: formatearMoneda(ventaDescifrada.totalIva) },
            { etiqueta: 'Total', valor: formatearMoneda(ventaDescifrada.total) }
        ]
    })
}

function mostrarMensaje(mensaje, tipo) {
    const mensajeElemento = document.getElementById('venta-form-mensaje')

    if (!mensajeElemento) {
        return
    }

    mensajeElemento.textContent = mensaje
    mensajeElemento.dataset.type = tipo
}

function limpiarMensaje() {
    const mensajeElemento = document.getElementById('venta-form-mensaje')

    if (!mensajeElemento) {
        return
    }

    mensajeElemento.textContent = ''
    delete mensajeElemento.dataset.type
}

function normalizarNumero(valor) {
    if (typeof valor !== 'string') {
        return Number(valor)
    }

    return Number(valor.replace(',', '.'))
}

function formatearMoneda(valor) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 2
    }).format(valor)
}

function formatearNumero(valor) {
    return new Intl.NumberFormat('es-CO', {
        maximumFractionDigits: 2
    }).format(valor)
}

function crearIdVenta() {
    if (globalThis.crypto?.randomUUID) {
        return globalThis.crypto.randomUUID()
    }

    return `venta-${Date.now()}-${Math.random().toString(16).slice(2)}`
}
