const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { supabase } = require('../config/supabase');

// Generate tokens using UUID
const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '15m',
  });
  const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
  });
  return { accessToken, refreshToken };
};

// Helper to format User model (similar to MongoDB document toJSON)
const formatUser = (user) => {
  if (!user) return null;
  const formatted = {
    _id: user.id,
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar || '',
    role: user.role || 'user',
    settings: {
      theme: user.theme || 'light',
      notifications: user.notifications !== false,
      signature: user.signature || '',
    },
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
  return formatted;
};

// @desc    Register new user
// @route   POST /api/auth/signup
const signup = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const lowerEmail = email.toLowerCase();

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', lowerEmail)
      .maybeSingle();

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        name,
        email: lowerEmail,
        password: hashedPassword,
      })
      .select()
      .single();

    if (error) throw error;

    const { accessToken, refreshToken } = generateTokens(user.id);

    // Save refresh token to DB
    await supabase
      .from('users')
      .update({ refresh_token: refreshToken })
      .eq('id', user.id);

    res.status(201).json({
      success: true,
      data: {
        user: formatUser(user),
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const lowerEmail = email.toLowerCase();

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', lowerEmail)
      .maybeSingle();

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const { accessToken, refreshToken } = generateTokens(user.id);

    // Update refresh token
    await supabase
      .from('users')
      .update({ refresh_token: refreshToken })
      .eq('id', user.id);

    res.json({
      success: true,
      data: {
        user: formatUser(user),
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
const logout = async (req, res, next) => {
  try {
    await supabase
      .from('users')
      .update({ refresh_token: null })
      .eq('id', req.user._id);

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const { data: user } = await supabase
      .from('users')
      .select('id, refresh_token')
      .eq('id', decoded.id)
      .maybeSingle();

    if (!user || user.refresh_token !== token) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
      });
    }

    const tokens = generateTokens(user.id);
    await supabase
      .from('users')
      .update({ refresh_token: tokens.refreshToken })
      .eq('id', user.id);

    res.json({
      success: true,
      data: tokens,
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Refresh token expired, please login again',
      });
    }
    next(error);
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
const getProfile = async (req, res, next) => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user._id)
      .single();

    res.json({ success: true, data: formatUser(user) });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
const updateProfile = async (req, res, next) => {
  try {
    const { name, avatar, settings } = req.body;
    const updates = {};

    if (name !== undefined) updates.name = name;
    if (avatar !== undefined) updates.avatar = avatar;
    if (settings !== undefined) {
      if (settings.theme !== undefined) updates.theme = settings.theme;
      if (settings.notifications !== undefined) updates.notifications = settings.notifications;
      if (settings.signature !== undefined) updates.signature = settings.signature;
    }

    const { data: user, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.user._id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data: formatUser(user) });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users (for email recipients autocomplete)
// @route   GET /api/auth/users
const getUsers = async (req, res, next) => {
  try {
    const { search } = req.query;
    let query = supabase
      .from('users')
      .select('id, name, email, avatar')
      .neq('id', req.user._id);

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: users, error } = await query.limit(20);
    if (error) throw error;

    const formattedUsers = users.map(u => ({
      _id: u.id,
      id: u.id,
      name: u.name,
      email: u.email,
      avatar: u.avatar || ''
    }));

    res.json({ success: true, data: formattedUsers });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  signup,
  login,
  logout,
  refreshToken,
  getProfile,
  updateProfile,
  getUsers,
};
