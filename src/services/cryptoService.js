const RSA_KEYS_KEY = 'contabilidad.crypto.rsaKeys'
const TEXT_ENCODER = new TextEncoder()
const TEXT_DECODER = new TextDecoder()

export async function crearHashSha256(texto) {
    const subtle = obtenerSubtleCrypto()
    const bytes = TEXT_ENCODER.encode(texto)
    const hashBuffer = await subtle.digest('SHA-256', bytes)

    return bufferAHex(hashBuffer)
}

export async function cifrarHibrido(datos) {
    const subtle = obtenerSubtleCrypto()
    const { publicKey } = await obtenerParRSA()
    const claveAES = await generarClaveAES()
    const texto = typeof datos === 'string' ? datos : JSON.stringify(datos)
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const textoCifrado = await subtle.encrypt(
        {
            name: 'AES-GCM',
            iv
        },
        claveAES,
        TEXT_ENCODER.encode(texto)
    )
    const claveAESRaw = await subtle.exportKey('raw', claveAES)
    const claveCifrada = await subtle.encrypt(
        {
            name: 'RSA-OAEP'
        },
        publicKey,
        claveAESRaw
    )

    return {
        version: 1,
        tipo: 'AES-GCM+RSA-OAEP',
        iv: bufferABase64(iv),
        claveCifrada: bufferABase64(claveCifrada),
        datosCifrados: bufferABase64(textoCifrado)
    }
}

export async function descifrarHibrido(paqueteCifrado, opciones = {}) {
    const subtle = obtenerSubtleCrypto()
    const { privateKey } = await obtenerParRSA()
    const claveAESRaw = await subtle.decrypt(
        {
            name: 'RSA-OAEP'
        },
        privateKey,
        base64ABuffer(paqueteCifrado.claveCifrada)
    )
    const claveAES = await subtle.importKey(
        'raw',
        claveAESRaw,
        {
            name: 'AES-GCM'
        },
        false,
        ['decrypt']
    )
    const datosDescifrados = await subtle.decrypt(
        {
            name: 'AES-GCM',
            iv: base64ABuffer(paqueteCifrado.iv)
        },
        claveAES,
        base64ABuffer(paqueteCifrado.datosCifrados)
    )
    const texto = TEXT_DECODER.decode(datosDescifrados)

    if (opciones.formato === 'texto') {
        return texto
    }

    return JSON.parse(texto)
}

export async function generarEvidenciaLogin({ email, password }) {
    const emailCifrado = await cifrarHibrido(email)
    const passwordCifrada = await cifrarHibrido(password)

    return {
        email,
        emailCifrado: emailCifrado.datosCifrados,
        emailDescifrado: await descifrarHibrido(emailCifrado, { formato: 'texto' }),
        passwordCifrada: passwordCifrada.datosCifrados,
        passwordDescifrada: await descifrarHibrido(passwordCifrada, { formato: 'texto' }),
        passwordHash: await crearHashSha256(password),
        algoritmoHash: 'SHA-256',
        algoritmoCifrado: 'AES-GCM + RSA-OAEP'
    }
}

export function esPaqueteCifrado(valor) {
    return Boolean(
        valor
        && typeof valor === 'object'
        && valor.version === 1
        && valor.tipo === 'AES-GCM+RSA-OAEP'
        && valor.iv
        && valor.claveCifrada
        && valor.datosCifrados
    )
}

async function obtenerParRSA() {
    const subtle = obtenerSubtleCrypto()
    const parGuardado = leerParRSAGuardado()

    if (parGuardado) {
        const publicKey = await subtle.importKey(
            'jwk',
            parGuardado.publicKey,
            {
                name: 'RSA-OAEP',
                hash: 'SHA-256'
            },
            true,
            ['encrypt']
        )
        const privateKey = await subtle.importKey(
            'jwk',
            parGuardado.privateKey,
            {
                name: 'RSA-OAEP',
                hash: 'SHA-256'
            },
            true,
            ['decrypt']
        )

        return { publicKey, privateKey }
    }

    const keyPair = await subtle.generateKey(
        {
            name: 'RSA-OAEP',
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: 'SHA-256'
        },
        true,
        ['encrypt', 'decrypt']
    )
    const publicKey = await subtle.exportKey('jwk', keyPair.publicKey)
    const privateKey = await subtle.exportKey('jwk', keyPair.privateKey)

    localStorage.setItem(RSA_KEYS_KEY, JSON.stringify({ publicKey, privateKey }))

    return keyPair
}

function leerParRSAGuardado() {
    const parGuardado = localStorage.getItem(RSA_KEYS_KEY)

    if (!parGuardado) {
        return null
    }

    try {
        const par = JSON.parse(parGuardado)

        if (par?.publicKey && par?.privateKey) {
            return par
        }
    } catch (error) {
        localStorage.removeItem(RSA_KEYS_KEY)
    }

    return null
}

async function generarClaveAES() {
    const subtle = obtenerSubtleCrypto()

    return subtle.generateKey(
        {
            name: 'AES-GCM',
            length: 256
        },
        true,
        ['encrypt', 'decrypt']
    )
}

function obtenerSubtleCrypto() {
    const subtle = globalThis.crypto?.subtle

    if (!subtle) {
        throw new Error('El navegador no soporta Web Crypto API.')
    }

    return subtle
}

function bufferAHex(buffer) {
    return Array.from(new Uint8Array(buffer))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('')
}

function bufferABase64(buffer) {
    const bytes = new Uint8Array(buffer)
    let textoBinario = ''

    bytes.forEach((byte) => {
        textoBinario += String.fromCharCode(byte)
    })

    return btoa(textoBinario)
}

function base64ABuffer(base64) {
    const textoBinario = atob(base64)
    const bytes = new Uint8Array(textoBinario.length)

    for (let index = 0; index < textoBinario.length; index += 1) {
        bytes[index] = textoBinario.charCodeAt(index)
    }

    return bytes
}
