# ⚡ EmailAI — Intelligent AI Email Client & Career Opportunity Agent

> A full-featured, AI-powered email client featuring sub-second AI email drafting, automatic career/internship opportunity detection, trust & scam verification, deadline reminders, and an interactive analytics suite.

[![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Supabase](https://img.shields.io/badge/Database-Supabase%20PostgreSQL-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![NVIDIA](https://img.shields.io/badge/AI%20Engine-NVIDIA%20NIM%20(Llama%203.2)-76B900?logo=nvidia&logoColor=white)](https://integrate.api.nvidia.com/)
[![Vercel](https://img.shields.io/badge/Deployed-Vercel-000000?logo=vercel&logoColor=white)](https://agenticemail-pdkn.vercel.app)
[![Render](https://img.shields.io/badge/Deployed-Render-46E3B7?logo=render&logoColor=black)](https://emailai-backend-gr8m.onrender.com)

---

## 🌐 Live Deployments

* **Frontend Web Application (Vercel)**: [https://agenticemail-pdkn.vercel.app](https://agenticemail-pdkn.vercel.app)
* **Backend API Server (Render)**: [https://emailai-backend-gr8m.onrender.com](https://emailai-backend-gr8m.onrender.com)
* **Interactive API Documentation**: [https://emailai-backend-gr8m.onrender.com/api/docs](https://emailai-backend-gr8m.onrender.com/api/docs)
* **API Health Check**: [https://emailai-backend-gr8m.onrender.com/api/health](https://emailai-backend-gr8m.onrender.com/api/health)

---

## 🚀 Key Features

### 1. 🤖 AI Writing Assistant (Sub-Second Latency)
* **AI Email Drafter**: Generate full, context-rich emails from quick prompts with selectable tones (*Professional, Friendly, Urgent, Persuasive*).
* **Smart Replies**: Suggests 3 context-aware, 1-click reply options tailored to the incoming message.
* **Smart Subject Generator**: Automatically drafts high-open-rate subject lines based on your draft content.
* **Email Summarizer**: Condenses long threads and newsletters into key bullet points.
* **Sentiment Analysis**: Evaluates customer and colleague sentiment (*Positive, Neutral, Negative*).

### 2. 🛡️ AI Job & Internship Opportunity Detector & Verification Agent
* **Automated Opportunity Detection**: Scans incoming emails for career openings, internships, and fellowships.
* **Trust & Scam Verification**: Evaluates employer legitimacy, domain integrity, and flags potential scams (e.g. upfront fee requests) with a **0–100% Trust Score**.
* **Deadline Tracking & Countdown**: Extracts application closing dates and displays dynamic countdown badges (`🚨 Closes Today`, `⏳ 2 days left`).
* **Deadline Reminders**: 1-click toggle for email deadline alerts.
* **1-Click AI Application Drafter**: Generates tailored, high-converting cover letters and applications for any position.

### 3. 📬 Complete Modern Email Client
* **Folder Management**: Inbox, Sent, Drafts, Starred, Archive, Trash, and Spam.
* **Real-time Delivery**: Instant updates powered by WebSockets (Socket.io) without page refreshes.
* **Auto-Contact Resolution**: Automatically detects and creates external recipient contacts when sending emails.
* **Custom Color Labels & Categorization**: Categorize messages into *Primary, Updates, Promotions, and Social*.
* **Scheduled Sending**: Schedule emails to be sent automatically at future timestamps.

### 4. 📊 Analytics & Activity Dashboard
* Tracks sent/received volume, weekly activity timelines, category distributions, and sentiment breakdowns.

---

## 🏗️ Architecture & Tech Stack

```mermaid
graph TD
    Client[React + Vite Frontend (Vercel)] <-->|REST API + WebSockets| Server[Express.js Backend (Render)]
    Server <-->|PostgreSQL Client| Database[(Supabase DB)]
    Server <-->|Fast NIM Inference| AI[NVIDIA NIM - Llama 3.2 11B]
```

* **Frontend**: React 18, Vite, Framer Motion, Lucide Icons, Chart.js, React Hot Toast, TanStack Query.
* **Backend**: Node.js, Express.js, Socket.io, Helmet, CORS, Morgan, JWT Auth, bcryptjs.
* **Database**: Supabase (PostgreSQL) with relational schema and indexes.
* **AI Provider**: NVIDIA NIM Endpoints running `meta/llama-3.2-11b-vision-instruct`.

---

## 🛠️ Local Development Setup

### 1. Prerequisites
* **Node.js** v18+ installed
* A free **[Supabase](https://supabase.com)** project
* An **[NVIDIA NIM](https://build.nvidia.com)** or OpenAI API key

### 2. Clone the Repository
```bash
git clone https://github.com/Mohilc/agenticemail.git
cd agenticemail
```

### 3. Install Dependencies
```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 4. Configure Environment Variables

Create a `.env` file in the `backend/` directory:

```env
PORT=5000
NODE_ENV=development

# JWT Secrets
JWT_SECRET=your_jwt_secret_key_2026
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_2026
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d

# NVIDIA NIM / OpenAI API Key
OPENAI_API_KEY=your_nvidia_nim_api_key
OPENAI_BASE_URL=https://integrate.api.nvidia.com/v1
AI_MODEL=meta/llama-3.2-11b-vision-instruct

# Frontend URL
CLIENT_URL=http://localhost:5173

# Supabase Credentials
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_service_role_secret_key
```

### 5. Initialize Supabase Database Tables
Open your **[Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql)** and execute the script located in `supabase/migrations/20260827_schema.sql`.

### 6. Run Locally
From the project root directory, run:
```bash
npm run dev
```
* **Frontend**: `http://localhost:5173`
* **Backend API**: `http://localhost:5000/api`

---

## 📡 API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/signup` | Register a new user account |
| `POST` | `/api/auth/login` | Log in and receive JWT tokens |
| `GET` | `/api/emails/:folder` | Fetch emails by folder (inbox, sent, drafts, etc.) |
| `POST` | `/api/emails` | Compose and send or schedule an email |
| `PATCH` | `/api/emails/:id` | Update email flags (read, star, trash, labels) |
| `POST` | `/api/ai/compose` | AI prompt email drafter with tone selection |
| `POST` | `/api/ai/smart-reply` | Generate 3 contextual smart replies |
| `POST` | `/api/ai/summarize` | Generate concise summary of email thread |
| `GET` | `/api/opportunities` | List detected job & internship opportunities |
| `POST` | `/api/opportunities/analyze/:emailId` | AI scan of email for job opportunities |
| `POST` | `/api/opportunities/:id/draft` | 1-Click AI cover letter & pitch generator |
| `GET` | `/api/analytics` | Fetch analytics, volume, and sentiment stats |

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).
