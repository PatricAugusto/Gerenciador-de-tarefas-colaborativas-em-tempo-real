const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const checkPermission = (allowedRoles) => {
  return async (req, res, next) => {
    const userId = req.userId;
    
    // Debug: ver o que está chegando
    console.log("--- DEBUG RBAC ---");
    console.log("User ID:", userId);
    console.log("Params:", req.params);
    console.log("Body:", req.body);
    
    // Tenta encontrar o projectId
    const projectId = req.params.projectId || req.query.projectId || req.body?.projectId;

    console.log("Project ID capturado:", projectId);

    if (!projectId) {
      console.log("Erro: Project ID não fornecido na requisição.");
      return res.status(400).json({ error: "ID do projeto não fornecido." });
    }

    try {
      const userProject = await prisma.userProject.findFirst({
        where: {
          userId: userId,
          projectId: projectId,
          role: { in: allowedRoles }
        }
      });

      console.log("Resultado da busca no Prisma:", userProject ? "Acesso Permitido" : "Acesso Negado");

      if (!userProject) {
        return res.status(403).json({ error: "Acesso negado. Você não tem permissão para este projeto." });
      }

      next();
    } catch (error) {
      console.error("Erro no middleware RBAC:", error);
      res.status(500).json({ error: "Erro interno ao verificar permissões." });
    }
  };
};

module.exports = checkPermission;