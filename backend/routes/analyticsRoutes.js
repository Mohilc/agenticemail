const express = require('express');
const router = express.Router();
const {
  getEmailStats,
  getSentimentBreakdown,
  getCategoryBreakdown,
  getActivityTimeline,
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/stats', getEmailStats);
router.get('/sentiment', getSentimentBreakdown);
router.get('/categories', getCategoryBreakdown);
router.get('/activity', getActivityTimeline);

module.exports = router;
