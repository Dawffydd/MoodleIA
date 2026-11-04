// ==========================================
// CONFIGURACIÓN
// ==========================================

const API_RESUMEN = "/api/kpis/resumen";
const API_POR_CURSO = "/api/kpis/por-curso";
const API_POR_DIA = "/api/kpis/por-dia";
const API_USUARIOS_ACTIVOS = "/api/kpis/usuarios-activos";


// ==========================================
// ELEMENTOS DEL DASHBOARD
// ==========================================

const totalConsultas =
    document.getElementById("totalConsultas");

const usuariosActivos =
    document.getElementById("usuariosActivos");

const porcentajeExitosas =
    document.getElementById("porcentajeExitosas");

const respuestasExitosas =
    document.getElementById("respuestasExitosas");

const sinContexto =
    document.getElementById("sinContexto");

const totalErrores =
    document.getElementById("totalErrores");

const tiempoPromedio =
    document.getElementById("tiempoPromedio");

const listaCursos =
    document.getElementById("listaCursos");

const selectorCurso =
    document.getElementById("selectorCurso");

const listaDias =
    document.getElementById("listaDias");

const btnCerrarSesion =
    document.getElementById("btnCerrarSesion");


// ==========================================
// TOKEN Y USUARIO
// ==========================================

const token = localStorage.getItem("token");

const usuarioGuardado =
    localStorage.getItem("usuario");

let usuario = null;
let cursoSeleccionado = "";

if (usuarioGuardado) {
    usuario = JSON.parse(usuarioGuardado);
}

// ==========================================
// MOSTRAR INFORMACIÓN DEL DOCENTE
// ==========================================

function mostrarInformacionDocente() {

    const nombreDocente =
        document.getElementById("nombreDocente");

    if (nombreDocente && usuario) {

        nombreDocente.textContent =
            `Bienvenido, ${usuario.nombre}`;
    }
}


// ==========================================
// VALIDAR SESIÓN
// ==========================================

if (!token || !usuario) {

    window.location.href = "/";

} else if (
    usuario.rol !== "DOCENTE" &&
    usuario.rol !== "ADMINISTRADOR"
) {

    window.location.href = "/";
}

// ==========================================
// CONSTRUIR URL CON FILTRO DE CURSO
// ==========================================

function obtenerURLFiltrada(url) {

    if (!cursoSeleccionado) {
        return url;
    }

    return `${url}?courseId=${encodeURIComponent(cursoSeleccionado)}`;
}


// ==========================================
// PETICIÓN AUTENTICADA
// ==========================================

async function peticionAPI(url) {

    const response = await fetch(url, {
        method: "GET",

        headers: {
            "Authorization": `Bearer ${token}`
        }
    });


    // Token expirado
    if (response.status === 401) {

        localStorage.removeItem("token");
        localStorage.removeItem("usuario");

        window.location.href = "/";

        throw new Error(
            "La sesión expiró"
        );
    }


    if (response.status === 403) {

    throw new Error(
        "No tienes permisos para consultar este recurso."
    );
}


    const data = await response.json();


    if (!response.ok) {

        throw new Error(
            data.mensaje ||
            "Error al obtener información"
        );
    }


    return data;
}

// ==========================================
// CARGAR CURSOS DEL DOCENTE
// ==========================================

