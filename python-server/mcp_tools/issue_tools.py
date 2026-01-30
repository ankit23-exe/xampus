"""
MCP Tools for Issue Duplicate Detection and Upvoting

These tools allow the AI agents to:
1. Search for similar existing issues
2. Upvote existing issues instead of creating duplicates
"""

import os
import requests
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

NODE_SERVER_URL = os.getenv('NODE_SERVER_URL', 'http://localhost:5000')


async def search_similar_issues(
    title: str,
    description: str,
    category: str = None,
    similarity_threshold: float = 0.6
) -> Dict[str, Any]:
    """
    Search for similar existing issues in the system
    
    Uses text similarity to find potential duplicate issues.
    Returns most similar issue if found.
    
    Args:
        title: Issue title
        description: Issue description
        category: Optional category filter
        similarity_threshold: Minimum similarity score (0-1)
    
    Returns:
        {
            'found': bool,
            'similar_issue': {...} or None,
            'similarity_score': float,
            'message': str
        }
    """
    try:
        # Get all open/in_progress issues
        params = {}
        if category:
            params['category'] = category
        
        response = requests.get(
            f"{NODE_SERVER_URL}/api/issues",
            params=params,
            timeout=10
        )
        
        if response.status_code != 200:
            return {
                'found': False,
                'similar_issue': None,
                'similarity_score': 0,
                'message': 'Failed to fetch existing issues'
            }
        
        data = response.json()
        existing_issues = data.get('complaints', [])
        
        if not existing_issues:
            return {
                'found': False,
                'similar_issue': None,
                'similarity_score': 0,
                'message': 'No existing issues found'
            }
        
        # Calculate similarity with each issue
        most_similar = None
        highest_similarity = 0
        
        search_text = f"{title} {description}".lower()
        
        for issue in existing_issues:
            # Skip resolved issues
            if issue.get('status') == 'resolved':
                continue
            
            issue_text = f"{issue.get('title', '')} {issue.get('description', '')}".lower()
            
            # Calculate similarity
            similarity = calculate_text_similarity(search_text, issue_text)
            
            if similarity > highest_similarity and similarity >= similarity_threshold:
                highest_similarity = similarity
                most_similar = issue
        
        if most_similar:
            return {
                'found': True,
                'similar_issue': most_similar,
                'similarity_score': highest_similarity,
                'message': f"Found similar issue: {most_similar.get('title')}"
            }
        else:
            return {
                'found': False,
                'similar_issue': None,
                'similarity_score': 0,
                'message': 'No similar issues found'
            }
    
    except Exception as e:
        logger.error(f"Error searching similar issues: {str(e)}")
        return {
            'found': False,
            'similar_issue': None,
            'similarity_score': 0,
            'message': f'Error: {str(e)}'
        }


async def upvote_issue(
    issue_id: str,
    user_id: str,
    user_token: str = None
) -> Dict[str, Any]:
    """
    Upvote an existing issue instead of creating a duplicate
    
    Args:
        issue_id: ID of the issue to upvote
        user_id: User ID who is upvoting
        user_token: Authentication token
    
    Returns:
        {
            'success': bool,
            'upvoted': bool,
            'upvote_count': int,
            'message': str
        }
    """
    try:
        headers = {}
        if user_token:
            headers['Authorization'] = f'Bearer {user_token}'
        
        response = requests.post(
            f"{NODE_SERVER_URL}/api/issues/{issue_id}/upvote",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            return {
                'success': True,
                'upvoted': data.get('upvoted', True),
                'upvote_count': data.get('upvoteCount', 0),
                'message': data.get('message', 'Issue upvoted successfully')
            }
        elif response.status_code == 404:
            return {
                'success': False,
                'upvoted': False,
                'upvote_count': 0,
                'message': 'Issue not found'
            }
        elif response.status_code == 403:
            return {
                'success': False,
                'upvoted': False,
                'upvote_count': 0,
                'message': 'Not authorized to upvote'
            }
        else:
            return {
                'success': False,
                'upvoted': False,
                'upvote_count': 0,
                'message': f'Failed to upvote: {response.status_code}'
            }
    
    except Exception as e:
        logger.error(f"Error upvoting issue: {str(e)}")
        return {
            'success': False,
            'upvoted': False,
            'upvote_count': 0,
            'message': f'Error: {str(e)}'
        }


def calculate_text_similarity(text1: str, text2: str) -> float:
    """
    Calculate similarity between two texts using Jaccard similarity
    
    Args:
        text1: First text
        text2: Second text
    
    Returns:
        Similarity score between 0 and 1
    """
    # Tokenize and filter short words
    words1 = set([w for w in text1.lower().split() if len(w) > 2])
    words2 = set([w for w in text2.lower().split() if len(w) > 2])
    
    if not words1 and not words2:
        return 1.0
    
    if not words1 or not words2:
        return 0.0
    
    # Calculate Jaccard similarity
    intersection = words1.intersection(words2)
    union = words1.union(words2)
    
    return len(intersection) / len(union) if union else 0.0


# MCP Tool Registry entries
ISSUE_TOOLS = {
    'search_similar_issues': {
        'function': search_similar_issues,
        'description': 'Search for similar existing issues to avoid duplicates',
        'parameters': {
            'title': 'Issue title',
            'description': 'Issue description',
            'category': 'Optional category filter',
            'similarity_threshold': 'Minimum similarity score (default 0.6)'
        }
    },
    'upvote_issue': {
        'function': upvote_issue,
        'description': 'Upvote an existing issue instead of creating duplicate',
        'parameters': {
            'issue_id': 'ID of the issue to upvote',
            'user_id': 'User ID who is upvoting',
            'user_token': 'Authentication token (optional)'
        }
    }
}
