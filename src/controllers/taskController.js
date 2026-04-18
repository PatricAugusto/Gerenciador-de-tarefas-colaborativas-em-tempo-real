const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * Cria uma nova tarefa e registra no log de auditoria.
 */
exports.createTask = async (req, res) => {
  const { title, description, projectId } = req.body;
  const userId = req.userId;

  try {
    // Conta quantas tarefas existem para definir a ordem (ordem baseada no índice)
    const taskCount = await prisma.task.count({
      where: { projectId },
    });

    const newTask = await prisma.task.create({
      data: {
        title,
        description: description || "",
        status: "TODO",
        order: taskCount,
        projectId: projectId,
      },
    });

    // Registra a criação
    await prisma.auditLog.create({
      data: {
        action: "TASK_CREATED",
        userId: userId,
        projectId: projectId,
      },
    });

    // Notificação em tempo real
    const io = req.app.get("io");
    io.to(projectId).emit("task_created", newTask);

    res.status(201).json(newTask);
  } catch (error) {
    console.error("Erro ao criar tarefa:", error);
    res.status(500).json({ error: "Erro ao criar tarefa." });
  }
};

/**
 * Atualiza apenas o status da tarefa (mover entre colunas sem reordenar).
 */
exports.updateTaskStatus = async (req, res) => {
  const { id } = req.params;
  const { status, projectId } = req.body;

  try {
    const updatedTask = await prisma.task.update({
      where: { id },
      data: { status },
    });

    const io = req.app.get("io");
    io.to(projectId).emit("task_moved", updatedTask);

    res.json(updatedTask);
  } catch (error) {
    console.error("Erro ao atualizar status:", error);
    res.status(500).json({ error: "Erro ao mover tarefa." });
  }
};

/**
 * Lista tarefas de um projeto com paginação baseada em cursor.
 */
exports.getTasksByProject = async (req, res) => {
  const { projectId } = req.params;
  const { limit, cursor } = req.query;

  try {
    const pageSize = parseInt(limit) || 10;

    const tasks = await prisma.task.findMany({
      take: pageSize,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      where: { projectId },
      orderBy: { order: "asc" }, // Ordenação visual do Kanban
    });

    // Define o próximo cursor baseado no último item retornado
    const nextCursor = tasks.length === pageSize ? tasks[tasks.length - 1].id : null;

    res.json({
      tasks,
      nextCursor,
    });
  } catch (error) {
    console.error("Erro detalhado no getTasksByProject:", error);
    res.status(500).json({ error: "Erro ao listar tarefas com paginação." });
  }
};

/**
 * Move uma tarefa para um novo status e reordena as outras na coluna de destino.
 */
exports.moveTask = async (req, res) => {
  const { id } = req.params;
  const { projectId, newStatus, newOrder } = req.body;
  const userId = req.userId;

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Busca tarefa original
      const currentTask = await tx.task.findUnique({ where: { id } });
      if (!currentTask) throw new Error("Tarefa não encontrada.");

      // 2. Abre espaço na coluna de destino (empurra tarefas existentes)
      await tx.task.updateMany({
        where: {
          projectId,
          status: newStatus,
          order: { gte: newOrder },
        },
        data: {
          order: { increment: 1 },
        },
      });

      // 3. Atualiza a tarefa alvo
      const updatedTask = await tx.task.update({
        where: { id },
        data: {
          status: newStatus,
          order: newOrder,
        },
      });

      // 4. Auditoria
      await tx.auditLog.create({
        data: {
          action: "TASK_MOVED",
          userId,
          projectId,
        },
      });

      // 5. Notificação via Socket
      const io = req.app.get("io");
      io.to(projectId).emit("task_reordered", {
        taskId: id,
        newStatus,
        newOrder,
        movedBy: userId,
      });

      return updatedTask;
    });

    res.json({ message: "Tarefa reordenada com sucesso." });
  } catch (error) {
    console.error("Erro na transação de moveTask:", error);
    res.status(500).json({ error: "Erro ao processar reordenação." });
  }
};

/**
 * Exclui uma tarefa e ajusta a ordenação das tarefas restantes.
 */
exports.deleteTask = async (req, res) => {
  const { id } = req.params;
  const userId = req.userId;

  try {
    const taskToDelete = await prisma.task.findUnique({
      where: { id }
    });

    if (!taskToDelete) {
      return res.status(404).json({ error: "Tarefa não encontrada." });
    }

    // Transação para garantir consistência após exclusão
    await prisma.$transaction([
      prisma.task.delete({ where: { id } }),
      
      // Decrementa o order das tarefas seguintes na mesma coluna
      prisma.task.updateMany({
        where: {
          projectId: taskToDelete.projectId,
          status: taskToDelete.status,
          order: { gt: taskToDelete.order }
        },
        data: { order: { decrement: 1 } }
      }),
      
      prisma.auditLog.create({
        data: {
          action: 'TASK_DELETED',
          userId: userId,
          projectId: taskToDelete.projectId
        }
      })
    ]);

    res.json({ message: "Tarefa excluída e lista reordenada com sucesso." });
  } catch (error) {
    console.error("Erro ao deletar tarefa:", error);
    res.status(500).json({ error: "Erro interno ao excluir tarefa." });
  }
};