async function cargarMisCursos() {

    const contenedor =
        document.getElementById("misCursosDocente");

    // Verificar que exista el contenedor
    if (!contenedor) {
        return;
    }

    try {

        // Verificar que el usuario esté vinculado con Moodle
        if (!usuario || !usuario.moodle_user_id) {

            contenedor.textContent =
                "El usuario no está vinculado con Moodle.";

            return;
        }

        // Obtener cursos desde Moodle
        const respuesta = await peticionAPI(
            `/api/moodle/usuarios/${usuario.moodle_user_id}/cursos`
        );

        const cursos = respuesta.cursos;

        // ==========================================
        // LLENAR SELECTOR DE CURSOS
        // ==========================================

        // Verificar que el selector exista en HTML
        if (selectorCurso) {

            selectorCurso.innerHTML = "";

            // Opción para mostrar todos los cursos
            const opcionTodos =
                document.createElement("option");

            opcionTodos.value = "";
            opcionTodos.textContent = "Todos mis cursos";

            selectorCurso.appendChild(opcionTodos);

            // Agregar cursos al selector
            if (Array.isArray(cursos)) {

                cursos.forEach(curso => {

                    const opcion =
                        document.createElement("option");

                    opcion.value = curso.id;
                    opcion.textContent = curso.fullname;

                    selectorCurso.appendChild(opcion);

                });

            }

            // Mantener el curso seleccionado
            selectorCurso.value = cursoSeleccionado;

        }

        // ==========================================
        // MOSTRAR CURSOS DEL DOCENTE
        // ==========================================

        contenedor.innerHTML = "";

        // Verificar si existen cursos
        if (!Array.isArray(cursos) || cursos.length === 0) {

            contenedor.textContent =
                "No se encontraron cursos asociados.";

            return;
        }

        // Crear tarjetas de cursos
        cursos.forEach(curso => {

            const tarjeta =
                document.createElement("div");

            tarjeta.classList.add("curso-item");

            const informacion =
                document.createElement("div");

            const nombre =
                document.createElement("strong");

            nombre.textContent = curso.fullname;

            const codigo =
                document.createElement("span");

            codigo.textContent = curso.shortname;

            // Separación visual entre nombre y código
            codigo.style.display = "block";
            codigo.style.marginTop = "5px";
            codigo.style.color = "#6b7280";

            informacion.appendChild(nombre);
            informacion.appendChild(codigo);

            tarjeta.appendChild(informacion);

            contenedor.appendChild(tarjeta);

        });

    } catch (error) {

        console.error(
            "Error cargando cursos del docente:",
            error
        );

        contenedor.textContent =
            "No fue posible cargar los cursos.";

    }

}

// ==========================================
// CARGAR RESUMEN
// ==========================================

async function cargarResumen() {

    try {

        const respuesta =
           await peticionAPI(
            obtenerURLFiltrada(API_RESUMEN)
                            );

        const datos =
            respuesta.datos;


        totalConsultas.textContent =
            datos.total_consultas ?? 0;


        respuestasExitosas.textContent =
            datos.exitosas ?? 0;


        sinContexto.textContent =
            datos.sin_contexto ?? 0;


        totalErrores.textContent =
            datos.errores ?? 0;


        porcentajeExitosas.textContent =
            `${datos.porcentaje_exitosas ?? 0}%`;


        tiempoPromedio.textContent =
            datos.tiempo_promedio_segundos ?? 0;


    } catch (error) {

        console.error(
            "Error cargando resumen:",
            error
        );
    }
}


// ==========================================
// CARGAR USUARIOS ACTIVOS
// ==========================================

async function cargarUsuariosActivos() {

    try {

       const respuesta = await peticionAPI(
    obtenerURLFiltrada(API_USUARIOS_ACTIVOS)
);

        usuariosActivos.textContent =
            respuesta.datos.usuarios_activos ?? 0;


    } catch (error) {

        console.error(
            "Error cargando usuarios activos:",
            error
        );
    }
}


// ==========================================
// CARGAR CONSULTAS POR CURSO
// ==========================================

async function cargarCursos() {

    try {

        const respuesta = await peticionAPI(
    obtenerURLFiltrada(API_POR_CURSO)
);
        const cursos =
            respuesta.datos;


        listaCursos.innerHTML = "";


        if (!cursos || cursos.length === 0) {

            listaCursos.textContent =
                "No hay cursos disponibles.";

            return;
        }


        cursos.forEach(curso => {

            const elemento =
                document.createElement("div");

            elemento.classList.add(
                "curso-item"
            );


            elemento.innerHTML = `
                <div>
                    <strong>
                        ${curso.nombre_curso}
                    </strong>

                    <span>
                        ${curso.codigo_curso}
                    </span>
                </div>

                <div class="cantidad-consultas">
                    ${curso.total_consultas}
                </div>
            `;


            listaCursos.appendChild(
                elemento
            );
        });


    } catch (error) {

        console.error(
            "Error cargando cursos:",
            error
        );

        listaCursos.textContent =
            "No fue posible cargar los cursos.";
    }
}


