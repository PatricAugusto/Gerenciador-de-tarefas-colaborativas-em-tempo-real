const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * @param {Array} allowedRoles - Lista de cargos permitidos (ex: ['OWNER', 'MEMBER'])
 */
const checkPermission = (allowedRoles) => {
  return async (req, res, next) => {
    const userId = req.userId;
    
    const projectId = req.params.projectId || (req.body && req.body.projectId) || req.query.projectId;

    if (!projectId) {
      return res.status(400).json({ error: "ID do projeto não fornecido." });
    }

    try {
      const userProject = await prisma.userProject.findFirst({
        where: {
          userId: userId,
          projectId: projectId,
          role: { in: allowedRoles } // Verifica se o cargo está na lista permitida
        }
      });

      if (!userProject) {
        return res.status(403).json({ error: "Acesso negado. Você não tem permissão para este projeto." });
      }

      next();
    } catch (error) {
      res.status(500).json({ error: "Erro ao verificar permissões." });
    }
  };
};

module.exports = checkPermission;
