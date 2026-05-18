import { cifrarHibrido, descifrarHibrido, esPaqueteCifrado } from '../services/cryptoService.js'
import { mostrarNotificacionCriptografica } from '../services/cryptoNotification.js'

const PRODUCTOS_KEY = 'contabilidad.productos'

let productos = []

export async function init() {
    productos = await leerProductos()

    configurarFormularioProducto()
    configurarTablaProductos()
    cargarTablaProductos()
}

function configurarFormularioProducto() {
    const btnNuevo = document.getElementById('btn-nuevo-producto')
    const btnCancelar = document.getElementById('btn-cancelar-producto')
    const form = document.getElementById('producto-form')
    const precioCompraInput = document.getElementById('producto-precio-compra')
    const ivaInput = document.getElementById('producto-iva')
    const precioFinalInput = document.getElementById('producto-precio-final')

    btnNuevo?.addEventListener('click', () => abrirFormularioProducto())
    btnCancelar?.addEventListener('click', cerrarFormularioProducto)
    form?.addEventListener('submit', guardarProductoDesdeFormulario)

    precioCompraInput?.addEventListener('input', calcularPrecioFinalSugerido)
    ivaInput?.addEventListener('input', calcularPrecioFinalSugerido)
    precioFinalInput?.addEventListener('input', () => {
        precioFinalInput.dataset.editado = 'true'
    })
}

function configurarTablaProductos() {
    const tbody = document.querySelector('#tabla-productos tbody')

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
            editarProducto(id)
        }

        if (boton.dataset.action === 'eliminar') {
            eliminarProducto(id)
        }
    })
}

async function guardarProductoDesdeFormulario(event) {
    event.preventDefault()

    const form = event.currentTarget
    const producto = obtenerProductoDesdeFormulario(form)

    if (!producto.ok) {
        mostrarMensaje(producto.mensaje, 'error')
        return
    }

    const productoExistente = productos.find((item) => item.codigo === producto.data.codigo && item.id !== producto.data.id)

    if (productoExistente) {
        mostrarMensaje('Ya existe un producto con este codigo.', 'error')
        return
    }

    if (producto.data.id) {
        productos = productos.map((item) => item.id === producto.data.id ? { ...item, ...producto.data } : item)
        await guardarProductos(productos)
        cargarTablaProductos()
        cerrarFormularioProducto()
        mostrarMensaje('Producto actualizado correctamente.', 'success')
        await notificarProductoCifrado(producto.data, 'Producto actualizado con cifrado')
    } else {
        const nuevoProducto = {
            ...producto.data,
            id: crearIdProducto(),
            creadoEn: new Date().toISOString()
        }

        productos.push(nuevoProducto)
        await guardarProductos(productos)
        cargarTablaProductos()
        cerrarFormularioProducto()
        mostrarMensaje('Producto guardado correctamente.', 'success')
        await notificarProductoCifrado(nuevoProducto, 'Producto guardado con cifrado')
    }
}

function obtenerProductoDesdeFormulario(form) {
    const formData = new FormData(form)
    const id = formData.get('id')?.trim() || ''
    const codigo = formData.get('codigo')?.trim() || ''
    const nombre = formData.get('nombre')?.trim() || ''
    const precioCompra = normalizarNumero(formData.get('precioCompra'))
    const iva = normalizarNumero(formData.get('iva'))
    const precioFinalVenta = normalizarNumero(formData.get('precioFinalVenta'))

    if (!codigo || !nombre) {
        return { ok: false, mensaje: 'Ingresa el codigo y el nombre del producto.' }
    }

    if (!Number.isFinite(precioCompra) || precioCompra < 0) {
        return { ok: false, mensaje: 'Ingresa un precio de compra valido.' }
    }

    if (!Number.isFinite(iva) || iva < 0) {
        return { ok: false, mensaje: 'Ingresa un IVA valido.' }
    }

    if (!Number.isFinite(precioFinalVenta) || precioFinalVenta < 0) {
        return { ok: false, mensaje: 'Ingresa un precio final de venta valido.' }
    }

    return {
        ok: true,
        data: {
            id,
            codigo,
            nombre,
            precioCompra,
            iva,
            precioFinalVenta,
            actualizadoEn: new Date().toISOString()
        }
    }
}

