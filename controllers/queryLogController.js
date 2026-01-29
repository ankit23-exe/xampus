import QueryLog from '../models/QueryLog.js';
import { normalizeQuery, findSimilarQuery } from '../services/queryService.js';

// @desc    Log an unanswered query (called by chat controller)
// @route   Internal function (not a route)
// @access  Internal
export async function logUnansweredQuery(originalQuestion, userId) {
  try {
    // Normalize the question for admin-friendly view
    const normalizedQuestion = await normalizeQuery(originalQuestion);

    // Find existing unanswered queries
    const existingQueries = await QueryLog.find({ answered: false });

    // Check if similar query exists
    const similarQuery = findSimilarQuery(normalizedQuestion, existingQueries, 0.7);

    if (similarQuery) {
      // Update existing query
      if (!similarQuery.askedByUsers.includes(userId)) {
        similarQuery.askedByUsers.push(userId);
      }
      similarQuery.askCount += 1;
      similarQuery.lastAskedAt = Date.now();
      
      // Add to original questions array
      similarQuery.originalQuestions.push({
        question: originalQuestion,
        askedAt: Date.now()
      });

      await similarQuery.save();
      
      console.log(`Updated existing query log: ${similarQuery.normalizedQuestion}`);
      return similarQuery;
    } else {
      // Create new query log
      const newQuery = new QueryLog({
        originalQuestion,
        normalizedQuestion,
        answered: false,
        answerSource: 'none',
        askedByUsers: userId ? [userId] : [],
        askCount: 1,
        originalQuestions: [{
          question: originalQuestion,
          askedAt: Date.now()
        }],
        lastAskedAt: Date.now()
      });

      await newQuery.save();
      
      console.log(`Created new query log: ${newQuery.normalizedQuestion}`);
      return newQuery;
    }
  } catch (error) {
    console.error('Error logging unanswered query:', error);
    throw error;
  }
}

// @desc    Get all unanswered queries (Admin view)
// @route   GET /api/admin/unanswered-queries
// @access  Private (Admin only)
export const getUnansweredQueries = async (req, res) => {
  try {
    const { sortBy = 'askCount' } = req.query;

    // Build sort
    let sort = {};
    if (sortBy === 'askCount') {
      sort = { askCount: -1, lastAskedAt: -1 };
    } else if (sortBy === 'recent') {
      sort = { lastAskedAt: -1 };
    } else {
      sort = { askCount: -1 };
    }

    // Only fetch unanswered queries
    const queries = await QueryLog.find({ answered: false })
      .populate('askedByUsers', 'name email')
      .sort(sort)
      .lean();

    // Get statistics
    const stats = {
      totalUnanswered: queries.length,
      totalAskCount: queries.reduce((sum, q) => sum + q.askCount, 0),
      uniqueStudents: new Set(queries.flatMap(q => q.askedByUsers.map(u => u._id.toString()))).size
    };

    res.json({
      stats,
      queries
    });
  } catch (error) {
    console.error('Get unanswered queries error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch unanswered queries.' 
    });
  }
};

// @desc    Mark query as answered
// @route   PATCH /api/admin/queries/:id/resolve
// @access  Private (Admin only)
export const markQueryAsAnswered = async (req, res) => {
  try {
    const query = await QueryLog.findById(req.params.id);

    if (!query) {
      return res.status(404).json({ 
        error: 'Query not found.' 
      });
    }

    query.answered = true;
    query.answerSource = 'human';
    query.updatedAt = Date.now();
    await query.save();

    res.json({
      message: 'Query marked as answered successfully',
      query
    });
  } catch (error) {
    console.error('Mark query as answered error:', error);
    res.status(500).json({ 
      error: 'Failed to mark query as answered.' 
    });
  }
};

// @desc    Get single query details
// @route   GET /api/admin/queries/:id
// @access  Private (Admin only)
export const getQueryById = async (req, res) => {
  try {
    const query = await QueryLog.findById(req.params.id)
      .populate('askedByUsers', 'name email');

    if (!query) {
      return res.status(404).json({ 
        error: 'Query not found.' 
      });
    }

    res.json({ query });
  } catch (error) {
    console.error('Get query error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch query details.' 
    });
  }
};

// @desc    Delete a query log (Admin only, for cleanup)
// @route   DELETE /api/admin/queries/:id
// @access  Private (Admin only)
export const deleteQuery = async (req, res) => {
  try {
    const query = await QueryLog.findByIdAndDelete(req.params.id);

    if (!query) {
      return res.status(404).json({ 
        error: 'Query not found.' 
      });
    }

    res.json({
      message: 'Query deleted successfully'
    });
  } catch (error) {
    console.error('Delete query error:', error);
    res.status(500).json({ 
      error: 'Failed to delete query.' 
    });
  }
};

// @desc    Get all queries (including answered ones) for analytics
// @route   GET /api/admin/queries/all
// @access  Private (Admin only)
export const getAllQueries = async (req, res) => {
  try {
    const { answered } = req.query;
    
    const filter = {};
    if (answered !== undefined) {
      filter.answered = answered === 'true';
    }

    const queries = await QueryLog.find(filter)
      .populate('askedByUsers', 'name email')
      .sort({ askCount: -1, lastAskedAt: -1 })
      .lean();

    res.json({
      count: queries.length,
      queries
    });
  } catch (error) {
    console.error('Get all queries error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch queries.' 
    });
  }
};
