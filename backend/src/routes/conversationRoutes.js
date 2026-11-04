const express = require("express");
const router = express.Router();

const { verificarToken } = require("../middleware/authMiddleware");

const {
    obtenerConversacionesUsuario,
    obtenerConversacionUsuario,
    obtenerMensajes,
    eliminarConversacionUsuario
} = require("../services/conversationService");


// LISTAR CONVERSACIONES DEL USUARIO
router.get("/", verificarToken, async (req, res) => {
    try {

        const conversaciones = await obtenerConversacionesUsuario(
            req.usuario.id
        );

        res.json({
            mensaje: "Conversaciones obtenidas correctamente",
            total: conversaciones.length,
            conversaciones
        });

    } catch (error) {

        console.error("Error conversaciones:", error);

        res.status(500).json({
            mensaje: "Error al obtener las conversaciones"
        });

    }
});


// OBTENER MENSAJES DE UNA CONVERSACIÓN
router.get("/:conversacionId/mensajes", verificarToken, async (req, res) => {
    try {

        const { conversacionId } = req.params;

        // Comprobar que la conversación pertenece al usuario
        const conversacion = await obtenerConversacionUsuario(
            conversacionId,
            req.usuario.id
        );

        if (!conversacion) {
            return res.status(404).json({
                mensaje: "Conversación no encontrada"
            });
        }

        const mensajes = await obtenerMensajes(conversacionId);

        res.json({
            mensaje: "Mensajes obtenidos correctamente",
            conversacion,
            totalMensajes: mensajes.length,
            mensajes
        });

    } catch (error) {

        console.error("Error mensajes:", error);

        res.status(500).json({
            mensaje: "Error al obtener los mensajes"
        });

    }
});



// ==========================================
// ELIMINAR UNA CONVERSACIÓN
// ==========================================

router.delete("/:conversacionId", verificarToken, async (req, res) => {

    try {

        const { conversacionId } = req.params;

        if (
            !/^[1-9]\d*$/.test(conversacionId) ||
            !Number.isSafeInteger(Number(conversacionId))
        ) {
            return res.status(400).json({
                mensaje: "El ID de la conversación no es válido"
            });
        }

        const eliminada = await eliminarConversacionUsuario(
            Number(conversacionId),
            req.usuario.id
        );

        if (!eliminada) {
            return res.status(404).json({
                mensaje: "Conversación no encontrada"
            });
        }

        return res.json({
            mensaje: "Conversación eliminada correctamente"
        });

    } catch (error) {

        console.error("Error eliminando conversación:", error);

        return res.status(500).json({
            mensaje: "No fue posible eliminar la conversación"
        });
    }

});


module.exports = router;