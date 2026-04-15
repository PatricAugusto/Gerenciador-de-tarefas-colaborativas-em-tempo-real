const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * @param {Array} allowedRoles - Lista de cargos permitidos (ex: ['OWNER', 'MEMBER'])
 */
const checkPermission = (allowedRoles) => {
  return async (req, res, next) => {
    const userId = req.userId;
    // O ID do projeto pode vir do corpo (POST) ou dos parâmetros (GET/PATCH)
    const projectId = req.params.projectId || (req.body && req.body.projectId);

    console.log("DEBUG RBAC - UserID:", userId);
    console.log("DEBUG RBAC - ProjectID:", projectId);

    if (!projectId) {
      return res
        .status(400)
        .json({
          error: "ID do projeto é obrigatório para verificar permissões.",
        });
    }

    try {
      const membership = await prisma.userProject.findUnique({
        where: {
          userId_projectId: {
            userId: userId,
            projectId: projectId,
          },
        },
      });

      if (!membership || !allowedRoles.includes(membership.role)) {
        return res.status(403).json({
          error:
            "Acesso negado. Você não tem permissão para realizar esta ação.",
        });
      }

      // Anexamos o cargo ao req para uso futuro se necessário
      req.userRole = membership.role;
      next();
    } catch (error) {
      res.status(500).json({ error: "Erro ao verificar permissões." });
    }
  };
};

module.exports = checkPermission;
