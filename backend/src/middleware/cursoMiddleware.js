
const {
    obtenerCursosUsuario
} = require("../services/moodleService");

// ==========================================
// VERIFICAR ACCESO A UN CURSO DE MOODLE
// ==========================================

const verificarAccesoCurso = async (req, res, next) => {

    try {

        const courseId = Number(req.params.courseId);
        const moodleUserId = Number(
            req.usuario?.moodle_user_id
        );

        // Validar el ID del curso
        if (
            !/^[1-9]\d*$/.test(String(req.params.courseId)) ||
            !Number.isSafeInteger(courseId)
        ) {
            return res.status(400).json({
                mensaje: "El ID del curso no es válido"
            });
        }

        // Comprobar vinculación con Moodle
        if (
            !Number.isSafeInteger(moodleUserId) ||
            moodleUserId <= 0
        ) {
            return res.status(403).json({
                mensaje: "Usuario sin vinculación válida con Moodle"
            });
        }

        // Consultar los cursos del usuario autenticado
        const cursos = await obtenerCursosUsuario(moodleUserId);

        if (!Array.isArray(cursos)) {
            return res.status(502).json({
                mensaje: "No fue posible verificar el acceso en Moodle"
            });
        }

        // Verificar que pertenezca al curso
        const tieneAcceso = cursos.some(
            curso => Number(curso.id) === courseId
        );

        if (!tieneAcceso) {
            return res.status(403).json({
                mensaje: "No tienes acceso a este curso"
            });
        }

        next();

    } catch (error) {

        console.error(
            "Error verificando acceso al curso:",
            error.message
        );

        return res.status(502).json({
            mensaje: "No fue posible verificar el acceso al curso"
        });
    }
};

module.exports = {
    verificarAccesoCurso
};
