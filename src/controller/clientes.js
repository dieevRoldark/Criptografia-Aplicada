export function init() {

    const btnNuevoCliente = document.getElementById('btn-cliente');

    if (btnNuevoCliente) {
        btnNuevoCliente.addEventListener ('click', () => alert('Agregar nuevo cliente'));
    }

    cargarTablaClientes();
}


function cargarTablaClientes() {
    const dataClientes = [
        { cedula: '1234567890', nombre: 'Juan Pérez', telefono: '0987654321', correo: 'client@example', direccion: 'Av. Siempre Viva 123' },
        { cedula: '1234567890', nombre: 'Juan Pérez', telefono: '0987654321', correo: 'client@example', direccion: 'Av. Siempre Viva 123' },
        { cedula: '1234567890', nombre: 'Juan Pérez', telefono: '0987654321', correo: 'client@example', direccion: 'Av. Siempre Viva 123' },
        { cedula: '1234567890', nombre: 'Juan Pérez', telefono: '0987654321', correo: 'client@example', direccion: 'Av. Siempre Viva 123' },
        { cedula: '1234567890', nombre: 'Juan Pérez', telefono: '0987654321', correo: 'client@example', direccion: 'Av. Siempre Viva 123' },
        { cedula: '1234567890', nombre: 'Juan Pérez', telefono: '0987654321', correo: 'client@example', direccion: 'Av. Siempre Viva 123' },
        { cedula: '1234567890', nombre: 'Juan Pérez', telefono: '0987654321', correo: 'client@example', direccion: 'Av. Siempre Viva 123' },
        { cedula: '1234567890', nombre: 'Juan Pérez', telefono: '0987654321', correo: 'client@example', direccion: 'Av. Siempre Viva 123' },
        { cedula: '1234567890', nombre: 'Juan Pérez', telefono: '0987654321', correo: 'client@example', direccion: 'Av. Siempre Viva 123' },
        { cedula: '1234567890', nombre: 'Juan Pérez', telefono: '0987654321', correo: 'client@example', direccion: 'Av. Siempre Viva 123' },
        { cedula: '1234567890', nombre: 'Juan Pérez', telefono: '0987654321', correo: 'client@example', direccion: 'Av. Siempre Viva 123' },
    ]

    const tbody = document.querySelector('#tbodyClientes tbody')
    
    tbody.innerHTML = ''
    
    dataClientes.forEach(cliente => {
        const fila = `
            <tr>
                <td>${cliente.cedula}</td>
                <td>${cliente.nombre}</td>
                <td>${cliente.telefono}</td>
                <td>${cliente.correo}</td>
                <td>${cliente.direccion}</td>
                <td><button class="btn-editar">✏️</button></td>
                <td><button class="btn-eliminar">🗑️</button></td>
            </tr>
        `

        tbody.innerHTML += fila
    })
}
