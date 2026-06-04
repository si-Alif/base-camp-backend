# Project Camp Backend

Project Camp is a Node.js and MongoDB REST API for collaborative project management. It enables teams to organize projects, manage hierarchical tasks with subtasks, maintain project notes, and handle user authentication with role-based access control. This project was built to learn production-grade patterns: request handling, validation, persistence, authentication, authorization, email workflows, and graceful error handling.

## What I Learned While Building It

- How to structure a Node.js API with clear separation between `src/` handlers and reusable utilities.
- How to return consistent JSON envelopes for success and error responses with standardized status codes.
- How to validate input payloads with `express-validator`, rejecting malformed data before database operations.
- How to implement async request handlers with try-catch and a custom error propagation pattern (`asyncHandler`).
- How to hash passwords with bcrypt and implement JWT-based authentication with access and refresh tokens.
- How to build token scopes (email verification vs. authentication) within a shared token infrastructure.
- How to send transactional emails in the background without blocking HTTP responses (email verification, password resets).
- How to layer middleware: validation → authentication → authorization (role-based permission checks).
- How to structure role-based access control (admin, project_admin, member) with permission matrices.
- How to organize MongoDB schemas with indexes, unique constraints, and lean queries for performance.

---

## System Architecture

```mermaid
flowchart LR
    C[Client/Browser] --> API[REST API<br/>src/server.js]

    API --> PIPE[Request Pipeline]
    PIPE --> VALIDATE[Input Validation<br/>express-validator]
    VALIDATE --> AUTH[Authenticate<br/>JWT Bearer token]
    AUTH --> AUTHZ[Authorization<br/>Role-based checks]

    AUTHZ --> ROUTER[Router<br/>Express]
    ROUTER --> HANDLERS[Handlers<br/>auth, projects, tasks,<br/>notes, members]

    HANDLERS --> MODELS[Data Models<br/>src/models]
    MODELS --> DB[(MongoDB<br/>users, projects, tasks,<br/>subtasks, notes,<br/>permissions)]

    HANDLERS --> MAILER[Mailer<br/>src/utils/mail]
    MAILER --> SMTP[SMTP Server<br/>Transactional emails]

    HANDLERS --> RESPONSE[Response Handler<br/>Standardized JSON]
```

---

## End-to-End Flows

### User Registration & Email Verification

```mermaid
sequenceDiagram
    participant User
    participant API as API
    participant DB as MongoDB
    participant Mail as Mailer
    participant SMTP as SMTP Server

    User->>API: POST /api/v1/auth/register<br/>(email, username, password, role)
    API->>API: Validate input
    API->>DB: Check if user exists
    DB-->>API: Not found
    API->>API: Hash password
    API->>DB: Create user (is_email_verified: false)
    DB-->>API: user_id returned
    API->>API: Generate email verification token
    API->>DB: Save hashed token + expiry
    API->>Mail: Queue email (async)
    Mail->>SMTP: Send verification email
    SMTP-->>Mail: Sent
    API-->>User: HTTP 200 + verification email sent

    Note over User: User receives email<br/>with verification link

    User->>API: GET /api/v1/auth/verify-email/:token
    API->>DB: Find user by hashed token
    DB-->>API: User + verify token validity
    API->>DB: Set is_email_verified: true
    API->>DB: Clear verification token
    DB-->>API: OK
    API-->>User: HTTP 200 + email verified
```

### User Login & Token Generation

```mermaid
sequenceDiagram
    participant User
    participant API as API
    participant DB as MongoDB
    participant JWT as JWT Engine

    User->>API: POST /api/v1/auth/login<br/>(email, password)
    API->>API: Validate input
    API->>DB: GetUserByEmail(email)
    DB-->>API: user + password_hash
    API->>API: Compare password hash
    API->>JWT: Sign access token (15m TTL)
    API->>JWT: Sign refresh token (7d TTL)
    API->>DB: Save refresh_token
    DB-->>API: OK
    API-->>User: HTTP 200 + access_token + refresh_token

    Note over User: User now has JWT

    User->>API: GET /api/v1/auth/get-current-user<br/>Authorization: Bearer {access_token}
    API->>API: Extract + verify token
    API->>DB: GetUserById(decoded._id)
    DB-->>API: user
    API-->>User: HTTP 200 + current user
```

### Project & Task CRUD with Role Checks

