import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import { isUnansweredResponse } from '../services/queryService.js';
import { logUnansweredQuery } from '../controllers/queryLogController.js';
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
});

// Session management
const userSessions = new Map();
const SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds

// Helper: Get or create session for user
function getSession(sessionId) {
  if (!userSessions.has(sessionId)) {
    userSessions.set(sessionId, {
      history: [],
      lastActivity: Date.now()
    });
  }
  return userSessions.get(sessionId);
}

// Helper: Update session activity
function updateSessionActivity(sessionId) {
  const session = getSession(sessionId);
  session.lastActivity = Date.now();
}

// Helper: Clean up inactive sessions
function cleanupInactiveSessions() {
  const now = Date.now();
  for (const [sessionId, session] of userSessions.entries()) {
    if (now - session.lastActivity > SESSION_TIMEOUT) {
      userSessions.delete(sessionId);
      console.log(`Session ${sessionId} cleaned up due to inactivity`);
    }
  }
}

// Run cleanup every minute
setInterval(cleanupInactiveSessions, 60 * 1000);

// Helper: Convert 3072-dimensional vectors to 768-dimensional vectors
function reduceDimensions(vector) {
    const sourceLength = vector.length; // 3072
    const targetLength = 768;
    const ratio = sourceLength / targetLength; // 4
    const reduced = [];
    
    for (let i = 0; i < targetLength; i++) {
        const start = Math.floor(i * ratio);
        const end = Math.floor((i + 1) * ratio);
        let sum = 0;
        let count = 0;
        
        for (let j = start; j < end; j++) {
            sum += vector[j];
            count++;
        }
        
        reduced.push(sum / count);
    }
    
    return reduced;
}

export async function transformQuery(question, sessionId) {
  const session = getSession(sessionId);
  
  session.history.push({
    role: 'user',
    content: question
  });
  
  const messages = [
    {
      role: 'system',
      content: `You are a query rewriting expert. Based on the provided chat history, rephrase the "Follow Up user Question" into a complete, standalone question that can be understood without the chat history.\nOnly output the rewritten question and nothing else.`
    },
    ...session.history
  ];
  
  const response = await openai.chat.completions.create({
    model: process.env.GPT_MODEL || "gpt-4o-mini",
    messages: messages,
  });
  
  session.history.pop();
  updateSessionActivity(sessionId);
  return response.choices[0].message.content;
}

export async function chatting(question, userId = null, sessionId = null) {
  // Generate sessionId if not provided (use userId or random ID)
  if (!sessionId) {
    sessionId = userId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  const session = getSession(sessionId);
  const queries = await transformQuery(question, sessionId);
  
  const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GEMINI_API_KEY,
    model: 'gemini-embedding-001',
  });
  let queryVector = await embeddings.embedQuery(queries);
  // Reduce dimensions from 3072 to 768
  queryVector = reduceDimensions(queryVector);
  const pinecone = new Pinecone();
  const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX_NAME);
  const searchResults = await pineconeIndex.query({
    topK: 10,
    vector: queryVector,
    includeMetadata: true,
  });
  const context = searchResults.matches
    .map(match => match.metadata.text)
    .join("\n\n---\n\n");
  
  session.history.push({
    role: 'user',
    content: queries
  });
  
  const messages = [
    {
      role: 'system',
      content: `You are a chatbot for JSS Academy of Technical Education. Answer student queries in a friendly and helpful manner. If the user greets, greet them and ask how you can help.\n\nIf a student asks about any notification, circular, or notice, only answer if the relevant information is present in the provided context. If the context is not sufficient, reply: "I can't help, contact the staff locally at student_help@jssaten.ac.in".\n\nAlways keep answers clear and concise. Only use the provided context to answer.\n\nContext: ${context}`
    },
    ...session.history
  ];
  
  const response = await openai.chat.completions.create({
    model: process.env.GPT_MODEL || "gpt-4o-mini",
    messages: messages,
  });
  
  const responseText = response.choices[0].message.content;
  
  session.history.push({
    role: 'assistant',
    content: responseText
  });

  updateSessionActivity(sessionId);

  // QUERY LOGGING LOGIC: Log unanswered queries
  // Check if the response indicates lack of verified information
  if (isUnansweredResponse(responseText)) {
    try {
      // Log this as an unanswered query for admin review
      await logUnansweredQuery(question, userId);
      console.log('Logged unanswered query for admin review');
    } catch (error) {
      console.error('Failed to log unanswered query:', error);
      // Don't fail the chat response if logging fails
    }
  }
  
  return { answer: responseText, sessionId };
}
