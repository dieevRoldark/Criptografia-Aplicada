# D&D Market (Desarrollo Desktop First)

<p>
D&D Market es una demo de gestion contable para pequenas y medianas empresas. El objetivo del proyecto es centralizar operaciones como ventas, productos, clientes, proveedores, facturacion, control de stock y reportes desde una aplicacion web construida con JavaScript modular.

El desarrollo de D&D Market nace de las necesidades de pequeñas y medianas empresas en llevar una gestión contable donde se cumpla con las regulaciones de Colombia en cuanto a tributación y facturación. Para este fin la demo inicial debe contar con:

</p>

- Gestión de ventas, productos, clientes y proveedores.
- Generación de facturación post y electrónica.
- Generación de reportes.
- Control de stock.
- Alertas personalizadas.
- Compatibilidad con los servicios de la Dian.

## Requerimientos del producto

- Requerimientos funcionales(RF):
- Requerimientos No funcionales(RNF):
- Diagrama de casos de uso:
- Diagramas adicionales

## Arquitectura Propuesta
- Arquitectura Centrada en los datos.
- MVC

## Arquitectura general

El proyecto esta organizado con una separacion cercana a MVC:

- `sections/`: contiene las vistas HTML que se cargan segun la ruta del hash.
- `src/controller/`: contiene la logica de cada pantalla, por ejemplo login, registro y productos.
- `src/services/`: contiene servicios compartidos como autenticacion, repositorio de usuarios, criptografia y notificaciones.
- `public/`: contiene estilos, fuentes e imagenes.

El archivo `src/main.js` funciona como router. Lee `window.location.hash`, carga la vista desde `sections/{ruta}.html`, importa el controlador correspondiente desde `src/controller/{ruta}.js` y ejecuta su funcion `init()`.

## Flujo de trabajo del login

1. El usuario entra a `#login` y se carga `sections/login.html`.
2. `src/main.js` importa `src/controller/login.js` y ejecuta `init()`.
3. El controlador captura el envio del formulario `login-form`.
4. Se normaliza y valida el correo con `esEmailValido(email)`.
5. Se valida la fortaleza de la contrasena con `validarPassword(password)`: minimo 8 caracteres, una mayuscula, una minuscula y un numero.
6. Se llama `validarCredenciales(email, password)` desde `src/services/userRepository.js`.
7. El repositorio busca el usuario en `localStorage` usando la clave `contabilidad.usuarios`.
8. Si el correo no existe, se guarda como registro pendiente en `contabilidad.registroPendiente.email` y se redirige a `#registro`.
9. Si el usuario existe, la contrasena ingresada se transforma a SHA-256 y se compara contra el `passwordHash` guardado.
10. Si la validacion es correcta, `iniciarSesion()` guarda la sesion activa en `sessionStorage` o `localStorage`, segun el checkbox "Recordarme".
11. Se redirige a `#inicio`.
12. Se muestra una notificacion criptografica con evidencia del hash SHA-256 y del cifrado hibrido usado en la demo.

La sesion se guarda con la clave `contabilidad.usuarioActivo`.

- Si el usuario marca "Recordarme", se usa `localStorage`.
- Si no lo marca, se usa `sessionStorage`.
- Al cerrar sesion, `cerrarSesion()` elimina la sesion de ambos almacenes.

## Flujo de registro

1. El usuario entra a `#registro`.
2. `src/controller/registro.js` captura nombre, correo, contrasena y confirmacion.
3. Se valida nombre, correo, fortaleza de contrasena y coincidencia entre contrasenas.
4. Se revisa si el correo ya existe con `buscarUsuarioPorEmail(email)`.
5. Si no existe, `registrarUsuario({ nombre, email, password })` crea el usuario.
6. Antes de guardar, la contrasena se convierte a SHA-256.
7. El usuario queda guardado en `localStorage` dentro de `contabilidad.usuarios`.
8. Luego se inicia sesion automaticamente y se redirige a `#inicio`.

Estructura guardada para cada usuario:

```js
{
    id: 'uuid-del-usuario',
    nombre: 'Nombre',
    email: 'correo@ejemplo.com',
    passwordHash: 'hash-sha-256-en-hexadecimal',
    creadoEn: 'fecha-iso',
    pendienteSincronizar: true
}
```

Importante: la contrasena original no se guarda. Solo se almacena su hash SHA-256.

## CRUD y almacenamiento de datos

El CRUD completo implementado actualmente esta en productos, en `src/controller/productos.js`.

### Crear producto

1. El usuario hace clic en "Nuevo producto".
2. Se abre el formulario `producto-form`.
3. Se capturan codigo, nombre, precio de compra, IVA y precio final de venta.
4. Se valida que codigo y nombre existan.
5. Se valida que los valores numericos sean correctos y no negativos.
6. Se revisa que no exista otro producto con el mismo codigo.
7. Se crea un `id` con `crypto.randomUUID()` cuando esta disponible.
8. Se agrega `creadoEn` y `actualizadoEn`.
9. Se guarda el arreglo completo de productos con cifrado hibrido.

### Leer productos

1. Al entrar a `#productos`, `init()` llama `leerProductos()`.
2. Se lee `localStorage.getItem('contabilidad.productos')`.
3. Si no hay datos, se devuelve un arreglo vacio.
4. Si los datos estan cifrados, se descifran con `descifrarHibrido()`.
5. Si se encuentran datos antiguos sin cifrar, se cargan y luego se vuelven a guardar cifrados para migrarlos.
6. Finalmente se renderiza la tabla.

### Actualizar producto

1. El usuario pulsa "Editar".
2. Se busca el producto por `id`.
3. El formulario se llena con los datos actuales.
4. Al guardar, el producto se reemplaza dentro del arreglo.
5. Se ejecuta `guardarProductos(productos)`.
6. El arreglo queda guardado otra vez con los campos sensibles cifrados.

### Eliminar producto

1. El usuario pulsa "Borrar".
2. Se pide confirmacion con `confirm()`.
3. Si confirma, se filtra el producto por `id`.
4. Se guarda el nuevo arreglo en `localStorage`.
5. Se refresca la tabla.

### Estado de clientes y proveedores

`src/controller/clientes.js` y `src/controller/proveedores.js` cargan datos de ejemplo en tablas. Sus botones de crear muestran una alerta y sus botones de editar/eliminar son visuales. Por eso, el flujo CRUD persistente y cifrado esta documentado tomando como base el modulo de productos.

## Como se guardan los datos

La aplicacion usa almacenamiento del navegador:

| Clave | Storage | Contenido |
| --- | --- | --- |
| `contabilidad.usuarios` | `localStorage` | Lista de usuarios registrados. Guarda correo, nombre y `passwordHash`, no la contrasena original. |
| `contabilidad.usuarioActivo` | `localStorage` o `sessionStorage` | Sesion activa. Usa `localStorage` si el usuario marca "Recordarme"; si no, usa `sessionStorage`. |
| `contabilidad.productos` | `localStorage` | Lista de productos. Los campos del producto se guardan cifrados en un paquete hibrido AES-GCM + RSA-OAEP. |
| `contabilidad.crypto.rsaKeys` | `localStorage` | Par de claves RSA en formato JWK usado por la demo para cifrar y descifrar la clave AES. |
| `contabilidad.registroPendiente.email` | `localStorage` | Correo temporal usado cuando un usuario intenta iniciar sesion sin estar registrado. |

Ejemplo simplificado de un producto guardado:

```js
{
    id: 'uuid-del-producto',
    creadoEn: 'fecha-iso',
    actualizadoEn: 'fecha-iso',
    datos: {
        version: 1,
        tipo: 'AES-GCM+RSA-OAEP',
        iv: 'iv-en-base64',
        claveCifrada: 'clave-aes-cifrada-con-rsa-en-base64',
        datosCifrados: 'producto-cifrado-con-aes-en-base64'
    }
}
```

## Aplicacion de SHA-256 en la contrasena

