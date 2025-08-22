# Application Workflow Diagrams

## 1. User Registration & Onboarding Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant FA as Firebase Auth
    participant API as API Routes
    participant DB as PostgreSQL

    U->>F: Visit Signup Page
    F->>U: Show Signup Form
    U->>F: Fill Form & Submit
    F->>FA: Create User Account
    FA->>F: Return User Credentials
    F->>API: POST /api/user/create
    API->>DB: Check if user exists
    API->>DB: Create user record
    API->>DB: Create quota record
    API->>F: Return success
    F->>U: Redirect to Dashboard
```

## 2. User Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant FA as Firebase Auth
    participant API as API Routes
    participant DB as PostgreSQL

    U->>F: Visit Login Page
    F->>U: Show Login Form
    U->>F: Enter Credentials
    F->>FA: Sign In
    FA->>F: Return Auth Token
    F->>API: GET /api/user/quotas
    API->>DB: Verify user & get quotas
    API->>F: Return user data
    F->>U: Redirect to Dashboard
```

## 3. English Assessment Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant API as API Routes
    participant DB as PostgreSQL
    participant AI as AI Service

    U->>F: Submit English Text
    F->>API: POST /api/evaluate-english-levels
    API->>DB: Check user quota
    alt Quota Available
        API->>DB: Decrement quota
        API->>DB: Save request
        API->>AI: Process text analysis
        AI->>API: Return assessment
        API->>DB: Update request status
        API->>F: Return results
        F->>U: Show assessment
    else Quota Exceeded
        API->>F: Return quota error
        F->>U: Show upgrade prompt
    end
```

## 4. PDF Download Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant API as API Routes
    participant DB as PostgreSQL
    participant GCS as Google Cloud Storage

    U->>F: Request PDF Download
    F->>API: GET /api/download-pdf/[requestId]
    API->>DB: Verify user ownership
    API->>DB: Check request status
    alt Request Complete
        API->>GCS: Generate signed URL
        GCS->>API: Return download URL
        API->>F: Return download link
        F->>U: Provide download
    else Request Pending
        API->>F: Return pending status
        F->>U: Show processing message
    end
```

## 5. System Architecture Flow

```mermaid
graph TB
    subgraph "Frontend Layer"
        A[Next.js App] --> B[React Components]
        B --> C[AuthContext]
        C --> D[Firebase Client SDK]
    end

    subgraph "Backend Layer"
        E[API Routes] --> F[Firebase Admin SDK]
        E --> G[PostgreSQL Client]
    end

    subgraph "External Services"
        H[Firebase Auth]
        I[Firebase Hosting]
        J[Cloud Functions]
        K[Google Cloud SQL]
        L[Google Cloud Storage]
    end

    A --> E
    D --> H
    E --> J
    G --> K
    E --> L
```

## 6. Error Handling Flow

```mermaid
flowchart TD
    A[API Request] --> B{Valid Token?}
    B -->|No| C[Return 401 Unauthorized]
    B -->|Yes| D{User Exists?}
    D -->|No| E[Return 404 User Not Found]
    D -->|Yes| F{Sufficient Quota?}
    F -->|No| G[Return 402 Quota Exceeded]
    F -->|Yes| H[Process Request]
    H --> I{Success?}
    I -->|No| J[Return 500 Server Error]
    I -->|Yes| K[Return Success Response]
```

## 7. Development Workflow

```mermaid
graph LR
    A[Local Development] --> B[Code Changes]
    B --> C[TypeScript Compilation]
    C --> D[ESLint Check]
    D --> E[Local Testing]
    E --> F[Build Test]
    F --> G[Deploy to Firebase]
    G --> H[Production Testing]
```

## Key Integration Points

### 1. Firebase Integration
- **Client-Side**: Authentication, real-time updates
- **Server-Side**: Token verification, admin operations
- **Hosting**: Static file serving, serverless functions

### 2. Database Integration
- **Connection Pooling**: Efficient database connections
- **Transaction Management**: Data consistency
- **Query Optimization**: Fast response times

### 3. Security Integration
- **Token Verification**: Every API request
- **User Isolation**: Data access control
- **Input Validation**: XSS and injection prevention

## Performance Considerations

### 1. Frontend Optimization
- **Code Splitting**: Lazy load components
- **Image Optimization**: Next.js Image component
- **Caching**: Browser and CDN caching

### 2. Backend Optimization
- **Database Indexing**: Fast query execution
- **Connection Pooling**: Reuse database connections
- **Response Caching**: Cache frequently accessed data

### 3. Deployment Optimization
- **Static Generation**: Pre-render static pages
- **Serverless Functions**: Scale automatically
- **CDN Distribution**: Global content delivery