function abrirFormularioProducto(producto = null) {
    const wrapper = document.getElementById('producto-form-wrapper')
    const form = document.getElementById('producto-form')
    const titulo = document.getElementById('producto-form-titulo')
    const submitButton = document.getElementById('btn-guardar-producto')
    const precioFinalInput = document.getElementById('producto-precio-final')

    if (!wrapper || !form) {
        return
    }

    form.reset()
    limpiarMensaje()

    if (precioFinalInput) {
        precioFinalInput.dataset.editado = producto ? 'true' : 'false'
    }

    if (producto) {
        form.elements.id.value = producto.id
        form.elements.codigo.value = producto.codigo
        form.elements.nombre.value = producto.nombre
        form.elements.precioCompra.value = producto.precioCompra
        form.elements.iva.value = producto.iva
        form.elements.precioFinalVenta.value = producto.precioFinalVenta
        titulo.textContent = 'Editar producto'
        submitButton.textContent = 'Actualizar producto'
    } else {
        form.elements.id.value = ''
        titulo.textContent = 'Nuevo producto'
        submitButton.textContent = 'Guardar producto'
    }

    wrapper.hidden = false
    form.elements.codigo.focus()
}

function cerrarFormularioProducto() {
    const wrapper = document.getElementById('producto-form-wrapper')
    const form = document.getElementById('producto-form')
    const precioFinalInput = document.getElementById('producto-precio-final')

    form?.reset()

    if (precioFinalInput) {
        precioFinalInput.dataset.editado = 'false'
    }

    limpiarMensaje()

    if (wrapper) {
        wrapper.hidden = true
    }
}

function editarProducto(id) {
    const producto = productos.find((item) => item.id === id)

    if (!producto) {
        mostrarMensaje('No se encontro el producto seleccionado.', 'error')
        return
    }

    abrirFormularioProducto(producto)
}

async function eliminarProducto(id) {
    const producto = productos.find((item) => item.id === id)

    if (!producto) {
        mostrarMensaje('No se encontro el producto seleccionado.', 'error')
        return
    }

    const confirmaEliminar = confirm(`Deseas eliminar el producto "${producto.nombre}"?`)

    if (!confirmaEliminar) {
        return
    }

    productos = productos.filter((item) => item.id !== id)
    await guardarProductos(productos)
    cargarTablaProductos()
    cerrarFormularioProducto()
    mostrarMensaje('Producto eliminado correctamente.', 'success')
}

