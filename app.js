
/*
REGISTRO DE USO DE INTELIGENCIA ARTIFICIAL
Herramienta utilizada: ChatGPT
Fecha: 31/10/2026
Prompt utilizado: Agregar validaciones a contactos y eventos con mensajes rojos debajo de los campos.
Cambios realizados: Validaciones de campos, duplicados y fechas; conservación de edición, borrado y localStorage.
*/

let contactos = [];
let eventos = [];
let idEditando = null;
let tipoEditando = null;

const campo = id => document.getElementById(id);
const formContacto = campo('form-contacto');
const formEvento = campo('form-evento');
const btnGuardarContacto = campo('btn-guardar-contacto');
const btnGuardarEvento = campo('btn-guardar-evento');

formContacto.noValidate = true;
formEvento.noValidate = true;

function guardarDatos() {
    localStorage.setItem('agenda-datos', JSON.stringify({ contactos, eventos }));
}

function cargarDatos() {
    try {
        const datos = JSON.parse(localStorage.getItem('agenda-datos') || '{}');
        contactos = Array.isArray(datos.contactos) ? datos.contactos : [];
        eventos = Array.isArray(datos.eventos) ? datos.eventos : [];
    } catch (error) {
        console.error('Error al cargar datos:', error);
        contactos = [];
        eventos = [];
    }
}

function crearId() {
    return crypto.randomUUID();
}

function crearBoton(texto, accion) {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.textContent = texto;
    boton.addEventListener('click', accion);
    return boton;
}

// MENSAJES DE ERROR EN ROJO
function borrarErrores(formulario) {
    formulario.querySelectorAll('.mensaje-error').forEach(error => error.remove());
    formulario.querySelectorAll('[aria-invalid="true"]').forEach(elemento => {
        elemento.removeAttribute('aria-invalid');
    });
}

function mostrarError(id, mensaje) {
    const elemento = campo(id);
    const error = document.createElement('p');
    error.className = 'mensaje-error';
    error.style.color = '#b00020';
    error.style.fontSize = '0.9rem';
    error.style.margin = '4px 0 10px';
    error.textContent = mensaje;
    elemento.setAttribute('aria-invalid', 'true');
    elemento.insertAdjacentElement('afterend', error);
}

// FECHAS
function fechaLocalHoy() {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
}

function fechaValida(fecha) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
    const [anio, mes, dia] = fecha.split('-').map(Number);
    const d = new Date(anio, mes - 1, dia);
    return d.getFullYear() === anio &&
           d.getMonth() === mes - 1 &&
           d.getDate() === dia;
}

// VALIDAR CONTACTOS
function validarContacto(datos) {
    borrarErrores(formContacto);
    let valido = true;

    if (!datos.nombre) {
        mostrarError('contacto-nombre', 'El nombre es obligatorio.');
        valido = false;
    }

    if (datos.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email)) {
        mostrarError('contacto-email', 'Ingresá un email válido.');
        valido = false;
    }

    if (datos.telefono && !/^[0-9\s-]+$/.test(datos.telefono)) {
        mostrarError('contacto-telefono', 'El teléfono solo puede tener números, espacios y guiones.');
        valido = false;
    }

    const normalizar = texto => texto.trim().toLocaleLowerCase('es');

    const duplicado = contactos.some(c =>
        String(c.id) !== String(tipoEditando === 'contacto' ? idEditando : '') &&
        normalizar(c.nombre || '') === normalizar(datos.nombre) &&
        normalizar(c.telefono || '') === normalizar(datos.telefono)
    );

    if (datos.nombre && duplicado) {
        mostrarError('contacto-nombre', 'Ya existe un contacto con este nombre y teléfono.');
        valido = false;
    }

    return valido;
}

// VALIDAR EVENTOS
function validarEvento(datos) {
    borrarErrores(formEvento);
    let valido = true;

    if (!datos.titulo) {
        mostrarError('evento-titulo', 'El título es obligatorio.');
        valido = false;
    }

    if (!fechaValida(datos.fecha)) {
        mostrarError('evento-fecha', 'Ingresá una fecha válida.');
        valido = false;
    } else if (datos.fecha < fechaLocalHoy()) {
        mostrarError('evento-fecha', 'La fecha ya pasó. Elegí una fecha de hoy o futura.');
        valido = false;
    }

    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(datos.hora)) {
        mostrarError('evento-hora', 'Ingresá una hora válida.');
        valido = false;
    }

    return valido;
}

// CANCELAR EDICIÓN
function cancelarEdicion() {
    idEditando = null;
    tipoEditando = null;
    formContacto.reset();
    formEvento.reset();
    borrarErrores(formContacto);
    borrarErrores(formEvento);
    btnGuardarContacto.textContent = 'Guardar contacto';
    btnGuardarEvento.textContent = 'Guardar evento';
    campo('btn-cancelar-contacto').hidden = true;
    campo('btn-cancelar-evento').hidden = true;
}

