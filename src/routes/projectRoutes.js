const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const authenticateToken = require('../middlewares/auth');

// Todas as rotas de projeto exigem login
router.use(authenticateToken);

router.post('/', projectController.createProject);
router.get('/', projectController.listMyProjects);

module.exports = router;