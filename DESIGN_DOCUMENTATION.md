# Vidvaan Application - Design Documentation

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Authentication Flow](#authentication-flow)
5. [API Routes & Database Operations](#api-routes--database-operations)
6. [Firebase Integration](#firebase-integration)
7. [Database Schema](#database-schema)
8. [Development Workflow](#development-workflow)
9. [Deployment Process](#deployment-process)
10. [Security Considerations](#security-considerations)

---

## Architecture Overview

### High-Level Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (Next.js)     │◄──►│   (API Routes)  │◄──►│   (PostgreSQL)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Firebase      │    │   Firebase      │    │   Cloud SQL     │
│   Auth          │    │   Admin SDK     │    │   (Google)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Key Components
- **Frontend**: Next.js 15 with App Router, TypeScript, Tailwind CSS
- **Authentication**: Firebase Authentication (Email/Password + Google)
- **Backend**: Next.js API Routes with Firebase Admin SDK
- **Database**: PostgreSQL on Google Cloud SQL
- **Hosting**: Firebase Hosting with Cloud Functions

---

## Technology Stack

### Frontend
- **Next.js 15.4.5**: React framework with App Router
- **TypeScript 5.9.2**: Type-safe JavaScript
- **Tailwind CSS 3.4.17**: Utility-first CSS framework
- **React 19.1.0**: UI library

### Backend & Services
- **Firebase Authentication**: User authentication
- **Firebase Admin SDK**: Server-side Firebase operations
- **PostgreSQL**: Primary database
- **pg (Node.js)**: PostgreSQL client

### Development Tools
- **ESLint**: Code linting
- **PostCSS**: CSS processing
- **Firebase CLI**: Deployment and emulator management

---

## Project Structure

```
vidvaan-test2/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API Routes (Backend)
│   │   │   ├── user/          # User-related APIs
│   │   │   │   ├── create/    # User creation
│   │   │   │   ├── quotas/    # User quotas
│   │   │   │   └── analysis-history/ # User analysis history
│   │   │   ├── evaluate-english-levels/ # English assessment
│   │   │   └── download-pdf/  # PDF download
│   │   ├── dashboard/         # Dashboard page
│   │   ├── login/            # Login page
│   │   ├── signup/           # Signup page
│   │   └── module/           # Learning modules
│   ├── components/           # Reusable React components
│   ├── contexts/             # React contexts (AuthContext)
│   ├── hooks/               # Custom React hooks
│   └── lib/                 # Utility libraries
│       ├── firebase.ts      # Client-side Firebase config
│       └── firebase-admin.ts # Server-side Firebase config
├── public/                  # Static assets
├── scripts/                # Utility scripts
└── migrations/             # Database migrations
```

---

## Authentication Flow

### 1. User Registration Flow
```
User → Signup Page → Firebase Auth → API Route → PostgreSQL
  ↓
Create User Record → Create Quota Record → Redirect to Dashboard
```

### 2. User Login Flow
```
User → Login Page → Firebase Auth → Verify Token → API Route
  ↓
Check User Exists → Return User Data → Redirect to Dashboard
```

### 3. Protected Route Flow
```
User → Protected Page → AuthContext → Check Firebase Token
  ↓
Valid Token → Allow Access | Invalid Token → Redirect to Login
```

### Key Files:
- `src/contexts/AuthContext.tsx`: Manages authentication state
- `src/lib/firebase.ts`: Client-side Firebase configuration
- `src/app/api/user/create/route.ts`: User creation API

---

## API Routes & Database Operations

### 1. User Management APIs

#### `/api/user/create` (POST)
**Purpose**: Create new user in PostgreSQL database
**Flow**:
1. Verify Firebase token
2. Extract user data (uid, email)
3. Check if user already exists
4. Create user record in PostgreSQL
5. Create default quota record

**Database Operations**:
```sql
-- Check existing user
SELECT id FROM users WHERE firebase_uid = $1

-- Create user
INSERT INTO users (firebase_uid, email, phone, created_at, updated_at)
VALUES ($1, $2, $3, NOW(), NOW())

-- Create quota
INSERT INTO user_quotas (user_id, user_email, english_analysis_quota, career_survey_quota, premium_modules_quota)
VALUES ($1, $2, 100, 5, 0)
```

#### `/api/user/quotas` (GET/POST)
**Purpose**: Manage user quotas
**Operations**:
- GET: Retrieve user's current quotas
- POST: Update user quotas (admin/purchase)

#### `/api/user/analysis-history` (GET)
**Purpose**: Get user's English analysis history
**Returns**: List of analysis requests with status and results

### 2. English Assessment APIs

#### `/api/evaluate-english-levels` (POST)
**Purpose**: Process English text analysis
**Flow**:
1. Verify user authentication
2. Check user quota
3. Process text analysis
4. Save request to database
5. Return assessment results

#### `/api/download-pdf/[requestId]` (GET)
**Purpose**: Generate download links for analysis PDFs
**Flow**:
1. Verify user owns the request
2. Check if analysis is complete
3. Return download URL

---

## Firebase Integration

### Client-Side Firebase (`src/lib/firebase.ts`)
```typescript
// Configuration using environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  // ... other config
};

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
```

### Server-Side Firebase (`src/lib/firebase-admin.ts`)
```typescript
// Centralized Firebase Admin initialization
if (!getApps().length) {
  firebaseApp = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY,
    })
  });
}

// Export auth instance with error handling
export function getFirebaseAuth() {
  return getAuth(firebaseApp);
}
```

### Key Benefits of Centralized Approach:
- **Single initialization point**: Prevents multiple app instances
- **Error handling**: Robust error management
- **Environment variables**: Secure configuration management
- **Reusability**: All API routes use the same instance

---

## Database Schema

### Core Tables

#### `users` Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  firebase_uid VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `user_quotas` Table
```sql
CREATE TABLE user_quotas (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(firebase_uid),
  user_email VARCHAR(255),
  english_analysis_quota INTEGER DEFAULT 100,
  career_survey_quota INTEGER DEFAULT 5,
  premium_modules_quota INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `english_analysis_requests` Table
```sql
CREATE TABLE english_analysis_requests (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(firebase_uid),
  user_email VARCHAR(255),
  input_text TEXT,
  request_id VARCHAR(255) UNIQUE,
  request_processed ENUM('yes', 'no', 'quota_exceeded', 'failed'),
  assessed_level VARCHAR(50),
  gcs_file_path VARCHAR(500),
  gcs_bucket VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,
  expires_at TIMESTAMP
);
```

---

## Development Workflow

### 1. Local Development Setup
```bash
# Install dependencies
npm install

# Set up environment variables
# Create .env.local with Firebase and database config

# Start development server
npm run dev

# Start Firebase emulators (optional)
npm run emulators:start
```

### 2. Code Organization Principles
- **Separation of Concerns**: API routes separate from UI components
- **Centralized Configuration**: Firebase config in dedicated files
- **Type Safety**: TypeScript for all components and APIs
- **Error Handling**: Consistent error handling across all routes

### 3. API Development Pattern
```typescript
// Standard API route pattern
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const authHeader = request.headers.get('authorization');
    const userId = await verifyToken(authHeader);
    
    // 2. Validate input
    const body = await request.json();
    
    // 3. Process business logic
    const result = await processData(userId, body);
    
    // 4. Return response
    return NextResponse.json(result);
  } catch (error) {
    // 5. Error handling
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
```

---

## Deployment Process

### 1. Pre-Deployment Checklist
- [ ] All tests pass
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Firebase configuration updated
- [ ] Build successful locally

### 2. Deployment Steps
```bash
# 1. Build the application
npm run build

# 2. Deploy to Firebase
firebase deploy

# 3. Verify deployment
# Check Firebase Console and test live application
```

### 3. Environment Configuration
- **Development**: `.env.local` file
- **Production**: Firebase Hosting environment variables
- **Database**: Google Cloud SQL connection

---

## Security Considerations

### 1. Authentication Security
- **Firebase Auth**: Industry-standard authentication
- **Token Verification**: All API routes verify Firebase tokens
- **Session Management**: Automatic token refresh

### 2. Database Security
- **Connection Security**: SSL connections to Cloud SQL
- **Query Parameterization**: All queries use parameterized statements
- **User Isolation**: Users can only access their own data

### 3. API Security
- **Input Validation**: All inputs validated before processing
- **Rate Limiting**: Consider implementing rate limiting
- **CORS**: Configured for specific origins

### 4. Environment Variables
- **Sensitive Data**: Never commit API keys or secrets
- **Environment Separation**: Different configs for dev/prod
- **Secret Rotation**: Regular rotation of Firebase service account keys

---

## Common Issues & Solutions

### 1. Firebase Admin SDK Issues
**Problem**: "The default Firebase app does not exist"
**Solution**: Use centralized Firebase admin configuration

### 2. Import Path Issues
**Problem**: Module resolution errors
**Solution**: Use relative paths or configure TypeScript paths

### 3. Database Connection Issues
**Problem**: Connection timeouts or authentication failures
**Solution**: Verify Cloud SQL configuration and credentials

### 4. Build Failures
**Problem**: TypeScript or dependency issues
**Solution**: Clear node_modules and reinstall dependencies

---

## Future Enhancements

### 1. Performance Optimizations
- Implement caching strategies
- Add database connection pooling
- Optimize API response times

### 2. Feature Additions
- Real-time notifications
- Advanced analytics dashboard
- Multi-language support

### 3. Monitoring & Logging
- Implement comprehensive logging
- Add performance monitoring
- Set up error tracking

---

This documentation provides a comprehensive overview of your application's architecture and should help you understand the codebase better. Feel free to ask questions about any specific part!
