const express = require("express");

const {
    verificarToken,
    permitirRoles
} = require("../middleware/authMiddleware");

const router = express.Router();

router.get(
    "/perfil",
    verificarToken,
    (req, res) => {
        res.json({
            mensaje: "Acceso autorizado",
            usuario: req.usuario
        });
    }
);

router.get(
    "/estudiante",
    verificarToken,
    permitirRoles("ESTUDIANTE"),
    (req, res) => {
        res.json({
            mensaje: "Bienvenido al módulo de estudiante"
        });
    }
);

router.get(
    "/docente",
    verificarToken,
    permitirRoles("DOCENTE"),
    (req, res) => {
        res.json({
            mensaje: "Bienvenido al módulo de docente"
        });
    }
);

router.get(
    "/admin",
    verificarToken,
    permitirRoles("ADMINISTRADOR"),
    (req, res) => {
        res.json({
            mensaje: "Bienvenido al módulo de administración"
        });
    }
);

module.exports = router;