// MOSTRAR CONTACTOS
function mostrarContactos() {
    const lista = campo('lista-contactos');
    lista.innerHTML = '';

    contactos.forEach(contacto => {
        const tarjeta = document.createElement('article');
        tarjeta.className = 'tarjeta';

        const nombre = document.createElement('h3');
        nombre.textContent = '👤 ' + contacto.nombre;

        const telefono = document.createElement('p');
        telefono.textContent = '📞 ' + (contacto.telefono || 'Sin teléfono');

        const email = document.createElement('p');
        email.textContent = '✉️ ' + (contacto.email || 'Sin email');

        tarjeta.append(
            nombre,
            telefono,
            email,
            crearBoton('✏️ Editar', () => editarContacto(contacto.id)),
            crearBoton('🗑️ Borrar', () => borrarContacto(contacto.id))
        );

        lista.appendChild(tarjeta);
    });
}

// MOSTRAR EVENTOS ORDENADOS
function mostrarEventos() {
    const lista = campo('lista-eventos');
    lista.innerHTML = '';

    const ordenados = [...eventos].sort((a, b) =>
        (a.fecha + 'T' + a.hora).localeCompare(b.fecha + 'T' + b.hora)
    );

    ordenados.forEach(evento => {
        const tarjeta = document.createElement('article');
        tarjeta.className = 'tarjeta';

        const titulo = document.createElement('h3');
        titulo.textContent = '📅 ' + evento.titulo;

        const fecha = document.createElement('p');
        fecha.textContent = '📆 ' + evento.fecha;

        const hora = document.createElement('p');
        hora.textContent = '🕒 ' + evento.hora;

        const lugar = document.createElement('p');
        lugar.textContent = '📍 ' + (evento.lugar || 'Sin lugar');

        const contacto = contactos.find(c =>
            String(c.id) === String(evento.contactoId)
        );

        const persona = document.createElement('p');
        persona.textContent = '👤 ' + (contacto ? contacto.nombre : 'Sin contacto');

        tarjeta.append(
            titulo,
            fecha,
            hora,
            lugar,
            persona,
            crearBoton('✏️ Editar', () => editarEvento(evento.id)),
            crearBoton('🗑️ Borrar', () => borrarEvento(evento.id))
        );

        lista.appendChild(tarjeta);
    });
}

// SELECT DE CONTACTOS
function llenarSelectContactos() {
    const select = campo('evento-contacto');
    select.innerHTML = '';

    const inicial = document.createElement('option');
    inicial.value = '';
    inicial.textContent = 'Seleccionar contacto';
    select.appendChild(inicial);

    contactos.forEach(contacto => {
        const opcion = document.createElement('option');
        opcion.value = contacto.id;
        opcion.textContent = contacto.nombre;
        select.appendChild(opcion);
    });
}

