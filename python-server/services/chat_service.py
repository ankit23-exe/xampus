import os
from typing import Dict, Any, Optional, List
import openai
# OLD CODE - GoogleGenerativeAI embeddings causing version conflicts
# from langchain_google_genai import GoogleGenerativeAIEmbeddings
from openai import OpenAI
from pinecone import Pinecone
import logging

logger = logging.getLogger(__name__)

# Initialize OpenAI client
client = OpenAI(
    api_key=os.getenv('OPENAI_API_KEY'),
    base_url=os.getenv('OPENAI_BASE_URL', 'https://api.openai.com/v1')
)

# Legacy compatibility
openai.api_key = os.getenv('OPENAI_API_KEY')
openai.base_url = os.getenv('OPENAI_BASE_URL', 'https://api.openai.com/v1')

# Initialize Pinecone
pc = Pinecone(api_key=os.getenv('PINECONE_API_KEY'))
index_name = os.getenv('PINECONE_INDEX_NAME', 'vectordb')
index = pc.Index(index_name)

# Use OpenAI embeddings instead (more stable, no version conflicts)
# embeddings_model = GoogleGenerativeAIEmbeddings(
#     model="models/embedding-001",
#     google_api_key=os.getenv('GEMINI_API_KEY')
# )


class ChatService:
    """
    Service for handling chat operations
    Includes RAG, conversation management, and LLM calls
    """
    
    def __init__(self):
        self.sessions: Dict[str, Dict] = {}
        self.SESSION_TIMEOUT = 5 * 60  # 5 minutes
    
    def get_or_create_session(self, session_id: str) -> Dict:
        """Get or create a chat session"""
        if session_id not in self.sessions:
            self.sessions[session_id] = {
                'history': [],
                'last_activity': None
            }
        return self.sessions[session_id]
    
    def reduce_dimensions(self, vector: List[float]) -> List[float]:
        """
        Reduce 3072-dimensional vectors to 768-dimensional
        """
        source_length = len(vector)
        target_length = 768
        ratio = source_length / target_length
        reduced = []
        
        for i in range(target_length):
            start = int(i * ratio)
            end = int((i + 1) * ratio)
            chunk = vector[start:end]
            reduced.append(sum(chunk) / len(chunk))
        
        return reduced
    
    async def transform_query(
        self,
        question: str,
        session_id: str
    ) -> str:
        """
        Transform query based on conversation history
        """
        session = self.get_or_create_session(session_id)
        
        if not session['history']:
            return question
        
        messages = [
            {
                'role': 'system',
                'content': 'You are a query rewriting expert. Based on the chat history, '
                          'rephrase the "Follow Up user Question" into a complete, standalone '
                          'question. Only output the rewritten question.'
            },
            *session['history'],
            {'role': 'user', 'content': question}
        ]
        
        try:
            response = openai.chat.completions.create(
                model=os.getenv('GPT_MODEL', 'gpt-4o-mini'),
                messages=messages
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"Error transforming query: {str(e)}")
            return question
    
    async def get_relevant_context(
        self,
        question: str,
        top_k: int = 5
    ) -> str:
        """
        Retrieve relevant context from Pinecone vector database
        """
        try:
            # Generate embedding for question using OpenAI
            response = client.embeddings.create(
                model="text-embedding-ada-002",
                input=question
            )
            question_embedding = response.data[0].embedding
            
            # OpenAI embeddings are 1536-dimensional, check if we need to reduce
            if len(question_embedding) > 768:
                question_embedding = self.reduce_dimensions(question_embedding)
            
            # Query Pinecone
            results = index.query(
                vector=question_embedding,
                top_k=top_k,
                include_metadata=True
            )
            
            # Extract context from matches
            contexts = []
            for match in results.matches:
                if hasattr(match, 'metadata') and 'text' in match.metadata:
                    contexts.append(match.metadata['text'])
            
            return '\n\n'.join(contexts) if contexts else ''
            
        except Exception as e:
            logger.error(f"Error retrieving context: {str(e)}")
            return ''
    
    async def generate_response(
        self,
        question: str,
        context: str,
        session_id: str
    ) -> str:
        """
        Generate response using LLM with context
        """
        session = self.get_or_create_session(session_id)
        
        system_message = f"""You are a helpful campus assistant chatbot for JSS Academy of Technical Education, Noida.

Use the following context from the campus knowledge base to answer questions:

CONTEXT:
{context}

Guidelines:
1. Answer based on the provided context
2. If the context doesn't contain relevant information, politely say you don't have that information
3. Be concise and helpful
4. For scholarship or admission queries, guide users through the process
5. If asked to fill forms or applications, confirm details with the user first
"""
        
        messages = [
            {'role': 'system', 'content': system_message},
            *session['history'],
            {'role': 'user', 'content': question}
        ]
        
        try:
            response = openai.chat.completions.create(
                model=os.getenv('GPT_MODEL', 'gpt-4o-mini'),
                messages=messages,
                temperature=0.7
            )
            
            answer = response.choices[0].message.content
            
            # Update session history
            session['history'].append({'role': 'user', 'content': question})
            session['history'].append({'role': 'assistant', 'content': answer})
            
            # Keep only last 10 messages to manage context length
            if len(session['history']) > 10:
                session['history'] = session['history'][-10:]
            
            return answer
            
        except Exception as e:
            logger.error(f"Error generating response: {str(e)}")
            return "I apologize, but I encountered an error processing your request. Please try again."
    
    async def chat(
        self,
        question: str,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Main chat function - handles the complete chat flow
        """
        # Generate session ID if not provided
        if not session_id:
            session_id = user_id or f"session_{id(question)}"
        
        try:
            # Transform query based on history
            transformed_question = await self.transform_query(question, session_id)
            
            # Get relevant context from vector DB
            context = await self.get_relevant_context(transformed_question)
            
            # Generate response
            answer = await self.generate_response(
                transformed_question,
                context,
                session_id
            )
            
            return {
                'success': True,
                'answer': answer,
                'session_id': session_id,
                'original_question': question,
                'transformed_question': transformed_question
            }
            
        except Exception as e:
            logger.error(f"Error in chat: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'session_id': session_id
            }


# Singleton instance
_chat_service = None

def get_chat_service() -> ChatService:
    """Get or create chat service singleton"""
    global _chat_service
    if _chat_service is None:
        _chat_service = ChatService()
    return _chat_service
