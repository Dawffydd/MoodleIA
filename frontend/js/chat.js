
const contenedorLogin = document.getElementById("contenedorLogin");
const contenedorChat = document.getElementById("contenedorChat");

const inputCorreo = document.getElementById("correo");
const inputPassword = document.getElementById("password");
const btnLogin = document.getElementById("btnLogin");
const btnCerrarSesion = document.getElementById("btnCerrarSesion");
const mensajeLogin = document.getElementById("mensajeLogin");

const inputPregunta = document.getElementById("pregunta");
const btnEnviar = document.getElementById("btnEnviar");
const contenedorMensajes = document.getElementById("mensajes");

const btnNuevaConversacion = document.getElementById("btnNuevaConversacion");
const listaConversaciones = document.getElementById("listaConversaciones");

const btnGenerarCuestionario = document.getElementById("btnGenerarCuestionario");
const btnCalificarCuestionario = document.getElementById("btnCalificarCuestionario");
const estadoCuestionario = document.getElementById("estadoCuestionario");
const contenedorCuestionario = document.getElementById("contenedorCuestionario");
const preguntasCuestionario = document.getElementById("preguntasCuestionario");
const resultadoCuestionario = document.getElementById("resultadoCuestionario");

const API_LOGIN = "/api/auth/login";
const API_CHAT = "/api/ia/chat";
const API_CONVERSACIONES = "/api/conversaciones";
const API_CUESTIONARIO = "/api/ia/cuestionario";

// ==========================================
// ELEMENTOS DEL RESUMEN
// ==========================================

const API_RESUMEN = "/api/ia/resumen";

const btnGenerarResumen =
    document.getElementById("btnGenerarResumen");

const btnCopiarResumen =
    document.getElementById("btnCopiarResumen");

const estadoResumen =
    document.getElementById("estadoResumen");

const contenedorResumen =
    document.getElementById("contenedorResumen");

const textoResumen =
    document.getElementById("textoResumen");

let resumenActual = "";
let generandoResumen = false;

const parametrosURL = new URLSearchParams(window.location.search);
const COURSE_ID = parametrosURL.get("courseId");

console.log("Curso Moodle detectado:", COURSE_ID);

const mensajeBienvenida =
    "Hola 👋 Soy MoodleIA. Puedes preguntarme sobre el contenido disponible en este curso.";

let conversacionId = null;
let chatEnProceso = false;

let cuestionarioActual = [];
let generandoCuestionario = false;
let cuestionarioCalificado = false;

// ==========================================
// MOSTRAR LOGIN O CHAT
// ==========================================

function mostrarLogin() {
    contenedorLogin.style.display = "flex";
    contenedorChat.style.display = "none";
}

function mostrarChat() {
    contenedorLogin.style.display = "none";
    contenedorChat.style.display = "flex";

    if (COURSE_ID) {
        cargarConversaciones();
    }
}

function limpiarSesion() {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    conversacionId = null;
}

function cerrarSesion() {
    limpiarSesion();
    mostrarLogin();
}

// ==========================================
// VERIFICAR SESIÓN
// ==========================================

function verificarSesionGuardada() {
    const token = localStorage.getItem("token");
    const usuarioGuardado = localStorage.getItem("usuario");

    if (!token || !usuarioGuardado) {
        mostrarLogin();
        return;
    }

    try {
        const usuario = JSON.parse(usuarioGuardado);

        if (
            usuario.rol === "DOCENTE" ||
            usuario.rol === "ADMINISTRADOR"
        ) {
            window.location.href = "/dashboard.html";
            return;
        }

        if (usuario.rol === "ESTUDIANTE") {
            if (COURSE_ID) {
                mostrarChat();
            } else {
                window.location.href = "/cursos.html";
            }
            return;
        }

        limpiarSesion();
        mostrarLogin();

    } catch (error) {
        limpiarSesion();
        mostrarLogin();
    }
}

// ==========================================
// INICIAR SESIÓN
// ==========================================

