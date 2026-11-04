const axios = require("axios");
const { convert } = require("html-to-text");
require("dotenv").config();

const moodleApi = axios.create({
    baseURL: `${process.env.MOODLE_URL}/webservice/rest/server.php`,
    timeout: 10000
});

// Obtener información general del sitio
const obtenerInfoSitio = async () => {
    const response = await moodleApi.get("", {
        params: {
            wstoken: process.env.MOODLE_TOKEN,
            wsfunction: "core_webservice_get_site_info",
            moodlewsrestformat: "json"
        }
    });

    return response.data;
};

// Obtener cursos de un usuario
const obtenerCursosUsuario = async (userId) => {
    const response = await moodleApi.get("", {
        params: {
            wstoken: process.env.MOODLE_TOKEN,
            wsfunction: "core_enrol_get_users_courses",
            moodlewsrestformat: "json",
            userid: userId
        }
    });

    return response.data;
};

// Obtener contenido de un curso
const obtenerContenidoCurso = async (courseId) => {
    const response = await moodleApi.get("", {
        params: {
            wstoken: process.env.MOODLE_TOKEN,
            wsfunction: "core_course_get_contents",
            moodlewsrestformat: "json",
            courseid: courseId
        }
    });

    return response.data;
};

const obtenerContextoCurso = async (courseId) => {
    const contenido = await obtenerContenidoCurso(courseId);

    if (contenido.exception) {
        return contenido;
    }

    const contexto = contenido.map(seccion => {

        const recursos = (seccion.modules || []).map(modulo => ({
            nombre: modulo.name,
            tipo: modulo.modname,
            descripcion: modulo.description || "",
            url: modulo.url || ""
        }));

        return {
            seccion: seccion.name,
            resumen: seccion.summary || "",
            recursos
        };
    });

    return contexto;
};

// Obtener las páginas de un curso con su contenido
const obtenerPaginasCurso = async (courseId) => {
    const response = await moodleApi.get("", {
        params: {
            wstoken: process.env.MOODLE_TOKEN,
            wsfunction: "mod_page_get_pages_by_courses",
            moodlewsrestformat: "json",
            "courseids[0]": courseId
        }
    });

    return response.data;
};

// Convertir contenido HTML de Moodle a texto limpio
const limpiarHTML = (html) => {
    if (!html) {
        return "";
    }

    return convert(html, {
        wordwrap: false,
        selectors: [
            {
                selector: "a",
                options: {
                    ignoreHref: true
                }
            }
        ]
    }).trim();
};


// Construir contexto académico limpio para la IA
const obtenerContextoIA = async (courseId) => {

    const resultado = await obtenerPaginasCurso(courseId);

    if (resultado.exception) {
        return resultado;
    }

    const paginas = resultado.pages || [];

    const recursos = paginas.map(pagina => ({
        id: pagina.id,
        nombre: pagina.name,
        contenido: limpiarHTML(pagina.content)
    }));

    const textoContexto = recursos
        .map(recurso => {
            return `
RECURSO: ${recurso.nombre}

${recurso.contenido}
            `.trim();
        })
        .join("\n\n------------------------------\n\n");

    return {
        courseId: Number(courseId),
        totalRecursos: recursos.length,
        recursos,
        textoContexto
    };
};


// Obtener usuario de Moodle por correo
const obtenerUsuarioPorCorreo = async (correo) => {

    const response = await moodleApi.get("", {
        params: {
            wstoken: process.env.MOODLE_TOKEN,
            wsfunction: "core_user_get_users_by_field",
            moodlewsrestformat: "json",
            field: "email",
            "values[0]": correo
        }
    });

    return response.data;
};

// ==========================================
// OBTENER USUARIOS MATRICULADOS EN UN CURSO
// ==========================================

const obtenerUsuariosCurso = async (courseId) => {

    const response = await moodleApi.get("", {
        params: {
            wstoken: process.env.MOODLE_TOKEN,
            wsfunction: "core_enrol_get_enrolled_users",
            moodlewsrestformat: "json",
            courseid: courseId
        }
    });

    return response.data;
};

module.exports = {
    obtenerInfoSitio,
    obtenerCursosUsuario,
    obtenerContenidoCurso,
    obtenerContextoCurso,
    obtenerPaginasCurso,
    obtenerContextoIA,
    obtenerUsuarioPorCorreo,
    obtenerUsuariosCurso
};