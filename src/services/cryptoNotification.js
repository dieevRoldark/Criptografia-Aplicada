export function mostrarNotificacionCriptografica({ titulo, descripcion, campos }) {
    cerrarNotificacionExistente()

    const overlay = document.createElement('div')
    const dialogo = document.createElement('section')
    const encabezado = document.createElement('header')
    const tituloElemento = document.createElement('h3')
    const cerrarBoton = document.createElement('button')
    const descripcionElemento = document.createElement('p')
    const lista = document.createElement('dl')

    overlay.className = 'crypto-modal'
    overlay.dataset.cryptoModal = 'true'
    dialogo.className = 'crypto-modal__dialog'
    dialogo.setAttribute('role', 'dialog')
    dialogo.setAttribute('aria-modal', 'true')
    dialogo.setAttribute('aria-labelledby', 'crypto-modal-title')

    encabezado.className = 'crypto-modal__header'
    tituloElemento.id = 'crypto-modal-title'
    tituloElemento.textContent = titulo
    cerrarBoton.className = 'crypto-modal__close'
    cerrarBoton.type = 'button'
    cerrarBoton.textContent = 'Cerrar'
    cerrarBoton.addEventListener('click', cerrarNotificacionExistente)

    descripcionElemento.className = 'crypto-modal__description'
    descripcionElemento.textContent = descripcion
    lista.className = 'crypto-modal__list'

    campos.forEach(({ etiqueta, valor }) => {
        const termino = document.createElement('dt')
        const detalle = document.createElement('dd')

        termino.textContent = etiqueta
        detalle.textContent = String(valor)
        lista.append(termino, detalle)
    })

    encabezado.append(tituloElemento, cerrarBoton)
    dialogo.append(encabezado, descripcionElemento, lista)
    overlay.append(dialogo)
    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) {
            cerrarNotificacionExistente()
        }
    })

    document.body.append(overlay)
    cerrarBoton.focus()
}

function cerrarNotificacionExistente() {
    document.querySelector('[data-crypto-modal="true"]')?.remove()
}
