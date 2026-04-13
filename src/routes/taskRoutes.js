const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const authenticateToken = require('../middlewares/auth');

router.use(authenticateToken);

router.post('/', taskController.createTask);
router.patch('/:id/status', taskController.updateTaskStatus);

module.exports = router;