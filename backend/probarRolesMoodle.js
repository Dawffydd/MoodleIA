// ==========================================
// PRUEBA DE ROLES DE USUARIOS EN MOODLE
// ==========================================

const {
    obtenerUsuariosCurso
} = require("./src/services/moodleService");

async function probarRoles() {

    try {

        // Curso 2: Introducción a la Programación
        const courseId = 2;

        console.log("Consultando curso:", courseId);

        const usuarios = await obtenerUsuariosCurso(courseId);

        // Verificar si Moodle devolvió un error
        if (!Array.isArray(usuarios)) {

            console.log("Respuesta de Moodle:");
            console.log(usuarios);

            return;
        }

        console.log("Usuarios encontrados:", usuarios.length);

        usuarios.forEach(usuario => {

            console.log("-------------------------");

            console.log("ID:", usuario.id);

            console.log("Nombre:", usuario.fullname);

            console.log("Correo:", usuario.email);

            console.log("Roles:");

            console.log(
                (usuario.roles || []).map(rol => ({
                    roleid: rol.roleid,
                    shortname: rol.shortname,
                    name: rol.name
                }))
            );

        });

    } catch (error) {

        console.error("Error al consultar Moodle:");

        console.error(
            error.response?.data || error.message
        );

    }

}

probarRoles();