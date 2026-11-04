const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/database");


const registrar = async (req, res) => {
    try {
        const { nombre, correo, password } = req.body;

        if (!nombre || !correo || !password) {
            return res.status(400).json({
                mensaje: "Todos los campos son obligatorios"
            });
        }

        const [usuarios] = await pool.query(
            "SELECT id FROM usuarios WHERE correo = ?",
            [correo]
        );

        if (usuarios.length > 0) {
            return res.status(409).json({
                mensaje: "El correo ya está registrado"
            });
        }

        // El registro público únicamente permite ESTUDIANTE
        const [roles] = await pool.query(
            "SELECT id FROM roles WHERE nombre = ?",
            ["ESTUDIANTE"]
        );

        if (roles.length === 0) {
            return res.status(500).json({
                mensaje: "No se encontró el rol ESTUDIANTE"
            });
        }

        const rolId = roles[0].id;

        const passwordHash = await bcrypt.hash(password, 10);

        const [resultado] = await pool.query(
            `INSERT INTO usuarios
            (nombre, correo, password_hash, rol_id)
            VALUES (?, ?, ?, ?)`,
            [nombre, correo, passwordHash, rolId]
        );

        return res.status(201).json({
            mensaje: "Usuario registrado correctamente",
            id: resultado.insertId
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            mensaje: "Error interno del servidor"
        });
    }
};


const login = async (req, res) => {
    try {
        const { correo, password } = req.body;

        if (!correo || !password) {
            return res.status(400).json({
                mensaje: "Correo y contraseña son obligatorios"
            });
        }

        const [usuarios] = await pool.query(
            `SELECT
                u.id,
                u.nombre,
                u.correo,
                u.password_hash,
                u.moodle_user_id,
                r.nombre AS rol
            FROM usuarios u
            INNER JOIN roles r ON u.rol_id = r.id
            WHERE u.correo = ?`,
            [correo]
        );

        if (usuarios.length === 0) {
            return res.status(401).json({
                mensaje: "Credenciales incorrectas"
            });
        }

        const usuario = usuarios[0];

        const passwordValido = await bcrypt.compare(
            password,
            usuario.password_hash
        );

        if (!passwordValido) {
            return res.status(401).json({
                mensaje: "Credenciales incorrectas"
            });
        }

        const token = jwt.sign(
            {
                id: usuario.id,
                nombre: usuario.nombre,
                correo: usuario.correo,
                rol: usuario.rol,
                moodle_user_id: usuario.moodle_user_id
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "2h"
            }
        );

        res.json({
            mensaje: "Inicio de sesión exitoso",
            token,
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                correo: usuario.correo,
                rol: usuario.rol,
                moodle_user_id: usuario.moodle_user_id
            }
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            mensaje: "Error interno del servidor"
        });
    }
};
module.exports = {
    registrar,
    login
};