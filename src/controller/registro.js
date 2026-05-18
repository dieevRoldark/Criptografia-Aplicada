import { iniciarSesion } from './authController.js'
import { generarEvidenciaLogin } from '../services/cryptoService.js'
import { mostrarNotificacionCriptografica } from '../services/cryptoNotification.js'
import {
    buscarUsuarioPorEmail,
    esEmailValido,
    limpiarRegistroPendiente,
    obtenerEmailRegistroPendiente,
    registrarUsuario,
    validarPassword
} from '../services/userRepository.js'

export function init() {
    const form = document.getElementById('register-form')
    const nombreInput = document.getElementById('register-name')
    const emailInput = document.getElementById('register-email')
    const passwordInput = document.getElementById('register-password')
    const confirmInput = document.getElementById('register-confirm')
    const errorMessage = document.getElementById('register-error')
    const submitButton = form?.querySelector('button[type="submit"]')

    if (!form) {
        return
    }

    const emailPendiente = obtenerEmailRegistroPendiente()

    if (emailPendiente) {
        emailInput.value = emailPendiente
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault()

        const nombre = nombreInput.value.trim()
        const email = emailInput.value.trim()
        const password = passwordInput.value
        const confirmPassword = confirmInput.value

        ocultarError(errorMessage)

        if (nombre.length < 2) {
            mostrarError(errorMessage, 'Ingresa un nombre valido.')
            return
        }

        if (!esEmailValido(email)) {
            mostrarError(errorMessage, 'Ingresa un correo valido.')
            return
        }

        const validacionPassword = validarPassword(password)

        if (!validacionPassword.ok) {
            mostrarError(errorMessage, validacionPassword.mensaje)
            return
        }

        if (password !== confirmPassword) {
            mostrarError(errorMessage, 'Las contrasenas no coinciden.')
            return
        }

        bloquearFormulario(submitButton, true)

        try {
            const usuarioExistente = await buscarUsuarioPorEmail(email)

            if (usuarioExistente) {
                mostrarError(errorMessage, 'Este correo ya esta registrado. Inicia sesion.')
                return
            }

            const resultado = await registrarUsuario({ nombre, email, password })

            if (!resultado.ok) {
                mostrarError(errorMessage, resultado.mensaje)
                return
            }

            const evidencia = await generarEvidenciaLogin({ email, password })

            limpiarRegistroPendiente()
            iniciarSesion({
                usuario: resultado.usuario,
                recordar: true
            })

            window.location.hash = 'inicio'
            mostrarNotificacionCriptografica({
                titulo: 'Registro protegido',
                descripcion: 'La cuenta conserva SHA-256 para validacion; AES cifra la muestra y RSA protege la clave AES.',
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
            console.error('Error al registrar usuario:', error)
            mostrarError(errorMessage, 'No se pudo crear la cuenta. Intentalo de nuevo.')
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
    submitButton.textContent = bloqueado ? 'Creando...' : 'Crear cuenta'
}
