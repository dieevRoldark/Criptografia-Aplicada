import { cerrarSesion, estaAutenticado } from './controller/authController.js'

const cacheVistas = {}
const RUTA_INICIO = 'inicio'
const RUTA_LOGIN = 'login'
const RUTA_REGISTRO = 'registro'
const rutasPublicas = [RUTA_LOGIN, RUTA_REGISTRO]

async function cargarContenido() {
    const hash = window.location.hash.slice(1) || RUTA_INICIO
    const ruta = protegerRuta(hash)
    const contentDiv = document.getElementById('contenido')

    if (!ruta || !contentDiv) {
        return
    }

    actualizarModoLogin(ruta)

    try {
        if (cacheVistas[ruta]) {
            contentDiv.innerHTML = cacheVistas[ruta]
            console.log(`Recuperado de cache: ${ruta}`)
        } else {
            const respuestaHtml = await fetch(`./sections/${ruta}.html`)

            if (respuestaHtml.ok) {
                const html = await respuestaHtml.text()

                cacheVistas[ruta] = html
                contentDiv.innerHTML = html
            } else {
                contentDiv.innerHTML = '<h2>Error 404</h2>'
                return
            }
        }

        try {
            const modulo = await import(`./controller/${ruta}.js`)

            if (modulo.init) {
                await modulo.init()
            }
        } catch (errorJs) {
            console.log(`Nota: No se cargo script para ${ruta}`)
        }
    } catch (error) {
        console.error('Error:', error)
    }
}

function protegerRuta(ruta) {
    if (!estaAutenticado() && !rutasPublicas.includes(ruta)) {
        actualizarModoLogin(RUTA_LOGIN)
        window.location.hash = RUTA_LOGIN
        return null
    }

    if (estaAutenticado() && rutasPublicas.includes(ruta)) {
        window.location.hash = RUTA_INICIO
        return null
    }

    return ruta
}

function actualizarModoLogin(ruta) {
    document.body.classList.toggle('login-mode', rutasPublicas.includes(ruta))
}

function configurarCerrarSesion() {
    const botonCerrarSesion = document.querySelector('[data-logout]')

    if (!botonCerrarSesion) {
        return
    }

    botonCerrarSesion.addEventListener('click', () => {
        cerrarSesion()
        window.location.hash = RUTA_LOGIN
    })
}

window.addEventListener('load', () => {
    configurarCerrarSesion()
    cargarContenido()
})
window.addEventListener('hashchange', cargarContenido)
