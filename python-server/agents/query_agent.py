"""
Query Agent - Handles information queries using RAG with LLM-based tool selection
Uses LLM to decide which tools to use for better answers
"""

from typing import Dict, Any
import logging
from services.chat_service import get_chat_service
from services.tool_selector import ToolSelector

logger = logging.getLogger(__name__)


class QueryAgent:
    """
    Handles user queries using RAG (Retrieval Augmented Generation)
    Uses LLM to intelligently select which tools to use
    """
    
    def __init__(self):
        self.chat_service = get_chat_service()
        self.tool_selector = ToolSelector()
    
    async def handle_query(
        self,
        message: str,
        user_id: str,
        session_id: str
    ) -> Dict[str, Any]:
        """
        Handle user query using RAG with intelligent tool selection
        
        Flow:
        1. Use LLM to select appropriate tools
        2. Execute tools based on selection
        3. Generate answer from results
        
        Args:
            message: User's question
            user_id: User identifier
            session_id: Session identifier
        
        Returns:
            Response with answer from RAG system
        """
        try:
            # Step 1: LLM decides which tools to use
            tool_decision = await self.tool_selector.select_query_tools(message)
            logger.info(f"Tool decision: {tool_decision}")
            
            # Step 2: Use chat service with RAG (already implements tool usage)
            result = await self.chat_service.chat(message, user_id, session_id)
            
            return {
                'success': True,
                'type': 'query',
                'answer': result.get('answer', 'I could not find an answer to your question.'),
                'session_id': session_id,
                'sources': result.get('sources', []),
                'metadata': {
                    'agent': 'QueryAgent',
                    'tools_used': tool_decision.get('tools', []),
                    'query_type': tool_decision.get('query_type', 'general'),
                    'tool_reasoning': tool_decision.get('reasoning', ''),
                    'method': 'RAG'
                }
            }
        
        except Exception as e:
            logger.error(f"Query agent error: {str(e)}")
            return {
                'success': False,
                'type': 'query',
                'message': 'I encountered an error processing your query. Please try again.',
                'error': str(e)
            }