// EDITAR CONTACTO
function editarContacto(id) {
    const contacto = contactos.find(c => String(c.id) === String(id));
    if (!contacto) return;

    cancelarEdicion();
    idEditando = id;
    tipoEditando = 'contacto';

    campo('contacto-nombre').value = contacto.nombre;
    campo('contacto-telefono').value = contacto.telefono || '';
    campo('contacto-email').value = contacto.email || '';
    campo('contacto-notas').value = contacto.notas || '';

    btnGuardarContacto.textContent = 'Actualizar';
    campo('btn-cancelar-contacto').hidden = false;
    formContacto.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// EDITAR EVENTO
function editarEvento(id) {
    const evento = eventos.find(e => String(e.id) === String(id));
    if (!evento) return;

    cancelarEdicion();
    idEditando = id;
    tipoEditando = 'evento';

    campo('evento-titulo').value = evento.titulo;
    campo('evento-fecha').value = evento.fecha;
    campo('evento-hora').value = evento.hora;
    campo('evento-lugar').value = evento.lugar || '';
    campo('evento-contacto').value = evento.contactoId || '';

    if (campo('evento-contacto').selectedIndex === -1) {
        campo('evento-contacto').value = '';
    }

    btnGuardarEvento.textContent = 'Actualizar';
    campo('btn-cancelar-evento').hidden = false;
    formEvento.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// BORRAR CONTACTO
function borrarContacto(id) {
    if (!confirm('¿Seguro que querés borrar este contacto?')) return;

    contactos = contactos.filter(c => String(c.id) !== String(id));

    if (tipoEditando === 'contacto' && String(idEditando) === String(id)) {
        cancelarEdicion();
    }

    guardarDatos();
    mostrarContactos();
    mostrarEventos();
    llenarSelectContactos();
}

// BORRAR EVENTO
function borrarEvento(id) {
    if (!confirm('¿Seguro que querés borrar este evento?')) return;

    eventos = eventos.filter(e => String(e.id) !== String(id));

    if (tipoEditando === 'evento' && String(idEditando) === String(id)) {
        cancelarEdicion();
    }

    guardarDatos();
    mostrarEventos();
}

// GUARDAR O ACTUALIZAR CONTACTO
formContacto.addEventListener('submit', event => {
    event.preventDefault();

    const datos = {
        nombre: campo('contacto-nombre').value.trim(),
        telefono: campo('contacto-telefono').value.trim(),
        email: campo('contacto-email').value.trim(),
        notas: campo('contacto-notas').value.trim()
    };

    if (!validarContacto(datos)) return;

    if (tipoEditando === 'contacto' && idEditando !== null) {
        const contacto = contactos.find(c =>
            String(c.id) === String(idEditando)
        );
        if (contacto) Object.assign(contacto, datos);
    } else {
        contactos.push({ id: crearId(), ...datos });
    }

    guardarDatos();
    cancelarEdicion();
    mostrarContactos();
    mostrarEventos();
    llenarSelectContactos();
});

// GUARDAR O ACTUALIZAR EVENTO
formEvento.addEventListener('submit', event => {
    event.preventDefault();

    const datos = {
        titulo: campo('evento-titulo').value.trim(),
        fecha: campo('evento-fecha').value,
        hora: campo('evento-hora').value,
        lugar: campo('evento-lugar').value.trim(),
        contactoId: campo('evento-contacto').value
    };

    if (!validarEvento(datos)) return;

    if (tipoEditando === 'evento' && idEditando !== null) {
        const evento = eventos.find(e =>
            String(e.id) === String(idEditando)
        );
        if (evento) Object.assign(evento, datos);
    } else {
        eventos.push({ id: crearId(), ...datos });
    }

    guardarDatos();
    cancelarEdicion();
    mostrarEventos();
});

// CREAR BOTONES CANCELAR
function agregarBotonCancelar(formulario, id) {
    const boton = crearBoton('Cancelar edición', cancelarEdicion);
    boton.id = id;
    boton.hidden = true;
    formulario.appendChild(boton);
}

agregarBotonCancelar(formContacto, 'btn-cancelar-contacto');
agregarBotonCancelar(formEvento, 'btn-cancelar-evento');

// INICIAR AGENDA
cargarDatos();
mostrarContactos();
mostrarEventos();
llenarSelectContactos();


/*
PASO 7: BUSCADOR EN VIVO Y EVENTOS DE HOY
*/

// 1. IGNORAR MAYÚSCULAS Y TILDES
function normalizarBusqueda(texto) {
    return String(texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

// 2. FILTRAR SIN BORRAR DATOS
function aplicarBusqueda() {
    const busqueda = normalizarBusqueda(
        document.getElementById("buscador").value.trim()
    );

    const tarjetasContactos =
        document.querySelectorAll("#lista-contactos .tarjeta");

    tarjetasContactos.forEach(function(tarjeta, indice) {
        const contacto = contactos[indice];
        const contenido = normalizarBusqueda(
            contacto.nombre + " " + (contacto.email || "")
        );

        tarjeta.hidden = !contenido.includes(busqueda);
        tarjeta.style.display = tarjeta.hidden ? "none" : "";
    });

    const eventosOrdenados = [...eventos].sort(function(a, b) {
        return (a.fecha + "T" + a.hora)
            .localeCompare(b.fecha + "T" + b.hora);
    });

    const tarjetasEventos =
        document.querySelectorAll("#lista-eventos .tarjeta");

    tarjetasEventos.forEach(function(tarjeta, indice) {
        const evento = eventosOrdenados[indice];
        const contenido = normalizarBusqueda(
            evento.titulo + " " + (evento.lugar || "")
        );

        tarjeta.hidden = !contenido.includes(busqueda);
        tarjeta.style.display = tarjeta.hidden ? "none" : "";
    });
}

// 3. ARMAR LA FECHA ACTUAL EN HORA LOCAL
function obtenerFechaHoy() {
    const ahora = new Date();

    const anio = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, "0");
    const dia = String(ahora.getDate()).padStart(2, "0");

    return anio + "-" + mes + "-" + dia;
}

// 4. CREAR RECUADRO HOY
const recuadroHoy = document.createElement("section");
recuadroHoy.id = "recuadro-hoy";
recuadroHoy.style.border = "2px solid #5278b5";
recuadroHoy.style.borderRadius = "12px";
recuadroHoy.style.padding = "15px";
recuadroHoy.style.margin = "15px 0";
recuadroHoy.style.backgroundColor = "#edf4ff";
recuadroHoy.style.color = "#172b4d";

const listaEventos = document.getElementById("lista-eventos");
listaEventos.parentNode.insertBefore(recuadroHoy, listaEventos);

// 5. MOSTRAR EVENTOS DE HOY
function mostrarEventosHoy() {
    recuadroHoy.innerHTML = "";

    const titulo = document.createElement("h3");
    titulo.textContent = "📅 Hoy";
    recuadroHoy.appendChild(titulo);

    const hoy = obtenerFechaHoy();

    const eventosHoy = eventos
        .filter(function(evento) {
            return evento.fecha === hoy;
        })
        .sort(function(a, b) {
            return a.hora.localeCompare(b.hora);
        });

    if (eventosHoy.length === 0) {
        const mensaje = document.createElement("p");
        mensaje.textContent = "No tenés eventos hoy";
        recuadroHoy.appendChild(mensaje);
        return;
    }

    eventosHoy.forEach(function(evento) {
        const detalle = document.createElement("p");
        detalle.textContent =
            "🕒 " + evento.hora +
            " — " + evento.titulo +
            (evento.lugar ? " — 📍 " + evento.lugar : "");

        recuadroHoy.appendChild(detalle);
    });
}

// 6. ACTUALIZAR BUSCADOR Y HOY AL MODIFICAR DATOS
const mostrarContactosAnterior = mostrarContactos;
const mostrarEventosAnterior = mostrarEventos;

mostrarContactos = function() {
    mostrarContactosAnterior();
    aplicarBusqueda();
};

mostrarEventos = function() {
    mostrarEventosAnterior();
    aplicarBusqueda();
    mostrarEventosHoy();
};

// 7. BUSCADOR EN VIVO
document.getElementById("buscador")
    .addEventListener("input", aplicarBusqueda);

// 8. MOSTRAR TODO AL INICIAR
aplicarBusqueda();
mostrarEventosHoy();


/*
PASO 8: EXPORTAR E IMPORTAR DATOS
*/

// 1. MOSTRAR MENSAJES DE IMPORTACIÓN
const mensajeImportacion = document.createElement("p");
mensajeImportacion.id = "mensaje-importacion";
mensajeImportacion.setAttribute("role", "status");

document.getElementById("herramientas")
    .appendChild(mensajeImportacion);

function informarImportacion(texto, esError = false) {
    mensajeImportacion.textContent = texto;
    mensajeImportacion.style.color = esError ? "#b00020" : "green";
}

// 2. EXPORTAR CONTACTOS Y EVENTOS
document.getElementById("btn-exportar")
    .addEventListener("click", function() {

        const datos = {
            contactos: contactos,
            eventos: eventos
        };

        const contenido = JSON.stringify(datos, null, 2);

        const archivo = new Blob(
            [contenido],
            { type: "application/json" }
        );

        const url = URL.createObjectURL(archivo);

        const enlace = document.createElement("a");
        enlace.href = url;
        enlace.download = "agenda.json";

        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();

        URL.revokeObjectURL(url);
    });

// 3. ABRIR SELECTOR DE ARCHIVOS
const archivoImportar = document.getElementById("archivo-importar");

document.getElementById("btn-importar")
    .addEventListener("click", function() {
        archivoImportar.click();
    });

// 4. LEER Y VALIDAR ARCHIVO JSON
archivoImportar.addEventListener("change", async function() {

    const archivo = archivoImportar.files[0];

    if (!archivo) return;

    try {
        if (!archivo.name.toLowerCase().endsWith(".json")) {
            throw new Error("Seleccioná un archivo JSON válido.");
        }

        const contenido = await archivo.text();

        // JSON.parse protegido por try/catch
        const datos = JSON.parse(contenido);

        // Verificar que existan ambas listas y sean arrays
        if (
            !datos ||
            typeof datos !== "object" ||
            !Array.isArray(datos.contactos) ||
            !Array.isArray(datos.eventos)
        ) {
            throw new Error(
                "El archivo debe contener las listas contactos y eventos."
            );
        }

        // Pedir confirmación antes de reemplazar
        const confirmado = confirm(
            "¿Querés reemplazar todos los contactos y eventos actuales por los del archivo?"
        );

        if (!confirmado) {
            informarImportacion("Importación cancelada. Tus datos siguen intactos.");
            return;
        }

        // Reemplazar solamente después de validar y confirmar
        contactos = datos.contactos;
        eventos = datos.eventos;

        cancelarEdicion();

        guardarDatos();
        mostrarContactos();
        mostrarEventos();
        llenarSelectContactos();

        informarImportacion("Datos importados correctamente.");

    } catch (error) {
        informarImportacion(
            "No se pudo importar: " + error.message,
            true
        );
    } finally {
        archivoImportar.value = "";
    }
});


