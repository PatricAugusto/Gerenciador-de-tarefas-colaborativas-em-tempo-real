const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Criar um novo projeto e já vincular o criador como OWNER
exports.createProject = async (req, res) => {
  const { title } = req.body;
  const userId = req.userId; // Capturado pelo middleware de autenticação

  try {
    const newProject = await prisma.project.create({
      data: {
        title,
        // Relacionamento Nested Write: Cria o projeto e o vínculo RBAC simultaneamente
        users: {
          create: {
            userId: userId,
            role: "OWNER",
          },
        },
      },
      include: {
        users: true, // Opcional: retorna os dados do vínculo na resposta
      },
    });

    // Auditoria: Registra que um projeto foi criado
    await prisma.auditLog.create({
      data: {
        action: "PROJECT_CREATED",
        userId,
        projectId: newProject.id,
        details: `Projeto "${title}" criado.`,
      },
    });

    res.status(201).json(newProject);
  } catch (error) {
    console.error("Erro ao criar projeto:", error);
    res.status(500).json({ error: "Erro ao criar projeto." });
  }
};

// Listar todos os projetos em que o usuário está vinculado
exports.listProjects = async (req, res) => {
  const userId = req.userId;

  try {
    const projects = await prisma.project.findMany({
      where: {
        users: {
          some: {
            userId: userId,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: "Erro ao listar projetos." });
  }
};

// Buscar detalhes de um projeto específico
exports.getProjectById = async (req, res) => {
  const { id } = req.params;

  try {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        tasks: true,
        users: {
          include: {
            user: {
              select: { name: true, email: true },
            },
          },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ error: "Projeto não encontrado." });
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar projeto." });
  }
};
