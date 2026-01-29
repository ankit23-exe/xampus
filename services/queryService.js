import OpenAI from 'openai';
import * as dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
});

/**
 * Check if the chatbot response indicates it couldn't answer the question
 * @param {string} responseText - The chatbot's response
 * @returns {boolean} - True if the response indicates lack of information
 */
export function isUnansweredResponse(responseText) {
  const unansweredPatterns = [
    /I can't help.*contact.*staff/i,
    /I don't have.*information/i,
    /I'm not sure.*about/i,
    /I cannot provide.*information/i,
    /I don't have access.*to/i,
    /I'm unable to.*help/i,
    /I can't assist.*with/i,
    /I don't have.*specific.*details/i,
    /contact.*staff.*locally/i,
    /student_help@jssaten\.ac\.in/i,
    /I cannot answer.*without/i,
    /I'm not equipped.*to/i,
    /I lack.*information/i,
    /I'm sorry.*I don't know/i
  ];

  return unansweredPatterns.some(pattern => pattern.test(responseText));
}

/**
 * Normalize a user question into a simplified, admin-friendly format
 * @param {string} originalQuestion - The original user question
 * @returns {Promise<string>} - Normalized question for admin review
 */
export async function normalizeQuery(originalQuestion) {
  try {
    const messages = [
      {
        role: 'system',
        content: `You are a query normalization expert for a college administration system. 

Your task is to convert student queries into clear, concise, admin-friendly questions that capture the core information need.

Guidelines:
1. Remove casual language, filler words, and emotional expressions
2. Focus on the specific information being requested
3. Use formal, professional language
4. Keep the essential context but make it concise
5. If the query is about notifications, circulars, or notices, specify that clearly
6. If the query is about procedures, deadlines, or requirements, make that explicit

Examples:
- "Hey, when is the exam??? I'm so stressed!" → "When are the examinations scheduled?"
- "Can someone tell me about the fee payment thing?" → "What is the fee payment procedure?"
- "I heard there's some notice about hostel stuff, what's that about?" → "What are the current hostel-related notices or updates?"
- "My friend said there's a new rule for attendance, is it true?" → "What are the current attendance policies or recent changes?"

Only respond with the normalized question, nothing else.`
      },
      {
        role: 'user',
        content: originalQuestion
      }
    ];

    const response = await openai.chat.completions.create({
      model: process.env.GPT_MODEL || "gpt-4o-mini",
      messages: messages,
      max_tokens: 150,
      temperature: 0.3
    });

    const normalizedQuestion = response.choices[0].message.content.trim();
    
    // Remove any quotes that might be added by the LLM
    return normalizedQuestion.replace(/^["']|["']$/g, '');
    
  } catch (error) {
    console.error('Error normalizing query:', error);
    // Fallback: return the original question if normalization fails
    return originalQuestion;
  }
}

/**
 * Find similar query from existing queries using simple string similarity
 * @param {string} normalizedQuestion - The normalized question to compare
 * @param {Array} existingQueries - Array of existing query objects
 * @param {number} threshold - Similarity threshold (0-1)
 * @returns {Object|null} - Similar query object or null if none found
 */
export function findSimilarQuery(normalizedQuestion, existingQueries, threshold = 0.7) {
  if (!existingQueries || existingQueries.length === 0) {
    return null;
  }

  let mostSimilar = null;
  let highestSimilarity = 0;

  for (const query of existingQueries) {
    const similarity = calculateStringSimilarity(
      normalizedQuestion.toLowerCase(),
      query.normalizedQuestion.toLowerCase()
    );

    if (similarity > highestSimilarity && similarity >= threshold) {
      highestSimilarity = similarity;
      mostSimilar = query;
    }
  }

  return mostSimilar;
}

/**
 * Calculate string similarity using Jaccard similarity coefficient
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} - Similarity score between 0 and 1
 */
function calculateStringSimilarity(str1, str2) {
  // Simple approach: Jaccard similarity on word sets
  const words1 = new Set(str1.toLowerCase().split(/\s+/).filter(word => word.length > 2));
  const words2 = new Set(str2.toLowerCase().split(/\s+/).filter(word => word.length > 2));

  if (words1.size === 0 && words2.size === 0) {
    return 1;
  }

  const intersection = new Set([...words1].filter(word => words2.has(word)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

/**
 * Advanced similarity calculation using edit distance (Levenshtein distance)
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} - Similarity score between 0 and 1
 */
function calculateEditDistanceSimilarity(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;
  
  // Create a 2D array for dynamic programming
  const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));
  
  // Initialize first row and column
  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;
  
  // Fill the matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  const editDistance = matrix[len1][len2];
  const maxLength = Math.max(len1, len2);
  
  return maxLength === 0 ? 1 : (maxLength - editDistance) / maxLength;
}

export default {
  isUnansweredResponse,
  normalizeQuery,
  findSimilarQuery
};