async function iniciarSesion() {
    const correo = inputCorreo.value.trim();
    const password = inputPassword.value;

    if (!correo || !password) {
        mensajeLogin.textContent =
            "Ingresa tu correo y contraseña.";
        return;
    }

    btnLogin.disabled = true;
    mensajeLogin.textContent = "Iniciando sesión...";

    try {
        const response = await fetch(API_LOGIN, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ correo, password })
        });

        const data = await response.json();

        if (!response.ok) {
            mensajeLogin.textContent =
                data.mensaje || "Credenciales incorrectas.";
            return;
        }

        localStorage.setItem("token", data.token);
        localStorage.setItem(
            "usuario",
            JSON.stringify(data.usuario)
        );

        mensajeLogin.textContent = "";

        if (
            data.usuario.rol === "DOCENTE" ||
            data.usuario.rol === "ADMINISTRADOR"
        ) {
            window.location.href = "/dashboard.html";
        } else if (data.usuario.rol === "ESTUDIANTE") {
            window.location.href = "/cursos.html";
        } else {
            limpiarSesion();
            mensajeLogin.textContent =
                "El usuario no tiene un rol válido.";
        }

    } catch (error) {
        console.error("Error login:", error);
        mensajeLogin.textContent =
            "No fue posible conectar con el servidor.";
    } finally {
        btnLogin.disabled = false;
    }
}

// ==========================================
// AGREGAR MENSAJES AL CHAT
// ==========================================

function agregarMensaje(texto, tipo) {
    const mensaje = document.createElement("div");
    mensaje.classList.add("mensaje", tipo);

    const burbuja = document.createElement("div");
    burbuja.classList.add("burbuja");
    burbuja.textContent = texto;

    mensaje.appendChild(burbuja);
    contenedorMensajes.appendChild(mensaje);

    contenedorMensajes.scrollTop =
        contenedorMensajes.scrollHeight;

    return mensaje;
}

// ==========================================
// ENVIAR PREGUNTA A OLLAMA
// ==========================================

async function enviarPregunta() {
    if (chatEnProceso) return;

    const pregunta = inputPregunta.value.trim();
    if (!pregunta) return;

    const token = localStorage.getItem("token");

    if (!token) {
        mostrarLogin();
        return;
    }

    chatEnProceso = true;

    agregarMensaje(pregunta, "usuario");
    inputPregunta.value = "";

    btnEnviar.disabled = true;
    inputPregunta.disabled = true;

    const mensajeProcesando = agregarMensaje(
        "Estoy procesando tu pregunta...",
        "asistente"
    );

    try {
        const cuerpo = {
            courseId: COURSE_ID,
            pregunta
        };

        if (conversacionId) {
            cuerpo.conversacionId = conversacionId;
        }

        const response = await fetch(API_CHAT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(cuerpo)
        });

        const data = await response.json();
        mensajeProcesando.remove();

        if (response.status === 401) {
            limpiarSesion();
            mensajeLogin.textContent =
                "Tu sesión expiró. Inicia sesión nuevamente.";
            mostrarLogin();
            return;
        }

        if (!response.ok) {
            agregarMensaje(
                data.mensaje || "Error al procesar la pregunta.",
                "asistente"
            );
            return;
        }

        conversacionId = data.conversacionId;
        agregarMensaje(data.respuesta, "asistente");

        await cargarConversaciones();

    } catch (error) {
        console.error("Error del chat:", error);
        mensajeProcesando.remove();

        agregarMensaje(
            "No fue posible conectar con MoodleIA.",
            "asistente"
        );

    } finally {
        chatEnProceso = false;
        btnEnviar.disabled = false;
        inputPregunta.disabled = false;
        inputPregunta.focus();
    }
}

// ==========================================
// NUEVA CONVERSACIÓN
// ==========================================

function nuevaConversacion() {
    if (chatEnProceso) return;

    conversacionId = null;
    contenedorMensajes.innerHTML = "";

    agregarMensaje(mensajeBienvenida, "asistente");

    inputPregunta.value = "";
    inputPregunta.focus();

    cargarConversaciones();
}

