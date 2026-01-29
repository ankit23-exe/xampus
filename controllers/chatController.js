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
const History = [];

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

export async function transformQuery(question) {
  History.push({
    role: 'user',
    content: question
  });
  
  const messages = [
    {
      role: 'system',
      content: `You are a query rewriting expert. Based on the provided chat history, rephrase the "Follow Up user Question" into a complete, standalone question that can be understood without the chat history.\nOnly output the rewritten question and nothing else.`
    },
    ...History
  ];
  
  const response = await openai.chat.completions.create({
    model: process.env.GPT_MODEL || "gpt-4o-mini",
    messages: messages,
  });
  
  History.pop();
  return response.choices[0].message.content;
}

export async function chatting(question, userId = null) {
  const queries = await transformQuery(question);
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
  
  History.push({
    role: 'user',
    content: queries
  });
  
  const messages = [
    {
      role: 'system',
      content: `You are a chatbot for JSS Academy of Technical Education. Answer student queries in a friendly and helpful manner. If the user greets, greet them and ask how you can help.\n\nIf a student asks about any notification, circular, or notice, only answer if the relevant information is present in the provided context. If the context is not sufficient, reply: "I can't help, contact the staff locally at student_help@jssaten.ac.in".\n\nAlways keep answers clear and concise. Only use the provided context to answer.\n\nContext: ${context}`
    },
    ...History
  ];
  
  const response = await openai.chat.completions.create({
    model: process.env.GPT_MODEL || "gpt-4o-mini",
    messages: messages,
  });
  
  const responseText = response.choices[0].message.content;
  
  History.push({
    role: 'assistant',
    content: responseText
  });

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
  
  return responseText;
}
