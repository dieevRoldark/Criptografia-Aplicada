export function init() {

    const btnNuevoProveedor = document.getElementById('btn-Proveedores');

    if (btnNuevoProveedor) {
        btnNuevoProveedor.addEventListener ('click', () => alert('Agregar nuevo proveedor'));
    }

    cargarTablaProveedores();
}


function cargarTablaProveedores() {
    const dataProveedores = [
        { nit: 1, nombre: 'SuperOriente', telefono: '123456789', direccion: 'Calle 123', email: 'Superori@example.com'},
        { nit: 2, nombre: 'SuperOccidente', telefono: '987654321', direccion: 'Avenida 456', email: 'nuevoprove@example.com'},
        { nit: 2, nombre: 'SuperOccidente', telefono: '987654321', direccion: 'Avenida 456', email: 'nuevoprove@example.com'},
        { nit: 2, nombre: 'SuperOccidente', telefono: '987654321', direccion: 'Avenida 456', email: 'nuevoprove@example.com'},
        { nit: 2, nombre: 'SuperOccidente', telefono: '987654321', direccion: 'Avenida 456', email: 'nuevoprove@example.com'},
        { nit: 2, nombre: 'SuperOccidente', telefono: '987654321', direccion: 'Avenida 456', email: 'nuevoprove@example.com'},
        { nit: 2, nombre: 'SuperOccidente', telefono: '987654321', direccion: 'Avenida 456', email: 'nuevoprove@example.com'},
        { nit: 2, nombre: 'SuperOccidente', telefono: '987654321', direccion: 'Avenida 456', email: 'nuevoprove@example.com'},
        { nit: 2, nombre: 'SuperOccidente', telefono: '987654321', direccion: 'Avenida 456', email: 'nuevoprove@example.com'},
        { nit: 2, nombre: 'SuperOccidente', telefono: '987654321', direccion: 'Avenida 456', email: 'nuevoprove@example.com'},
    ]

    const tbody = document.querySelector('#tbodyProveedores tbody')
    
    tbody.innerHTML = ''
    
    dataProveedores.forEach(proveedor => {
        const fila = `
            <tr>
                <td>${proveedor.nit}</td>
                <td>${proveedor.nombre}</td>
                <td>${proveedor.telefono}</td>
                <td>${proveedor.direccion}</td>
                <td>${proveedor.email}</td>
                <td><button class="btn-editar">✏️</button></td>
                <td><button class="btn-eliminar">🗑️</button></td>
            </tr>
        `

        tbody.innerHTML += fila
    })
}
