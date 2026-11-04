
require("dotenv").config();

const bcrypt = require("bcrypt");
const pool = require("./src/config/database");

async function crearAdministrador() {
    try {
        const nombre = "Administrador MoodleIA";
        const correo = "admin@moodleia.com";

        // La contraseña se solicitará por consola
        const readline = require("readline/promises");
        const interfaz = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        let password;

        try {
            password = await interfaz.question(
                "Ingresa la contraseña del administrador: "
            );
        } finally {
            interfaz.close();
        }

        if (!password || password.length < 12) {
            throw new Error(
                "La contraseña debe tener al menos 12 caracteres"
            );
        }

        // Verificar si el administrador ya existe
        const [usuarios] = await pool.query(
            "SELECT id FROM usuarios WHERE correo = ?",
            [correo]
        );

        if (usuarios.length > 0) {
            console.log("El administrador ya está registrado.");
            return;
        }

        // Obtener el ID real del rol ADMINISTRADOR
        const [roles] = await pool.query(
            "SELECT id FROM roles WHERE UPPER(nombre) = ?",
            ["ADMINISTRADOR"]
        );

        if (roles.length === 0) {
            throw new Error(
                "No se encontró el rol ADMINISTRADOR"
            );
        }

        // Proteger contraseña
        const passwordHash = await bcrypt.hash(password, 10);

        // Crear cuenta administrativa
        const [resultado] = await pool.query(
            `INSERT INTO usuarios
             (nombre, correo, password_hash, rol_id)
             VALUES (?, ?, ?, ?)`,
            [nombre, correo, passwordHash, roles[0].id]
        );

        console.log("Administrador creado correctamente.");
        console.log("ID:", resultado.insertId);
        console.log("Correo:", correo);

    } catch (error) {
        console.error("Error:", error.message);
    } finally {
        await pool.end();
    }
}

crearAdministrador();
