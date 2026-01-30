"""
AI Orchestrator - Routes requests to Query or Issue agents using LLM-based classification
Dynamically extensible for new agents
"""

from typing import Dict, Any
import logging
import os
from openai import OpenAI

logger = logging.getLogger(__name__)


class AIOrchestrator:
    """
    Main orchestrator that decides which agent to call using LLM
    Uses OpenAI to intelligently classify: Query (RAG) vs Issue Creation
    """
    
    def __init__(self):
        # Initialize OpenAI client for LLM-based routing
        self.client = OpenAI(
            api_key=os.getenv('OPENAI_API_KEY'),
            base_url=os.getenv('OPENAI_BASE_URL', 'https://api.openai.com/v1')
        )
        self.model = os.getenv('GPT_MODEL', 'gpt-4o-mini')
    
    def classify_intent(self, message: str) -> Dict[str, Any]:
        """
        Classify user intent using LLM: 'query' or 'issue'
        
        Returns:
            {
                'intent': 'query' or 'issue',
                'confidence': float,
                'reasoning': str
            }
        """
        try:
            system_prompt = """You are an intent classifier for a campus assistant chatbot.
Analyze the user's message and classify it into one of two categories:

1. **query** - User wants information, asking questions about campus facilities, procedures, deadlines, policies, etc.
   Examples: "What are the library timings?", "How do I apply for scholarship?", "Tell me about hostel rules"

2. **issue** - User wants to report a problem, complaint, or issue that needs to be fixed
   Examples: "Tap is leaking in washroom", "WiFi not working", "I want to complain about food quality"

Respond in JSON format:
{
    "intent": "query" or "issue",
    "confidence": 0.0 to 1.0,
    "reasoning": "brief explanation"
}"""

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Classify this message: {message}"}
                ],
                temperature=0.3,
                max_tokens=150
            )
            
            # Parse LLM response
            result_text = response.choices[0].message.content.strip()
            
            # Try to extract JSON
            import json
            import re
            
            # Find JSON in response
            json_match = re.search(r'\{.*\}', result_text, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group())
                
                # Validate and normalize
                intent = result.get('intent', 'query').lower()
                confidence = float(result.get('confidence', 0.5))
                reasoning = result.get('reasoning', 'LLM classification')
                
                # Ensure valid intent
                if intent not in ['query', 'issue']:
                    intent = 'query'
                
                return {
                    'intent': intent,
                    'confidence': min(max(confidence, 0.0), 1.0),
                    'reasoning': f"LLM: {reasoning}"
                }
            else:
                # Fallback if no JSON found
                logger.warning(f"Could not parse LLM response: {result_text}")
                return self._fallback_classification(message)
                
        except Exception as e:
            logger.error(f"LLM classification error: {str(e)}")
            return self._fallback_classification(message)
    
    def _fallback_classification(self, message: str) -> Dict[str, Any]:
        """Fallback keyword-based classification if LLM fails"""
        message_lower = message.lower()
        
        # Check for strong issue indicators
        issue_keywords = ['complaint', 'problem', 'broken', 'not working', 'issue', 'report', 'fix', 'leaking']
        query_keywords = ['what', 'when', 'where', 'how', 'why', 'tell me', 'explain']
        
        issue_score = sum(1 for kw in issue_keywords if kw in message_lower)
        query_score = sum(1 for kw in query_keywords if kw in message_lower)
        
        if issue_score > query_score:
            return {
                'intent': 'issue',
                'confidence': 0.7,
                'reasoning': 'Fallback: Issue keywords detected'
            }
        else:
            return {
                'intent': 'query',
                'confidence': 0.6,
                'reasoning': 'Fallback: Default to query'
            }
    
    async def route_request(
        self,
        message: str,
        user_id: str,
        session_id: str,
        intent_override: str = None,
        user_token: str = None
    ) -> Dict[str, Any]:
        """
        Route request to appropriate agent
        
        Args:
            message: User's message
            user_id: User identifier
            session_id: Session identifier
            intent_override: Force specific intent ('query' or 'issue')
            user_token: Authentication token for API calls
        
        Returns:
            Response from the selected agent
        """
        try:
            # Classify intent (or use override)
            if intent_override:
                classification = {
                    'intent': intent_override,
                    'confidence': 1.0,
                    'reasoning': 'Manual override'
                }
            else:
                classification = self.classify_intent(message)
            
            logger.info(f"Intent classification: {classification}")
            
            # Route to appropriate agent
            if classification['intent'] == 'query':
                from agents.query_agent import QueryAgent
                agent = QueryAgent()
                result = await agent.handle_query(message, user_id, session_id)
            
            elif classification['intent'] == 'issue':
                from agents.issue_agent import IssueAgent
                agent = IssueAgent()
                result = await agent.handle_issue(
                    message=message,
                    user_id=user_id,
                    session_id=session_id,
                    user_token=user_token
                )
            
            else:
                return {
                    'success': False,
                    'message': 'Unable to determine intent. Please rephrase your request.',
                    'classification': classification
                }
            
            # Add classification metadata
            if isinstance(result, dict):
                result['classification'] = classification
            
            return result
        
        except Exception as e:
            logger.error(f"Orchestrator error: {str(e)}")
            return {
                'success': False,
                'message': 'An error occurred processing your request.',
                'error': str(e)
            }


# Registry for dynamic agent addition
AGENT_REGISTRY = {
    'query': {
        'name': 'QueryAgent',
        'description': 'Handles information queries using RAG',
        'class_path': 'agents.query_agent.QueryAgent'
    },
    'issue': {
        'name': 'IssueAgent',
        'description': 'Handles issue/complaint creation',
        'class_path': 'agents.issue_agent.IssueAgent'
    }
}


def register_agent(intent: str, name: str, description: str, class_path: str):
    """
    Dynamically register a new agent
    
    Usage:
        register_agent('appointment', 'AppointmentAgent', 
                      'Handles appointment booking', 
                      'agents.appointment_agent.AppointmentAgent')
    """
    AGENT_REGISTRY[intent] = {
        'name': name,
        'description': description,
        'class_path': class_path
    }
    logger.info(f"Registered new agent: {name} for intent '{intent}'")


def get_agent_info() -> Dict[str, Any]:
    """Get information about all registered agents"""
    return {
        'total_agents': len(AGENT_REGISTRY),
        'agents': AGENT_REGISTRY
    }
