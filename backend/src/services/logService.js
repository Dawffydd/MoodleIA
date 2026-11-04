const pool = require("../config/database");

const registrarLogIA = async ({
    usuarioId,
    conversacionId,
    cursoMoodleId,
    modelo,
    estado,
    mensajeError = null,
    tiempoRespuestaMs = null
}) => {

    const [resultado] = await pool.query(
        `INSERT INTO logs_ia
        (
            usuario_id,
            conversacion_id,
            curso_moodle_id,
            modelo,
            estado,
            mensaje_error,
            tiempo_respuesta_ms
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            usuarioId,
            conversacionId,
            cursoMoodleId,
            modelo,
            estado,
            mensajeError,
            tiempoRespuestaMs
        ]
    );

    return resultado.insertId;
};

module.exports = {
    registrarLogIA
};