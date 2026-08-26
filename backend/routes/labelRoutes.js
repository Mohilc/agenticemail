const express = require('express');
const router = express.Router();
const {
  getLabels,
  createLabel,
  updateLabel,
  deleteLabel,
  addLabelToEmail,
  removeLabelFromEmail,
} = require('../controllers/labelController');
const { protect } = require('../middleware/auth');
const { validate, labelSchema } = require('../middleware/validate');

router.use(protect);

router.get('/', getLabels);
router.post('/', validate(labelSchema), createLabel);
router.put('/:id', validate(labelSchema), updateLabel);
router.delete('/:id', deleteLabel);
router.post('/:labelId/emails/:emailId', addLabelToEmail);
router.delete('/:labelId/emails/:emailId', removeLabelFromEmail);

module.exports = router;