```mermaid
sequenceDiagram
    participant User
    participant API as API
    participant AUTH as Auth Check
    participant AUTHZ as AuthZ Check
    participant DB as MongoDB

    User->>API: POST /api/v1/projects<br/>Authorization: Bearer {token}<br/>(name, description)
    API->>AUTH: Extract + verify JWT
    AUTH->>DB: GetUserViaToken(token)
    DB-->>AUTH: user
    AUTH->>API: OK, user attached to req

    API->>AUTHZ: Check user.role === admin
    AUTHZ-->>API: Permission granted

    API->>API: Validate input
    API->>DB: Create project<br/>{ owner: user._id, members: [user._id] }
    DB-->>API: project
    API-->>User: HTTP 201 + project

    Note over User: User is now project owner

    User->>API: POST /api/v1/projects/:projectId/members<br/>(userId, role)
    API->>AUTH: Verify JWT
    AUTH-->>API: OK
    API->>AUTHZ: Check user is admin OR<br/>project_admin in this project
    AUTHZ-->>API: Permission granted
    API->>DB: Add member to project
    DB-->>API: OK
    API-->>User: HTTP 200 + member added
```

---

## Why I Built This

I wanted to move beyond toy examples and learn how a production-grade Node.js API handles real concerns:

- **Request validation pipeline** – Malformed input should fail fast with precise error messages before touching the database.
- **Authentication vs. authorization** – Tokens prove who you are; roles define what you can do. They are not the same thing.
- **Token scopes & reusability** – Same JWT infrastructure for different purposes (email verification, authentication) using scopes.
- **Async workflows** – Sending verification emails in the background without blocking responses or losing reliability.
- **Password security** – Hashing with bcrypt and secure reset token flows.
- **Role-based access control** – Three-tier permissions (admin, project_admin, member) with granular feature access.
- **Consistent error handling** – Standardized JSON error responses with status codes and nested error details.
- **Database indexing & queries** – Lean queries, unique constraints, and indexes for query performance on nested data.

The goal was not to ship a product but to understand the architectural decisions that matter in a production system.

---

## Engineering Decisions

| Problem                                                        | Decision                                                                     | Why It Matters                                                                                                                   |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Passwords leak in responses                                    | Hash passwords with bcrypt; never store/return plaintext                     | Security baseline. Hash cost can be tuned as hardware improves.                                                                  |
| Frontend doesn't know which fields failed validation           | Array of field-level errors in response: `[{ email: "Invalid email" }, ...]` | Better UX. Client can highlight failed fields precisely.                                                                         |
| Access tokens expire but user is still logged in               | Separate access (15m) and refresh (7d) tokens                                | Access tokens are short-lived, reducing window if stolen. Refresh tokens are long-lived but less exposed (not in every request). |
| Email verification tokens and auth tokens collide semantically | Token scopes: `is_email_verified` vs. `is_authentication`                    | Same DB schema, different semantics. Prevents accidental cross-token usage.                                                      |
| Role-based checks are scattered across handlers                | Centralized enum constants (`UserRoleEnums`) and permission middleware       | Single source of truth. Easy to audit permissions.                                                                               |
| Sending emails blocks the HTTP response                        | Async email queuing (nodemailer background)                                  | User gets response instantly. Email failures don't cascade to API.                                                               |
| Database connection fails but server starts anyway             | Synchronous DB connect before listen                                         | Fail fast. No 500 errors on first request if DB is down.                                                                         |
| No way to tell what routes are protected                       | Explicit `verify_jwt` middleware in route definitions                        | Visible in code review. Middleware layer separates concerns.                                                                     |
| Database queries return all fields unnecessarily               | `.select("-password -tokens ...")` to exclude sensitive fields               | Smaller response payloads. Prevents accidental leaks.                                                                            |

---

## Tech Stack

- **Node.js 18+** – Async event-driven runtime; fast development and deployment.
- **Express 5.x** – Minimal web framework; explicit middleware composition.
- **MongoDB + Mongoose** – Document database with schema validation, indexes, and hooks.
- **JWT (jsonwebtoken)** – Stateless authentication tokens with expiry and scopes.
- **bcrypt** – Password hashing with configurable cost factor.
- **nodemailer + mailgen** – SMTP client and HTML email template generation.
- **express-validator** – Declarative input validation chaining.
- **dotenv** – Environment variable management.
- **cookie-parser** – Automatic cookie parsing middleware.
- **cors** – Cross-origin request handling.
- **nodemon** – Development hot-reload.

