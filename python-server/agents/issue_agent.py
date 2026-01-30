"""
Issue Agent - Handles issue/complaint creation with LLM-based tool selection
Includes duplicate detection, image upload, and priority assessment via LLM
"""

from typing import Dict, Any, Optional
import logging
import os
from datetime import datetime
from azure.storage.blob import BlobServiceClient, ContentSettings
import uuid
import json
from services.tool_selector import ToolSelector
from openai import OpenAI

logger = logging.getLogger(__name__)


class IssueAgent:
    """
    Handles issue/complaint creation with smart duplicate detection
    Uses LLM to decide which tools to use and assess priority
    - Checks for similar existing issues
    - Upvotes existing issues instead of creating duplicates
    - Extracts title and description
    - Uploads images to Azure Blob Storage
    - Creates issue in database only if no similar issue exists
    """
    
    def __init__(self):
        # Azure Blob Storage configuration
        self.connection_string = os.getenv('AZURE_STORAGE_CONNECTION_STRING')
        self.container_name = os.getenv('AZURE_CONTAINER_NAME', 'issue-images')
        self.tool_selector = ToolSelector()
        
        # OpenAI configuration for LLM extraction
        self.client = OpenAI(
            api_key=os.getenv('OPENAI_API_KEY'),
            base_url=os.getenv('OPENAI_BASE_URL', 'https://api.openai.com/v1')
        )
        self.model = os.getenv('GPT_MODEL', 'gpt-4o-mini')
        
        if self.connection_string:
            try:
                self.blob_service_client = BlobServiceClient.from_connection_string(
                    self.connection_string
                )
                # Ensure container exists
                self._ensure_container_exists()
            except Exception as e:
                logger.warning(f"Azure Blob Storage not initialized: {str(e)}")
                self.blob_service_client = None
        else:
            logger.warning("Azure Blob Storage connection string not found")
            self.blob_service_client = None
    
    def _ensure_container_exists(self):
        """Create container if it doesn't exist"""
        try:
            container_client = self.blob_service_client.get_container_client(
                self.container_name
            )
            if not container_client.exists():
                container_client.create_container()
                logger.info(f"Created Azure Blob container: {self.container_name}")
        except Exception as e:
            logger.error(f"Error creating container: {str(e)}")
    
    async def upload_image_to_azure(
        self,
        image_data: bytes,
        filename: str,
        content_type: str = 'image/jpeg'
    ) -> Optional[str]:
        """
        Upload image to Azure Blob Storage
        
        Args:
            image_data: Image binary data
            filename: Original filename
            content_type: MIME type of the image
        
        Returns:
            URL of the uploaded image or None if upload fails
        """
        if not self.blob_service_client:
            logger.error("Azure Blob Storage not configured")
            return None
        
        try:
            # Generate unique blob name
            file_extension = os.path.splitext(filename)[1] or '.jpg'
            blob_name = f"{uuid.uuid4()}{file_extension}"
            
            # Get blob client
            blob_client = self.blob_service_client.get_blob_client(
                container=self.container_name,
                blob=blob_name
            )
            
            # Upload with content type
            content_settings = ContentSettings(content_type=content_type)
            blob_client.upload_blob(
                image_data,
                overwrite=True,
                content_settings=content_settings
            )
            
            # Return the URL
            image_url = blob_client.url
            logger.info(f"Image uploaded successfully: {image_url}")
            
            return image_url
        
        except Exception as e:
            logger.error(f"Error uploading image to Azure: {str(e)}")
            return None
    
    def detect_category(self, title: str, description: str) -> str:
        """
        Detect issue category based on keywords in title and description
        
        Valid categories: cleanliness, infrastructure, safety, academic, hostel, transport, other
        """
        full_text = (title + " " + description).lower()
        
        # Category mapping with keywords
        category_keywords = {
            'cleanliness': ['dirty', 'clean', 'trash', 'garbage', 'dust', 'filthy', 'mess', 'hygiene'],
            'infrastructure': ['tap', 'leak', 'water', 'pipe', 'broken', 'repair', 'door', 'window', 'roof', 'wall', 'floor'],
            'safety': ['safety', 'accident', 'injury', 'dangerous', 'hazard', 'unsafe', 'emergency'],
            'academic': ['class', 'lab', 'study', 'exam', 'teacher', 'book', 'classroom', 'library'],
            'hostel': ['hostel', 'room', 'bed', 'dorm', 'accommodation', 'lodging'],
            'transport': ['transport', 'bus', 'vehicle', 'commute', 'travel', 'shuttle']
        }
        
        # Count keyword matches for each category
        scores = {}
        for category, keywords in category_keywords.items():
            score = sum(1 for kw in keywords if kw in full_text)
            scores[category] = score
        
        # Return category with highest score, default to 'other'
        if max(scores.values()) > 0:
            return max(scores, key=scores.get)
        return 'other'
    
    async def extract_with_llm(self, message: str) -> Dict[str, Any]:
        """
        Use LLM to intelligently extract title and description from user message
        
        Returns:
            {
                'title': 'extracted title',
                'description': 'extracted description',
                'is_valid': True/False,
                'message': 'error message if invalid'
            }
        """
        try:
            system_prompt = """You are an issue extraction assistant for a campus complaint system.
Extract the title and description from the user's message.
Rules:
- Title: A brief, concise summary (max 100 chars) of the issue
- Description: Detailed explanation of the problem, location, duration, impact, etc.

Return ONLY valid JSON in this format:
{
    "title": "issue title",
    "description": "detailed description"
}

If you cannot extract both, return:
{
    "error": "reason why extraction failed"
}"""

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Extract title and description:\n{message}"}
                ],
                temperature=0.3,
                max_tokens=500
            )
            
            response_text = response.choices[0].message.content.strip()
            logger.info(f"LLM extraction response: {response_text}")
            
            # Parse JSON response
            try:
                data = json.loads(response_text)
                
                if 'error' in data:
                    logger.warning(f"LLM extraction failed: {data['error']}")
                    return {
                        'title': None,
                        'description': None,
                        'is_valid': False,
                        'message': data['error']
                    }
                
                title = data.get('title', '').strip()
                description = data.get('description', '').strip()
                
                if title and description and len(title) > 2 and len(description) > 2:
                    return {
                        'title': title[:100],
                        'description': description,
                        'is_valid': True,
                        'message': 'Successfully extracted'
                    }
                else:
                    return {
                        'title': None,
                        'description': None,
                        'is_valid': False,
                        'message': 'Extracted data too short or invalid'
                    }
            except json.JSONDecodeError:
                logger.error(f"Failed to parse LLM response as JSON: {response_text}")
                return {
                    'title': None,
                    'description': None,
                    'is_valid': False,
                    'message': 'Failed to parse LLM response'
                }
        
        except Exception as e:
            logger.error(f"LLM extraction error: {str(e)}")
            return {
                'title': None,
                'description': None,
                'is_valid': False,
                'message': str(e)
            }
    
    async def extract_issue_details(self, message: str) -> Dict[str, Any]:
        """
        Extract title and description from user message using LLM
        Falls back to rule-based extraction if LLM fails
        
        Returns what details are provided and what's missing
        
        Handles multiple formats:
        - "title - X , description - Y"
        - Natural language descriptions
        - Multiple sentences
        """
        message = message.strip()
        
        # Check if this is just an intent to create issue
        intent_only_phrases = [
            'raise a complaint', 'raise an issue', 'file a complaint', 
            'report a problem', 'create issue', 'want to complain',
            'want to report', 'need to report', 'complain', 'complaint',
            'issue', 'problem', 'report'
        ]
        
        message_lower = message.lower()
        is_intent_only = any(phrase in message_lower for phrase in intent_only_phrases)
        
        # If only intent or too short, need title + description
        if is_intent_only or len(message.split()) < 5:
            return {
                'has_sufficient_details': False,
                'title': None,
                'description': None,
                'reason': 'needs_title_description',
                'what_needed': ['title', 'description'],
                'what_provided': []
            }
        
        # Try LLM extraction first
        logger.info(f"Using LLM to extract title and description from: {message}")
        llm_result = await self.extract_with_llm(message)
        
        if llm_result['is_valid']:
            logger.info(f"LLM extraction successful: title='{llm_result['title']}'")
            return {
                'has_sufficient_details': True,
                'title': llm_result['title'],
                'description': llm_result['description'],
                'reason': 'complete',
                'what_provided': ['title', 'description'],
                'what_needed': [],
                'extraction_method': 'llm'
            }
        
        logger.warning(f"LLM extraction failed, falling back to rule-based: {llm_result['message']}")
        
        # Fallback: Try to parse "title - X , description - Y" format
        if 'title' in message_lower and 'description' in message_lower:
            parts = message.split(',')
            if len(parts) >= 2:
                # Extract title part
                title_part = parts[0].strip()
                if title_part.lower().startswith('title'):
                    title = title_part.split('-', 1)[1].strip() if '-' in title_part else title_part
                else:
                    title = title_part
                
                # Extract description part
                description_part = ','.join(parts[1:]).strip()
                if description_part.lower().startswith('description'):
                    description = description_part.split('-', 1)[1].strip() if '-' in description_part else description_part
                else:
                    description = description_part
                
                # Validate we got both
                if title and description and len(title) > 2 and len(description) > 2:
                    return {
                        'has_sufficient_details': True,
                        'title': title[:100],
                        'description': description,
                        'reason': 'complete',
                        'what_provided': ['title', 'description'],
                        'what_needed': [],
                        'extraction_method': 'rule_based'
                    }
        
        # Fallback: Extract title and description using periods/sentences
        sentences = [s.strip() for s in message.split('.') if s.strip()]
        
        if len(sentences) >= 2:
            # Multiple sentences: first is title, rest is description
            title = sentences[0][:100]
            description = ' '.join(sentences[1:])
            has_description = True
        elif len(sentences) == 1:
            # Single sentence: check if it's detailed enough
            words = message.split()
            if len(words) > 15:
                # Long sentence: use first part as title, rest as description
                title = ' '.join(words[:8])
                description = message
                has_description = True
            else:
                # Short sentence: might be just title
                title = message
                description = None
                has_description = False
        else:
            title = message[:100]
            description = message
            has_description = True
        
        return {
            'has_sufficient_details': has_description,
            'title': title,
            'description': description,
            'reason': 'needs_description' if not has_description else 'complete',
            'what_provided': ['title'] + (['description'] if has_description else []),
            'what_needed': [] if has_description else ['description'],
            'extraction_method': 'sentence_based'
        }
    
    async def handle_issue(
        self,
        message: str,
        user_id: str,
        session_id: str,
        image_data: Optional[bytes] = None,
        image_filename: Optional[str] = None,
        image_content_type: Optional[str] = None,
        user_token: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Handle issue creation with conversational flow and duplicate detection
        
        Flow:
        1. Check if user provided sufficient details
        2. If not, ask for title and description
        3. Extract title and description
        4. Check for similar existing issues
        5. If similar issue found, upvote it instead of creating new one
        6. If no similar issue, upload image and create new issue
        
        Args:
            message: User's issue description
            user_id: User identifier
            session_id: Session identifier
            image_data: Optional image binary data
            image_filename: Optional original filename
            image_content_type: Optional MIME type
            user_token: Optional authentication token for upvoting
        
        Returns:
            Response with issue creation/upvote details or request for more info
        """
        try:
            # Extract and validate issue details using LLM
            details = await self.extract_issue_details(message)
            
            # If insufficient details, ask dynamically for what's missing
            if not details.get('has_sufficient_details'):
                reason = details.get('reason', 'needs_details')
                what_provided = details.get('what_provided', [])
                what_needed = details.get('what_needed', [])
                
                if reason == 'needs_title_description':
                    # No title or description yet
                    return {
                        'success': True,
                        'type': 'issue_collection',
                        'message': (
                            "📝 **Let's report this issue:**\n\n"
                            "Please provide:\n"
                            "1. **Title:** A brief summary (e.g., 'Tap leaking')\n"
                            "2. **Description:** What's the problem? Where? When? (e.g., '2nd floor washroom, leaking for 3 days')\n\n"
                            "Example: *'Tap leakage in washroom. The tap in the 2nd floor boys washroom has been leaking for 3 days causing water wastage.'\n\n"
                            "You can also attach an image using the 📷 button!"
                        ),
                        'metadata': {
                            'agent': 'IssueAgent',
                            'action': 'collect_details',
                            'awaiting': what_needed,
                            'provided': what_provided
                        }
                    }
                elif reason == 'needs_description':
                    # Has title, need description
                    return {
                        'success': True,
                        'type': 'issue_collection',
                        'message': (
                            f"📝 **Got the title!** '{details['title']}'\n\n"
                            "Now please provide more **details**:\n"
                            "- What exactly is the problem?\n"
                            "- Where is it located?\n"
                            "- Since when has it been happening?\n"
                            "- Any other relevant information?\n\n"
                            "Example: 'The tap in the 2nd floor boys washroom has been leaking for 3 days causing water wastage.'\n\n"
                            "You can also attach an image using the 📷 button!"
                        ),
                        'metadata': {
                            'agent': 'IssueAgent',
                            'action': 'collect_details',
                            'awaiting': what_needed,
                            'provided': what_provided,
                            'title': details['title']
                        }
                    }
            
            # Step 1: LLM decides which tools to use
            tool_decision = await self.tool_selector.select_issue_tools(message)
            logger.info(f"Tool decision for issue: {tool_decision}")
            
            # Step 2: Check for similar existing issues (always first tool)
            from mcp_tools.issue_tools import search_similar_issues, upvote_issue
            
            logger.info(f"Checking for similar issues: {details['title']}")
            
            similar_result = await search_similar_issues(
                title=details['title'],
                description=details['description'],
                category=None,
                similarity_threshold=0.6
            )
            
            # Step 3: If similar issue found, upvote it
            if similar_result.get('found') and similar_result.get('similar_issue'):
                similar_issue = similar_result['similar_issue']
                similarity_score = similar_result.get('similarity_score', 0)
                
                logger.info(
                    f"Similar issue found: {similar_issue.get('_id')} "
                    f"(similarity: {similarity_score:.2f})"
                )
                
                # Upvote the existing issue
                upvote_result = await upvote_issue(
                    issue_id=str(similar_issue.get('_id')),
                    user_id=user_id,
                    user_token=user_token
                )
                
                response_message = f"🔍 **Found Similar Issue!**\n\n"
                response_message += f"Your concern matches an existing issue:\n"
                response_message += f"📋 **Title:** {similar_issue.get('title')}\n"
                response_message += f"🆔 **Issue ID:** {similar_issue.get('_id')}\n"
                response_message += f"📊 **Status:** {similar_issue.get('status', 'open').replace('_', ' ').title()}\n"
                response_message += f"⚡ **Priority:** {tool_decision.get('priority', 'medium').upper()}\n"
                
                if upvote_result.get('success'):
                    response_message += f"\n✅ **Your upvote has been added!**\n"
                    response_message += f"👍 **Total Upvotes:** {upvote_result.get('upvote_count', 0)}\n"
                else:
                    response_message += f"\n⚠️ Note: {upvote_result.get('message')}\n"
                
                response_message += f"\nThe authorities are already aware of this issue and will resolve it soon."
                
                return {
                    'success': True,
                    'type': 'upvote',
                    'message': response_message,
                    'similar_issue': {
                        'id': str(similar_issue.get('_id')),
                        'title': similar_issue.get('title'),
                        'description': similar_issue.get('description'),
                        'status': similar_issue.get('status'),
                        'upvote_count': upvote_result.get('upvote_count', 0)
                    },
                    'metadata': {
                        'agent': 'IssueAgent',
                        'action': 'upvote_existing',
                        'similarity_score': similarity_score,
                        'priority': tool_decision.get('priority', 'medium'),
                        'tools_used': tool_decision.get('tools', []),
                        'upvoted': upvote_result.get('upvoted', False)
                    }
                }
            
            # Step 4: No similar issue found, create new one
            logger.info("No similar issue found, creating new issue")
            
            # Upload image if provided (Step 2 of tools)
            image_url = None
            if image_data and image_filename:
                image_url = await self.upload_image_to_azure(
                    image_data,
                    image_filename,
                    image_content_type or 'image/jpeg'
                )
                logger.info(f"Image uploaded: {image_url}")
            
            # Create issue via Node.js API (Step 3 of tools)
            import aiohttp
            
            # Detect category
            category = self.detect_category(details['title'], details['description'])
            
            node_api_url = os.getenv('NODE_API_URL', 'http://localhost:5000')
            create_issue_url = f"{node_api_url}/api/issues"
            
            issue_payload = {
                'userId': user_id,
                'title': details['title'],
                'description': details['description'],
                'category': category,
                'imageUrl': image_url
            }
            
            async with aiohttp.ClientSession() as session:
                headers = {}
                if user_token:
                    headers['Authorization'] = f'Bearer {user_token}'
                
                async with session.post(
                    create_issue_url,
                    json=issue_payload,
                    headers=headers
                ) as response:
                    if response.status == 201 or response.status == 200:
                        issue_data = await response.json()
                        issue = issue_data.get('complaint') or issue_data
                        issue_id = str(issue.get('_id'))
                        
                        response_message = f"✅ **Issue Created Successfully!**\n\n"
                        response_message += f"📋 **Title:** {details['title']}\n"
                        response_message += f"📝 **Description:** {details['description'][:100]}...\n"
                        response_message += f"📂 **Category:** {category.replace('_', ' ').title()}\n"
                        response_message += f"⚡ **Priority:** {tool_decision.get('priority', 'medium').upper()}\n"
                        
                        if image_url:
                            response_message += f"📷 **Image:** Attached\n"
                        
                        response_message += f"\n🆔 **Issue ID:** {issue_id}\n"
                        response_message += f"✨ Thank you for reporting! Our team will look into this soon."
                        
                        return {
                            'success': True,
                            'type': 'issue_created',
                            'message': response_message,
                            'issue': {
                                'id': issue_id,
                                'title': details['title'],
                                'category': category,
                                'image_url': image_url,
                                'status': 'open'
                            },
                            'metadata': {
                                'agent': 'IssueAgent',
                                'action': 'create_issue',
                                'category': category,
                                'priority': tool_decision.get('priority', 'medium'),
                                'tools_used': tool_decision.get('tools', []),
                                'tool_reasoning': tool_decision.get('reasoning', ''),
                                'image_uploaded': bool(image_url),
                                'issue_id': issue_id
                            }
                        }
                    else:
                        error_text = await response.text()
                        logger.error(f"Failed to create issue: {error_text}")
                        raise Exception(f"Failed to create issue: HTTP {response.status}")
        
        except Exception as e:
            logger.error(f"Issue agent error: {str(e)}")
            return {
                'success': False,
                'type': 'issue',
                'message': 'Failed to create issue. Please try again.',
                'error': str(e)
            }
