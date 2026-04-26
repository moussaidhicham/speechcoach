# API Documentation

## Base URL

- Development: `http://localhost:8000`
- Production: `https://api.speechcoach.com`

## Authentication

Most endpoints require authentication via JWT token.

### Headers
```
Authorization: Bearer <token>
Content-Type: application/json
```

## Authentication Endpoints

### Login
```http
POST /auth/jwt/login
Content-Type: application/x-www-form-urlencoded

username=user@example.com&password=secret
```

**Response:**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer"
}
```

### Register
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password"
}
```

**Response:** `204 No Content`

### Verify Email
```http
POST /auth/verify
Content-Type: application/json

{
  "token": "verification_token"
}
```

**Response:**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "is_verified": true
  }
}
```

### Get Auth Status
```http
GET /auth/status
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "is_active": true,
  "is_verified": true,
  "is_superuser": false
}
```

### Reset Password
```http
POST /auth/reset-password
Content-Type: application/json

{
  "token": "reset_token",
  "password": "new_password"
}
```

**Response:** `204 No Content`

## API v1 Endpoints

### User Profile

#### Get Profile
```http
GET /api/v1/user/profile
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "John Doe",
  "preferred_language": "en",
  "preferred_device_type": "laptop_desktop",
  "experience_level": "beginner",
  "avatar_url": "/storage/avatars/uuid.jpg"
}
```

#### Update Profile
```http
PATCH /api/v1/user/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "full_name": "John Doe",
  "preferred_language": "en",
  "preferred_device_type": "laptop_desktop",
  "experience_level": "intermediate"
}
```

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "John Doe",
  "preferred_language": "en",
  "preferred_device_type": "laptop_desktop",
  "experience_level": "intermediate",
  "avatar_url": "/storage/avatars/uuid.jpg"
}
```

#### Upload Avatar
```http
POST /api/v1/user/avatar
Authorization: Bearer <token>
Content-Type: multipart/form-data

avatar=@avatar.jpg
```

**Response:**
```json
{
  "avatar_url": "/storage/avatars/uuid.jpg"
}
```

#### Delete Avatar
```http
DELETE /api/v1/user/avatar
Authorization: Bearer <token>
```

**Response:** `204 No Content`

#### Delete Account
```http
DELETE /api/v1/user/account
Authorization: Bearer <token>
```

**Response:** `204 No Content`

### Video Upload

#### Upload Video
```http
POST /api/v1/video/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file=@video.mp4
device_type=laptop_desktop
language=en
```

**Response:**
```json
{
  "session_id": "uuid"
}
```

### Session Tracking

#### Get Session Status
```http
GET /api/v1/tracker/status/{session_id}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "session_id": "uuid",
  "status": "processing",
  "progress": 50,
  "created_at": "2024-01-01T00:00:00Z",
  "video_url": "/storage/uploads/uuid/video.mp4"
}
```

**Status values:**
- `uploading`: Video is being uploaded
- `processing`: Analysis in progress
- `completed`: Analysis complete
- `failed`: Analysis failed

#### Get Session History
```http
GET /api/v1/tracker/history
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": "uuid",
    "title": "Presentation Practice",
    "created_at": "2024-01-01T00:00:00Z",
    "duration_seconds": 120,
    "language": "en",
    "overall_score": 75
  }
]
```

#### Get Dashboard Summary
```http
GET /api/v1/tracker/dashboard-summary
Authorization: Bearer <token>
```

**Response:**
```json
{
  "total_sessions": 10,
  "average_score": 75,
  "recent_sessions": [...],
  "strengths": ["Clear speech", "Good posture"],
  "weaknesses": ["Too fast", "Low eye contact"]
}
```

