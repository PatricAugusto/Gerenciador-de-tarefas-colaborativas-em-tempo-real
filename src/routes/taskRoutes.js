const express = require("express");
const router = express.Router();
const taskController = require("../controllers/taskController");
const authenticateToken = require("../middlewares/auth");
const checkPermission = require("../middlewares/rbac");

router.use(authenticateToken);

// Apenas OWNER e MEMBER podem criar tarefas
router.post(
  "/",
  checkPermission(["OWNER", "MEMBER"]),
  taskController.createTask,
);

// Apenas OWNER e MEMBER podem mover tarefas (VIEWER só olha)
router.patch(
  "/:id/move",
  checkPermission(["OWNER", "MEMBER"]),
  taskController.moveTask,
);

router.get(
  "/project/:projectId",
  checkPermission(["OWNER", "MEMBER"]),
  taskController.getTasksByProject,
);

router.delete(
  "/:id",
  checkPermission(["OWNER", "MEMBER"]),
  taskController.deleteTask,
);

module.exports = router;
