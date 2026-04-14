const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getProjectLogs = async (req, res) => {
  const { projectId } = req.params;

  try {
    const logs = await prisma.auditLog.findMany({
      where: { projectId },
      include: {
        user: {
          select: { name: true, email: true } // Não trazemos a senha por segurança
        }
      },
      orderBy: { createdAt: 'desc' }, // O mais recente primeiro
      take: 50 // Limitamos aos últimos 50 eventos para manter a performance
    });

    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar logs de auditoria." });
  }
};