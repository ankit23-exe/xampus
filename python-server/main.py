from fastapi import FastAPI, HTTPException, Request, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
import logging
import os
from dotenv import load_dotenv
import uvicorn

# Load environment variables
load_dotenv()

# Import services and agents
from services.chat_service import get_chat_service
from services.armoriq_service import get_armoriq_service
from orchestrator import AIOrchestrator, get_agent_info
from mcp_tools.tools import execute_mcp_action, MCP_REGISTRY

# OLD CODE - Commented out (Part of complex scholarship/admission system)
# from admin_verification import router as admin_router, log_policy_violation

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Campus AI Assistant API",
    description="Python FastAPI server with ArmorIQ SDK for secure agent execution",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize orchestrator and agents
orchestrator = AIOrchestrator()

# OLD CODE - Commented out (Part of complex scholarship/admission system)
# app.include_router(admin_router)


# ============= Pydantic Models =============

class ChatRequest(BaseModel):
    question: str = Field(..., description="User's question")
    userId: Optional[str] = Field(None, description="User identifier")
    sessionId: Optional[str] = Field(None, description="Session identifier")
    userContext: Optional[Dict[str, Any]] = Field(None, description="Additional user context")


class ChatResponse(BaseModel):
    success: bool
    answer: Optional[str] = None
    sessionId: Optional[str] = None
    error: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class ScholarshipRequest(BaseModel):
    action: str = Field(..., description="Action to perform: create, check, delete, update")
    message: str = Field(..., description="User's message")
    userId: str = Field(..., description="Student ID")
    sessionId: Optional[str] = None
    scholarshipData: Optional[Dict[str, Any]] = Field(None, description="Scholarship data for creation")


class AdmissionRequest(BaseModel):
    action: str = Field(..., description="Action: create, check, cancel, payment")
    message: str = Field(..., description="User's message")
    userId: str = Field(..., description="User identifier (email)")
    sessionId: Optional[str] = None
    admissionData: Optional[Dict[str, Any]] = Field(None, description="Admission data for creation")


class MCPExecuteRequest(BaseModel):
    mcp: str = Field(..., description="MCP name")
    action: str = Field(..., description="Action name")
    params: Dict[str, Any] = Field(..., description="Action parameters")


# ============= API Routes =============

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "Campus AI Assistant",
        "version": "1.0.0",
        "armoriq_enabled": True
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "services": {
            "armoriq": "connected",
            "mongodb": "connected",
            "openai": "connected"
        }
    }


@app.post("/chat", response_model=ChatResponse)
async def chat(
    request: Request,
    question: str = Form(None),
    sessionId: Optional[str] = Form(None),
    userId: Optional[str] = Form(None),
    image: UploadFile = File(None)
):
    """
    SIMPLIFIED AI ORCHESTRATION WITH IMAGE SUPPORT & DUPLICATE DETECTION
    
    Supports both:
    - JSON requests (text-only queries)
    - multipart/form-data (queries with images)
    
    Flow:
    1. Classify intent (Query vs Issue)
    2. If image provided, route to IssueAgent
    3. IssueAgent checks for duplicates and upvotes if similar issue exists
    4. Otherwise route to QueryAgent (RAG) or IssueAgent based on keywords
    5. Return result
    """
    try:
        # Check if it's a JSON request
        content_type = request.headers.get('content-type', '')
        user_token = None
        
        if 'application/json' in content_type:
            # Handle JSON request
            body = await request.json()
            question = body.get('question')
            sessionId = body.get('sessionId')
            userId = body.get('userId')
            image = None
        
        # Extract auth token from headers
        auth_header = request.headers.get('authorization', '')
        if auth_header.startswith('Bearer '):
            user_token = auth_header.replace('Bearer ', '')
        
        if not question:
            return {
                'success': False,
                'error': 'Question is required',
                'answer': 'Please provide a message.'
            }
        
        logger.info(f"Chat request from user: {userId}, has_image: {image is not None}")
        
        # If image is provided, automatically route to issue agent
        if image:
            from agents.issue_agent import IssueAgent
            
            agent = IssueAgent()
            
            # Read image
            image_data = await image.read()
            image_filename = image.filename
            image_content_type = image.content_type
            
            # Handle issue with image (includes duplicate detection)
            result = await agent.handle_issue(
                message=question,
                user_id=userId or 'anonymous',
                session_id=sessionId or 'default',
                image_data=image_data,
                image_filename=image_filename,
                image_content_type=image_content_type,
                user_token=user_token
            )
            
            return {
                'success': result.get('success', True),
                'answer': result.get('message') or result.get('answer', 'Issue processed successfully!'),
                'sessionId': sessionId,
                'metadata': result.get('metadata', {})
            }
        else:
            # No image - use orchestrator for keyword-based routing
            result = await orchestrator.route_request(
                message=question,
                user_id=userId or 'anonymous',
                session_id=sessionId or 'default',
                user_token=user_token
            )
            
            # Return response
            return {
                'success': result.get('success', False),
                'answer': result.get('answer') or result.get('message'),
                'sessionId': sessionId,
                'metadata': result.get('metadata', {})
            }
    
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'answer': 'I encountered an error. Please try again.'
        }