---

## Project Layout

| Path              | Purpose                                                               |
| ----------------- | --------------------------------------------------------------------- |
| `src/server.js`   | Application entry point, DB connection, and server startup            |
| `src/app.js`      | Express app setup: middleware, CORS, routes                           |
| `src/routes/`     | Route definitions with validation and auth middleware chains          |
| `src/controller/` | HTTP handlers: validate, call models, format responses                |
| `src/models/`     | Mongoose schemas with hooks, indexes, and custom methods              |
| `src/middleware/` | Reusable middleware: JWT verification, validation error handling      |
| `src/utils/`      | Helpers: API response/error classes, async handlers, email, constants |
| `src/validator/`  | Declarative validation rules using express-validator chains           |
| `src/db/`         | MongoDB connection and initialization                                 |
| `public/`         | Static assets (uploaded images, avatars)                              |
| `.env.example`    | Environment variable template                                         |

---

## Database Schema

### Users Collection

- `_id` – MongoDB ObjectId
- `email` – Unique, lowercase, indexed for fast login lookups
- `username` – Unique, lowercase, indexed
- `password` – Bcrypt hash (never returned in API)
- `full_name`, `last_name` – Optional profile fields
- `avatar` – Object with `url` and `localPath` for profile pictures
- `role` – Enum: `admin`, `project_admin`, `member`
- `is_email_verified` – Boolean; gates login if false
- `email_verification_token` – Hashed temporary token
- `email_verification_token_expiry` – Timestamp
- `forgot_password_token` – Hashed reset token
- `refresh_token` – Current JWT refresh token
- `created_at`, `updated_at` – Timestamps

### Projects Collection _(planned)_

- `_id` – MongoDB ObjectId
- `name`, `description` – Project metadata
- `owner` – Reference to User.\_id
- `members` – Array of `{ userId, role }` (admin/project_admin/member)
- `tasks` – Array of Task.\_id references
- `notes` – Array of Note.\_id references
- `created_at`, `updated_at` – Timestamps

### Tasks Collection _(planned)_

- `_id` – MongoDB ObjectId
- `projectId` – Reference to Project.\_id
- `title`, `description` – Task content
- `status` – Enum: `todo`, `in_progress`, `completed`
- `assignee` – Reference to User.\_id (nullable)
- `subtasks` – Array of Subtask.\_id references
- `attachments` – Array of `{ url, mime_type, size }`
- `created_at`, `updated_at` – Timestamps

### Subtasks Collection _(planned)_

- `_id` – MongoDB ObjectId
- `taskId` – Reference to Task.\_id
- `title` – Subtask description
- `is_completed` – Boolean
- `completed_by` – Reference to User.\_id (nullable)

### Notes Collection _(planned)_

- `_id` – MongoDB ObjectId
- `projectId` – Reference to Project.\_id
- `content` – Note text (markdown supported)
- `author` – Reference to User.\_id
- `created_at`, `updated_at` – Timestamps

---

## API Endpoints

All routes prefix: `/api/v1`

### Auth Routes `/auth/` _(implemented)_

| Method | Route                           | Auth | Body                              | Response                      |
| ------ | ------------------------------- | ---- | --------------------------------- | ----------------------------- |
| POST   | `/register`                     | ✗    | `email, username, password, role` | `HTTP 200 + user`             |
| POST   | `/login`                        | ✗    | `email, password`                 | `HTTP 200 + tokens`           |
| GET    | `/verify-email/:token`          | ✗    | (none)                            | `HTTP 200 + verified user`    |
| POST   | `/forgot-password-request`      | ✗    | `email`                           | `HTTP 200 + reset email sent` |
| POST   | `/forgot-password-reset/:token` | ✗    | `new_password`                    | `HTTP 200 + password reset`   |
| GET    | `/get-current-user`             | ✓    | (none)                            | `HTTP 200 + user`             |
| POST   | `/change-password`              | ✓    | `old_password, new_password`      | `HTTP 200 + success`          |
| POST   | `/refresh-access-token`         | ✓    | (none)                            | `HTTP 200 + new access_token` |
| POST   | `/logout`                       | ✓    | (none)                            | `HTTP 200 + logged out`       |
| POST   | `/resend-email-verification`    | ✓    | (none)                            | `HTTP 200 + email sent`       |

### Project Routes `/projects/` _(not yet implemented)_

| Method | Route                         | Auth | Role    | Purpose                    |
| ------ | ----------------------------- | ---- | ------- | -------------------------- |
| GET    | `/`                           | ✓    | any     | List user's projects       |
| POST   | `/`                           | ✓    | admin   | Create new project         |
| GET    | `/:projectId`                 | ✓    | member+ | Get project details        |
| PUT    | `/:projectId`                 | ✓    | admin   | Update project info        |
| DELETE | `/:projectId`                 | ✓    | admin   | Delete project             |
| GET    | `/:projectId/members`         | ✓    | member+ | List project members       |
| POST   | `/:projectId/members`         | ✓    | admin   | Add member to project      |
| PUT    | `/:projectId/members/:userId` | ✓    | admin   | Update member role         |
| DELETE | `/:projectId/members/:userId` | ✓    | admin   | Remove member from project |

### Task Routes `/tasks/` _(not yet implemented)_

| Method | Route                            | Auth | Role    | Purpose               |
| ------ | -------------------------------- | ---- | ------- | --------------------- |
| GET    | `/:projectId`                    | ✓    | member+ | List project tasks    |
| POST   | `/:projectId`                    | ✓    | admin+  | Create task           |
| GET    | `/:projectId/t/:taskId`          | ✓    | member+ | Get task details      |
| PUT    | `/:projectId/t/:taskId`          | ✓    | admin+  | Update task           |
| DELETE | `/:projectId/t/:taskId`          | ✓    | admin+  | Delete task           |
| POST   | `/:projectId/t/:taskId/subtasks` | ✓    | admin+  | Create subtask        |
| PUT    | `/:projectId/st/:subTaskId`      | ✓    | member+ | Update subtask status |
| DELETE | `/:projectId/st/:subTaskId`      | ✓    | admin+  | Delete subtask        |

### Note Routes `/notes/` _(not yet implemented)_

| Method | Route                   | Auth | Role    | Purpose            |
| ------ | ----------------------- | ---- | ------- | ------------------ |
| GET    | `/:projectId`           | ✓    | member+ | List project notes |
| POST   | `/:projectId`           | ✓    | admin   | Create note        |
| GET    | `/:projectId/n/:noteId` | ✓    | member+ | Get note           |
| PUT    | `/:projectId/n/:noteId` | ✓    | admin   | Update note        |
| DELETE | `/:projectId/n/:noteId` | ✓    | admin   | Delete note        |

### Health Check `/healthcheck/` _(implemented)_

| Method | Route | Purpose                |
| ------ | ----- | ---------------------- |
| GET    | `/`   | System status endpoint |

---

## Permission Matrix

| Feature                    | Admin | Project Admin | Member |
| -------------------------- | ----- | ------------- | ------ |
| Create Project             | ✓     | ✗             | ✗      |
| Update/Delete Project      | ✓     | ✗             | ✗      |
| Manage Project Members     | ✓     | ✗             | ✗      |
| Create/Update/Delete Tasks | ✓     | ✓             | ✗      |
| View Tasks                 | ✓     | ✓             | ✓      |
| Update Subtask Status      | ✓     | ✓             | ✓      |
| Create/Delete Subtasks     | ✓     | ✓             | ✗      |
| Create/Update/Delete Notes | ✓     | ✗             | ✗      |
| View Notes                 | ✓     | ✓             | ✓      |

---

## Response Format

All responses follow a standardized JSON envelope:

### Success Response

```json
{
  "statusCode": 200,
  "data": {
    /* resource or null */
  },
  "message": "Success",
  "success": true
}
```

### Error Response

```json
{
  "statusCode": 422,
  "data": [],
  "message": "Received data isn't valid",
  "errors": [
    { "email": "Email is required" },
    { "password": "Password must be at least 8 characters" }
  ],
  "success": false
}
```

---

## Running Locally

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- npm or yarn
- An SMTP account (Mailtrap, SendGrid, Gmail, etc.) for emails

### Setup

1. **Clone and install dependencies:**

   ```bash
   git clone <repo>
   cd base-camp-backend
   npm install
   ```

2. **Create `.env` file** (copy from `.env.example`):

   ```bash
   cp .env.example .env
   ```

