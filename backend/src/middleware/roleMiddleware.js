const permitirRoles = (...rolesPermitidos) => {

    return (req, res, next) => {

        // Verificar que exista un usuario autenticado
        if (!req.usuario) {

            return res.status(401).json({
                mensaje: "Usuario no autenticado"
            });

        }

        // Verificar si el rol está permitido
        if (!rolesPermitidos.includes(req.usuario.rol)) {

            return res.status(403).json({
                mensaje: "No tienes permisos para acceder a este recurso"
            });

        }

        next();
    };

};

module.exports = {
    permitirRoles
};