import express from 'express';
import { verifyToken, isAdmin } from '../middleware/auth.js';
import axios from 'axios';

const router = express.Router();

const PYTHON_SERVER_URL = process.env.PYTHON_SERVER_URL || 'http://localhost:8001';

/**
 * @route   GET /api/admin/documents/pending
 * @desc    Get all documents pending verification
 * @access  Admin only
 */
router.get('/documents/pending', verifyToken, isAdmin, async (req, res) => {
    try {
        const response = await axios.get(`${PYTHON_SERVER_URL}/admin/documents/pending`);
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching pending documents:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch pending documents' 
        });
    }
});

/**
 * @route   GET /api/admin/documents/:applicationId
 * @desc    Get documents for specific application
 * @access  Admin only
 */
router.get('/documents/:applicationId', verifyToken, isAdmin, async (req, res) => {
    try {
        const { applicationId } = req.params;
        const response = await axios.get(`${PYTHON_SERVER_URL}/admin/documents/${applicationId}`);
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching application documents:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch application documents' 
        });
    }
});

/**
 * @route   POST /api/admin/documents/verify
 * @desc    Verify a document
 * @access  Admin only
 */
router.post('/documents/verify', verifyToken, isAdmin, async (req, res) => {
    try {
        const { applicationId, documentId, status, remarks } = req.body;
        
        if (!applicationId || !documentId || !status) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields: applicationId, documentId, status' 
            });
        }
        
        const response = await axios.post(`${PYTHON_SERVER_URL}/admin/documents/verify`, {
            applicationId,
            documentId,
            status, // 'verified', 'rejected', 'pending_resubmission'
            remarks,
            verifiedBy: req.user.id, // Admin who verified
            verifiedAt: new Date().toISOString()
        });
        
        res.json(response.data);
    } catch (error) {
        console.error('Error verifying document:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to verify document' 
        });
    }
});

/**
 * @route   POST /api/admin/documents/bulk-verify
 * @desc    Bulk verify multiple documents
 * @access  Admin only
 */
router.post('/documents/bulk-verify', verifyToken, isAdmin, async (req, res) => {
    try {
        const { verifications } = req.body;
        
        if (!verifications || !Array.isArray(verifications)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid bulk verification data' 
            });
        }
        
        const response = await axios.post(`${PYTHON_SERVER_URL}/admin/documents/bulk-verify`, {
            verifications,
            verifiedBy: req.user.id
        });
        
        res.json(response.data);
    } catch (error) {
        console.error('Error in bulk verification:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to perform bulk verification' 
        });
    }
});

/**
 * @route   GET /api/admin/scholarships/pending
 * @desc    Get all scholarships pending approval
 * @access  Admin only
 */
router.get('/scholarships/pending', verifyToken, isAdmin, async (req, res) => {
    try {
        const response = await axios.get(`${PYTHON_SERVER_URL}/admin/scholarships/pending`);
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching pending scholarships:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch pending scholarships' 
        });
    }
});

/**
 * @route   POST /api/admin/scholarships/approve
 * @desc    Approve/reject scholarship application
 * @access  Admin only
 */
router.post('/scholarships/approve', verifyToken, isAdmin, async (req, res) => {
    try {
        const { scholarshipId, status, remarks, amount } = req.body;
        
        if (!scholarshipId || !status) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields: scholarshipId, status' 
            });
        }
        
        const response = await axios.post(`${PYTHON_SERVER_URL}/admin/scholarships/approve`, {
            scholarshipId,
            status, // 'approved', 'rejected'
            remarks,
            amount,
            approvedBy: req.user.id,
            approvedAt: new Date().toISOString()
        });
        
        res.json(response.data);
    } catch (error) {
        console.error('Error approving scholarship:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to approve scholarship' 
        });
    }
});

/**
 * @route   GET /api/admin/admissions/pending
 * @desc    Get all admissions pending approval
 * @access  Admin only
 */
router.get('/admissions/pending', verifyToken, isAdmin, async (req, res) => {
    try {
        const response = await axios.get(`${PYTHON_SERVER_URL}/admin/admissions/pending`);
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching pending admissions:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch pending admissions' 
        });
    }
});

/**
 * @route   POST /api/admin/admissions/approve
 * @desc    Approve/reject admission application
 * @access  Admin only
 */
router.post('/admissions/approve', verifyToken, isAdmin, async (req, res) => {
    try {
        const { admissionId, status, remarks, enrollmentNumber } = req.body;
        
        if (!admissionId || !status) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields: admissionId, status' 
            });
        }
        
        const response = await axios.post(`${PYTHON_SERVER_URL}/admin/admissions/approve`, {
            admissionId,
            status, // 'approved', 'rejected', 'waitlisted'
            remarks,
            enrollmentNumber,
            approvedBy: req.user.id,
            approvedAt: new Date().toISOString()
        });
        
        res.json(response.data);
    } catch (error) {
        console.error('Error approving admission:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to approve admission' 
        });
    }
});

/**
 * @route   GET /api/admin/policy/violations
 * @desc    Get all policy violations (blocked attempts)
 * @access  Admin only
 */
router.get('/policy/violations', verifyToken, isAdmin, async (req, res) => {
    try {
        const response = await axios.get(`${PYTHON_SERVER_URL}/admin/policy/violations`);
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching policy violations:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch policy violations' 
        });
    }
});

/**
 * @route   GET /api/admin/stats
 * @desc    Get admin dashboard statistics
 * @access  Admin only
 */
router.get('/stats', verifyToken, isAdmin, async (req, res) => {
    try {
        const response = await axios.get(`${PYTHON_SERVER_URL}/admin/stats`);
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching admin stats:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch admin statistics' 
        });
    }
});

/**
 * @route   POST /api/admin/policy/update
 * @desc    Update policy settings (deadlines, limits, etc.)
 * @access  Admin only
 */
router.post('/policy/update', verifyToken, isAdmin, async (req, res) => {
    try {
        const { policyType, updates } = req.body;
        
        if (!policyType || !updates) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields: policyType, updates' 
            });
        }
        
        const response = await axios.post(`${PYTHON_SERVER_URL}/admin/policy/update`, {
            policyType,
            updates,
            updatedBy: req.user.id,
            updatedAt: new Date().toISOString()
        });
        
        res.json(response.data);
    } catch (error) {
        console.error('Error updating policy:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to update policy' 
        });
    }
});

export default router;
