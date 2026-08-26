const express = require('express');
const router = express.Router();
const {
  signup,
  login,
  logout,
  refreshToken,
  getProfile,
  updateProfile,
  getUsers,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validate, signupSchema, loginSchema } = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/signup', authLimiter, validate(signupSchema), signup);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/logout', protect, logout);
router.post('/refresh', refreshToken);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.get('/users', protect, getUsers);

module.exports = router;
