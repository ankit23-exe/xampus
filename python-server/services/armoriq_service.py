import os
from typing import Dict, Any, Optional, List
from armoriq_sdk import ArmorIQClient
from armoriq_sdk.exceptions import ArmorIQException
import logging

logger = logging.getLogger(__name__)


class ArmorIQService:
    """
    Service for interacting with ArmorIQ SDK
    Handles plan capture, intent tokens, and execution
    """
    
    def __init__(self):
        """Initialize ArmorIQ client"""
        self.client = ArmorIQClient(
            api_key=os.getenv('ARMORIQ_API_KEY'),
            user_id=os.getenv('ARMORIQ_USER_ID', 'campus_chatbot_system'),
            agent_id=os.getenv('ARMORIQ_AGENT_ID', 'campus_assistant_v1'),
            proxy_url=os.getenv('ARMORIQ_PROXY_URL', 'https://customer-proxy.armoriq.ai'),
            timeout=int(os.getenv('ARMORIQ_TIMEOUT', '30')),
            max_retries=int(os.getenv('ARMORIQ_MAX_RETRIES', '3'))
        )
        logger.info("ArmorIQ client initialized successfully")
    
    def capture_plan_from_prompt(
        self,
        prompt: str,
        llm: str = "gpt-4o-mini",
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Capture execution plan from a natural language prompt
        Let the LLM generate the plan structure
        
        Args:
            prompt: Natural language description of what to do
            llm: LLM identifier (default: gpt-4o-mini)
            metadata: Optional metadata to attach
        
        Returns:
            PlanCapture object with plan details
        """
        try:
            captured = self.client.capture_plan(
                llm=llm,
                prompt=prompt,
                metadata=metadata
            )
            
            logger.info(f"Plan captured successfully for prompt: {prompt[:50]}...")
            return {
                'success': True,
                'plan': captured.plan,
                'llm': captured.llm,
                'prompt': captured.prompt,
                'metadata': captured.metadata
            }
        except ArmorIQException as e:
            logger.error(f"ArmorIQ error: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
        except Exception as e:
            logger.error(f"Unexpected error in capture_plan: {str(e)}")
            return {
                'success': False,
                'error': f'Failed to capture plan: {str(e)}'
            }
    
    def capture_plan_with_structure(
        self,
        prompt: str,
        plan_structure: Dict[str, Any],
        llm: str = "gpt-4o-mini",
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Capture execution plan with explicit plan structure
        
        Args:
            prompt: Natural language context
            plan_structure: Explicit plan structure with steps
            llm: LLM identifier
            metadata: Optional metadata
        
        Returns:
            PlanCapture object with plan details
        """
        try:
            captured = self.client.capture_plan(
                llm=llm,
                prompt=prompt,
                plan=plan_structure,
                metadata=metadata
            )
            
            logger.info(f"Plan with structure captured for: {prompt[:50]}...")
            return {
                'success': True,
                'plan': captured.plan,
                'llm': captured.llm,
                'prompt': captured.prompt,
                'metadata': captured.metadata
            }
        except ArmorIQException as e:
            logger.error(f"ArmorIQ error: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
        except Exception as e:
            logger.error(f"Error capturing plan with structure: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_intent_token(self, plan_id: str) -> Dict[str, Any]:
        """
        Get intent token for a captured plan
        
        Args:
            plan_id: ID of the captured plan
        
        Returns:
            Intent token details
        """
        try:
            token = self.client.get_intent_token(plan_id)
            logger.info(f"Intent token retrieved for plan: {plan_id}")
            return {
                'success': True,
                'token': token
            }
        except ArmorIQException as e:
            logger.error(f"Failed to get intent token: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def invoke_with_intent(
        self,
        intent_token: str,
        mcp_name: str,
        action_name: str,
        params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Invoke an MCP action with intent token
        
        Args:
            intent_token: Intent token from get_intent_token
            mcp_name: Name of the MCP
            action_name: Action to invoke
            params: Parameters for the action
        
        Returns:
            Invocation result
        """
        try:
            result = self.client.invoke(
                intent_token=intent_token,
                mcp=mcp_name,
                action=action_name,
                params=params
            )
            logger.info(f"Action {action_name} invoked successfully on {mcp_name}")
            return {
                'success': True,
                'result': result
            }
        except ArmorIQException as e:
            logger.error(f"Failed to invoke action: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def delegate_execution(
        self,
        plan_id: str,
        executor_callback: callable
    ) -> Dict[str, Any]:
        """
        Delegate plan execution to a callback function
        
        Args:
            plan_id: ID of the captured plan
            executor_callback: Function to execute each step
        
        Returns:
            Execution results
        """
        try:
            result = self.client.delegate(
                plan_id=plan_id,
                executor=executor_callback
            )
            logger.info(f"Plan {plan_id} delegated successfully")
            return {
                'success': True,
                'result': result
            }
        except ArmorIQException as e:
            logger.error(f"Failed to delegate execution: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def validate_intent(self, prompt: str, intent_type: str) -> Dict[str, Any]:
        """
        Validate user intent using ArmorIQ guardrails
        Detects malicious, inappropriate, or off-topic requests
        
        Args:
            prompt: User's input prompt
            intent_type: Expected intent type (scholarship, admission, general_query)
        
        Returns:
            Validation result with is_valid flag
        """
        try:
            # Define malicious/inappropriate patterns
            malicious_patterns = [
                'hack', 'exploit', 'bypass', 'inject', 'script',
                'malware', 'virus', 'attack', 'crack', 'steal'
            ]
            
            off_topic_patterns = [
                'weather', 'sports', 'movies', 'gaming', 'politics',
                'recipe', 'joke', 'story', 'song', 'poem'
            ]
            
            prompt_lower = prompt.lower()
            
            # Check for malicious content
            if any(pattern in prompt_lower for pattern in malicious_patterns):
                logger.warning(f"Malicious intent detected: {prompt}")
                return {
                    'success': True,
                    'is_valid': False,
                    'reason': 'malicious_content',
                    'message': 'Your request contains inappropriate content and cannot be processed.'
                }
            
            # Check for off-topic requests
            if intent_type in ['scholarship', 'admission']:
                if any(pattern in prompt_lower for pattern in off_topic_patterns):
                    logger.info(f"Off-topic request detected: {prompt}")
                    return {
                        'success': True,
                        'is_valid': False,
                        'reason': 'off_topic',
                        'message': 'Your request is not related to campus services. Please ask about scholarships, admissions, or campus queries.'
                    }
            
            # Intent is valid
            return {
                'success': True,
                'is_valid': True,
                'reason': 'valid',
                'message': 'Intent validated successfully'
            }
            
        except Exception as e:
            logger.error(f"Error validating intent: {str(e)}")
            # On error, allow the request (fail open)
            return {
                'success': True,
                'is_valid': True,
                'reason': 'validation_error',
                'message': 'Could not validate intent, proceeding'
            }
    
    def create_scholarship_plan(self, student_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a plan for scholarship application
        
        Args:
            student_data: Student information for scholarship
        
        Returns:
            Captured plan
        """
        prompt = f"""Create a scholarship application for student:
Name: {student_data.get('student_name')}
Course: {student_data.get('course')}
Year: {student_data.get('year')}
Scholarship Type: {student_data.get('scholarship_type')}
"""
        
        plan_structure = {
            "steps": [
                {
                    "action": "create_scholarship_application",
                    "mcp": "scholarship-mcp",
                    "description": "Create scholarship application in database",
                    "metadata": {"student_id": student_data.get('student_id')}
                }
            ],
            "metadata": {
                "purpose": "scholarship_application",
                "student_id": student_data.get('student_id')
            }
        }
        
        return self.capture_plan_with_structure(
            prompt=prompt,
            plan_structure=plan_structure,
            metadata={"operation": "scholarship_creation"}
        )
    
    def create_admission_plan(self, applicant_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a plan for admission application
        
        Args:
            applicant_data: Applicant information
        
        Returns:
            Captured plan
        """
        prompt = f"""Create an admission application for:
Name: {applicant_data.get('applicant_name')}
Course: {applicant_data.get('course')}
Program: {applicant_data.get('program_type')}
"""
        
        plan_structure = {
            "steps": [
                {
                    "action": "create_admission_application",
                    "mcp": "admission-mcp",
                    "description": "Create admission application in database",
                    "metadata": {"email": applicant_data.get('email')}
                }
            ],
            "metadata": {
                "purpose": "admission_application",
                "email": applicant_data.get('email')
            }
        }
        
        return self.capture_plan_with_structure(
            prompt=prompt,
            plan_structure=plan_structure,
            metadata={"operation": "admission_creation"}
        )


# Singleton instance
_armoriq_service = None

def get_armoriq_service() -> ArmorIQService:
    """Get or create ArmorIQ service singleton"""
    global _armoriq_service
    if _armoriq_service is None:
        _armoriq_service = ArmorIQService()
    return _armoriq_service
