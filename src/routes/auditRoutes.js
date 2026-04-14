const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const authenticateToken = require('../middlewares/auth');
const checkPermission = require('../middlewares/rbac');

router.use(authenticateToken);

// Somente membros (qualquer nível) podem ver o feed de atividades
router.get(
  '/:projectId', 
  checkPermission(['OWNER', 'MEMBER', 'VIEWER']), 
  auditController.getProjectLogs
);

module.exports = router;