// ==========================================
// CARGAR CONVERSACIONES
// ==========================================

async function cargarConversaciones() {
    const token = localStorage.getItem("token");

    if (!token || !COURSE_ID) return;

    try {
        listaConversaciones.textContent =
            "Cargando conversaciones...";

        const response = await fetch(API_CONVERSACIONES, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            limpiarSesion();
            mostrarLogin();
            return;
        }

        if (!response.ok) {
            throw new Error("Error al obtener conversaciones");
        }

        const data = await response.json();

        const conversaciones = (
            data.conversaciones || []
        ).filter(item =>
            Number(item.curso_moodle_id) === Number(COURSE_ID)
        );

        listaConversaciones.innerHTML = "";

        if (conversaciones.length === 0) {
            listaConversaciones.textContent =
                "Todavía no tienes conversaciones en este curso.";
            return;
        }

        conversaciones.forEach(item => {
            const tarjeta = document.createElement("div");
            tarjeta.classList.add("tarjeta-conversacion");

            const boton = document.createElement("button");
            boton.type = "button";
            boton.classList.add("conversacion-item");
            boton.textContent =
                item.titulo || "Conversación sin título";
            boton.title = boton.textContent;

            if (Number(item.id) === Number(conversacionId)) {
                boton.classList.add("activa");
            }

            boton.addEventListener("click", () => {
                if (!chatEnProceso) {
                    abrirConversacion(item.id);
                }
            });

            const btnEliminar = document.createElement("button");
            btnEliminar.type = "button";
            btnEliminar.classList.add("btn-eliminar-conversacion");
            btnEliminar.textContent = "Eliminar";

            btnEliminar.addEventListener("click", () => {
                if (!chatEnProceso) {
                    eliminarConversacion(item.id);
                }
            });

            tarjeta.appendChild(boton);
            tarjeta.appendChild(btnEliminar);
            listaConversaciones.appendChild(tarjeta);
        });

    } catch (error) {
        console.error("Error historial:", error);
        listaConversaciones.textContent =
            "No fue posible cargar el historial.";
    }
}

// ==========================================
// ABRIR CONVERSACIÓN
// ==========================================

