"""
Tool Selector Service - Uses LLM to decide which tools agents should use
Enables intelligent tool selection based on user request
"""

import os
import logging
import json
import re
from typing import Dict, Any, List
from openai import OpenAI

logger = logging.getLogger(__name__)


class ToolSelector:
    """
    Uses LLM to intelligently decide which tools should be used
    """
    
    def __init__(self):
        self.client = OpenAI(
            api_key=os.getenv('OPENAI_API_KEY'),
            base_url=os.getenv('OPENAI_BASE_URL', 'https://api.openai.com/v1')
        )
        self.model = os.getenv('GPT_MODEL', 'gpt-4o-mini')
    
    async def select_query_tools(self, message: str) -> Dict[str, Any]:
        """
        Decide which RAG tools to use for query
        
        Available tools:
        - search_knowledge_base: Search campus knowledge base
        - fetch_faq: Get FAQ answers
        - search_policies: Search campus policies
        
        Returns:
            {
                'tools': ['tool_name1', 'tool_name2'],
                'reasoning': 'why these tools',
                'query_type': 'academic|facilities|policies|general'
            }
        """
        try:
            system_prompt = """You are a tool selector for a campus query system.
Based on the user's question, decide which tools should be used to answer it.

Available tools:
1. search_knowledge_base - Search campus information (best for: facilities, services, procedures)
2. fetch_faq - Get frequently asked questions (best for: common questions)
3. search_policies - Search campus policies and rules (best for: policies, regulations, rules)

Return JSON format:
{
    "tools": ["tool_name1", "tool_name2"],
    "reasoning": "why these tools were selected",
    "query_type": "academic|facilities|policies|general"
}"""

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Select tools for this query: {message}"}
                ],
                temperature=0.3,
                max_tokens=200
            )
            
            result_text = response.choices[0].message.content.strip()
            
            # Extract JSON from response
            json_match = re.search(r'\{.*\}', result_text, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group())
                logger.info(f"Selected tools for query: {result['tools']}")
                return result
            else:
                logger.warning("Could not parse tool selection response")
                return self._default_query_tools(message)
                
        except Exception as e:
            logger.error(f"Error selecting query tools: {str(e)}")
            return self._default_query_tools(message)
    
    def _default_query_tools(self, message: str) -> Dict[str, Any]:
        """Fallback tool selection"""
        message_lower = message.lower()
        
        tools = ["search_knowledge_base"]
        query_type = "general"
        
        if any(word in message_lower for word in ['policy', 'rule', 'regulation', 'allow']):
            tools.append("search_policies")
            query_type = "policies"
        elif any(word in message_lower for word in ['faq', 'common', 'usually', 'often']):
            tools.append("fetch_faq")
            query_type = "general"
        
        return {
            'tools': tools,
            'reasoning': 'Fallback selection based on keywords',
            'query_type': query_type
        }
    
    async def select_issue_tools(self, message: str) -> Dict[str, Any]:
        """
        Decide which issue tools to use
        
        Available tools:
        - check_duplicates: Check for similar existing issues
        - upload_image: Upload image to Azure
        - create_issue: Create new issue in database
        - upvote_existing: Upvote similar issue
        
        Returns:
            {
                'tools': ['tool_name1', 'tool_name2'],
                'reasoning': 'why these tools',
                'priority': 'low|medium|high'
            }
        """
        try:
            system_prompt = """You are a tool selector for a campus issue reporting system.
Based on the issue description, decide which tools should be used.

Available tools:
1. check_duplicates - Check for similar existing issues (ALWAYS use this first)
2. upload_image - Upload image to cloud storage (use if user mentions image/photo/attachment)
3. create_issue - Create new issue (use if no duplicate found)
4. upvote_existing - Upvote similar issue (use if duplicate found)

Tool execution order:
- ALWAYS start with check_duplicates
- If duplicate found: use upvote_existing
- If no duplicate: optionally use upload_image, then use create_issue

Assess priority based on severity keywords:
- HIGH: injury, dangerous, safety, emergency, broken water, no power
- MEDIUM: leak, damage, dirt, discomfort, inconvenience
- LOW: minor, small, cosmetic, suggestion

Return JSON format:
{
    "tools": ["tool_name1", "tool_name2"],
    "reasoning": "why these tools in this order",
    "priority": "low|medium|high"
}"""

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Select tools for this issue: {message}"}
                ],
                temperature=0.3,
                max_tokens=200
            )
            
            result_text = response.choices[0].message.content.strip()
            
            # Extract JSON from response
            json_match = re.search(r'\{.*\}', result_text, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group())
                
                # Ensure check_duplicates is first
                if 'check_duplicates' not in result['tools']:
                    result['tools'].insert(0, 'check_duplicates')
                
                logger.info(f"Selected tools for issue: {result['tools']} (priority: {result['priority']})")
                return result
            else:
                logger.warning("Could not parse issue tool selection")
                return self._default_issue_tools(message)
                
        except Exception as e:
            logger.error(f"Error selecting issue tools: {str(e)}")
            return self._default_issue_tools(message)
    
    def _default_issue_tools(self, message: str) -> Dict[str, Any]:
        """Fallback tool selection for issues"""
        message_lower = message.lower()
        
        # Always check duplicates first
        tools = ["check_duplicates"]
        priority = "medium"
        
        # Add upload if mentions images
        if any(word in message_lower for word in ['image', 'photo', 'picture', 'screenshot', 'attachment']):
            tools.append("upload_image")
        
        # Determine priority
        if any(word in message_lower for word in ['injury', 'danger', 'emergency', 'unsafe', 'broken']):
            priority = "high"
        elif any(word in message_lower for word in ['small', 'minor', 'cosmetic']):
            priority = "low"
        
        return {
            'tools': tools + ["create_issue"],
            'reasoning': 'Fallback: Check duplicates first, then create',
            'priority': priority
        }
