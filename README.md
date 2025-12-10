<h1>
  <img src="./assets/logo_transparent.png" width="100" alt="VaultID Logo" style="vertical-align: middle;">
  VaultID – Authentication & Identity Service
</h1>

VaultID is an authentication and identity service built with Node.js, NestJS, TypeScript, Prisma, and PostgreSQL.  
It provides user management, token-based authentication, email verification, and password reset functionality.  
The project also includes Docker-based local development and deployment on Render.

---

## Table of Contents
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Installation & Setup](#installation--setup)
  - [Prerequisites](#prerequisites)
  - [Local Development](#local-development)
- [Authentication Workflows](#authentication-workflows)
- [Database Schema Overview](#database-schema-overview)
- [Deployment](#deployment)
- [Notes](#notes)

---

## Features

### Authentication
- User registration with hashed passwords (bcrypt)
- Login with JWT access tokens
- Refresh token rotation stored in the database
- Logout with refresh token revocation

### Account Management
- Email verification workflow using token links
- Password reset via email link and secure token handling

### Email Delivery
- Integration with Resend API for sending transactional emails
- Local fallback mode without external email delivery

### Database
- PostgreSQL with Prisma ORM
- Migrations included in `/prisma/migrations`
- Schema includes:
  - User
  - RefreshToken
  - EmailVerificationToken
  - PasswordResetToken

### Infrastructure
- Dockerfile (multi-stage)
- docker-compose for local development (app + PostgreSQL + Redis placeholder)
- GitHub Actions CI support
- Deployment on Render (Node Web Service + Managed PostgreSQL)

Redis is included in docker-compose but currently not used in the application logic.

---

## Technology Stack

| Area          | Tooling |
|---------------|---------|
| Language      | TypeScript |
| Runtime       | Node.js |
| Framework     | NestJS |
| ORM           | Prisma |
| Database      | PostgreSQL |
| Email Service | Resend |
| Containers    | Docker |
| Hosting       | Render |
| CI/CD         | GitHub Actions |

---

## Project Structure

```
.github/
  workflows/        # CI/CD pipelines
prisma/
  migrations/       # Database migrations
  schema.prisma     # Prisma schema
src/
  auth/             # Authentication module
  common/           # Shared utilities
  database/         # Prisma connection + DB module
  health/           # Health check endpoint
  mail/             # Email service integration
  users/            # User management
  app.controller.ts
  app.module.ts
  app.service.ts
  main.ts
docker-compose.yml  # Local dev environment
Dockerfile          # Production build container
```

---

## Installation & Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Docker (optional, for container-based development)
- PostgreSQL (local or remote)
- Resend API key (for email delivery)

### Local Development

1. **Install Dependencies**

   Run the following command in the project root:

   ```bash
   npm install
   ```

2. **Setup Environment Variables**

   Copy the provided template and update values as needed:

   **Windows:**
   ```bash
   copy .env.example .env
   ```

   **Mac/Linux:**
   ```bash
   cp .env.example .env
   ```

   Update the variables inside `.env` according to your setup (e.g., `DATABASE_URL`, `RESEND_API_KEY`, `APP_BASE_URL`, `JWT_SECRET`).

3. **Apply Prisma Migrations**

   To initialize the local database schema:

   ```bash
   npx prisma migrate dev
   ```

   If you only want to generate the Prisma client:

   ```bash
   npx prisma generate
   ```

4. **Start the Application (Development Mode)**

   ```bash
   npm run start:dev
   ```

   The API will now be available at:
   http://localhost:3000

5. **Optional: Run With Docker (App + PostgreSQL)**

   To start the full stack using docker-compose:

   ```bash
   docker compose up --build
   ```

   This will launch:
   * PostgreSQL database
   * NestJS application
   * Optional Redis container (currently unused)

   The app will again be reachable at:
   http://localhost:3000

6. **Running in Production Mode**

   Build the project:

   ```bash
   npm run build
   ```

   Start it:

   ```bash
   npm run start:prod
   ```

---

## Authentication Workflows

### Registration

- User submits email, password, and name.
- Password is hashed using bcrypt and stored securely.
- Email verification token is generated and persisted.
- Verification link is sent via the MailService.
- Access and refresh tokens are issued after registration.

### Login

- User provides email and password.
- Credentials are validated; bcrypt is used for password comparison.
- If valid, new access and refresh tokens are generated.

### Refresh Token Rotation

- Refresh token is validated, including expiry and revocation checks.
- Old refresh token is revoked.
- A new access + refresh token pair is issued.

### Logout

- The refresh token is revoked in the database.

### Email Verification

- Verification token is checked for validity and expiration.
- User's emailVerified flag is updated.
- Token is marked as used.

### Password Reset

- User requests reset with email.
- Token is generated, stored, and sent via email.
- User submits token + new password.
- Token validity is checked; new password is hashed.
- All existing refresh tokens for the user are revoked.

---

## Database Schema Overview

### User

- Stores credentials and profile information.
- Relations to refresh tokens, email tokens, and password reset tokens.

### RefreshToken

- Used for session continuation.
- Includes expiration, revocation, and usage metadata.

### EmailVerificationToken

- Allows confirming ownership of an email address.

### PasswordResetToken

- Temporary token for resetting forgotten passwords.

---

## Deployment

- Application deployed on Render as a Node service.
- PostgreSQL provisioned via Render.
- Environment variables provided through Render Dashboard.
- Build pipeline uses Prisma migrations and NestJS build.

---

## Notes

- Redis is not implemented yet; it is planned for session invalidation, rate limiting, or caching.
- Email delivery is handled using Resend. No additional abstraction layer or alternative email providers are used.
