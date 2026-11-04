// ==========================================
// DATOS DE SESIÓN
// ==========================================

const token = localStorage.getItem("token");
const usuarioGuardado = localStorage.getItem("usuario");

const listaCursos =
    document.getElementById("listaCursos");

const mensajeEstado =
    document.getElementById("mensajeEstado");

const saludoUsuario =
    document.getElementById("saludoUsuario");

const btnCerrarSesion =
    document.getElementById("btnCerrarSesion");


// ==========================================
// VALIDAR SESIÓN
// ==========================================

if (!token || !usuarioGuardado) {

    window.location.href = "/";
}


// ==========================================
// OBTENER USUARIO
// ==========================================

let usuario = null;

try {

    usuario = JSON.parse(usuarioGuardado);

} catch (error) {

    localStorage.removeItem("token");
    localStorage.removeItem("usuario");

    window.location.href = "/";
}


// ==========================================
// VALIDAR ROL
// ==========================================

if (usuario && usuario.rol !== "ESTUDIANTE") {

    if (
        usuario.rol === "DOCENTE" ||
        usuario.rol === "ADMINISTRADOR"
    ) {

        window.location.href = "/dashboard.html";
    }
}


// ==========================================
// MOSTRAR NOMBRE
// ==========================================

if (usuario) {

    saludoUsuario.textContent =
        `Cursos de ${usuario.nombre}`;
}


// ==========================================
// CARGAR CURSOS
// ==========================================

async function cargarCursos() {

    try {

        const moodleUserId =
            usuario.moodle_user_id;

        if (!moodleUserId) {

            mensajeEstado.textContent =
                "Tu usuario no está vinculado con Moodle.";

            return;
        }


        const response = await fetch(
            `/api/moodle/usuarios/${moodleUserId}/cursos`,
            {
                headers: {
                    "Authorization":
                        `Bearer ${token}`
                }
            }
        );


        const data = await response.json();


        // Token vencido
        if (response.status === 401) {

            localStorage.removeItem("token");
            localStorage.removeItem("usuario");

            window.location.href = "/";

            return;
        }


        if (!response.ok) {

            mensajeEstado.textContent =
                data.mensaje ||
                "No fue posible obtener tus cursos.";

            return;
        }


        mostrarCursos(data.cursos);


    } catch (error) {

        console.error(
            "Error cargando cursos:",
            error
        );

        mensajeEstado.textContent =
            "No fue posible conectar con el servidor.";
    }
}


// ==========================================
// MOSTRAR CURSOS
// ==========================================

function mostrarCursos(cursos) {

    listaCursos.innerHTML = "";


    if (!cursos || cursos.length === 0) {

        mensajeEstado.textContent =
            "No tienes cursos matriculados.";

        return;
    }


    mensajeEstado.textContent = "";


    cursos.forEach(curso => {

        const tarjeta =
            document.createElement("article");

        tarjeta.classList.add("tarjeta-curso");


        const informacion =
            document.createElement("div");

        informacion.classList.add(
            "informacion-curso"
        );


        const nombre =
            document.createElement("h3");

        nombre.textContent =
            curso.fullname;


        const codigo =
            document.createElement("p");

        codigo.textContent =
            curso.shortname;


        informacion.appendChild(nombre);
        informacion.appendChild(codigo);


        const boton =
            document.createElement("button");

        boton.textContent = "Entrar al curso";

        boton.addEventListener(
            "click",
            function () {

                abrirCurso(curso.id);
            }
        );


        tarjeta.appendChild(informacion);
        tarjeta.appendChild(boton);

        listaCursos.appendChild(tarjeta);
    });
}


// ==========================================
// ABRIR CHAT DEL CURSO
// ==========================================

function abrirCurso(courseId) {

    window.location.href =
        `/?courseId=${courseId}`;
}


// ==========================================
// CERRAR SESIÓN
// ==========================================

function cerrarSesion() {

    localStorage.removeItem("token");
    localStorage.removeItem("usuario");

    window.location.href = "/";
}


// ==========================================
// EVENTOS
// ==========================================

btnCerrarSesion.addEventListener(
    "click",
    cerrarSesion
);


// ==========================================
// INICIAR
// ==========================================

cargarCursos();