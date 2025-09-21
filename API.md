# API Documentation

Complete API reference for the Safe Communication Rewriter backend service.

## Base URL

```
Production: https://api.safe-rewriter.com
Staging: https://staging-api.safe-rewriter.com
Development: http://localhost:3001
```

## Authentication

Most endpoints require authentication via JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Rate Limiting

- **General API**: 10 requests per minute per IP
- **Rewrite Endpoint**: 5 requests per minute per IP
- **Analytics**: 10 requests per 5 minutes per user
- **Pattern Reports**: 3 reports per minute per IP

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 2024-01-15T10:30:00.000Z
```

## Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "details": "Additional error details (development only)"
  }
}
```

### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `AUTHENTICATION_REQUIRED` | 401 | Valid authentication required |
| `AUTHORIZATION_ERROR` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit exceeded |
| `AI_SERVICE_ERROR` | 502 | AI service unavailable |
| `DATABASE_SERVICE_ERROR` | 503 | Database service unavailable |
| `INTERNAL_ERROR` | 500 | Internal server error |

## Endpoints

### POST /api/rewrite

Rewrite a scam message using AI analysis.

**Request Body:**
```json
{
  "message": "string (required) - The suspicious message to analyze (1-1000 characters)",
  "region": "string (optional) - Region code (US, UK, CA, AU, IN, SG, DE, FR, ES, IT, JP, KR, BR, MX)",
  "userId": "string (optional) - User identifier for tracking"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "original_message": "Your UPI payment failed! Click here to get refund: http://refund-upi.com immediately",
    "safe_version": "Dear Customer, we noticed an issue with your recent UPI transaction of ₹XXXX. Please check your transaction status in the official bank app. For assistance, call our customer care at 1800-XXX-XXXX between 9 AM - 3 PM IST.",
    "differences": [
      {
        "aspect": "Links",
        "scam": "Contains suspicious link",
        "official": "No external links",
        "status": "✅ Fixed"
      },
      {
        "aspect": "Urgency",
        "scam": "Excessive urgency and pressure",
        "official": "Professional and calm tone",
        "status": "✅ Fixed"
      }
    ],
    "red_flags_fixed": 4,
    "tone_comparison": {
      "scam": "Urgent, Fearful, Demanding",
      "official": "Professional, Calm, Helpful"
    },
    "key_learning": "Official banks never send links for refunds. Always verify through official channels."
  },
  "cached": false,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Example Request:**
```bash
curl -X POST https://api.safe-rewriter.com/api/rewrite \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Your UPI payment failed! Click here to get refund: http://refund-upi.com immediately",
    "region": "IN"
  }'
```

### GET /api/health

Health check endpoint for monitoring.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "environment": "production",
  "services": {
    "database": "connected",
    "redis": "connected",
    "gemini": "available"
  }
}
```

### GET /api/analytics

Get usage analytics and statistics. Requires authentication.

**Query Parameters:**
- `startDate` (optional): Start date in ISO 8601 format
- `endDate` (optional): End date in ISO 8601 format
- `region` (optional): Filter by region code
- `userId` (optional): Filter by specific user

**Response:**
```json
{
  "success": true,
  "data": {
    "totalRewrites": 1250,
    "uniqueUsers": 89,
    "averageResponseTime": 1250,
    "cacheHitRate": 0.75,
    "topRegions": [
      {
        "region": "US",
        "count": 450
      },
      {
        "region": "IN",
        "count": 320
      }
    ],
    "dailyStats": [
      {
        "date": "2024-01-15",
        "count": 45
      },
      {
        "date": "2024-01-14",
        "count": 38
      }
    ],
    "patternTrends": [
      {
        "pattern": "phishing",
        "frequency": 120,
        "trend": "up"
      },
      {
        "pattern": "urgent_payment",
        "frequency": 85,
        "trend": "stable"
      }
    ]
  }
}
```

### GET /api/history

Get user's rewrite history. Requires authentication.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `sort` (optional): Sort field (default: created_at)
- `order` (optional): Sort order - asc or desc (default: desc)

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "507f1f77bcf86cd799439011",
        "original_message": "Your account will be closed! Click here immediately!",
        "safe_version": "Dear Customer, we want to inform you about your account status...",
        "region": "US",
        "created_at": "2024-01-15T10:30:00.000Z",
        "response_time": 1250,
        "cached": false,
        "red_flags_fixed": 3,
        "differences": [...]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "pages": 3,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### POST /api/patterns

Report a new scam pattern for learning.

**Request Body:**
```json
{
  "message": "string (required) - Example scam message",
  "category": "string (required) - Pattern category",
  "severity": "string (optional) - Severity level (low, medium, high, critical)"
}
```

