const express = require("express");
const router = express.Router();

const { verificarToken } = require("../middleware/authMiddleware");
const { permitirRoles } = require("../middleware/roleMiddleware");

const {
    verificarAccesoCurso
} = require("../middleware/cursoMiddleware");
router.use(verificarToken);


const {
    obtenerInfoSitio,
    obtenerCursosUsuario,
    obtenerUsuariosCurso,
    obtenerContenidoCurso,
    obtenerContextoCurso,
    obtenerPaginasCurso,
    obtenerContextoIA,
    obtenerUsuarioPorCorreo
} = require("../services/moodleService");

// Información general de Moodle
router.get("/site-info", async (req, res) => {
    try {
        const informacion = await obtenerInfoSitio();

        if (informacion.exception) {
            return res.status(400).json({
                mensaje: "Moodle devolvió un error",
                detalle: informacion
            });
        }

        res.json({
            mensaje: "Conexión con Moodle exitosa",
            informacion
        });

    } catch (error) {
        console.error("Error Moodle:", error.response?.data || error.message);

        res.status(500).json({
            mensaje: "Error al conectar con Moodle",
            detalle: error.response?.data || error.message
        });
    }
});


/* ==========================================
   CURSOS DE UN USUARIO
   ========================================== */

router.get("/usuarios/:userId/cursos", async (req, res) => {

    try {

        const userId = Number(req.params.userId);
        const usuarioAutenticadoId = Number(
            req.usuario.moodle_user_id
        );

        // Validar el ID solicitado
        if (
            !Number.isSafeInteger(userId) ||
            userId <= 0
        ) {
            return res.status(400).json({
                mensaje: "El ID del usuario no es válido"
            });
        }

        // Validar vinculación del usuario autenticado
        if (
            !Number.isSafeInteger(usuarioAutenticadoId) ||
            usuarioAutenticadoId <= 0
        ) {
            return res.status(403).json({
                mensaje: "Usuario sin vinculación válida con Moodle"
            });
        }

        // Impedir consultar los cursos de otra persona
        // Incluso el administrador utiliza su propio ID
        // en esta ruta.
        if (userId !== usuarioAutenticadoId) {
            return res.status(403).json({
                mensaje: "No puedes consultar los cursos de otro usuario"
            });
        }

        // Obtener cursos matriculados
        const cursosMoodle = await obtenerCursosUsuario(
            usuarioAutenticadoId
        );

        if (!Array.isArray(cursosMoodle)) {
            return res.status(502).json({
                mensaje: "No fue posible obtener los cursos de Moodle"
            });
        }

        let cursosAutorizados = cursosMoodle;

        // El docente solo puede ver cursos donde es profesor
        if (req.usuario.rol === "DOCENTE") {

            const resultados = await Promise.all(
                cursosMoodle.map(async curso => {

                    const usuarios = await obtenerUsuariosCurso(
                        curso.id
                    );

                    if (!Array.isArray(usuarios)) {
                        const error = new Error(
                            "No fue posible verificar los roles del curso"
                        );
                        error.status = 502;
                        throw error;
                    }

                    const usuarioMoodle = usuarios.find(
                        usuario =>
                            Number(usuario.id) === usuarioAutenticadoId
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

                    return esDocente ? curso : null;

                })
            );

            cursosAutorizados = resultados.filter(
                curso => curso !== null
            );
        }

        // ESTUDIANTE: conserva sus cursos matriculados.
        // ADMINISTRADOR: conserva sus cursos asociados.
        res.json({
            mensaje: "Cursos obtenidos correctamente",
            usuarioMoodleId: usuarioAutenticadoId,
            totalCursos: cursosAutorizados.length,
            cursos: cursosAutorizados
        });

    } catch (error) {

        console.error(
            "Error obteniendo cursos:",
            error.response?.data || error.message
        );

        res.status(error.status || 500).json({
            mensaje: error.status
                ? error.message
                : "Error al obtener los cursos"
        });
    }

});


// Contenido de un curso
router.get("/cursos/:courseId/contenido", verificarAccesoCurso, async (req, res) => {
    try {
        const { courseId } = req.params;

        const contenido = await obtenerContenidoCurso(courseId);

        if (contenido.exception) {
            return res.status(400).json({
                mensaje: "Moodle devolvió un error",
                detalle: contenido
            });
        }

        res.json({
            mensaje: "Contenido del curso obtenido correctamente",
            cursoMoodleId: Number(courseId),
            totalSecciones: contenido.length,
            secciones: contenido
        });

    } catch (error) {
        console.error("Error Moodle:", error.response?.data || error.message);

        res.status(500).json({
            mensaje: "Error al obtener el contenido del curso",
            detalle: error.response?.data || error.message
        });
    }
});

router.get("/cursos/:courseId/contexto", verificarAccesoCurso, async (req, res) => {
    try {
        const { courseId } = req.params;

        const contexto = await obtenerContextoCurso(courseId);

        if (contexto.exception) {
            return res.status(400).json({
                mensaje: "Moodle devolvió un error",
                detalle: contexto
            });
        }

        res.json({
            mensaje: "Contexto académico obtenido correctamente",
            cursoMoodleId: Number(courseId),
            contexto
        });

    } catch (error) {
        console.error(
            "Error obteniendo contexto:",
            error.response?.data || error.message
        );

        res.status(500).json({
            mensaje: "Error al obtener el contexto académico"
        });
    }
});

// Obtener páginas y contenido de un curso
router.get("/cursos/:courseId/paginas", verificarAccesoCurso, async (req, res) => {
    try {
        const { courseId } = req.params;

        const resultado = await obtenerPaginasCurso(courseId);

        if (resultado.exception) {
            return res.status(400).json({
                mensaje: "Moodle devolvió un error",
                detalle: resultado
            });
        }

        res.json({
            mensaje: "Páginas del curso obtenidas correctamente",
            cursoMoodleId: Number(courseId),
            totalPaginas: resultado.pages?.length || 0,
            paginas: resultado.pages || [],
            advertencias: resultado.warnings || []
        });

    } catch (error) {
        console.error(
            "Error obteniendo páginas:",
            error.response?.data || error.message
        );

        res.status(500).json({
            mensaje: "Error al obtener las páginas del curso",
            detalle: error.response?.data || error.message
        });
    }
});

// Obtener contexto académico limpio preparado para IA
router.get("/cursos/:courseId/contexto-ia", verificarAccesoCurso, async (req, res) => {
    try {
        const { courseId } = req.params;

        const contexto = await obtenerContextoIA(courseId);

        if (contexto.exception) {
            return res.status(400).json({
                mensaje: "Moodle devolvió un error",
                detalle: contexto
            });
        }

        res.json({
            mensaje: "Contexto académico preparado correctamente",
            contexto
        });

    } catch (error) {
        console.error(
            "Error preparando contexto para IA:",
            error.response?.data || error.message
        );

        res.status(500).json({
            mensaje: "Error al preparar el contexto académico"
        });
    }
});

// Buscar usuario de Moodle por correo
router.get(
    "/usuario-por-correo",
    permitirRoles("ADMINISTRADOR"),
    async (req, res) => {
    try {

        const { correo } = req.query;

        if (!correo) {
            return res.status(400).json({
                mensaje: "El correo es obligatorio"
            });
        }

        const usuarios =
            await obtenerUsuarioPorCorreo(correo);

        if (usuarios.exception) {
            return res.status(400).json({
                mensaje: "Moodle devolvió un error",
                detalle: usuarios
            });
        }

        if (!usuarios || usuarios.length === 0) {
            return res.status(404).json({
                mensaje: "Usuario no encontrado en Moodle"
            });
        }

        res.json({
            mensaje: "Usuario encontrado correctamente",
            usuario: usuarios[0]
        });

    } catch (error) {

        console.error(
            "Error buscando usuario Moodle:",
            error.response?.data || error.message
        );

        res.status(500).json({
            mensaje: "Error al buscar el usuario en Moodle",
            detalle: error.response?.data || error.message
        });
    }
});

module.exports = router;