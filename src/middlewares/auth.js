const jwt = require('jsonwebtoken');

// Usamos o segredo do .env
const JWT_SECRET = process.env.JWT_SECRET || 'uma_chave_muito_segura_aqui';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  // O formato do header é "Bearer <TOKEN>", por isso usamos o split
  const token = authHeader && authHeader.split(' ')[1]; 

  if (!token) {
    return res.status(401).json({ error: "Acesso negado. Token não fornecido." });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: "Token inválido ou expirado." });
    }

    // Salvamos o ID do usuário dentro da requisição (req) 
    // para que as próximas funções saibam quem está logado
    req.userId = decoded.userId;
    next(); // Pula para a próxima função (a rota em si)
  });
};

module.exports = authenticateToken;