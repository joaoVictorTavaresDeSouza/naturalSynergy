const express = require("express");
const db = require("./database");
const authRoutes = require("./routes/auth.routes");
const app = express();

app.use(express.json());
app.use("/api/auth", authRoutes);

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Natural Synergy API funcionando!",
  });
});

app.get("/api/db-test", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT 1 AS conectado");

    res.status(200).json({
      success: true,
      message: "Conexão com MySQL estabelecida!",
      database: rows[0],
    });
  } catch (error) {
    console.error("Erro ao conectar ao MySQL:", error.message);

    res.status(500).json({
      success: false,
      message: "Não foi possível conectar ao banco de dados.",
    });
  }
});

module.exports = app;