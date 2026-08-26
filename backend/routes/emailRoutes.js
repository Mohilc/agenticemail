const express = require('express');
const router = express.Router();
const {
  composeEmail,
  getEmailsByFolder,
  getEmail,
  getThread,
  updateEmail,
  deleteEmail,
  moveToTrash,
  searchEmails,
  getEmailCounts,
} = require('../controllers/emailController');
const { protect } = require('../middleware/auth');
const { validate, composeEmailSchema } = require('../middleware/validate');

// All email routes require authentication
router.use(protect);

router.post('/', validate(composeEmailSchema), composeEmail);
router.get('/search', searchEmails);
router.get('/counts', getEmailCounts);
router.get('/detail/:id', getEmail);
router.get('/thread/:id', getThread);
router.patch('/:id', updateEmail);
router.patch('/:id/trash', moveToTrash);
router.delete('/:id', deleteEmail);
router.get('/:folder', getEmailsByFolder);

module.exports = router;
