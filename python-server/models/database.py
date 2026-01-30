from pymongo import MongoClient
from datetime import datetime
from typing import Optional
import os

client = MongoClient(os.getenv('MONGO_URI'))
db = client['campus_database']

# Collections
scholarships_collection = db['scholarships']
admissions_collection = db['admissions']
payments_collection = db['payments']

class ScholarshipModel:
    """
    Scholarship application model
    """
    @staticmethod
    def create_scholarship(data: dict) -> dict:
        """Create a new scholarship application"""
        scholarship = {
            'student_id': data.get('student_id'),
            'student_name': data.get('student_name'),
            'email': data.get('email'),
            'phone': data.get('phone'),
            'course': data.get('course'),
            'year': data.get('year'),
            'semester': data.get('semester'),
            'scholarship_type': data.get('scholarship_type'),
            'scholarship_name': data.get('scholarship_name'),
            'family_income': data.get('family_income'),
            'cgpa': data.get('cgpa'),
            'documents': data.get('documents', []),
            'reason': data.get('reason', ''),
            'status': 'pending',
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        result = scholarships_collection.insert_one(scholarship)
        scholarship['_id'] = str(result.inserted_id)
        return scholarship
    
    @staticmethod
    def get_scholarship(scholarship_id: str) -> Optional[dict]:
        """Get scholarship by ID"""
        scholarship = scholarships_collection.find_one({'_id': scholarship_id})
        if scholarship:
            scholarship['_id'] = str(scholarship['_id'])
        return scholarship
    
    @staticmethod
    def get_scholarships_by_student(student_id: str) -> list:
        """Get all scholarships for a student"""
        scholarships = scholarships_collection.find({'student_id': student_id})
        return [{**s, '_id': str(s['_id'])} for s in scholarships]
    
    @staticmethod
    def update_scholarship(scholarship_id: str, data: dict) -> bool:
        """Update scholarship application"""
        data['updated_at'] = datetime.utcnow()
        result = scholarships_collection.update_one(
            {'_id': scholarship_id},
            {'$set': data}
        )
        return result.modified_count > 0
    
    @staticmethod
    def delete_scholarship(scholarship_id: str) -> bool:
        """Delete scholarship application"""
        result = scholarships_collection.delete_one({'_id': scholarship_id})
        return result.deleted_count > 0
    
    @staticmethod
    def get_all_scholarships(filters: dict = None) -> list:
        """Get all scholarships with optional filters"""
        query = filters if filters else {}
        scholarships = scholarships_collection.find(query)
        return [{**s, '_id': str(s['_id'])} for s in scholarships]
    
    @staticmethod
    def find_by_status(status: str) -> list:
        """Find scholarships by status"""
        scholarships = scholarships_collection.find({'status': status})
        return [{**s, '_id': str(s['_id'])} for s in scholarships]
    
    @staticmethod
    def get_by_id(scholarship_id: str) -> Optional[dict]:
        """Get scholarship by ID (alias for get_scholarship)"""
        return ScholarshipModel.get_scholarship(scholarship_id)
    
    @staticmethod
    def update(scholarship_id: str, data: dict) -> bool:
        """Update scholarship (alias for update_scholarship)"""
        return ScholarshipModel.update_scholarship(scholarship_id, data)
    
    @staticmethod
    def get_all() -> list:
        """Get all scholarships"""
        return ScholarshipModel.get_all_scholarships()


class AdmissionModel:
    """
    Admission application model
    """
    @staticmethod
    def create_admission(data: dict) -> dict:
        """Create a new admission application"""
        admission = {
            'applicant_name': data.get('applicant_name'),
            'email': data.get('email'),
            'phone': data.get('phone'),
            'date_of_birth': data.get('date_of_birth'),
            'gender': data.get('gender'),
            'course': data.get('course'),
            'program_type': data.get('program_type'),  # UG/PG/PhD
            'entrance_exam': data.get('entrance_exam'),
            'entrance_score': data.get('entrance_score'),
            'previous_education': data.get('previous_education', {}),
            'address': data.get('address', {}),
            'documents': data.get('documents', []),
            'payment_status': 'pending',
            'payment_id': None,
            'application_status': 'pending',
            'application_number': f"APP{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        result = admissions_collection.insert_one(admission)
        admission['_id'] = str(result.inserted_id)
        return admission
    
    @staticmethod
    def get_admission(admission_id: str) -> Optional[dict]:
        """Get admission by ID"""
        admission = admissions_collection.find_one({'_id': admission_id})
        if admission:
            admission['_id'] = str(admission['_id'])
        return admission
    
    @staticmethod
    def get_admission_by_email(email: str) -> list:
        """Get all admissions for an email"""
        admissions = admissions_collection.find({'email': email})
        return [{**a, '_id': str(a['_id'])} for a in admissions]
    
    @staticmethod
    def update_admission(admission_id: str, data: dict) -> bool:
        """Update admission application"""
        data['updated_at'] = datetime.utcnow()
        result = admissions_collection.update_one(
            {'_id': admission_id},
            {'$set': data}
        )
        return result.modified_count > 0
    
    @staticmethod
    def cancel_admission(admission_id: str) -> bool:
        """Cancel admission application"""
        result = admissions_collection.update_one(
            {'_id': admission_id},
            {'$set': {
                'application_status': 'cancelled',
                'updated_at': datetime.utcnow()
            }}
        )
        return result.modified_count > 0
    
    @staticmethod
    def get_all_admissions(filters: dict = None) -> list:
        """Get all admissions with optional filters"""
        query = filters if filters else {}
        admissions = admissions_collection.find(query)
        return [{**a, '_id': str(a['_id'])} for a in admissions]
    
    @staticmethod
    def find_by_status(status: str) -> list:
        """Find admissions by status"""
        admissions = admissions_collection.find({'application_status': status})
        return [{**a, '_id': str(a['_id'])} for a in admissions]
    
    @staticmethod
    def get_by_id(admission_id: str) -> Optional[dict]:
        """Get admission by ID (alias for get_admission)"""
        return AdmissionModel.get_admission(admission_id)
    
    @staticmethod
    def update(admission_id: str, data: dict) -> bool:
        """Update admission (alias for update_admission)"""
        return AdmissionModel.update_admission(admission_id, data)
    
    @staticmethod
    def get_all() -> list:
        """Get all admissions"""
        return AdmissionModel.get_all_admissions()


class PaymentModel:
    """
    Payment tracking model
    """
    @staticmethod
    def create_payment(data: dict) -> dict:
        """Create a new payment record"""
        payment = {
            'transaction_id': f"TXN{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
            'admission_id': data.get('admission_id'),
            'amount': data.get('amount'),
            'payment_method': data.get('payment_method', 'mock'),
            'status': 'pending',
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        result = payments_collection.insert_one(payment)
        payment['_id'] = str(result.inserted_id)
        return payment
    
    @staticmethod
    def update_payment_status(payment_id: str, status: str) -> bool:
        """Update payment status"""
        result = payments_collection.update_one(
            {'_id': payment_id},
            {'$set': {
                'status': status,
                'updated_at': datetime.utcnow()
            }}
        )
        return result.modified_count > 0
    
    @staticmethod
    def get_payment(payment_id: str) -> Optional[dict]:
        """Get payment by ID"""
        payment = payments_collection.find_one({'_id': payment_id})
        if payment:
            payment['_id'] = str(payment['_id'])
        return payment
