const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const app = express();
const server = http.createServer(app); // Criamos o servidor HTTP a partir do Express

// Inicialização do Socket.io com suporte a CORS (importante para o frontend acessar)
const io = new Server(server, {
  cors: {
    origin: "*", // Em produção, substitua pelo domínio do seu frontend
    methods: ["GET", "POST"]
  }
});

const prisma = new PrismaClient();

app.use(express.json());

// --- Lógica de Tempo Real (WebSockets) ---
io.on('connection', (socket) => {
  console.log(`Usuário conectado: ${socket.id}`);

  // Evento para entrar em um projeto específico (Room)
  socket.on('join_project', (projectId) => {
    socket.join(projectId);
    console.log(`Usuário ${socket.id} entrou no projeto: ${projectId}`);
  });

  socket.on('disconnect', () => {
    console.log('Usuário desconectado');
  });
});

// --- Rota de Teste (Health Check) ---
app.get('/health', (req, res) => {
  res.json({ status: 'DevBoard API está rodando!' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

// Exportamos o prisma e o io para usar em outros arquivos depois
module.exports = { prisma, io };