const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
// No Mongoose DB connection needed here (Supabase is lazily loaded)
const { initSocket } = require('./config/socket');
const { startScheduler } = require('./services/emailService');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

// Route imports
const authRoutes = require('./routes/authRoutes');
const emailRoutes = require('./routes/emailRoutes');
const aiRoutes = require('./routes/aiRoutes');
const labelRoutes = require('./routes/labelRoutes');
const templateRoutes = require('./routes/templateRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const opportunityRoutes = require('./routes/opportunityRoutes');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Database connection handled via Supabase API calls

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Rate limiting
app.use('/api', apiLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/labels', labelRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/opportunities', opportunityRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'EmailAI API is running',
    timestamp: new Date().toISOString(),
  });
});

// Swagger API docs (development only)
if (process.env.NODE_ENV === 'development') {
  try {
    const swaggerJsdoc = require('swagger-jsdoc');
    const swaggerUi = require('swagger-ui-express');

    const swaggerOptions = {
      definition: {
        openapi: '3.0.0',
        info: {
          title: 'EmailAI API',
          version: '1.0.0',
          description: 'AI-powered email management API',
        },
        servers: [{ url: `http://localhost:${process.env.PORT || 5000}` }],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
          },
        },
        security: [{ bearerAuth: [] }],
      },
      apis: ['./routes/*.js'],
    };

    const specs = swaggerJsdoc(swaggerOptions);
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs));
    console.log('Swagger docs available at /api/docs');
  } catch (err) {
    console.log('Swagger setup skipped');
  }
}

// Error handler (must be after routes)
app.use(errorHandler);

// Start email scheduler
startScheduler();

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║         EmailAI API Server Started         ║
║────────────────────────────────────────────║
║  Port:     ${PORT}                            ║
║  Mode:     ${process.env.NODE_ENV || 'development'}                   ║
║  Docs:     http://localhost:${PORT}/api/docs   ║
║  Health:   http://localhost:${PORT}/api/health  ║
╚════════════════════════════════════════════╝
  `);
});

module.exports = app;
