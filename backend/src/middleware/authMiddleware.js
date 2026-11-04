const jwt = require("jsonwebtoken");

const verificarToken = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                mensaje: "Token no proporcionado"
            });
        }

        const partes = authHeader.split(" ");

        if (partes.length !== 2 || partes[0] !== "Bearer") {
            return res.status(401).json({
                mensaje: "Formato de token inválido"
            });
        }

        const token = partes[1];

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.usuario = decoded;

        next();

    } catch (error) {
        return res.status(401).json({
            mensaje: "Token inválido o expirado"
        });
    }
};

const permitirRoles = (...rolesPermitidos) => {
    return (req, res, next) => {

        if (!req.usuario) {
            return res.status(401).json({
                mensaje: "Usuario no autenticado"
            });
        }

        if (!rolesPermitidos.includes(req.usuario.rol)) {
            return res.status(403).json({
                mensaje: "No tienes permisos para acceder a este recurso"
            });
        }

        next();
    };
};

module.exports = {
    verificarToken,
    permitirRoles
};