@app.post("/issues/create")
async def create_issue_manual(
    title: str = Form(...),
    description: str = Form(...),
    userId: str = Form(...),
    category: str = Form('general'),
    priority: str = Form('medium'),
    image: UploadFile = File(None)
):
    """
    Create issue manually with optional image upload
    Supports form-data for file upload
    """
    try:
        from agents.issue_agent import IssueAgent
        
        agent = IssueAgent()
        
        # Read image if provided
        image_data = None
        image_filename = None
        image_content_type = None
        
        if image:
            image_data = await image.read()
            image_filename = image.filename
            image_content_type = image.content_type
        
        # Create issue message
        message = f"Title: {title}\n\nDescription: {description}"
        
        # Handle issue with agent
        result = await agent.handle_issue(
            message=message,
            user_id=userId,
            session_id=userId,
            image_data=image_data,
            image_filename=image_filename,
            image_content_type=image_content_type
        )
        
        return result
    
    except Exception as e:
        logger.error(f"Issue creation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/agents/info")
async def get_agents_info():
    """Get information about all registered agents"""
    from orchestrator import get_agent_info
    return get_agent_info()


@app.get("/agents/unanswered")
async def get_unanswered_queries():
    """Get unanswered queries - uses existing query normalization"""
    try:
        from models.database import db
        
        # Query for unanswered issues or queries
        complaints_collection = db['complaints']
        unanswered = list(complaints_collection.find({
            'status': {'$in': ['open', 'pending']},
            'responded': {'$ne': True}
        }).limit(50))
        
        return {
            'success': True,
            'count': len(unanswered),
            'queries': [{**q, '_id': str(q['_id'])} for q in unanswered]
        }
    
    except Exception as e:
        logger.error(f"Error fetching unanswered queries: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/agent/scholarship")
async def scholarship_agent_endpoint(request: ScholarshipRequest):
    """
    Scholarship agent endpoint
    Handles all scholarship-related operations
    """
    try:
        logger.info(f"Scholarship request: {request.action} from {request.userId}")
        
        # Prepare user context
        user_context = request.scholarshipData or {}
        if request.userId:
            user_context['student_id'] = request.userId
        
        # Handle request through agent
        result = await scholarship_agent.handle_query(
            message=request.message,
            user_id=request.userId,
            session_id=request.sessionId or request.userId,
            user_context=user_context
        )
        
        return result
    
    except Exception as e:
        logger.error(f"Error in scholarship agent: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/agent/admission")
async def admission_agent_endpoint(request: AdmissionRequest):
    """
    Admission agent endpoint
    Handles all admission-related operations including payments
    """
    try:
        logger.info(f"Admission request: {request.action} from {request.userId}")
        
        # Prepare user context
        user_context = request.admissionData or {}
        if request.userId:
            user_context['email'] = request.userId
        
        # Handle request through agent
        result = await admission_agent.handle_query(
            message=request.message,
            user_id=request.userId,
            session_id=request.sessionId or request.userId,
            user_context=user_context
        )
        
        return result
    
    except Exception as e:
        logger.error(f"Error in admission agent: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/mcp/execute")
async def execute_mcp(request: MCPExecuteRequest):
    """
    Direct MCP action execution endpoint
    For testing and debugging
    """
    try:
        logger.info(f"Executing MCP action: {request.mcp}.{request.action}")
        
        result = execute_mcp_action(
            mcp_name=request.mcp,
            action_name=request.action,
            params=request.params
        )
        
        return result
    
    except Exception as e:
        logger.error(f"Error executing MCP action: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/mcp/registry")
async def get_mcp_registry():
    """
    Get available MCPs and their actions
    """
    registry_info = {}
    
    for mcp_name, mcp_data in MCP_REGISTRY.items():
        registry_info[mcp_name] = {
            'name': mcp_data['name'],
            'description': mcp_data['description'],
            'actions': list(mcp_data['actions'].keys())
        }
    
    return {
        'success': True,
        'mcps': registry_info,
        'count': len(registry_info)
    }


@app.post("/armoriq/validate")
async def validate_intent(request: Dict[str, Any]):
    """
    Validate user intent using ArmorIQ guardrails
    """
    try:
        prompt = request.get('prompt', '')
        intent_type = request.get('intent_type', 'general_query')
        
        armoriq = get_armoriq_service()
        result = armoriq.validate_intent(prompt, intent_type)
        
        return result
    
    except Exception as e:
        logger.error(f"Error validating intent: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/scholarships/{student_id}")
async def get_student_scholarships(student_id: str):
    """Get all scholarships for a student"""
    try:
        result = execute_mcp_action(
            'scholarship-mcp',
            'get_scholarship_status',
            {'student_id': student_id}
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/admissions/{email}")
async def get_user_admissions(email: str):
    """Get all admissions for an email"""
    try:
        result = execute_mcp_action(
            'admission-mcp',
            'get_admission_status',
            {'email': email}
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============= Error Handlers =============

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {str(exc)}")
    return {
        "success": False,
        "error": "Internal server error",
        "detail": str(exc)
    }


# ============= Startup/Shutdown Events =============

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    logger.info("Starting Campus AI Assistant API...")
    logger.info("ArmorIQ SDK initialized")
    logger.info("Agents initialized: Query (RAG), Issue (with duplicate detection)")
    logger.info(f"MCP Registry loaded: {len(MCP_REGISTRY)} MCPs")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down Campus AI Assistant API...")


# ============= Main =============

if __name__ == "__main__":
    port = int(os.getenv("PYTHON_SERVER_PORT", 8001))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )
