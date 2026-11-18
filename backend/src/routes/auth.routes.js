const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../database");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { nome, email, senha, confirmarSenha } = req.body;

    // 1. Validar os campos
    if (!nome || !email || !senha || !confirmarSenha) {
      return res.status(400).json({
        success: false,
        message: "Preencha todos os campos.",
      });
    }

    // 2. Verificar confirmação da senha
    if (senha !== confirmarSenha) {
      return res.status(400).json({
        success: false,
        message: "As senhas não coincidem.",
      });
    }

    // 3. Verificar se o e-mail já existe
    const [usuarios] = await db.execute(
      "SELECT id FROM usuarios WHERE email = ?",
      [email]
    );

    if (usuarios.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Este e-mail já está cadastrado.",
      });
    }

    // 4. Criptografar a senha
    const senhaHash = await bcrypt.hash(senha, 12);

    // 5. Salvar usuário
    await db.execute(
      "INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)",
      [nome, email, senhaHash]
    );

    return res.status(201).json({
      success: true,
      message: "Usuário cadastrado com sucesso!",
    });

  } catch (error) {
    console.error("Erro no cadastro:", error.message);

    return res.status(500).json({
      success: false,
      message: "Erro interno ao cadastrar usuário.",
    });
  }
});


router.post("/login", async (req, res) => {
  try {
    const { email, senha } = req.body;

    // 1. Validar os campos
    if (!email || !senha) {
      return res.status(400).json({
        success: false,
        message: "Informe seu e-mail e sua senha.",
      });
    }

    // 2. Buscar usuário no banco
    const [usuarios] = await db.execute(
      "SELECT id, nome, email, senha_hash FROM usuarios WHERE email = ?",
      [email]
    );

    if (usuarios.length === 0) {
      return res.status(401).json({
        success: false,
        message: "E-mail ou senha incorretos.",
      });
    }

    const usuario = usuarios[0];

    // 3. Comparar senha com o hash
    const senhaCorreta = await bcrypt.compare(
      senha,
      usuario.senha_hash
    );

    if (!senhaCorreta) {
      return res.status(401).json({
        success: false,
        message: "E-mail ou senha incorretos.",
      });
    }

    // 4. Gerar token JWT
const token = jwt.sign(
  {
    id: usuario.id,
    email: usuario.email,
  },
  process.env.JWT_SECRET,
  {
    expiresIn: "1h",
  }
);

// 5. Login autorizado
return res.status(200).json({
  success: true,
  message: "Login realizado com sucesso!",
  token,
  usuario: {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
  },
});

  } catch (error) {
    console.error("Erro no login:", error.message);

    return res.status(500).json({
      success: false,
      message: "Erro interno ao realizar login.",
    });
  }
});

module.exports = router;