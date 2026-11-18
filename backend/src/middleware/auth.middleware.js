const jwt = require("jsonwebtoken");

function autenticarToken(req, res, next) {
  const authHeader = req.headers.authorization;

  // Verifica se o token foi enviado
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: "Token de autenticação não informado.",
    });
  }

  // Extrai o token do cabeçalho Bearer
  const [tipo, token] = authHeader.split(" ");

  if (tipo !== "Bearer" || !token) {
    return res.status(401).json({
      success: false,
      message: "Formato de token inválido.",
    });
  }

  try {
    // Verifica a validade do token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Disponibiliza os dados do usuário para a rota
    req.usuario = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Token inválido ou expirado.",
    });
  }
}

module.exports = autenticarToken;