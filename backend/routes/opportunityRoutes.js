const express = require('express');
const router = express.Router();
const {
  getOpportunities,
  analyzeEmailOpportunity,
  updateOpportunity,
  generateCoverLetter,
  deleteOpportunity,
} = require('../controllers/opportunityController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getOpportunities);

router.route('/analyze/:emailId')
  .post(analyzeEmailOpportunity);

router.route('/:id')
  .patch(updateOpportunity)
  .delete(deleteOpportunity);

router.route('/:id/draft')
  .post(generateCoverLetter);

module.exports = router;