**Categories:**
- `phishing` - Phishing attempts
- `urgent_payment` - Urgent payment requests
- `fake_links` - Suspicious links
- `personal_info` - Personal information requests
- `suspicious_attachments` - Suspicious file attachments
- `fake_authority` - Fake authority claims
- `too_good_to_be_true` - Too good to be true offers
- `pressure_tactics` - Pressure tactics
- `grammar_errors` - Grammar and spelling errors
- `suspicious_sender` - Suspicious sender information
- `other` - Other patterns

**Response:**
```json
{
  "success": true,
  "data": {
    "patternId": "507f1f77bcf86cd799439012",
    "message": "Pattern reported successfully"
  }
}
```

### GET /api/patterns/trending

Get trending scam patterns.

**Query Parameters:**
- `limit` (optional): Number of patterns to return (default: 10, max: 50)

**Response:**
```json
{
  "success": true,
  "data": {
    "patterns": [
      {
        "id": "507f1f77bcf86cd799439013",
        "category": "phishing",
        "frequency": 45,
        "severity": "high",
        "lastSeen": "2024-01-15T10:30:00.000Z",
        "examples": [
          "Your account will be closed!",
          "Verify your information now!"
        ]
      }
    ]
  }
}
```

## SDK Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');

const api = axios.create({
  baseURL: 'https://api.safe-rewriter.com',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-jwt-token'
  }
});

// Rewrite a message
async function rewriteMessage(message, region = 'US') {
  try {
    const response = await api.post('/api/rewrite', {
      message,
      region
    });
    return response.data;
  } catch (error) {
    console.error('Error:', error.response.data);
    throw error;
  }
}

// Get analytics
async function getAnalytics(startDate, endDate) {
  try {
    const response = await api.get('/api/analytics', {
      params: { startDate, endDate }
    });
    return response.data;
  } catch (error) {
    console.error('Error:', error.response.data);
    throw error;
  }
}
```

### Python

```python
import requests
import json

class SafeRewriterAPI:
    def __init__(self, base_url, api_key=None):
        self.base_url = base_url
        self.headers = {
            'Content-Type': 'application/json'
        }
        if api_key:
            self.headers['Authorization'] = f'Bearer {api_key}'
    
    def rewrite_message(self, message, region='US'):
        url = f"{self.base_url}/api/rewrite"
        data = {
            'message': message,
            'region': region
        }
        
        response = requests.post(url, headers=self.headers, json=data)
        response.raise_for_status()
        return response.json()
    
    def get_analytics(self, start_date=None, end_date=None):
        url = f"{self.base_url}/api/analytics"
        params = {}
        if start_date:
            params['startDate'] = start_date
        if end_date:
            params['endDate'] = end_date
        
        response = requests.get(url, headers=self.headers, params=params)
        response.raise_for_status()
        return response.json()

# Usage
api = SafeRewriterAPI('https://api.safe-rewriter.com', 'your-jwt-token')
result = api.rewrite_message('Your account will be closed! Click here!')
print(result)
```

### cURL Examples

```bash
# Rewrite a message
curl -X POST https://api.safe-rewriter.com/api/rewrite \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Your UPI payment failed! Click here to get refund: http://refund-upi.com immediately",
    "region": "IN"
  }'

# Get health status
curl https://api.safe-rewriter.com/api/health

# Get analytics (with authentication)
curl -X GET https://api.safe-rewriter.com/api/analytics \
  -H "Authorization: Bearer your-jwt-token"

# Report a pattern
curl -X POST https://api.safe-rewriter.com/api/patterns \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Your account will be closed! Click here immediately!",
    "category": "phishing",
    "severity": "high"
  }'
```

## Webhooks

### Event Types

The API supports webhooks for the following events:

- `rewrite.completed` - When a message rewrite is completed
- `pattern.reported` - When a new pattern is reported
- `user.created` - When a new user is created
- `error.occurred` - When an error occurs

### Webhook Payload

```json
{
  "event": "rewrite.completed",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "messageLength": 45,
    "region": "US",
    "responseTime": 1250,
    "redFlagsFixed": 3
  }
}
```

### Webhook Configuration

To configure webhooks, send a POST request to `/api/webhooks`:

```json
{
  "url": "https://your-app.com/webhook",
  "events": ["rewrite.completed", "pattern.reported"],
  "secret": "your-webhook-secret"
}
```

## Rate Limiting Details

### Rate Limit Headers

Every response includes rate limiting information:

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 1642248600
X-RateLimit-Window: 60
```

### Rate Limit Exceeded Response

When rate limit is exceeded:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests from this IP, please try again later",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "retryAfter": 60
  }
}
```

## Changelog

### Version 1.0.0
- Initial API release
- Basic rewrite functionality
- User authentication
- Analytics endpoints
- Pattern reporting

### Version 1.1.0
- Added webhook support
- Enhanced error handling
- Improved rate limiting
- Added caching headers

### Version 1.2.0
- Added batch operations
- Enhanced analytics
- Improved security
- Added health check endpoints

---

For more information, visit our [documentation site](https://docs.safe-rewriter.com) or contact support.
