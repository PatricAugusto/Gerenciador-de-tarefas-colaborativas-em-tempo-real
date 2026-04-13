const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const authenticateToken = require('../middlewares/auth');
const checkPermission = require('../middlewares/rbac');

router.use(authenticateToken);

// Apenas OWNER e MEMBER podem criar tarefas
router.post(
  '/', 
  checkPermission(['OWNER', 'MEMBER']), 
  taskController.createTask
);

// Apenas OWNER e MEMBER podem mover tarefas (VIEWER só olha)
router.patch(
  '/:id/status', 
  checkPermission(['OWNER', 'MEMBER']), 
  taskController.updateTaskStatus
);

router.get(
  '/project/:projectId', 
  checkPermission(['OWNER', 'MEMBER', 'VIEWER']), 
  taskController.listTasks
);

module.exports = router;