const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.createProject = async (req, res) => {
  const { title } = req.body;
  const userId = req.userId; // Vem do nosso middleware de auth

  try {
    // Usamos transação para garantir integridade
    const newProject = await prisma.$transaction(async (tx) => {
      // 1. Cria o projeto
      const project = await tx.project.create({
        data: { title }
      });

      // 2. Vincula o criador como OWNER
      await tx.userProject.create({
        data: {
          userId: userId,
          projectId: project.id,
          role: 'OWNER'
        }
      });

      // 3. Cria um log de auditoria
      await tx.auditLog.create({
        data: {
          action: 'PROJECT_CREATED',
          userId: userId,
          projectId: project.id
        }
      });

      return project;
    });

    res.status(201).json(newProject);
  } catch (error) {
    res.status(500).json({ error: "Erro ao criar projeto." });
  }
};

exports.listMyProjects = async (req, res) => {
  try {
    const projects = await prisma.userProject.findMany({
      where: { userId: req.userId },
      include: {
        project: true // Traz os dados do projeto junto com o vínculo
      }
    });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: "Erro ao listar projetos." });
  }
};