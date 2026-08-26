const express = require('express');
const router = express.Router();
const {
  composeAssist,
  smartReply,
  summarize,
  sentiment,
  detectSpam,
  generateSubject,
  categorize,
  generateTemplate,
} = require('../controllers/aiController');
const { protect } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimiter');
const { validate, aiComposeSchema } = require('../middleware/validate');

// All AI routes require auth + rate limiting
router.use(protect);
router.use(aiLimiter);

router.post('/compose-assist', validate(aiComposeSchema), composeAssist);
router.post('/smart-reply', smartReply);
router.post('/summarize', summarize);
router.post('/sentiment', sentiment);
router.post('/detect-spam', detectSpam);
router.post('/generate-subject', generateSubject);
router.post('/categorize', categorize);
router.post('/generate-template', generateTemplate);

module.exports = router;
