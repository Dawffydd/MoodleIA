const express = require("express");
const cors = require("cors");
const path = require("path");

require("dotenv").config();

const pool = require("./src/config/database");
const authRoutes = require("./src/routes/authRoutes");
const protectedRoutes = require("./src/routes/protectedRoutes");

const moodleRoutes = require("./src/routes/moodleRoutes");
const iaRoutes = require("./src/routes/iaRoutes");
const conversationRoutes = require("./src/routes/conversationRoutes");
const kpiRoutes = require("./src/routes/kpiRoutes");

const app = express();

app.use(cors());
app.use(express.json());

// Servir archivos del frontend
app.use(express.static(
    path.join(__dirname, "../frontend")
));

app.use("/api/auth", authRoutes);
app.use("/api/protegido", protectedRoutes);
app.use("/api/moodle", moodleRoutes);
app.use("/api/ia", iaRoutes);
app.use("/api/conversaciones", conversationRoutes);
app.use("/api/kpis", kpiRoutes);

app.get("/", (req, res) => {
    res.sendFile(
        path.join(__dirname, "../frontend/index.html")
    );
});

app.get("/api/test-db", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT NOW() AS fecha");

        res.json({
            mensaje: "Conexión con MySQL exitosa",
            fechaServidor: rows[0].fecha
        });
    } catch (error) {
        console.error("Error MySQL:", error);

        res.status(500).json({
            mensaje: "Error al conectar con MySQL"
        });
    }
});

const PORT = process.env.PORT || 3006;

app.listen(PORT, () => {
    console.log(`MoodleIA ejecutándose en http://localhost:${PORT}`);
});