const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.createTask = async (req, res) => {
  const { title, description, status, projectId } = req.body;
  const userId = req.userId;

  try {
    // 1. Criar a tarefa no banco
    const task = await prisma.task.create({
      data: {
        title,
        description,
        status: status || "TODO",
        order: 0, // No futuro, podemos calcular a ordem baseada nas tarefas existentes
        projectId
      }
    });

    // 2. Registrar log de auditoria
    await prisma.auditLog.create({
      data: {
        action: 'TASK_CREATED',
        userId,
        projectId
      }
    });

    // 3. EM TEMPO REAL: Notificar todos na sala do projeto (exceto quem enviou)
    // Precisamos acessar o 'io' globalmente. Uma forma limpa é via req.app.get
    const io = req.app.get('io');
    io.to(projectId).emit('task_created', task);

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: "Erro ao criar tarefa." });
  }
};

exports.updateTaskStatus = async (req, res) => {
  const { id } = req.params;
  const { status, projectId } = req.body;

  try {
    const updatedTask = await prisma.task.update({
      where: { id },
      data: { status }
    });

    // Notificar mudança de posição/coluna no Kanban
    const io = req.app.get('io');
    io.to(projectId).emit('task_moved', updatedTask);

    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ error: "Erro ao mover tarefa." });
  }
};

exports.listTasks = async (req, res) => {
  const { projectId } = req.params;
  const { limit = 10, cursor } = req.query; // Recebemos via Query Params

  try {
    const tasks = await prisma.task.findMany({
      take: Number(limit), // Quantidade de itens
      skip: cursor ? 1 : 0, // Se houver cursor, pula o próprio item do cursor
      cursor: cursor ? { id: cursor } : undefined,
      where: { projectId },
      orderBy: { createdAt: 'desc' } // Tarefas mais recentes primeiro
    });

    // Pegamos o ID do último item para ser o próximo cursor
    const nextCursor = tasks.length > 0 ? tasks[tasks.length - 1].id : null;

    res.json({
      tasks,
      nextCursor
    });
  } catch (error) {
    res.status(500).json({ error: "Erro ao listar tarefas com paginação." });
  }
};