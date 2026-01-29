import Complaint from '../models/Complaint.js';

// @desc    Create a new complaint/issue
// @route   POST /api/issues
// @access  Private (Student only)
export const createIssue = async (req, res) => {
  try {
    const { title, description, imageUrl, category } = req.body;

    // Validate input
    if (!title || !description) {
      return res.status(400).json({ 
        error: 'Title and description are required.' 
      });
    }

    // Create new complaint
    const complaint = new Complaint({
      title,
      description,
      imageUrl,
      category: category || 'other',
      createdBy: req.user._id
    });

    await complaint.save();

    // Populate creator details
    await complaint.populate('createdBy', 'name email');

    res.status(201).json({
      message: 'Issue created successfully',
      complaint
    });
  } catch (error) {
    console.error('Create issue error:', error);
    res.status(500).json({ 
      error: 'Failed to create issue. Please try again.' 
    });
  }
};

// @desc    Get all issues (for students - read-only)
// @route   GET /api/issues
// @access  Public (or could be Private)
export const getAllIssues = async (req, res) => {
  try {
    const { status, category, sortBy = 'upvoteCount' } = req.query;
    
    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;

    // Build sort
    let sort = {};
    if (sortBy === 'upvoteCount') {
      sort = { upvoteCount: -1, createdAt: -1 };
    } else if (sortBy === 'recent') {
      sort = { createdAt: -1 };
    } else {
      sort = { createdAt: -1 };
    }

    const complaints = await Complaint.find(filter)
      .populate('createdBy', 'name email')
      .sort(sort)
      .lean();

    res.json({
      count: complaints.length,
      complaints
    });
  } catch (error) {
    console.error('Get issues error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch issues.' 
    });
  }
};

// @desc    Get single issue by ID
// @route   GET /api/issues/:id
// @access  Public
export const getIssueById = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('upvotes', 'name email');

    if (!complaint) {
      return res.status(404).json({ 
        error: 'Issue not found.' 
      });
    }

    res.json({ complaint });
  } catch (error) {
    console.error('Get issue error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch issue.' 
    });
  }
};

// @desc    Toggle upvote on an issue
// @route   POST /api/issues/:id/upvote
// @access  Private (Student only)
export const toggleUpvote = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ 
        error: 'Issue not found.' 
      });
    }

    // Check if user is admin
    if (req.user.role === 'admin') {
      return res.status(403).json({ 
        error: 'Admins cannot upvote issues.' 
      });
    }

    const userId = req.user._id;
    const upvoteIndex = complaint.upvotes.indexOf(userId);

    if (upvoteIndex > -1) {
      // User already upvoted, remove upvote
      complaint.upvotes.splice(upvoteIndex, 1);
      await complaint.save();
      
      return res.json({
        message: 'Upvote removed',
        upvoted: false,
        upvoteCount: complaint.upvoteCount
      });
    } else {
      // Add upvote
      complaint.upvotes.push(userId);
      await complaint.save();
      
      return res.json({
        message: 'Issue upvoted',
        upvoted: true,
        upvoteCount: complaint.upvoteCount
      });
    }
  } catch (error) {
    console.error('Toggle upvote error:', error);
    res.status(500).json({ 
      error: 'Failed to toggle upvote.' 
    });
  }
};

// @desc    Get all issues (Admin view with more details)
// @route   GET /api/admin/issues
// @access  Private (Admin only)
export const getAdminIssues = async (req, res) => {
  try {
    const { status, category } = req.query;
    
    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;

    const complaints = await Complaint.find(filter)
      .populate('createdBy', 'name email')
      .populate('upvotes', 'name email')
      .sort({ upvoteCount: -1, createdAt: -1 });

    // Get statistics
    const stats = {
      total: complaints.length,
      open: complaints.filter(c => c.status === 'open').length,
      inProgress: complaints.filter(c => c.status === 'in_progress').length,
      resolved: complaints.filter(c => c.status === 'resolved').length
    };

    res.json({
      stats,
      complaints
    });
  } catch (error) {
    console.error('Get admin issues error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch issues.' 
    });
  }
};

// @desc    Update issue status
// @route   PATCH /api/admin/issues/:id/status
// @access  Private (Admin only)
export const updateIssueStatus = async (req, res) => {
  try {
    const { status } = req.body;

    // Validate status
    if (!status || !['open', 'in_progress', 'resolved'].includes(status)) {
      return res.status(400).json({ 
        error: 'Valid status is required (open, in_progress, or resolved).' 
      });
    }

    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ 
        error: 'Issue not found.' 
      });
    }

    complaint.status = status;
    complaint.updatedAt = Date.now();
    await complaint.save();

    await complaint.populate('createdBy', 'name email');

    res.json({
      message: 'Issue status updated successfully',
      complaint
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ 
      error: 'Failed to update issue status.' 
    });
  }
};