function cargarTablaProductos() {
    const tbody = document.querySelector('#tabla-productos tbody')

    if (!tbody) {
        return
    }

    tbody.innerHTML = ''

    if (productos.length === 0) {
        const filaVacia = document.createElement('tr')
        const celdaVacia = document.createElement('td')

        celdaVacia.colSpan = 7
        celdaVacia.textContent = 'No hay productos registrados.'
        filaVacia.append(celdaVacia)
        tbody.append(filaVacia)
        return
    }

    productos.forEach((producto) => {
        const fila = document.createElement('tr')

        agregarCelda(fila, producto.codigo)
        agregarCelda(fila, producto.nombre)
        agregarCelda(fila, formatearMoneda(producto.precioCompra))
        agregarCelda(fila, `${formatearNumero(producto.iva)}%`)
        agregarCelda(fila, formatearMoneda(producto.precioFinalVenta))
        agregarCeldaAccion(fila, 'editar', producto.id, 'Editar')
        agregarCeldaAccion(fila, 'eliminar', producto.id, 'Borrar')

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
    boton.setAttribute('aria-label', `${texto} producto`)

    celda.append(boton)
    fila.append(celda)
}

function calcularPrecioFinalSugerido() {
    const precioCompraInput = document.getElementById('producto-precio-compra')
    const ivaInput = document.getElementById('producto-iva')
    const precioFinalInput = document.getElementById('producto-precio-final')

    if (!precioCompraInput || !ivaInput || !precioFinalInput || precioFinalInput.dataset.editado === 'true') {
        return
    }

    const precioCompra = normalizarNumero(precioCompraInput.value)
    const iva = normalizarNumero(ivaInput.value)

    if (!Number.isFinite(precioCompra) || !Number.isFinite(iva)) {
        precioFinalInput.value = ''
        return
    }

    precioFinalInput.value = (precioCompra * (1 + iva / 100)).toFixed(2)
}

async function leerProductos() {
    const productosGuardados = localStorage.getItem(PRODUCTOS_KEY)

    if (!productosGuardados) {
        return []
    }

    try {
        const productosParseados = JSON.parse(productosGuardados)

        if (!Array.isArray(productosParseados)) {
            return []
        }

        const productosDescifrados = []
        let requiereMigracion = false

        for (const producto of productosParseados) {
            if (producto?.datos && esPaqueteCifrado(producto.datos)) {
                const datosDescifrados = await descifrarHibrido(producto.datos)

                productosDescifrados.push({
                    id: producto.id,
                    creadoEn: producto.creadoEn,
                    actualizadoEn: producto.actualizadoEn,
                    ...datosDescifrados
                })
            } else {
                requiereMigracion = true
                productosDescifrados.push(producto)
            }
        }

        if (requiereMigracion) {
            await guardarProductos(productosDescifrados)
        }

        return productosDescifrados
    } catch (error) {
        console.error('No se pudieron leer los productos cifrados:', error)
        return []
    }
}

async function guardarProductos(productosActualizados) {
    const productosCifrados = await Promise.all(
        productosActualizados.map(async (producto) => ({
            id: producto.id,
            creadoEn: producto.creadoEn,
            actualizadoEn: producto.actualizadoEn,
            datos: await cifrarHibrido({
                codigo: producto.codigo,
                nombre: producto.nombre,
                precioCompra: producto.precioCompra,
                iva: producto.iva,
                precioFinalVenta: producto.precioFinalVenta
            })
        }))
    )

    localStorage.setItem(PRODUCTOS_KEY, JSON.stringify(productosCifrados))
}

async function notificarProductoCifrado(producto, titulo) {
    const paqueteCifrado = await cifrarHibrido({
        codigo: producto.codigo,
        nombre: producto.nombre,
        precioCompra: producto.precioCompra,
        iva: producto.iva,
        precioFinalVenta: producto.precioFinalVenta
    })
    const productoDescifrado = await descifrarHibrido(paqueteCifrado)

    mostrarNotificacionCriptografica({
        titulo,
        descripcion: 'Los campos del producto se guardan con AES-GCM y la clave AES queda protegida con RSA-OAEP.',
        campos: [
            { etiqueta: 'Codigo cifrado', valor: paqueteCifrado.datosCifrados },
            { etiqueta: 'Clave AES cifrada con RSA', valor: paqueteCifrado.claveCifrada },
            { etiqueta: 'Codigo descifrado', valor: productoDescifrado.codigo },
            { etiqueta: 'Nombre descifrado', valor: productoDescifrado.nombre },
            { etiqueta: 'Precio compra descifrado', valor: productoDescifrado.precioCompra },
            { etiqueta: 'IVA descifrado', valor: productoDescifrado.iva },
            { etiqueta: 'Precio final descifrado', valor: productoDescifrado.precioFinalVenta }
        ]
    })
}

function mostrarMensaje(mensaje, tipo) {
    const mensajeElemento = document.getElementById('producto-form-mensaje')

    if (!mensajeElemento) {
        return
    }

    mensajeElemento.textContent = mensaje
    mensajeElemento.dataset.type = tipo
}

function limpiarMensaje() {
    const mensajeElemento = document.getElementById('producto-form-mensaje')

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

function crearIdProducto() {
    if (globalThis.crypto?.randomUUID) {
        return globalThis.crypto.randomUUID()
    }

    return `producto-${Date.now()}-${Math.random().toString(16).slice(2)}`
}