3. **Configure environment variables:**

   ```env
   PORT=3000
   MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/project_camp

   # JWT secrets
   ACCESS_TOKEN_SECRET=your_secret_key_here
   ACCESS_TOKEN_EXPIRY=15m
   REFRESH_TOKEN_SECRET=your_refresh_secret_here
   REFRESH_TOKEN_EXPIRY=7d

   # Email (Mailtrap example)
   SMTP_HOST=smtp.mailtrap.io
   SMTP_PORT=2525
   SMTP_USER=your_mailtrap_user
   SMTP_PASS=your_mailtrap_pass
   SMTP_FROM=noreply@projectcamp.dev

   # CORS
   CORS_ORIGIN=http://localhost:5173,http://localhost:3000

   # App
   NODE_ENV=development
   ```

4. **Start the development server:**

   ```bash
   npm run dev
   ```

   The API will be available at `http://localhost:3000/api/v1`

### Useful Commands

```bash
# Development with hot-reload
npm run dev

# Production build/start
npm start

# Run linting/formatting (Prettier)
npx prettier --write src/
```

---

## Configuration

All configuration is via environment variables in `.env`:

| Variable               | Default                 | Purpose                                |
| ---------------------- | ----------------------- | -------------------------------------- |
| `PORT`                 | `3000`                  | API port                               |
| `NODE_ENV`             | `development`           | Runtime environment                    |
| `MONGO_URI`            | (required)              | MongoDB connection string              |
| `ACCESS_TOKEN_SECRET`  | (required)              | JWT signing key for access tokens      |
| `ACCESS_TOKEN_EXPIRY`  | `15m`                   | Access token TTL                       |
| `REFRESH_TOKEN_SECRET` | (required)              | JWT signing key for refresh tokens     |
| `REFRESH_TOKEN_EXPIRY` | `7d`                    | Refresh token TTL                      |
| `SMTP_HOST`            | (required)              | Email server hostname                  |
| `SMTP_PORT`            | (required)              | Email server port                      |
| `SMTP_USER`            | (required)              | Email account username                 |
| `SMTP_PASS`            | (required)              | Email account password                 |
| `SMTP_FROM`            | (required)              | Sender email address                   |
| `CORS_ORIGIN`          | `http://localhost:5173` | Allowed CORS origins (comma-separated) |

---

## Implementation Roadmap

### Phase 1: Auth ✅ Complete

- [x] User registration with email verification
- [x] Login/logout with JWT tokens
- [x] Token refresh mechanism
- [x] Change password
- [x] Forgot/reset password
- [x] Get current user

### Phase 2: Projects & Members

- [ ] Create/read/update/delete projects
- [ ] List projects
- [ ] Add/remove project members
- [ ] Update member roles
- [ ] Member listing

### Phase 3: Tasks & Subtasks

- [ ] Create/read/update/delete tasks
- [ ] List tasks with filtering
- [ ] Create/update/delete subtasks
- [ ] Mark subtasks as complete
- [ ] File attachments for tasks

### Phase 4: Notes

- [ ] Create/read/update/delete notes
- [ ] List project notes

### Phase 5: Advanced Features

- [ ] Activity logging
- [ ] Notifications system
- [ ] Bulk operations
- [ ] Advanced filtering and search
- [ ] Export project data

---

## Common Issues & Troubleshooting

**Q: Getting "CORS error" from frontend?**

- Ensure your frontend origin is in `CORS_ORIGIN` environment variable (comma-separated list)

**Q: Email verification not sending?**

- Check `SMTP_*` environment variables are correct
- Verify SMTP credentials with provider (Mailtrap, etc.)
- Check server logs for mail service errors

**Q: Cannot connect to MongoDB?**

- Ensure `MONGO_URI` is correct
- If using MongoDB Atlas, add your IP to whitelist
- Check network connectivity to database

**Q: JWT token expired?**

- Use the refresh token endpoint to get a new access token
- Refresh tokens expire after 7 days by default

---

## Next Steps

1. Implement project management routes (CRUD, member management)
2. Add task and subtask management
3. Implement permission-based authorization middleware
4. Add comprehensive error logging and monitoring
5. Write integration tests for core flows
6. Add API documentation (Swagger/OpenAPI)
7. Implement rate limiting per endpoint
8. Add request logging and tracing

---

## Author

Built as a learning project in the backend job hunt — focusing on production patterns and system design.