async function abrirConversacion(id) {
    if (chatEnProceso) return;

    const token = localStorage.getItem("token");
    if (!token) return mostrarLogin();

    chatEnProceso = true;
    btnEnviar.disabled = true;
    inputPregunta.disabled = true;
    btnNuevaConversacion.disabled = true;

    try {
        const response = await fetch(
            `${API_CONVERSACIONES}/${encodeURIComponent(id)}/mensajes`,
            {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );

        if (response.status === 401) {
            limpiarSesion();
            mostrarLogin();
            return;
        }

        if (!response.ok) {
            throw new Error("No fue posible abrir la conversación");
        }

        const data = await response.json();

        if (
            Number(data.conversacion.curso_moodle_id) !==
            Number(COURSE_ID)
        ) {
            throw new Error("Conversación de otro curso");
        }

        conversacionId = data.conversacion.id;
        contenedorMensajes.innerHTML = "";

        const mensajes = data.mensajes || [];

        if (mensajes.length === 0) {
            agregarMensaje(mensajeBienvenida, "asistente");
        } else {
            mensajes.forEach(mensaje => {
                const tipo = mensaje.tipo === "usuario"
                    ? "usuario"
                    : "asistente";

                agregarMensaje(mensaje.contenido, tipo);
            });
        }

        await cargarConversaciones();

    } catch (error) {
        console.error(error);
        alert("No fue posible abrir la conversación.");

    } finally {
        chatEnProceso = false;
        btnEnviar.disabled = false;
        inputPregunta.disabled = false;
        btnNuevaConversacion.disabled = false;
    }
}

// ==========================================
// ELIMINAR CONVERSACIÓN
// ==========================================

async function eliminarConversacion(id) {
    if (chatEnProceso) return;

    const confirmar = confirm(
        "¿Estás seguro de eliminar esta conversación? No se puede deshacer."
    );

    if (!confirmar) return;

    const token = localStorage.getItem("token");
    if (!token) return mostrarLogin();

    chatEnProceso = true;
    btnEnviar.disabled = true;
    inputPregunta.disabled = true;
    btnNuevaConversacion.disabled = true;

    try {
        const response = await fetch(
            `${API_CONVERSACIONES}/${encodeURIComponent(id)}`,
            {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );

        if (response.status === 401) {
            limpiarSesion();
            mostrarLogin();
            return;
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.mensaje || "Error al eliminar");
        }

        if (Number(conversacionId) === Number(id)) {
            conversacionId = null;
            contenedorMensajes.innerHTML = "";
            agregarMensaje(mensajeBienvenida, "asistente");
        }

        await cargarConversaciones();

    } catch (error) {
        console.error(error);
        alert(error.message);

    } finally {
        chatEnProceso = false;
        btnEnviar.disabled = false;
        inputPregunta.disabled = false;
        btnNuevaConversacion.disabled = false;
    }
}

// ==========================================
// GENERAR CUESTIONARIO CON IA
// ==========================================

async function generarCuestionario() {
    if (generandoCuestionario) return;

    const token = localStorage.getItem("token");

    if (!token) {
        mostrarLogin();
        return;
    }

    if (!COURSE_ID) {
        estadoCuestionario.textContent =
            "Primero debes seleccionar un curso.";
        return;
    }

    generandoCuestionario = true;
    cuestionarioCalificado = false;
    cuestionarioActual = [];

    btnGenerarCuestionario.disabled = true;
    btnGenerarCuestionario.textContent =
        "Generando cuestionario...";

    estadoCuestionario.textContent =
        "MoodleIA está preparando las preguntas. " +
        "Este proceso puede tardar varios minutos.";

    contenedorCuestionario.style.display = "none";
    preguntasCuestionario.innerHTML = "";
    resultadoCuestionario.textContent = "";

    try {
        const response = await fetch(API_CUESTIONARIO, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                courseId: Number(COURSE_ID)
            })
        });

        const data = await response.json();

        if (response.status === 401) {
            limpiarSesion();
            mostrarLogin();
            return;
        }

        if (!response.ok) {
            throw new Error(
                data.mensaje || "No fue posible generar el cuestionario."
            );
        }

        if (
            !Array.isArray(data.preguntas) ||
            data.preguntas.length !== 5
        ) {
            throw new Error(
                "La IA no devolvió las cinco preguntas esperadas."
            );
        }

        cuestionarioActual = data.preguntas;

        mostrarCuestionario();

        estadoCuestionario.textContent =
            "Cuestionario generado correctamente. " +
            "Selecciona una respuesta para cada pregunta.";

    } catch (error) {
        console.error("Error cuestionario:", error);
        estadoCuestionario.textContent =
            error.message || "Error al conectar con MoodleIA.";

    } finally {
        generandoCuestionario = false;
        btnGenerarCuestionario.disabled = false;
        btnGenerarCuestionario.textContent =
            "Generar otro cuestionario";
    }
}

// ==========================================
// MOSTRAR CUESTIONARIO
// ==========================================