// ==========================================
// GRÁFICA
// ==========================================

let grafica = null;


function crearGrafica(datos) {

    const canvas =
        document.getElementById(
            "graficaConsultas"
        );


    const etiquetas =
        datos.map(item => {

            const fecha =
                new Date(item.fecha);

            return fecha.toLocaleDateString(
                "es-GT",
                {
                    day: "2-digit",
                    month: "2-digit"
                }
            );
        });


    const cantidades =
        datos.map(
            item => item.total_consultas
        );


    if (grafica) {
        grafica.destroy();
    }


    grafica = new Chart(
        canvas,
        {

            type: "line",

            data: {

                labels: etiquetas,

                datasets: [
                    {
                        label:
                            "Consultas realizadas",

                        data: cantidades,

                        borderWidth: 2,

                        tension: 0.3,

                        fill: false
                    }
                ]
            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                scales: {

                    y: {

                        beginAtZero: true,

                        ticks: {
                            precision: 0
                        }
                    }
                }
            }
        }
    );
}


// ==========================================
// CARGAR CONSULTAS POR DÍA
// ==========================================

async function cargarConsultasPorDia() {

    try {

       const respuesta = await peticionAPI(
    obtenerURLFiltrada(API_POR_DIA)
);
        const datos =
            respuesta.datos;


        listaDias.innerHTML = "";


        if (!datos || datos.length === 0) {

            listaDias.textContent =
                "No hay consultas registradas.";

            // Eliminar la gráfica anterior
            if (grafica) {
                grafica.destroy();
                grafica = null;
            }

            return;
        }


        datos.forEach(item => {

            const fecha =
                new Date(item.fecha);


            const elemento =
                document.createElement("div");

            elemento.classList.add(
                "dia-item"
            );


            elemento.innerHTML = `
                <span>
                    ${fecha.toLocaleDateString("es-GT")}
                </span>

                <strong>
                    ${item.total_consultas}
                    consultas
                </strong>
            `;


            listaDias.appendChild(
                elemento
            );
        });


        crearGrafica(datos);


    } catch (error) {

        console.error(
            "Error cargando consultas por día:",
            error
        );

        listaDias.textContent =
            "No fue posible cargar las consultas.";
    }
}


// ==========================================
// CERRAR SESIÓN
// ==========================================

function cerrarSesion() {

    localStorage.removeItem("token");
    localStorage.removeItem("usuario");

    window.location.href = "/";
}


btnCerrarSesion.addEventListener(
    "click",
    cerrarSesion
);


// ==========================================
// CARGAR DASHBOARD
// ==========================================

async function cargarDashboard() {

    await Promise.all([
        cargarMisCursos(),
        cargarResumen(),
        cargarUsuariosActivos(),
        cargarCursos(),
        cargarConsultasPorDia()
    ]);

}


// ==========================================
// INICIAR DASHBOARD
// ==========================================

if (
    token &&
    usuario &&
    (
        usuario.rol === "DOCENTE" ||
        usuario.rol === "ADMINISTRADOR"
    )
) {

    // Mostrar bienvenida al docente
    mostrarInformacionDocente();

    // ==========================================
    // CAMBIAR CURSO SELECCIONADO
    // ==========================================

    if (selectorCurso) {

        selectorCurso.addEventListener("change", async () => {

            cursoSeleccionado = selectorCurso.value;

            console.log(
                "Curso seleccionado:",
                cursoSeleccionado || "Todos mis cursos"
            );

            // Actualizar estadísticas del curso seleccionado
            await Promise.all([
                cargarResumen(),
                cargarUsuariosActivos(),
                cargarCursos(),
                cargarConsultasPorDia()
            ]);

        });

    }

    // Cargar información inicial del dashboard
    cargarDashboard();

}