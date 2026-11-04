const express = require("express");
const router = express.Router();

const { verificarToken } = require("../middleware/authMiddleware");
const {
    verificarAccesoCurso
} = require("../middleware/cursoMiddleware");

const { obtenerContextoIA } = require("../services/moodleService");
const {
    preguntarIA,
    generarCuestionarioIA,
    generarResumenIA
} = require("../services/iaService");
const { registrarLogIA } = require("../services/logService");

const {
    crearConversacion,
    guardarMensaje,
    obtenerMensajes,
    obtenerConversacionUsuario
} = require("../services/conversationService");


// ==========================================
// ADAPTAR EL COURSE ID DEL CHAT
// ==========================================

const adaptarCursoChat = (req, res, next) => {

    // Validar que se recibió un cuerpo JSON
    if (
        !req.body ||
        typeof req.body !== "object"
    ) {
        return res.status(400).json({
            mensaje: "El cuerpo de la solicitud no es válido"
        });
    }

    const courseId = req.body.courseId;

    // Aceptar únicamente IDs positivos y enteros
    if (
        !(
            typeof courseId === "number" &&
            Number.isSafeInteger(courseId) &&
            courseId > 0
        ) &&
        !(
            typeof courseId === "string" &&
            /^[1-9]\d*$/.test(courseId) &&
            Number.isSafeInteger(Number(courseId))
        )
    ) {
        return res.status(400).json({
            mensaje: "El ID del curso no es válido"
        });
    }

    // Reutilizar el middleware de acceso a cursos
    req.params.courseId = String(courseId);

    next();
};

// CHAT CON IA + HISTORIAL
router.post(
    "/chat",
    verificarToken,
    adaptarCursoChat,
    verificarAccesoCurso,
    async (req, res) => {

    try {

        const usuarioId = req.usuario.id;

        const {
            courseId,
            pregunta,
            conversacionId
        } = req.body;


        // Validar datos obligatorios
        if (!courseId || !pregunta) {
            return res.status(400).json({
                mensaje: "El courseId y la pregunta son obligatorios"
            });
        }


        let idConversacion = conversacionId;


        // Si ya existe una conversación, verificar que sea del usuario
        if (idConversacion) {

            const conversacion = await obtenerConversacionUsuario(
                idConversacion,
                usuarioId
            );

            if (!conversacion) {
                return res.status(403).json({
                    mensaje: "No tienes acceso a esta conversación"
                });
            }

            // Evitar usar una conversación de otro curso
            if (Number(conversacion.curso_moodle_id) !== Number(courseId)) {
                return res.status(400).json({
                    mensaje: "La conversación no pertenece al curso indicado"
                });
            }

        } else {

            // Crear una nueva conversación
            const titulo = pregunta.length > 100
                ? pregunta.substring(0, 100)
                : pregunta;

            idConversacion = await crearConversacion(
                usuarioId,
                courseId,
                titulo
            );
        }


        // Obtener historial ANTES de guardar la pregunta actual
        const historial = await obtenerMensajes(idConversacion);





        // Obtener contexto académico desde Moodle
        const contexto = await obtenerContextoIA(courseId);

        if (contexto.exception) {
            return res.status(400).json({
                mensaje: "No fue posible obtener el contenido de Moodle",
                detalle: contexto
            });
        }


        if (!contexto.textoContexto) {
            return res.status(400).json({
                mensaje: "El curso no contiene información disponible para la IA"
            });
        }

        // Guardar la pregunta únicamente cuando Moodle
        // haya proporcionado contexto académico válido
        await guardarMensaje(
            idConversacion,
            "usuario",
            pregunta
        );


        // Convertir historial a texto
        const historialTexto = historial
            .map(mensaje => {

                const autor =
                    mensaje.tipo === "usuario"
                        ? "Estudiante"
                        : "MoodleIA";

                return `${autor}: ${mensaje.contenido}`;
            })
            .join("\n");


        // Construir contexto completo
        const contextoCompleto = `
CONTENIDO ACADÉMICO DEL CURSO:

${contexto.textoContexto}

HISTORIAL DE LA CONVERSACIÓN:

${historialTexto || "Sin mensajes anteriores."}
        `.trim();


// Medir tiempo de respuesta de la IA
const inicioIA = Date.now();

let respuesta;
let respuestaSinContexto = false;

try {

    respuesta = await preguntarIA(
        pregunta,
        contextoCompleto
    );

    const tiempoRespuestaMs = Date.now() - inicioIA;

    // Detectar la marca técnica enviada por la IA
    respuestaSinContexto =
        respuesta.trim() === "[SIN_CONTEXTO]";

    const estadoIA = respuestaSinContexto
        ? "SIN_CONTEXTO"
        : "EXITOSO";

    await registrarLogIA({
        usuarioId,
        conversacionId: idConversacion,
        cursoMoodleId: Number(courseId),
        modelo: "llama3.2:3b",
        estado: estadoIA,
        tiempoRespuestaMs
    });

} catch (errorIA) {

    const tiempoRespuestaMs = Date.now() - inicioIA;

    await registrarLogIA({
        usuarioId,
        conversacionId: idConversacion,
        cursoMoodleId: Number(courseId),
        modelo: "llama3.2:3b",
        estado: "ERROR",
        mensajeError: errorIA.message,
        tiempoRespuestaMs
    });

    throw errorIA;
}


// Convertir la marca interna en un mensaje entendible para el estudiante
if (respuestaSinContexto) {
    respuesta =
        "No encuentro suficiente información sobre ese tema en el contenido del curso.";
}

        // Guardar respuesta del asistente
        await guardarMensaje(
            idConversacion,
            "asistente",
            respuesta
        );


        res.json({
            mensaje: "Respuesta generada correctamente",
            conversacionId: idConversacion,
            cursoMoodleId: Number(courseId),
            pregunta,
            respuesta
        });


    } catch (error) {

        console.error(
            "Error IA:",
            error.response?.data || error.message
        );

        res.status(500).json({
            mensaje: "Error al procesar la consulta con IA"
        });

    }

});


// ==========================================
// GENERAR CUESTIONARIO CON IA
// ==========================================

router.post(
    "/cuestionario",
    verificarToken,
    adaptarCursoChat,
    verificarAccesoCurso,
    async (req, res) => {

        try {

            const courseId = Number(req.body.courseId);

            // Obtener contenido académico de Moodle
            const contexto = await obtenerContextoIA(courseId);

            if (
                !contexto ||
                contexto.exception ||
                typeof contexto.textoContexto !== "string"
            ) {
                return res.status(502).json({
                    mensaje: "No fue posible obtener el contenido académico de Moodle"
                });
            }

            if (!contexto.textoContexto.trim()) {
                return res.status(400).json({
                    mensaje: "El curso no contiene material disponible para generar un cuestionario"
                });
            }

            // Generar preguntas con Ollama
            const cuestionario = await generarCuestionarioIA(
                contexto.textoContexto
            );

            return res.status(200).json({
                mensaje: "Cuestionario generado correctamente",
                cursoMoodleId: courseId,
                totalPreguntas: cuestionario.preguntas.length,
                preguntas: cuestionario.preguntas
            });

        } catch (error) {

            console.error(
                "Error generando cuestionario:",
                error.message
            );

            return res.status(500).json({
                mensaje: "No fue posible generar el cuestionario"
            });

        }
    }
);


/* ==========================================
   GENERAR RESUMEN DE ESTUDIO CON IA
   ========================================== */

router.post(
    "/resumen",
    verificarToken,
    adaptarCursoChat,
    verificarAccesoCurso,
    async (req, res) => {

        try {

            const courseId = Number(req.body.courseId);

            // Obtener el contenido académico de Moodle
            const contexto = await obtenerContextoIA(courseId);

            // Comprobar si Moodle devolvió un error
            if (
                !contexto ||
                contexto.exception ||
                typeof contexto.textoContexto !== "string"
            ) {
                return res.status(502).json({
                    mensaje: "No fue posible obtener el contenido académico de Moodle"
                });
            }

            // Comprobar que exista material para resumir
            if (!contexto.textoContexto.trim()) {
                return res.status(400).json({
                    mensaje: "El curso no contiene material disponible para generar un resumen"
                });
            }

            // Generar resumen con Ollama
            const resumen = await generarResumenIA(
                contexto.textoContexto
            );

            return res.status(200).json({
                mensaje: "Resumen generado correctamente",
                cursoMoodleId: courseId,
                resumen
            });

        } catch (error) {

            console.error(
                "Error generando resumen:",
                error.response?.data || error.message
            );

            return res.status(500).json({
                mensaje: "No fue posible generar el resumen de estudio"
            });

        }
    }
);


module.exports = router;