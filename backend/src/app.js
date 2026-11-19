
const express = require("express");
const cors = require("cors");
const db = require("./database");
const authRoutes = require("./routes/auth.routes");

const app = express();

const allowedOrigins = [
  "https://naturalsynergy-frontend.vercel.app",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:5173",
  "http://127.0.0.1:5173"
];

app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

app.use("/api/auth", authRoutes);

const autenticarToken = require("./middleware/auth.middleware");

// ==========================================
// MEMÓRIA TEMPORÁRIA DA TELEMETRIA
// ==========================================

let telemetria = {
  batimentos: null,
  aceleracao: null,
  recebidoEm: null,
  quantidadeMensagens: 0,
  ultimoAlerta: null
};

function normalizarNumero(valor) {
  if (valor === null || valor === undefined) {
    return null;
  }

  const numero = Number(valor);

  return Number.isFinite(numero) ? numero : null;
}

// Receber dados dos sensores
app.post("/api/dados", (req, res) => {
  const { batimentos, aceleracao } = req.body;

  telemetria = {
    ...telemetria,
    batimentos: normalizarNumero(batimentos),
    aceleracao: normalizarNumero(aceleracao),
    recebidoEm: new Date().toISOString(),
    quantidadeMensagens: telemetria.quantidadeMensagens + 1
  };

  res.status(200).json({
    success: true,
    message: "Telemetria recebida!",
    dados: telemetria
  });
});

// Receber alertas de emergência
app.post("/api/alerta", (req, res) => {
  const { tipo, mensagem, batimentos, aceleracao } = req.body;

  telemetria = {
    ...telemetria,
    batimentos: normalizarNumero(batimentos),
    aceleracao: normalizarNumero(aceleracao),
    recebidoEm: new Date().toISOString(),
    quantidadeMensagens: telemetria.quantidadeMensagens + 1,
    ultimoAlerta: {
      tipo: tipo || "EMERGENCIA",
      mensagem: mensagem || "Alerta recebido",
      recebidoEm: new Date().toISOString()
    }
  };

  console.log("ALERTA RECEBIDO:", telemetria.ultimoAlerta);

  res.status(200).json({
    success: true,
    message: "Alerta recebido!",
    alerta: telemetria.ultimoAlerta
  });
});

// Consultar últimos dados recebidos
app.get("/api/dados", (req, res) => {
  res.set("Cache-Control", "no-store");

  res.status(200).json({
    success: true,
    dados: telemetria
  });
});

// ==========================================
// ROTAS EXISTENTES
// ==========================================

app.get("/api/usuario/perfil", autenticarToken, (req, res) => {
  res.status(200).json({
    success: true,
    message: "Autenticação validada com sucesso!",
    usuario: req.usuario
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Natural Synergy API funcionando!"
  });
});

app.get("/api/db-test", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT 1 AS conectado");

    res.status(200).json({
      success: true,
      message: "Conexão com MySQL estabelecida!",
      database: rows[0]
    });
  } catch (error) {
    console.error("Erro ao conectar ao MySQL:", error.message);

    res.status(500).json({
      success: false,
      message: "Não foi possível conectar ao banco de dados."
    });
  }
});

module.exports = app;