La funcion responsable es `crearHashSha256(texto)` en `src/services/cryptoService.js`.

Paso a paso:

1. El usuario escribe la contrasena en el formulario.
2. El controlador nunca guarda directamente ese valor.
3. El repositorio llama `crearHashSha256(password)`.
4. `TextEncoder` convierte el texto a bytes en UTF-8.
5. `crypto.subtle.digest('SHA-256', bytes)` calcula el resumen criptografico.
6. El resultado binario se convierte a hexadecimal con `bufferAHex()`.
7. En registro, ese hexadecimal se guarda como `passwordHash`.
8. En login, se calcula otra vez el hash de la contrasena ingresada y se compara contra el hash guardado.

Fragmento comentado del flujo:

```js
export async function crearHashSha256(texto) {
    const subtle = obtenerSubtleCrypto()

    // 1. La contrasena se convierte a bytes usando UTF-8.
    const bytes = TEXT_ENCODER.encode(texto)

    // 2. Web Crypto API calcula el hash SHA-256.
    const hashBuffer = await subtle.digest('SHA-256', bytes)

    // 3. El resultado se transforma a hexadecimal para poder guardarlo como texto.
    return bufferAHex(hashBuffer)
}
```

Uso durante el registro:

```js
const usuario = {
    id: crearIdUsuario(),
    nombre: nombre.trim(),
    email: emailNormalizado,

    // Solo se guarda el hash. La contrasena original no queda persistida.
    passwordHash: await crearHashSha256(password),

    creadoEn: new Date().toISOString(),
    pendienteSincronizar: true
}
```

Uso durante el login:

```js
const passwordHash = await crearHashSha256(password)

// Si el hash calculado no coincide con el almacenado, la contrasena es invalida.
if (passwordHash !== usuario.passwordHash) {
    return {
        ok: false,
        motivo: 'PASSWORD_INVALIDA',
        mensaje: 'La contrasena no coincide con este correo.'
    }
}
```

Nota: SHA-256 es una funcion hash, no un cifrado. No se puede "descifrar" para recuperar la contrasena original. Para un entorno productivo se recomienda usar un algoritmo especializado para contrasenas como Argon2, bcrypt o PBKDF2 con salt; en esta demo se usa SHA-256 para explicar el concepto y validar el flujo.

## Cifrado simetrico y asimetrico

El proyecto implementa un cifrado hibrido en `src/services/cryptoService.js`.

- Cifrado simetrico: AES-GCM de 256 bits.
- Cifrado asimetrico: RSA-OAEP de 2048 bits con SHA-256.
- Estrategia hibrida: AES cifra los datos y RSA cifra la clave AES.

Esta combinacion se usa porque AES es eficiente para cifrar datos completos, mientras que RSA es adecuado para proteger claves pequenas.

### Cifrado hibrido

La funcion principal es `cifrarHibrido(datos)`.

```js
export async function cifrarHibrido(datos) {
    const subtle = obtenerSubtleCrypto()

    // 1. Se obtiene o se genera el par de claves RSA.
    const { publicKey } = await obtenerParRSA()

    // 2. Se genera una clave AES nueva para esta operacion.
    const claveAES = await generarClaveAES()

    // 3. Los datos se convierten a texto JSON si son objetos.
    const texto = typeof datos === 'string' ? datos : JSON.stringify(datos)

    // 4. AES-GCM necesita un IV aleatorio. Aqui se usan 12 bytes.
    const iv = crypto.getRandomValues(new Uint8Array(12))

    // 5. Los datos se cifran con AES-GCM.
    const textoCifrado = await subtle.encrypt(
        { name: 'AES-GCM', iv },
        claveAES,
        TEXT_ENCODER.encode(texto)
    )

    // 6. La clave AES se exporta en crudo para poder protegerla con RSA.
    const claveAESRaw = await subtle.exportKey('raw', claveAES)

    // 7. La clave AES se cifra con la clave publica RSA.
    const claveCifrada = await subtle.encrypt(
        { name: 'RSA-OAEP' },
        publicKey,
        claveAESRaw
    )

    // 8. Se devuelve un paquete transportable en Base64.
    return {
        version: 1,
        tipo: 'AES-GCM+RSA-OAEP',
        iv: bufferABase64(iv),
        claveCifrada: bufferABase64(claveCifrada),
        datosCifrados: bufferABase64(textoCifrado)
    }
}
```

