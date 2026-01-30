import dotenv from 'dotenv';

dotenv.config();
import express from 'express';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import fileRoutes from './routes/fileRoutes.js';
import authRoutes from './routes/authRoutes.js';
import issuesRoutes from './routes/issuesRoutes.js';
import queryRoutes from './routes/queryRoutes.js';
import adminVerificationRoutes from './routes/adminVerificationRoutes.js';
import interactionRoutes from './routes/interactionRoutes.js';
import knowledgeGapRoutes from './routes/knowledgeGapRoutes.js';

import cors from 'cors';

import { chatting } from './controllers/chatController.js'; //GEmini wallah

import TelegramBot from "node-telegram-bot-api";
import axios from "axios";

// Python server URL for agent-based processing
const PYTHON_SERVER_URL = process.env.PYTHON_SERVER_URL || 'http://localhost:8001';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;



// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes
// Admin/file upload routes
app.use('/api/files', fileRoutes);

// Authentication routes
app.use('/api/auth', authRoutes);

// Issues/Complaints routes
app.use('/api/issues', issuesRoutes);

// Query log routes (Admin only)
app.use('/api/admin/queries', queryRoutes);

// Admin verification routes (Document verification, approvals)
app.use('/api/admin', adminVerificationRoutes);

// CRM Interaction routes (Interaction tracking)
app.use('/api/interactions', interactionRoutes);

// Knowledge Gap routes (Admin only - unanswered questions)
app.use('/api/admin/knowledge-gaps', knowledgeGapRoutes);

// Serve chatbot demo page
app.get('/demo', (req, res) => {
  res.sendFile(path.join(__dirname, 'client-old', 'public', 'chatbot-demo.html'));
});



// Chat route - Now forwards to Python FastAPI server with ArmorIQ integration
app.post('/chat', async (req, res) => {
  const { question, userId, sessionId, userContext } = req.body;
  
  if (!question) {
    return res.status(400).json({ error: 'Question is required' });
  }
  
  try {
    // Forward request to Python server
    const response = await axios.post(`${PYTHON_SERVER_URL}/chat`, {
      question,
      userId,
      sessionId,
      userContext
    });
    
    res.json(response.data);
  } catch (err) {
    console.error('Error forwarding to Python server:', err.message);
    
    // Fallback to Node.js chatbot if Python server is down
    try {
      const result = await chatting(question, userId, sessionId);
      res.json({ ...result, fallback: true });
    } catch (fallbackErr) {
      res.status(500).json({ error: fallbackErr.message });
    }
  }
});

// Scholarship agent endpoint - forwards to Python
app.post('/agent/scholarship', async (req, res) => {
  try {
    const response = await axios.post(`${PYTHON_SERVER_URL}/agent/scholarship`, req.body);
    res.json(response.data);
  } catch (err) {
    console.error('Error in scholarship agent:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Admission agent endpoint - forwards to Python
app.post('/agent/admission', async (req, res) => {
  try {
    const response = await axios.post(`${PYTHON_SERVER_URL}/agent/admission`, req.body);
    res.json(response.data);
  } catch (err) {
    console.error('Error in admission agent:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// MCP execution endpoint - forwards to Python
app.post('/mcp/execute', async (req, res) => {
  try {
    const response = await axios.post(`${PYTHON_SERVER_URL}/mcp/execute`, req.body);
    res.json(response.data);
  } catch (err) {
    console.error('Error executing MCP:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get MCP registry
app.get('/mcp/registry', async (req, res) => {
  try {
    const response = await axios.get(`${PYTHON_SERVER_URL}/mcp/registry`);
    res.json(response.data);
  } catch (err) {
    console.error('Error getting MCP registry:', err.message);
    res.status(500).json({ error: err.message });
  }
});


/* 
// 🚀 Telegram Bot Integration (POLLING MODE)
if (process.env.TELEGRAM_BOT_TOKEN) {
    const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

    bot.on("message", async (msg) => {
        const chatId = msg.chat.id;
        const userMessage = msg.text;

        if (!userMessage) return;

        try {
            // Call your existing /chat route
            const response = await axios.post(`http://localhost:${PORT}/chat`, {
                question: userMessage,
            });

            const reply = response.data.answer || "No answer available.";
            bot.sendMessage(chatId, reply);
        } catch (error) {
            console.error("Telegram bot error:", error.message);
            bot.sendMessage(chatId, "⚠️ Something went wrong, please try again.");
        }
    });

    console.log("🤖 Telegram bot is running...");
} else {
    console.log("⚠️ TELEGRAM_BOT_TOKEN not set in .env, skipping Telegram bot setup.");
}
 */

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});