#### Get Session Result
```http
GET /api/v1/tracker/result/{session_id}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "session": {
    "id": "uuid",
    "title": "Presentation Practice",
    "created_at": "2024-01-01T00:00:00Z",
    "video_url": "/storage/uploads/uuid/video.mp4",
    "duration_seconds": 120,
    "language": "en"
  },
  "summary": {
    "overall_score": 75,
    "headline": "Good presentation with room for improvement",
    "narrative": "Your presentation shows...",
    "priority_focus": "Speaking pace",
    "encouragement": "Great job on posture!"
  },
  "scores": {
    "overall": 75,
    "voice": 7.5,
    "body_language": 8.0,
    "scene": 7.0,
    "presence": 7.2,
    "eye_contact": 65
  },
  "metrics": {
    "wpm": 145,
    "pause_count": 8,
    "filler_count": 5,
    "stutter_count": 2,
    "face_presence_ratio": 85,
    "eye_contact_ratio": 65,
    "hands_visibility_ratio": 70,
    "hands_activity_score": 5.5,
    "brightness": 180,
    "blur": 45
  },
  "strengths": ["Clear speech", "Good posture"],
  "weaknesses": ["Too fast", "Low eye contact"],
  "recommendations": [
    {
      "category": "Voice",
      "severity": "Warning",
      "message": "Speaking too fast",
      "tip": "Try to slow down to 120-140 WPM"
    }
  ],
  "transcript": [
    {
      "start": 0.0,
      "end": 2.5,
      "text": "Hello everyone, today I want to talk about..."
    }
  ]
}
```

#### Get Markdown Report
```http
GET /api/v1/tracker/report/{session_id}/markdown
Authorization: Bearer <token>
```

**Response:** `text/markdown`

#### Get PDF Report
```http
GET /api/v1/tracker/report/{session_id}/pdf
Authorization: Bearer <token>
```

**Response:** `application/pdf`

#### Get Print Report
```http
GET /api/v1/tracker/report/{session_id}/print
Authorization: Bearer <token>
```

**Response:** `text/html`

#### Delete Session
```http
DELETE /api/v1/tracker/session/{session_id}
Authorization: Bearer <token>
```

**Response:** `204 No Content`

#### Update Session
```http
PATCH /api/v1/tracker/session/{session_id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Title"
}
```

**Response:** `204 No Content`

### Platform Feedback

#### Submit Feedback
```http
POST /api/v1/feedback
Authorization: Bearer <token>
Content-Type: application/json

{
  "category": "feature",
  "message": "Add dark mode",
  "rating": 5
}
```

**Response:**
```json
{
  "id": "uuid",
  "category": "feature",
  "message": "Add dark mode",
  "rating": 5,
  "created_at": "2024-01-01T00:00:00Z"
}
```

#### Get Feedback Stats
```http
GET /api/v1/feedback/stats
Authorization: Bearer <token>
```

**Response:**
```json
{
  "total_feedback": 100,
  "average_rating": 4.5,
  "by_category": {
    "feature": 40,
    "bug": 30,
    "improvement": 30
  }
}
```

## Error Responses

All endpoints may return these error responses:

### 401 Unauthorized
```json
{
  "detail": "Not authenticated"
}
```

### 403 Forbidden
```json
{
  "detail": "Not enough permissions"
}
```

### 404 Not Found
```json
{
  "detail": "Resource not found"
}
```

### 422 Validation Error
```json
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

### 500 Internal Server Error
```json
{
  "detail": "Internal server error",
  "traceback": "..."
}
```

## Rate Limiting

- Auth endpoints: 10 requests/minute
- API endpoints: 100 requests/minute

## Pagination

For list endpoints, use query parameters:

```
GET /api/v1/tracker/history?page=1&limit=10
```

**Response:**
```json
{
  "items": [...],
  "total": 100,
  "page": 1,
  "limit": 10,
  "pages": 10
}
```

## Interactive API Documentation

Visit `/docs` for Swagger UI or `/redoc` for ReDoc.

## WebSocket (Future)

Real-time updates for session processing:

```javascript
const ws = new WebSocket('ws://localhost:8000/ws/sessions/{session_id}');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Status:', data.status);
};
```
