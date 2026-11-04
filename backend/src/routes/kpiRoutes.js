const express = require("express");
const router = express.Router();

const { verificarToken } = require("../middleware/authMiddleware");
const { permitirRoles } = require("../middleware/roleMiddleware");
const {
    obtenerCursosUsuario,
    obtenerUsuariosCurso
} = require("../services/moodleService");

const {
    obtenerResumenKPIs,
    obtenerConsultasPorCurso,
    obtenerConsultasPorDia,
    obtenerUsuariosActivos
} = require("../services/kpiService");


// ==========================================
// OBTENER CURSOS AUTORIZADOS PARA KPIs
// ==========================================

async function obtenerCursoIdsFiltrados(req) {

    const moodleUserId = Number(
        req.usuario.moodle_user_id
    );

    if (
        !Number.isSafeInteger(moodleUserId) ||
        moodleUserId <= 0
    ) {
        const error = new Error(
            "El usuario no está vinculado correctamente con Moodle"
        );
        error.status = 400;
        throw error;
    }

    // Validar el filtro solicitado
    const courseId = req.query.courseId;

    if (
        courseId !== undefined &&
        (
            typeof courseId !== "string" ||
            !/^[1-9]\d*$/.test(courseId) ||
            !Number.isSafeInteger(Number(courseId))
        )
    ) {
        const error = new Error(
            "El ID del curso no es válido"
        );
        error.status = 400;
        throw error;
    }

    // Obtener los cursos del usuario
    const cursosMoodle =
        await obtenerCursosUsuario(moodleUserId);

    if (!Array.isArray(cursosMoodle)) {
        const error = new Error(
            "No fue posible obtener los cursos de Moodle"
        );
        error.status = 502;
        throw error;
    }

    const cursoIds = [
        ...new Set(
            cursosMoodle
                .map(curso => Number(curso.id))
                .filter(id =>
                    Number.isSafeInteger(id) && id > 0
                )
        )
    ];

    // Si se solicita un curso específico,
    // comprobar primero que esté asociado al usuario
    const cursosARevisar = courseId === undefined
        ? cursoIds
        : [Number(courseId)];

    if (
        courseId !== undefined &&
        !cursoIds.includes(Number(courseId))
    ) {
        const error = new Error(
            "No tienes acceso a las estadísticas de este curso"
        );
        error.status = 403;
        throw error;
    }

    // El administrador conserva el alcance actual:
    // cursos asociados a su usuario de Moodle.
    if (req.usuario.rol === "ADMINISTRADOR") {
        return cursosARevisar;
    }

    // Verificar el rol docente en cada curso
    const resultados = await Promise.all(
        cursosARevisar.map(async idCurso => {

            const usuarios =
                await obtenerUsuariosCurso(idCurso);

            if (!Array.isArray(usuarios)) {
                const error = new Error(
                    "No fue posible verificar los roles del curso"
                );
                error.status = 502;
                throw error;
            }

            const usuarioMoodle = usuarios.find(
                usuario =>
                    Number(usuario.id) === moodleUserId
            );

            if (!usuarioMoodle) {
                return null;
            }

            const esDocente = (
                usuarioMoodle.roles || []
            ).some(rol =>
                rol.shortname === "editingteacher" ||
                rol.shortname === "teacher"
            );

            return esDocente ? idCurso : null;

        })
    );

    const cursosAutorizados = resultados.filter(
        id => id !== null
    );

    // Si pidió un curso concreto y no es docente
    if (
        courseId !== undefined &&
        cursosAutorizados.length === 0
    ) {
        const error = new Error(
            "No tienes acceso a las estadísticas de este curso"
        );
        error.status = 403;
        throw error;
    }

    return cursosAutorizados;
}

// =====================================================
// SEGURIDAD DE LAS RUTAS KPI
// Solo DOCENTE y ADMINISTRADOR
// =====================================================

router.use(
    verificarToken,
    permitirRoles("DOCENTE", "ADMINISTRADOR")
);


// =====================================================
// RESUMEN DE KPIs
// Todos los cursos o uno seleccionado
// =====================================================

router.get("/resumen", async (req, res) => {

    try {

        // Obtener los IDs de cursos permitidos
        const cursoIds =
            await obtenerCursoIdsFiltrados(req);

        // Consultar estadísticas de esos cursos
        const resumen =
            await obtenerResumenKPIs(cursoIds);

        res.json({
            mensaje: "Resumen de KPIs obtenido correctamente",
            datos: resumen
        });

    } catch (error) {

        console.error("Error resumen KPIs:", error);

        res.status(error.status || 500).json({
            mensaje: error.status
                ? error.message
                : "Error al obtener el resumen de KPIs"
        });
    }

});

// =====================================================
// CONSULTAS POR CURSO
// =====================================================

router.get("/por-curso", async (req, res) => {

    try {

        const cursoIds =
            await obtenerCursoIdsFiltrados(req);

        const cursosMoodle =
            await obtenerCursosUsuario(
                req.usuario.moodle_user_id
            );

        if (!Array.isArray(cursosMoodle)) {
            return res.status(502).json({
                mensaje: "No fue posible obtener los cursos de Moodle"
            });
        }

        const datos =
            await obtenerConsultasPorCurso(cursoIds);

        const datosCompletos = cursosMoodle
            .filter(curso =>
                cursoIds.includes(Number(curso.id))
            )
            .map(curso => {

                const estadistica = datos.find(
                    item =>
                        Number(item.curso_moodle_id) ===
                        Number(curso.id)
                );

                return {
                    curso_moodle_id: Number(curso.id),
                    nombre_curso: curso.fullname,
                    codigo_curso: curso.shortname,
                    total_consultas: estadistica
                        ? estadistica.total_consultas
                        : 0
                };
            });

        res.json({
            mensaje: "Consultas por curso obtenidas correctamente",
            datos: datosCompletos
        });

    } catch (error) {

        console.error("Error KPIs por curso:", error);

        res.status(error.status || 500).json({
            mensaje: error.status
                ? error.message
                : "Error al obtener consultas por curso"
        });
    }
});

// =====================================================
// CONSULTAS POR DÍA
// =====================================================

router.get("/por-dia", async (req, res) => {

    try {

        const cursoIds =
            await obtenerCursoIdsFiltrados(req);

        const datos =
            await obtenerConsultasPorDia(cursoIds);

        res.json({
            mensaje: "Consultas por día obtenidas correctamente",
            datos
        });

    } catch (error) {

        console.error("Error KPIs por día:", error);

        res.status(error.status || 500).json({
            mensaje: error.status
                ? error.message
                : "Error al obtener consultas por día"
        });
    }
});

// =====================================================
// USUARIOS ACTIVOS
// =====================================================

router.get("/usuarios-activos", async (req, res) => {

    try {

        const cursoIds =
            await obtenerCursoIdsFiltrados(req);

        const datos =
            await obtenerUsuariosActivos(cursoIds);

        res.json({
            mensaje: "Usuarios activos obtenidos correctamente",
            datos
        });

    } catch (error) {

        console.error("Error usuarios activos:", error);

        res.status(error.status || 500).json({
            mensaje: error.status
                ? error.message
                : "Error al obtener usuarios activos"
        });
    }
});

module.exports = router;