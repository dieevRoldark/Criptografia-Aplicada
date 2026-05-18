import { iniciarSesion } from './authController.js'
import { generarEvidenciaLogin } from '../services/cryptoService.js'
import { mostrarNotificacionCriptografica } from '../services/cryptoNotification.js'
import {
    esEmailValido,
    guardarEmailRegistroPendiente,
    validarCredenciales,
    validarPassword
} from '../services/userRepository.js'

export function init() {
    const form = document.getElementById('login-form')
    const emailInput = document.getElementById('email')
    const passwordInput = document.getElementById('password')
    const recordarInput = document.getElementById('checkbox')
    const errorMessage = document.getElementById('login-error')
    const registerLink = document.getElementById('go-register')
    const submitButton = form?.querySelector('button[type="submit"]')

    if (!form) {
        return
    }

    registerLink?.addEventListener('click', () => {
        const email = emailInput.value.trim()

        if (esEmailValido(email)) {
            guardarEmailRegistroPendiente(email)
        }
    })

    form.addEventListener('submit', async (event) => {
        event.preventDefault()

        const email = emailInput.value.trim()
        const password = passwordInput.value

        ocultarError(errorMessage)

        if (!esEmailValido(email)) {
            mostrarError(errorMessage, 'Ingresa un correo valido.')
            return
        }

        const validacionPassword = validarPassword(password)

        if (!validacionPassword.ok) {
            mostrarError(errorMessage, validacionPassword.mensaje)
            return
        }

        bloquearFormulario(submitButton, true)

        try {
            const resultado = await validarCredenciales(email, password)

            if (resultado.motivo === 'NO_REGISTRADO') {
                guardarEmailRegistroPendiente(email)
                window.location.hash = 'registro'
                return
            }

            if (!resultado.ok) {
                mostrarError(errorMessage, resultado.mensaje)
                return
            }

            const evidencia = await generarEvidenciaLogin({ email, password })

            iniciarSesion({
                usuario: resultado.usuario,
                recordar: recordarInput.checked
            })

            window.location.hash = 'inicio'
            mostrarNotificacionCriptografica({
                titulo: 'Flujo criptografico del login',
                descripcion: 'La contrasena se valida con SHA-256; AES cifra los datos y RSA protege la clave AES.',
                campos: [
                    { etiqueta: 'Correo', valor: evidencia.email },
                    { etiqueta: 'Correo cifrado', valor: evidencia.emailCifrado },
                    { etiqueta: 'Correo descifrado', valor: evidencia.emailDescifrado },
                    { etiqueta: 'Contrasena cifrada', valor: evidencia.passwordCifrada },
                    { etiqueta: 'Contrasena descifrada', valor: evidencia.passwordDescifrada },
                    { etiqueta: 'Hash SHA-256', valor: evidencia.passwordHash },
                    { etiqueta: 'Algoritmos', valor: evidencia.algoritmoCifrado }
                ]
            })
        } catch (error) {
            console.error('Error al iniciar sesion:', error)
            mostrarError(errorMessage, 'No se pudo iniciar sesion. Intentalo de nuevo.')
        } finally {
            bloquearFormulario(submitButton, false)
        }
    })
}

function mostrarError(errorMessage, mensaje) {
    if (!errorMessage) {
        return
    }

    errorMessage.textContent = mensaje
    errorMessage.hidden = false
}

function ocultarError(errorMessage) {
    if (!errorMessage) {
        return
    }

    errorMessage.textContent = ''
    errorMessage.hidden = true
}

function bloquearFormulario(submitButton, bloqueado) {
    if (!submitButton) {
        return
    }

    submitButton.disabled = bloqueado
    submitButton.textContent = bloqueado ? 'Ingresando...' : 'Login'
}
