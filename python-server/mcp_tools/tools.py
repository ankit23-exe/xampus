from typing import Dict, Any, Optional, List
from models.database import ScholarshipModel, AdmissionModel, PaymentModel
import uuid
import random


class ScholarshipMCPTools:
    """
    MCP Tools for Scholarship Agent
    Implements actions that can be used by ArmorIQ agents
    """
    
    @staticmethod
    def create_scholarship_application(params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Action: create_scholarship_application
        Description: Creates a new scholarship application in the database
        
        Parameters:
        - student_id: str (required)
        - student_name: str (required)
        - email: str (required)
        - phone: str (required)
        - course: str (required)
        - year: int (required)
        - semester: int (required)
        - scholarship_type: str (required) - e.g., 'merit', 'need-based', 'sports'
        - scholarship_name: str (required)
        - family_income: float (optional)
        - cgpa: float (optional)
        - reason: str (optional)
        - documents: list (optional)
        """
        from services.policy_enforcer import PolicyEnforcer
        
        try:
            # Validate required fields
            required = ['student_id', 'student_name', 'email', 'phone', 'course', 
                       'year', 'semester', 'scholarship_type', 'scholarship_name']
            
            for field in required:
                if field not in params or not params[field]:
                    return {
                        'success': False,
                        'error': f'Missing required field: {field}'
                    }
            
            # OLD CODE - Commented out (Policy enforcement from complex system)
            # existing_scholarships = ScholarshipModel.get_scholarships_by_student(params['student_id'])
            # user_confirmed = params.get('user_confirmed', False)
            # from services.policy_enforcer import PolicyEnforcer
            # policy_result = PolicyEnforcer.enforce_all_scholarship_policies(
            #     params,
            #     existing_scholarships,
            #     user_confirmed
            # )
            
            policy_result = {'blocked': False}  # Simplified - no policy checks
            
            if policy_result.get('blocked'):
                return {
                    'success': False,
                    'blocked': True,
                    'blocking_check': policy_result.get('blocking_check'),
                    'error': policy_result.get('message'),
                    'policy': policy_result.get('policy'),
                    'severity': policy_result.get('severity')
                }
            
            # Create scholarship
            scholarship = ScholarshipModel.create_scholarship(params)
            
            return {
                'success': True,
                'scholarship_id': scholarship['_id'],
                'application_number': scholarship.get('_id'),
                'status': scholarship['status'],
                'message': f"Scholarship application created successfully for {params['student_name']}"
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    @staticmethod
    def get_scholarship_status(params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Action: get_scholarship_status
        Description: Retrieves scholarship application status
        
        Parameters:
        - scholarship_id: str (optional)
        - student_id: str (optional)
        """
        try:
            if 'scholarship_id' in params:
                scholarship = ScholarshipModel.get_scholarship(params['scholarship_id'])
                if scholarship:
                    return {
                        'success': True,
                        'scholarship': scholarship
                    }
                return {
                    'success': False,
                    'error': 'Scholarship not found'
                }
            
            elif 'student_id' in params:
                scholarships = ScholarshipModel.get_scholarships_by_student(params['student_id'])
                return {
                    'success': True,
                    'scholarships': scholarships,
                    'count': len(scholarships)
                }
            
            return {
                'success': False,
                'error': 'Either scholarship_id or student_id is required'
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    @staticmethod
    def delete_scholarship_application(params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Action: delete_scholarship_application
        Description: Deletes a scholarship application
        
        Parameters:
        - scholarship_id: str (required)
        - student_id: str (required) - for verification
        """
        try:
            if 'scholarship_id' not in params:
                return {
                    'success': False,
                    'error': 'scholarship_id is required'
                }
            
            # Verify ownership
            scholarship = ScholarshipModel.get_scholarship(params['scholarship_id'])
            if not scholarship:
                return {
                    'success': False,
                    'error': 'Scholarship not found'
                }
            
            if 'student_id' in params and scholarship['student_id'] != params['student_id']:
                return {
                    'success': False,
                    'error': 'Unauthorized: You can only delete your own applications'
                }
            
            # Delete scholarship
            deleted = ScholarshipModel.delete_scholarship(params['scholarship_id'])
            
            if deleted:
                return {
                    'success': True,
                    'message': 'Scholarship application deleted successfully'
                }
            else:
                return {
                    'success': False,
                    'error': 'Failed to delete scholarship'
                }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    @staticmethod
    def update_scholarship_application(params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Action: update_scholarship_application
        Description: Updates an existing scholarship application
        
        Parameters:
        - scholarship_id: str (required)
        - student_id: str (required) - for verification
        - updates: dict (required) - fields to update
        """
        try:
            if 'scholarship_id' not in params:
                return {
                    'success': False,
                    'error': 'scholarship_id is required'
                }
            
            # Verify ownership
            scholarship = ScholarshipModel.get_scholarship(params['scholarship_id'])
            if not scholarship:
                return {
                    'success': False,
                    'error': 'Scholarship not found'
                }
            
            if 'student_id' in params and scholarship['student_id'] != params['student_id']:
                return {
                    'success': False,
                    'error': 'Unauthorized: You can only update your own applications'
                }
            
            updates = params.get('updates', {})
            if not updates:
                return {
                    'success': False,
                    'error': 'No updates provided'
                }
            
            # OLD CODE - Commented out (Policy enforcement from complex system)
            # from services.policy_enforcer import PolicyEnforcer
            # from datetime import datetime
            # deadline_check = PolicyEnforcer.check_scholarship_deadline()
            # if not deadline_check['allowed']:
            #     return {
            #         'success': False,
            #         'blocked': True,
            #         'error': deadline_check['message']
            #     }
            
            # Simplified - no deadline checks
            
            # Update scholarship
            updated = ScholarshipModel.update_scholarship(params['scholarship_id'], updates)
            
            if updated:
                return {
                    'success': True,
                    'message': 'Scholarship application updated successfully'
                }
            else:
                return {
                    'success': False,
                    'error': 'Failed to update scholarship'
                }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }


class AdmissionMCPTools:
    """
    MCP Tools for Admission Agent
    Implements actions for admission management
    """
    
    @staticmethod
    def create_admission_application(params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Action: create_admission_application
        Description: Creates a new admission application
        
        Parameters:
        - applicant_name: str (required)
        - email: str (required)
        - phone: str (required)
        - date_of_birth: str (required)
        - gender: str (required)
        - course: str (required)
        - program_type: str (required) - 'UG', 'PG', or 'PhD'
        - entrance_exam: str (optional)
        - entrance_score: float (optional)
        - previous_education: dict (optional)
        - address: dict (optional)
        - documents: list (optional)
        """
        # OLD CODE - Commented out (Policy enforcement from complex system)
        # from services.policy_enforcer import PolicyEnforcer
        
        try:
            # Validate required fields
            required = ['applicant_name', 'email', 'phone', 'date_of_birth', 
                       'gender', 'course', 'program_type']
            
            for field in required:
                if field not in params or not params[field]:
                    return {
                        'success': False,
                        'error': f'Missing required field: {field}'
                    }
            
            # OLD CODE - Commented out (Policy enforcement from complex system)
            # existing_admissions = AdmissionModel.get_admission_by_email(params['email'])
            # user_confirmed = params.get('user_confirmed', False)
            # policy_result = PolicyEnforcer.enforce_all_admission_policies(
            #     params,
            #     existing_admissions,
            #     user_confirmed
            # )
            
            policy_result = {'blocked': False}  # Simplified - no policy checks
            
            if policy_result.get('blocked'):
                return {
                    'success': False,
                    'blocked': True,
                    'blocking_check': policy_result.get('blocking_check'),
                    'error': policy_result.get('message'),
                    'policy': policy_result.get('policy'),
                    'severity': policy_result.get('severity')
                }
            
            # Create admission
            admission = AdmissionModel.create_admission(params)
            
            return {
                'success': True,
                'admission_id': admission['_id'],
                'application_number': admission['application_number'],
                'status': admission['application_status'],
                'message': f"Admission application created successfully for {params['applicant_name']}. Application Number: {admission['application_number']}"
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    @staticmethod
    def get_admission_status(params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Action: get_admission_status
        Description: Retrieves admission application status
        
        Parameters:
        - admission_id: str (optional)
        - email: str (optional)
        - application_number: str (optional)
        """
        try:
            if 'admission_id' in params:
                admission = AdmissionModel.get_admission(params['admission_id'])
                if admission:
                    return {
                        'success': True,
                        'admission': admission
                    }
                return {
                    'success': False,
                    'error': 'Admission not found'
                }
            
            elif 'email' in params:
                admissions = AdmissionModel.get_admission_by_email(params['email'])
                return {
                    'success': True,
                    'admissions': admissions,
                    'count': len(admissions)
                }
            
            return {
                'success': False,
                'error': 'Either admission_id or email is required'
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    @staticmethod
    def cancel_admission_application(params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Action: cancel_admission_application
        Description: Cancels an admission application
        
        Parameters:
        - admission_id: str (required)
        - email: str (required) - for verification
        """
        try:
            if 'admission_id' not in params:
                return {
                    'success': False,
                    'error': 'admission_id is required'
                }
            
            # Verify ownership
            admission = AdmissionModel.get_admission(params['admission_id'])
            if not admission:
                return {
                    'success': False,
                    'error': 'Admission not found'
                }
            
            if 'email' in params and admission['email'] != params['email']:
                return {
                    'success': False,
                    'error': 'Unauthorized: You can only cancel your own applications'
                }
            
            # Cancel admission
            cancelled = AdmissionModel.cancel_admission(params['admission_id'])
            
            if cancelled:
                return {
                    'success': True,
                    'message': 'Admission application cancelled successfully'
                }
            else:
                return {
                    'success': False,
                    'error': 'Failed to cancel admission'
                }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    @staticmethod
    def process_admission_payment(params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Action: process_admission_payment
        Description: Processes payment for admission application (Mock)
        
        Parameters:
        - admission_id: str (required)
        - amount: float (required)
        - payment_method: str (optional, default: 'mock')
        """
        try:
            if 'admission_id' not in params or 'amount' not in params:
                return {
                    'success': False,
                    'error': 'admission_id and amount are required'
                }
            
            # Verify admission exists
            admission = AdmissionModel.get_admission(params['admission_id'])
            if not admission:
                return {
                    'success': False,
                    'error': 'Admission not found'
                }
            
            # Create payment record
            payment = PaymentModel.create_payment({
                'admission_id': params['admission_id'],
                'amount': params['amount'],
                'payment_method': params.get('payment_method', 'mock')
            })
            
            # Simulate payment processing (mock)
            # In real scenario, integrate with payment gateway
            success = random.choice([True, True, True, False])  # 75% success rate
            
            if success:
                PaymentModel.update_payment_status(payment['_id'], 'completed')
                AdmissionModel.update_admission(params['admission_id'], {
                    'payment_status': 'completed',
                    'payment_id': payment['_id']
                })
                
                return {
                    'success': True,
                    'transaction_id': payment['transaction_id'],
                    'payment_status': 'completed',
                    'message': f"Payment of ₹{params['amount']} processed successfully"
                }
            else:
                PaymentModel.update_payment_status(payment['_id'], 'failed')
                
                return {
                    'success': False,
                    'transaction_id': payment['transaction_id'],
                    'payment_status': 'failed',
                    'error': 'Payment processing failed. Please try again.'
                }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }


# MCP Registry - Maps MCP names to tool classes
MCP_REGISTRY = {
    'scholarship-mcp': {
        'name': 'scholarship-mcp',
        'description': 'MCP for managing scholarship applications',
        'actions': {
            'create_scholarship_application': ScholarshipMCPTools.create_scholarship_application,
            'get_scholarship_status': ScholarshipMCPTools.get_scholarship_status,
            'delete_scholarship_application': ScholarshipMCPTools.delete_scholarship_application,
            'update_scholarship_application': ScholarshipMCPTools.update_scholarship_application,
        }
    },
    'admission-mcp': {
        'name': 'admission-mcp',
        'description': 'MCP for managing admission applications',
        'actions': {
            'create_admission_application': AdmissionMCPTools.create_admission_application,
            'get_admission_status': AdmissionMCPTools.get_admission_status,
            'cancel_admission_application': AdmissionMCPTools.cancel_admission_application,
            'process_admission_payment': AdmissionMCPTools.process_admission_payment,
        }
    },
    'issue-mcp': {
        'name': 'issue-mcp',
        'description': 'MCP for managing campus issues and duplicate detection',
        'actions': {
            'search_similar_issues': 'issue_tools.search_similar_issues',
            'upvote_issue': 'issue_tools.upvote_issue',
        }
    }
}


def execute_mcp_action(mcp_name: str, action_name: str, params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute an MCP action
    
    Args:
        mcp_name: Name of the MCP (e.g., 'scholarship-mcp')
        action_name: Name of the action to execute
        params: Parameters for the action
    
    Returns:
        Result dictionary from the action
    """
    if mcp_name not in MCP_REGISTRY:
        return {
            'success': False,
            'error': f'MCP not found: {mcp_name}'
        }
    
    mcp = MCP_REGISTRY[mcp_name]
    
    if action_name not in mcp['actions']:
        return {
            'success': False,
            'error': f'Action not found: {action_name} in MCP {mcp_name}'
        }
    
    action_func = mcp['actions'][action_name]
    return action_func(params)
