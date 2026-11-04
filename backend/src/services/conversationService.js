const pool = require("../config/database");

// Crear una conversación nueva
const crearConversacion = async (usuarioId, courseId, titulo) => {
    const [resultado] = await pool.query(
        `INSERT INTO conversaciones 
        (usuario_id, curso_moodle_id, titulo)
        VALUES (?, ?, ?)`,
        [usuarioId, courseId, titulo]
    );

    return resultado.insertId;
};

// Guardar un mensaje
const guardarMensaje = async (conversacionId, tipo, contenido) => {
    const [resultado] = await pool.query(
        `INSERT INTO mensajes
        (conversacion_id, tipo, contenido)
        VALUES (?, ?, ?)`,
        [conversacionId, tipo, contenido]
    );

    return resultado.insertId;
};

// Obtener mensajes de una conversación
const obtenerMensajes = async (conversacionId) => {
    const [rows] = await pool.query(
        `SELECT id, tipo, contenido, fecha
         FROM mensajes
         WHERE conversacion_id = ?
         ORDER BY fecha ASC, id ASC`,
        [conversacionId]
    );

    return rows;
};

// Verificar que una conversación pertenezca al usuario
const obtenerConversacionUsuario = async (conversacionId, usuarioId) => {
    const [rows] = await pool.query(
        `SELECT id, usuario_id, curso_moodle_id, titulo, fecha_inicio
         FROM conversaciones
         WHERE id = ? AND usuario_id = ?`,
        [conversacionId, usuarioId]
    );

    return rows[0] || null;
};

const obtenerConversacionesUsuario = async (usuarioId) => {
    const [rows] = await pool.query(
        `SELECT 
            id,
            curso_moodle_id,
            titulo,
            fecha_inicio
         FROM conversaciones
         WHERE usuario_id = ?
         ORDER BY fecha_inicio DESC`,
        [usuarioId]
    );

    return rows;
};


// ==========================================
// ELIMINAR CONVERSACIÓN DEL USUARIO
// ==========================================

const eliminarConversacionUsuario = async (
    conversacionId,
    usuarioId
) => {

    const conexion = await pool.getConnection();

    try {

        await conexion.beginTransaction();

        // Comprobar que la conversación pertenece
        // al usuario autenticado
        const [conversaciones] = await conexion.query(
            `SELECT id
             FROM conversaciones
             WHERE id = ? AND usuario_id = ?
             FOR UPDATE`,
            [conversacionId, usuarioId]
        );

        if (conversaciones.length === 0) {
            await conexion.rollback();
            return false;
        }

        // Eliminar mensajes relacionados
        await conexion.query(
            `DELETE FROM mensajes
             WHERE conversacion_id = ?`,
            [conversacionId]
        );

        // Eliminar conversación
        // MySQL aplicará SET NULL en logs_ia
        await conexion.query(
            `DELETE FROM conversaciones
             WHERE id = ? AND usuario_id = ?`,
            [conversacionId, usuarioId]
        );

        await conexion.commit();

        return true;

    } catch (error) {

        await conexion.rollback();
        throw error;

    } finally {

        conexion.release();
    }
};


module.exports = {
    crearConversacion,
    guardarMensaje,
    obtenerMensajes,
    obtenerConversacionUsuario,
    obtenerConversacionesUsuario,
    eliminarConversacionUsuario
};