# EmailAI

An AI-powered email management application that helps users compose, organize, and manage emails intelligently using artificial intelligence.

## Problem Statement

Email management is time-consuming and overwhelming. Users spend hours composing emails, sorting through inboxes, and trying to prioritize communications. **EmailAI** leverages AI to automate and enhance email workflows — from smart compose and auto-categorization to sentiment analysis and intelligent reply suggestions.

## Features

### Core Features
- ✅ User Authentication (Signup, Login, Logout, Protected Routes)
- ✅ AI-Assisted Email Composition (with tone adjustment)
- ✅ Email Inbox Management (read, archive, star, delete)
- ✅ Responsive Design (mobile + desktop)
- ✅ Full CRUD Operations for Emails
- ✅ Real-time Notifications (Socket.io)

### AI Features
- ✅ Smart Compose (AI writes emails based on prompts)
- ✅ Smart Reply Suggestions
- ✅ Email Summarization
- ✅ Sentiment Analysis
- ✅ AI-Powered Spam Detection
- ✅ Subject Line Generator
- ✅ Email Categorization (Primary, Social, Promotions, Updates)
- ✅ AI Template Generation

### Bonus Features
- ✅ Dark Mode / Light Mode Toggle
- ✅ Email Labels & Tags
- ✅ Email Search & Filtering
- ✅ Draft Saving & Management
- ✅ Email Scheduling (Send Later)
- ✅ Email Threading
- ✅ Analytics Dashboard (Charts & Stats)
- ✅ Keyboard Shortcuts
- ✅ Skeleton Loading States
- ✅ Toast Notifications
- ✅ Rate Limiting & API Security
- ✅ JWT Token Refresh
- ✅ Swagger API Documentation

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Styling | CSS (custom design system with CSS variables) |
| State Management | React Context + React Query |
| Backend | Node.js + Express.js |
| Database | MongoDB + Mongoose |
| AI | OpenAI API (GPT-4o-mini) |
| Authentication | JWT (Access + Refresh Tokens) + bcrypt |
| Real-time | Socket.io |
| Charts | Recharts |
| Animations | Framer Motion |
| Icons | Lucide React |

## Screenshots

> Add screenshots of your deployed application here

### Login Page
<!-- ![Login](./screenshots/login.png) -->

### Inbox
<!-- ![Inbox](./screenshots/inbox.png) -->

### AI Compose
<!-- ![Compose](./screenshots/compose.png) -->

### Email View with AI Features
<!-- ![Email View](./screenshots/email-view.png) -->

### Analytics Dashboard
<!-- ![Analytics](./screenshots/analytics.png) -->

### Settings
<!-- ![Settings](./screenshots/settings.png) -->

## Live Demo

🔗 [Live Demo](https://emailai.vercel.app)

## Backend

🔗 [API Base URL](https://emailai-api.onrender.com)

📖 [API Documentation](https://emailai-api.onrender.com/api/docs)

## Setup Instructions

### Prerequisites
- Node.js v18+
- npm or yarn
- MongoDB Atlas account (or local MongoDB)
- OpenAI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/emailai.git
   cd emailai
   ```

2. **Install all dependencies**
   ```bash
   npm run install:all
   ```

3. **Configure environment variables**

   Backend (`backend/.env`):
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env with your values
   ```

   Frontend (`frontend/.env`):
   ```bash
   cp frontend/.env.example frontend/.env
   # Edit frontend/.env with your values
   ```

4. **Start development servers**
   ```bash
   npm run dev
   ```

   This starts both the backend (port 5000) and frontend (port 5173) concurrently.

## Environment Variables

### Backend (.env)
```
PORT=5000
NODE_ENV=development
MONGODB_URI=
JWT_SECRET=
JWT_REFRESH_SECRET=
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d
OPENAI_API_KEY=
CLIENT_URL=http://localhost:5173
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME=EmailAI
```

> ⚠️ **IMPORTANT:** Never commit API keys, passwords, OAuth secrets, access tokens, or other sensitive credentials to GitHub.

## Project Structure

```
emailai/
├── frontend/                   # React + Vite
│   ├── src/
│   │   ├── components/         # Reusable components
│   │   │   ├── Layout/         # Sidebar, Header, AppLayout
│   │   │   └── UI/             # Button, Input, Modal, etc.
│   │   ├── context/            # Auth, Theme, Socket contexts
│   │   ├── pages/              # Login, Signup, Dashboard, etc.
│   │   ├── services/           # API service layer
│   │   ├── App.jsx             # Root component with routing
│   │   └── main.jsx            # Entry point
│   └── index.html
├── backend/                    # Node.js + Express
│   ├── config/                 # DB, Socket.io config
│   ├── controllers/            # Route handlers
│   ├── middleware/              # Auth, validation, rate limiting
│   ├── models/                 # Mongoose schemas
│   ├── routes/                 # API routes
│   ├── services/               # AI, email business logic
│   └── server.js               # Entry point
├── README.md
├── .gitignore
└── package.json
```

## License

MIT