function mostrarCuestionario() {
    preguntasCuestionario.innerHTML = "";
    resultadoCuestionario.textContent = "";

    cuestionarioCalificado = false;
    btnCalificarCuestionario.disabled = false;

    cuestionarioActual.forEach((item, indice) => {
        const tarjeta = document.createElement("div");
        tarjeta.classList.add("pregunta-cuestionario");

        const titulo = document.createElement("h3");
        titulo.textContent =
            `Pregunta ${indice + 1}. ${item.pregunta}`;

        tarjeta.appendChild(titulo);

        item.opciones.forEach((opcion, indiceOpcion) => {
            const etiqueta = document.createElement("label");
            etiqueta.classList.add("opcion-cuestionario");

            const radio = document.createElement("input");
            radio.type = "radio";
            radio.name = `pregunta_${indice}`;
            radio.value = String(indiceOpcion);

            const texto = document.createElement("span");
            texto.textContent = " " + opcion;

            etiqueta.appendChild(radio);
            etiqueta.appendChild(texto);
            tarjeta.appendChild(etiqueta);
        });

        const explicacion = document.createElement("div");
        explicacion.id = `explicacion_${indice}`;
        explicacion.classList.add("explicacion-cuestionario");

        tarjeta.appendChild(explicacion);
        preguntasCuestionario.appendChild(tarjeta);
    });

    contenedorCuestionario.style.display = "block";
}

// ==========================================
// CALIFICAR CUESTIONARIO
// ==========================================

function calificarCuestionario() {
    console.log("Se presionó el botón Calificar cuestionario");

    if (
        cuestionarioActual.length === 0 ||
        cuestionarioCalificado
    ) {
        return;
    }

    const respuestas = cuestionarioActual.map((item, indice) => {
        const seleccionada = preguntasCuestionario.querySelector(
            `input[name="pregunta_${indice}"]:checked`
        );

        return seleccionada
            ? Number(seleccionada.value)
            : null;
    });

    if (respuestas.some(respuesta => respuesta === null)) {
        resultadoCuestionario.textContent =
            "Debes responder las cinco preguntas antes de calificar.";

        resultadoCuestionario.style.color = "#b91c1c";

        resultadoCuestionario.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

        return;
    }

    let respuestasCorrectas = 0;

    cuestionarioActual.forEach((item, indice) => {
        const respuestaEstudiante = respuestas[indice];
        const respuestaCorrecta = Number(item.respuestaCorrecta);

        const explicacion = document.getElementById(
            `explicacion_${indice}`
        );

        explicacion.innerHTML = "";

        const resultado = document.createElement("p");
        const detalle = document.createElement("p");

        if (respuestaEstudiante === respuestaCorrecta) {
            respuestasCorrectas++;
            resultado.textContent = "✓ Respuesta correcta";
            resultado.style.color = "#15803d";
        } else {
            resultado.textContent = "✗ Respuesta incorrecta";
            resultado.style.color = "#b91c1c";
        }

        detalle.textContent =
            "Respuesta correcta: " +
            item.opciones[respuestaCorrecta] +
            ". " +
            item.explicacion;

        explicacion.appendChild(resultado);
        explicacion.appendChild(detalle);
    });

    const total = cuestionarioActual.length;

    const nota = Math.round(
        (respuestasCorrectas / total) * 100
    );

    resultadoCuestionario.textContent =
        `Calificación: ${nota}/100. ` +
        `Respuestas correctas: ${respuestasCorrectas} de ${total}.`;

    resultadoCuestionario.style.color =
        nota >= 60 ? "#15803d" : "#b91c1c";

    resultadoCuestionario.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });

    preguntasCuestionario
        .querySelectorAll('input[type="radio"]')
        .forEach(opcion => {
            opcion.disabled = true;
        });

    cuestionarioCalificado = true;
    btnCalificarCuestionario.disabled = true;
}


// ==========================================
// GENERAR RESUMEN DE ESTUDIO
// ==========================================