### Descifrado hibrido

La funcion inversa es `descifrarHibrido(paqueteCifrado, opciones)`.

```js
export async function descifrarHibrido(paqueteCifrado, opciones = {}) {
    const subtle = obtenerSubtleCrypto()

    // 1. Se obtiene la clave privada RSA.
    const { privateKey } = await obtenerParRSA()

    // 2. La clave privada RSA descifra la clave AES.
    const claveAESRaw = await subtle.decrypt(
        { name: 'RSA-OAEP' },
        privateKey,
        base64ABuffer(paqueteCifrado.claveCifrada)
    )

    // 3. La clave AES se importa para poder usarla en Web Crypto API.
    const claveAES = await subtle.importKey(
        'raw',
        claveAESRaw,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
    )

    // 4. AES-GCM descifra los datos usando el mismo IV guardado en el paquete.
    const datosDescifrados = await subtle.decrypt(
        { name: 'AES-GCM', iv: base64ABuffer(paqueteCifrado.iv) },
        claveAES,
        base64ABuffer(paqueteCifrado.datosCifrados)
    )

    const texto = TEXT_DECODER.decode(datosDescifrados)

    // 5. Si se pidio texto, retorna texto; si no, asume JSON.
    if (opciones.formato === 'texto') {
        return texto
    }

    return JSON.parse(texto)
}
```

### Generacion y almacenamiento del par RSA

`obtenerParRSA()` primero revisa si ya existe un par de claves en `localStorage`. Si existe, importa las claves JWK. Si no existe, genera un par nuevo:

```js
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
```

Luego exporta las claves a JWK y las guarda en `contabilidad.crypto.rsaKeys`.

## Flujo criptografico aplicado a productos

Cuando se guarda un producto, `guardarProductos()` no persiste directamente `codigo`, `nombre`, `precioCompra`, `iva` ni `precioFinalVenta`. Esos campos se empaquetan y se cifran:

```js
async function guardarProductos(productosActualizados) {
    const productosCifrados = await Promise.all(
        productosActualizados.map(async (producto) => ({
            id: producto.id,
            creadoEn: producto.creadoEn,
            actualizadoEn: producto.actualizadoEn,

            // Los datos del negocio quedan dentro del paquete cifrado.
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
```

Al cargar los productos, `leerProductos()` detecta si `producto.datos` es un paquete cifrado con `esPaqueteCifrado()` y lo descifra antes de renderizar la tabla.

## Ejemplo para explicar la criptografia de la aplicacion

Una forma sencilla de explicarlo seria:

> En D&D Market la contrasena del usuario no se guarda como texto. Cuando el usuario se registra, la aplicacion calcula un hash SHA-256 de esa contrasena y guarda solo ese resultado. En el login, vuelve a calcular el hash de la contrasena ingresada y lo compara con el hash almacenado. Si coinciden, el acceso es valido.
>
> Para los productos se usa un esquema hibrido. Primero, la aplicacion genera una clave AES temporal y cifra los datos del producto con AES-GCM. Luego cifra esa clave AES con RSA-OAEP usando la clave publica. En `localStorage` se guarda el paquete con el IV, la clave AES cifrada y los datos cifrados. Para leer el producto, la clave privada RSA recupera la clave AES y con esa clave se descifran los datos.

Resumen corto para una exposicion:

1. SHA-256 protege la validacion de contrasenas porque evita guardar la contrasena real.
2. AES-GCM cifra los datos del producto porque es rapido y seguro para informacion completa.
3. RSA-OAEP protege la clave AES porque permite envolver la clave simetrica con criptografia asimetrica.
4. El resultado es un flujo hibrido: AES protege los datos y RSA protege la clave.