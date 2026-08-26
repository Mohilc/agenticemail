const express = require('express');
const router = express.Router();
const {
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} = require('../controllers/templateController');
const { protect } = require('../middleware/auth');
const { validate, templateSchema } = require('../middleware/validate');

router.use(protect);

router.get('/', getTemplates);
router.get('/:id', getTemplate);
router.post('/', validate(templateSchema), createTemplate);
router.put('/:id', validate(templateSchema), updateTemplate);
router.delete('/:id', deleteTemplate);

module.exports = router;
