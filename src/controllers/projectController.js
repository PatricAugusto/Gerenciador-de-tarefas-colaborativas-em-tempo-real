const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * @desc    Cria um novo projeto e vincula automaticamente o criador como OWNER.
 * @route   POST /projects
 * @access  Private
 */
exports.createProject = async (req, res) => {
  const { title } = req.body;
  const userId = req.userId; // Extraído do Token JWT pelo middleware de auth

  try {
    // Usamos o Nested Write do Prisma para garantir a atomicidade da operação
    const newProject = await prisma.project.create({
      data: {
        title,
        // 'members' deve bater com o nome definido no seu schema.prisma
        members: {
          create: {
            userId: userId,
            role: 'OWNER'
          }
        }
      },
      include: {
        members: true // Retorna os vínculos criados para conferência
      }
    });

    // Auditoria: Registra o histórico de criação
    await prisma.auditLog.create({
      data: {
        action: 'PROJECT_CREATED',
        userId,
        projectId: newProject.id,
      }
    });

    res.status(201).json(newProject);
  } catch (error) {
    console.error("Erro ao criar projeto:", error);
    res.status(500).json({ error: "Erro interno ao processar a criação do projeto." });
  }
};

/**
 * @desc    Lista todos os projetos aos quais o usuário autenticado pertence.
 * @route   GET /projects
 * @access  Private
 */
exports.listProjects = async (req, res) => {
  const userId = req.userId;

  try {
    const projects = await prisma.project.findMany({
      where: {
        members: {
          some: {
            userId: userId
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(projects);
  } catch (error) {
    console.error("Erro ao listar projetos:", error);
    res.status(500).json({ error: "Erro ao buscar a lista de projetos." });
  }
};

/**
 * @desc    Busca detalhes de um projeto, incluindo suas tarefas e membros.
 * @route   GET /projects/:id
 * @access  Private (Validado pelo middleware de RBAC na rota)
 */
exports.getProjectById = async (req, res) => {
  const { id } = req.params;

  try {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        tasks: {
          orderBy: { order: 'asc' } // Já traz as tarefas ordenadas para o Kanban
        },
        members: {
          include: {
            user: {
              select: { 
                id: true, 
                name: true, 
                email: true 
              }
            }
          }
        }
      }
    });

    if (!project) {
      return res.status(404).json({ error: "Projeto não encontrado." });
    }

    res.json(project);
  } catch (error) {
    console.error("Erro ao buscar detalhes do projeto:", error);
    res.status(500).json({ error: "Erro ao carregar os dados do projeto." });
  }
};