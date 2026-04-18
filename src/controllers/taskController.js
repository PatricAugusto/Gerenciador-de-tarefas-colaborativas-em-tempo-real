const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.createTask = async (req, res) => {
  const { title, description, projectId } = req.body;
  const userId = req.userId;

  try {
    // Descobrir qual a próxima ordem (opcional, ou podemos deixar 0 por padrão)
    const taskCount = await prisma.task.count({
      where: { projectId },
    });

    const newTask = await prisma.task.create({
      data: {
        title,
        description: description || "",
        status: "TODO", // Valor padrão
        order: taskCount,
        projectId: projectId,
        // Se houver relação com usuário que criou:
        // creatorId: userId
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "TASK_CREATED",
        userId: userId,
        projectId: projectId,
      },
    });

    // 3. Notificar via Socket
    const io = req.app.get("io");
    io.to(projectId).emit("task_created", newTask);

    res.status(201).json(newTask);
  } catch (error) {
    console.error("ERRO NO TERMINAL:", error);
    res.status(500).json({ error: "Erro ao criar tarefa." });
  }
};

exports.updateTaskStatus = async (req, res) => {
  const { id } = req.params;
  const { status, projectId } = req.body;

  try {
    const updatedTask = await prisma.task.update({
      where: { id },
      data: { status },
    });

    // Notificar mudança de posição/coluna no Kanban
    const io = req.app.get("io");
    io.to(projectId).emit("task_moved", updatedTask);

    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ error: "Erro ao mover tarefa." });
  }
};

exports.getTasksByProject = async (req, res) => {
  const { projectId } = req.params;
  const { limit = 10, cursor } = req.query; // Recebemos via Query Params

  try {
    const tasks = await prisma.task.findMany({
      take: Number(limit), // Quantidade de itens
      skip: cursor ? 1 : 0, // Se houver cursor, pula o próprio item do cursor
      cursor: cursor ? { id: cursor } : undefined,
      where: { projectId },
      orderBy: { createdAt: "desc" }, // Tarefas mais recentes primeiro
    });

    // Pegamos o ID do último item para ser o próximo cursor
    const nextCursor = tasks.length > 0 ? tasks[tasks.length - 1].id : null;

    res.json({
      tasks,
      nextCursor,
    });
  } catch (error) {
    res.status(500).json({ error: "Erro ao listar tarefas com paginação." });
  }
};

exports.moveTask = async (req, res) => {
  const { id } = req.params; // ID da tarefa sendo movida
  const { projectId, newStatus, newOrder } = req.body;
  const userId = req.userId;

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Buscamos a tarefa atual para saber de onde ela veio
      const currentTask = await tx.task.findUnique({ where: { id } });

      if (!currentTask) throw new Error("Tarefa não encontrada.");

      // 2. "Empurrar" as tarefas para baixo na coluna de destino para abrir espaço
      // Incrementamos o 'order' de todas as tarefas que estão na mesma posição ou abaixo
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

      // 3. Atualizar a tarefa movida com o novo status e nova ordem
      const updatedTask = await tx.task.update({
        where: { id },
        data: {
          status: newStatus,
          order: newOrder,
        },
      });

      // 4. Log de Auditoria
      await tx.auditLog.create({
        data: {
          action: "TASK_MOVED",
          userId,
          projectId,
        },
      });

      // 5. Notificar via Socket.io em tempo real
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
    console.error(error);
    res.status(500).json({ error: "Erro ao processar reordenação." });
  }
};

exports.deleteTask = async (req, res) => {
  const { id } = req.params;
  const userId = req.userId;

  try {
    // 1. Encontrar a tarefa para saber seu contexto antes de deletar
    const taskToDelete = await prisma.task.findUnique({
      where: { id }
    });

    if (!taskToDelete) {
      return res.status(404).json({ error: "Tarefa não encontrada." });
    }

    // 2. Usar transação para garantir integridade
    await prisma.$transaction([
      // Deletar a tarefa
      prisma.task.delete({
        where: { id }
      }),
      // Reordenar as tarefas restantes (decrementa 1 de quem tem ordem maior que a deletada)
      prisma.task.updateMany({
        where: {
          projectId: taskToDelete.projectId,
          status: taskToDelete.status,
          order: { gt: taskToDelete.order }
        },
        data: {
          order: { decrement: 1 }
        }
      }),
      // Auditoria
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