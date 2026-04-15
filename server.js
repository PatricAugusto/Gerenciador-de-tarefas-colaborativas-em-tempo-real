const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const authenticateToken = require('./src/middlewares/auth');
const projectRoutes = require('./src/routes/projectRoutes');
const taskRoutes = require('./src/routes/taskRoutes');
const auditRoutes = require('./src/routes/auditRoutes');

const app = express();
const server = http.createServer(app);
const prisma = new PrismaClient();

// Configuração do Socket.io com CORS
const io = new Server(server, {
  cors: {
    origin: "*", // Em produção, utilize o domínio do seu frontend
    methods: ["GET", "POST"]
  }
});

const JWT_SECRET = process.env.JWT_SECRET || 'sua_chave_secreta_super_complexa';

// Middleware para processar JSON no corpo das requisições
app.use(express.json());

app.set('io', io);

// --- 1. MIDDLEWARE DE SEGURANÇA (WEBSOCKETS) ---
// Impede que usuários não autenticados conectem ao Socket.io
io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error("Acesso negado: Token não fornecido."));
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return next(new Error("Acesso negado: Token inválido."));
    
    // Anexa o ID do usuário ao socket para identificar quem está enviando mensagens
    socket.userId = decoded.userId;
    next();
  });
});

// --- 2. LÓGICA DE EVENTOS (WEBSOCKETS) ---
io.on('connection', (socket) => {
  console.log(`🔌 Usuário conectado ao WS: ${socket.userId}`);

  // Entrar em uma sala de projeto específica
  socket.on('join_project', (projectId) => {
    socket.join(projectId);
    console.log(`📁 Usuário ${socket.userId} entrou na sala: ${projectId}`);
  });

  socket.on('disconnect', () => {
    console.log('❌ Usuário desconectado do WS');
  });
});

// --- 3. ROTAS DE AUTENTICAÇÃO (REST) ---

/**
 * @route POST /auth/register
 * @desc Registra um novo usuário com senha criptografada
 */
app.post('/auth/register', async (req, res) => {
  const { email, password, name } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, name, password: hashedPassword },
    });

    res.status(201).json({ message: "Usuário criado!", userId: user.id });
  } catch (error) {
    res.status(400).json({ error: "Erro ao registrar usuário. O e-mail pode já existir." });
  }
});

/**
 * @route POST /auth/login
 * @desc Autentica usuário e retorna o Token JWT
 */
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Credenciais inválidas." });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1d' });

    res.json({ 
      token, 
      user: { id: user.id, name: user.name, email: user.email } 
    });
  } catch (error) {
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

// --- 4. ROTAS PROTEGIDAS (EXEMPLO) ---

/**
 * @route GET /me
 * @desc Retorna os dados do usuário logado (usa o middleware authenticateToken)
 */
app.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, name: true, email: true }
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar dados do usuário." });
  }
});

app.use('/projects', projectRoutes);
app.use('/tasks', taskRoutes);
app.use('/audit', auditRoutes);

// --- 5. INICIALIZAÇÃO DO SERVIDOR ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor DevBoard rodando em http://localhost:${PORT}`);
});

// Exportação para uso em outros módulos (controllers/serviços)
module.exports = { prisma, io };