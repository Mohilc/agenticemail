const mongoose = require('mongoose');
const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (dnsErr) {}

const path = require('path');
require('dotenv').config();

const User = require('./models/User');
const Email = require('./models/Email');

const simulatedSenders = [
  { name: 'Sarah Chen (Product)', email: 'sarah.chen@company.com', avatar: '', password: 'dummy-password-123' },
  { name: 'DeepSeek Agent', email: 'agent@deepseek.ai', avatar: '', password: 'dummy-password-123' },
  { name: 'NVIDIA Developer Group', email: 'developer@nvidia.com', avatar: '', password: 'dummy-password-123' },
  { name: 'Weekly Tech Digest', email: 'news@dailytech.com', avatar: '', password: 'dummy-password-123' }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB...');

    // Find the main user
    const mainUser = await User.findOne({ email: 'mohilc24@gmail.com' });
    if (!mainUser) {
      console.error('Error: Main user mohilc24@gmail.com not found. Please register/log in on the website first!');
      process.exit(1);
    }

    console.log(`Found main user: ${mainUser.name} <${mainUser.email}>`);

    // Clean existing emails
    await Email.deleteMany({});
    console.log('Cleared existing emails.');

    // Create simulated users
    const senders = [];
    for (const senderInfo of simulatedSenders) {
      let u = await User.findOne({ email: senderInfo.email });
      if (!u) {
        u = await User.create(senderInfo);
        console.log(`Created sender: ${u.name} <${u.email}>`);
      }
      senders.push(u);
    }

    const [sarah, deepseek, nvidia, techDigest] = senders;

    // Create inbox emails
    const emails = [
      {
        from: sarah._id,
        to: [mainUser._id],
        subject: 'Q3 Product Roadmap - Feedback Requested',
        body: `<p>Hi Mohil,</p>
<p>I hope you are doing well. I've finished putting together the draft for the Q3 Product Roadmap. Since you are leading the development integrations, I would love to get your thoughts on the timeline and scope.</p>
<p>Could we schedule a quick 15-minute sync tomorrow afternoon? Or feel free to drop your comments directly into the shared document.</p>
<p>Best regards,<br/>Sarah Chen<br/>Lead Product Manager</p>`,
        snippet: "I've finished putting together the draft for the Q3 Product Roadmap. Since you...",
        folder: 'inbox',
        category: 'updates',
        sentiment: 'positive',
        isRead: false,
        sentAt: new Date(Date.now() - 3600000 * 2), // 2 hours ago
      },
      {
        from: deepseek._id,
        to: [mainUser._id],
        subject: 'Welcome to DeepSeek flash agents!',
        body: `<p>Dear Developer,</p>
<p>Thank you for choosing DeepSeek for your agentic workflows. Our new DeepSeek-V4 models are designed for fast completion times, low latencies, and high reasoning capability.</p>
<p>We are happy to see you building on top of our API. Let us know if you have any feedback or feature requests.</p>
<p>Happy Coding,<br/>The DeepSeek Team</p>`,
        snippet: 'Thank you for choosing DeepSeek for your agentic workflows. Our new DeepSeek-V4...',
        folder: 'inbox',
        category: 'primary',
        sentiment: 'positive',
        isRead: false,
        sentAt: new Date(Date.now() - 3600000 * 4), // 4 hours ago
      },
      {
        from: techDigest._id,
        to: [mainUser._id],
        subject: 'Weekly Tech News: The Rise of Agentic AI Coding Assistants',
        body: `<p>Hello Reader,</p>
<p>In this week's newsletter, we dive deep into agentic programming: how LLMs are transitioning from basic code completion to full pair programming agents that plan, write, and verify code autonomously.</p>
<p>Inside:</p>
<ul>
  <li>Comparing LLM code generation architectures</li>
  <li>Why local verification is the key to safe agentic programming</li>
  <li>Top open-source coding agents of 2026</li>
</ul>
<p>Read the full article on our website.</p>`,
        snippet: "In this week's newsletter, we dive deep into agentic programming: how LLMs...",
        folder: 'inbox',
        category: 'promotions',
        sentiment: 'neutral',
        isRead: true,
        sentAt: new Date(Date.now() - 3600000 * 24), // 1 day ago
      },
      {
        from: nvidia._id,
        to: [mainUser._id],
        subject: 'NVIDIA NIM Developer Updates - August 2026',
        body: `<p>Hi Developer,</p>
<p>We have updated several foundation models on the NVIDIA NIM integration API catalog. Developers now have access to faster inference endpoints for Llama 3.2, Gemma 3, and Nemotron models.</p>
<p>Check out our updated documentation to learn how to integrate these endpoints into your local tools.</p>
<p>Best,<br/>NVIDIA Developer Relations</p>`,
        snippet: 'We have updated several foundation models on the NVIDIA NIM integration API...',
        folder: 'inbox',
        category: 'updates',
        sentiment: 'neutral',
        isRead: true,
        sentAt: new Date(Date.now() - 3600000 * 36), // 1.5 days ago
      },
      // Sent email
      {
        from: mainUser._id,
        to: [sarah._id],
        subject: 'Re: Q3 Product Roadmap - Feedback Requested',
        body: `<p>Hi Sarah,</p>
<p>Thanks for sharing. The roadmap looks solid. I will review it and drop my notes directly into the document by end of day today.</p>
<p>Tomorrow afternoon works great for a quick call. Let's sync at 2 PM.</p>
<p>Best,<br/>Mohil</p>`,
        snippet: "Thanks for sharing. The roadmap looks solid. I will review it and drop my notes...",
        folder: 'sent',
        category: 'primary',
        sentiment: 'positive',
        isRead: true,
        sentAt: new Date(Date.now() - 3600000 * 1), // 1 hour ago
      },
      // Draft email
      {
        from: mainUser._id,
        to: [sarah._id],
        subject: 'Draft: Integration API Specs',
        body: `<p>Hi Sarah,</p>
<p>Here are the draft specifications for the incoming email webhook integrations we discussed...</p>`,
        snippet: 'Here are the draft specifications for the incoming email webhook integrations...',
        folder: 'drafts',
        isDraft: true,
        isRead: true,
        createdAt: new Date(Date.now() - 600000), // 10 minutes ago
      }
    ];

    await Email.insertMany(emails);
    console.log('Seeded database with sample emails successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding database:', err);
    process.exit(1);
  }
}

seed();