async function generarResumen() {

    if (generandoResumen) return;

    const token = localStorage.getItem("token");

    if (!token) {
        mostrarLogin();
        return;
    }

    if (!COURSE_ID) {
        estadoResumen.textContent =
            "Primero debes seleccionar un curso.";
        return;
    }

    generandoResumen = true;
    resumenActual = "";

    btnGenerarResumen.disabled = true;
    btnGenerarResumen.textContent =
        "Generando resumen...";

    estadoResumen.textContent =
        "MoodleIA está analizando el material académico. " +
        "La generación puede tardar varios minutos.";

    contenedorResumen.style.display = "none";
    textoResumen.textContent = "";

    try {

        const response = await fetch(API_RESUMEN, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                courseId: Number(COURSE_ID)
            })
        });

        const data = await response.json();

        if (response.status === 401) {
            limpiarSesion();
            mostrarLogin();
            return;
        }

        if (!response.ok) {
            throw new Error(
                data.mensaje ||
                "No fue posible generar el resumen."
            );
        }

        if (
            typeof data.resumen !== "string" ||
            !data.resumen.trim()
        ) {
            throw new Error(
                "La IA no devolvió un resumen válido."
            );
        }

        resumenActual = data.resumen;

        textoResumen.textContent = resumenActual;
        contenedorResumen.style.display = "block";

        estadoResumen.textContent =
            "Resumen generado correctamente.";

    } catch (error) {

        console.error("Error generando resumen:", error);

        estadoResumen.textContent =
            error.message ||
            "No fue posible conectar con MoodleIA.";

    } finally {

        generandoResumen = false;
        btnGenerarResumen.disabled = false;
        btnGenerarResumen.textContent =
            "Generar otro resumen";
    }
}

// ==========================================
// COPIAR RESUMEN
// ==========================================


async function copiarResumen() {

    console.log("Se presionó Copiar resumen");

    const contenido = resumenActual ||
        textoResumen.textContent;

    if (!contenido || !contenido.trim()) {
        estadoResumen.textContent =
            "No hay ningún resumen para copiar.";
        return;
    }

    // Método alternativo de copiado
    function copiarConTextarea(texto) {

        const textarea = document.createElement("textarea");

        textarea.value = texto;
        textarea.setAttribute("readonly", "");

        textarea.style.position = "fixed";
        textarea.style.top = "0";
        textarea.style.left = "0";
        textarea.style.opacity = "0";

        document.body.appendChild(textarea);

        textarea.focus();
        textarea.select();
        textarea.setSelectionRange(0, texto.length);

        let copiado = false;

        try {
            copiado = document.execCommand("copy");
        } finally {
            document.body.removeChild(textarea);
        }

        return copiado;
    }

    let copiado = false;

    // Intentar primero el método alternativo,
    // debido a las restricciones del iframe de Moodle.
    try {
        copiado = copiarConTextarea(contenido);
    } catch (error) {
        console.warn("Método alternativo falló:", error);
    }

    if (copiado) {

        estadoResumen.textContent =
            "✓ Resumen copiado correctamente.";

        estadoResumen.style.color = "#15803d";

    } else {

        // Si Moodle también bloquea este método,
        // seleccionar el texto para copiar manualmente.
        const seleccion = window.getSelection();
        const rango = document.createRange();

        rango.selectNodeContents(textoResumen);

        seleccion.removeAllRanges();
        seleccion.addRange(rango);

        estadoResumen.textContent =
            "El navegador bloqueó el copiado automático. " +
            "El resumen está seleccionado; presiona Ctrl + C.";

        estadoResumen.style.color = "#b45309";
    }
}




// ==========================================
// EVENTOS
// ==========================================

btnLogin.addEventListener("click", iniciarSesion);

btnCerrarSesion.addEventListener("click", cerrarSesion);

btnEnviar.addEventListener("click", enviarPregunta);

btnNuevaConversacion.addEventListener(
    "click",
    nuevaConversacion
);

btnGenerarCuestionario.addEventListener(
    "click",
    generarCuestionario
);

btnCalificarCuestionario.addEventListener(
    "click",
    calificarCuestionario
);

inputPassword.addEventListener("keydown", event => {
    if (event.key === "Enter") {
        iniciarSesion();
    }
});

inputPregunta.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        enviarPregunta();
    }
});
btnGenerarResumen.addEventListener(
    "click",
    generarResumen
);

btnCopiarResumen.addEventListener(
    "click",
    copiarResumen
);

// ==========================================
// INICIAR MOODLEIA
// ==========================================

verificarSesionGuardada();
