const pool = require("../config/database");


// =====================================================
// RESUMEN GENERAL DE KPIs
// Solo considera los cursos recibidos desde Moodle
// =====================================================
const obtenerResumenKPIs = async (cursoIds) => {

    // Si el docente no tiene cursos asignados
    if (!cursoIds || cursoIds.length === 0) {
        return {
            total_consultas: 0,
            exitosas: 0,
            sin_contexto: 0,
            errores: 0,
            porcentaje_exitosas: 0,
            porcentaje_sin_contexto: 0,
            porcentaje_errores: 0,
            tiempo_promedio_ms: 0,
            tiempo_promedio_segundos: 0
        };
    }

    const [[resultado]] = await pool.query(`
        SELECT
            COUNT(*) AS total_consultas,

            SUM(
                CASE
                    WHEN estado = 'EXITOSO'
                    THEN 1
                    ELSE 0
                END
            ) AS exitosas,

            SUM(
                CASE
                    WHEN estado = 'SIN_CONTEXTO'
                    THEN 1
                    ELSE 0
                END
            ) AS sin_contexto,

            SUM(
                CASE
                    WHEN estado = 'ERROR'
                    THEN 1
                    ELSE 0
                END
            ) AS errores,

            ROUND(
                (
                    SUM(
                        CASE
                            WHEN estado = 'EXITOSO'
                            THEN 1
                            ELSE 0
                        END
                    ) / NULLIF(COUNT(*), 0)
                ) * 100,
                2
            ) AS porcentaje_exitosas,

            ROUND(
                (
                    SUM(
                        CASE
                            WHEN estado = 'SIN_CONTEXTO'
                            THEN 1
                            ELSE 0
                        END
                    ) / NULLIF(COUNT(*), 0)
                ) * 100,
                2
            ) AS porcentaje_sin_contexto,

            ROUND(
                (
                    SUM(
                        CASE
                            WHEN estado = 'ERROR'
                            THEN 1
                            ELSE 0
                        END
                    ) / NULLIF(COUNT(*), 0)
                ) * 100,
                2
            ) AS porcentaje_errores,

            ROUND(
                AVG(
                    CASE
                        WHEN estado IN ('EXITOSO', 'SIN_CONTEXTO')
                        THEN tiempo_respuesta_ms
                    END
                ),
                2
            ) AS tiempo_promedio_ms,

            ROUND(
                AVG(
                    CASE
                        WHEN estado IN ('EXITOSO', 'SIN_CONTEXTO')
                        THEN tiempo_respuesta_ms
                    END
                ) / 1000,
                2
            ) AS tiempo_promedio_segundos

        FROM logs_ia

        WHERE curso_moodle_id IN (?)
    `, [cursoIds]);

    return resultado;
};


// =====================================================
// CONSULTAS POR CURSO
// Solo considera los cursos autorizados del docente
// =====================================================

const obtenerConsultasPorCurso = async (cursoIds) => {

    // Si no tiene cursos asignados
    if (!cursoIds || cursoIds.length === 0) {
        return [];
    }

    const [rows] = await pool.query(`
        SELECT
            curso_moodle_id,
            COUNT(*) AS total_consultas

        FROM logs_ia

        WHERE curso_moodle_id IN (?)

        GROUP BY curso_moodle_id

        ORDER BY total_consultas DESC
    `, [cursoIds]);

    return rows;
};


// =====================================================
// CONSULTAS POR DÍA
// Solo de los cursos del docente
// =====================================================
const obtenerConsultasPorDia = async (cursoIds) => {

    if (!cursoIds || cursoIds.length === 0) {
        return [];
    }

    const [rows] = await pool.query(`
        SELECT
            DATE(fecha) AS fecha,
            COUNT(*) AS total_consultas

        FROM logs_ia

        WHERE curso_moodle_id IN (?)

        GROUP BY DATE(fecha)

        ORDER BY fecha ASC
    `, [cursoIds]);

    return rows;
};


// =====================================================
// USUARIOS ACTIVOS
// Solo de los cursos del docente
// =====================================================
const obtenerUsuariosActivos = async (cursoIds) => {

    if (!cursoIds || cursoIds.length === 0) {
        return {
            usuarios_activos: 0
        };
    }

    const [[resultado]] = await pool.query(`
        SELECT
            COUNT(DISTINCT usuario_id) AS usuarios_activos

        FROM logs_ia

        WHERE usuario_id IS NOT NULL
        AND curso_moodle_id IN (?)
    `, [cursoIds]);

    return resultado;
};


// =====================================================
// EXPORTACIONES
// =====================================================
module.exports = {
    obtenerResumenKPIs,
    obtenerConsultasPorCurso,
    obtenerConsultasPorDia,
    obtenerUsuariosActivos
};