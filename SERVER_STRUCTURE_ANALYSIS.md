# BGalin Server (Bun + Elysia) - Structure Analysis

## Overview
The server is built with **Bun** runtime and **Elysia** framework, using **Prisma** as ORM with **PostgreSQL** database. It follows a clean layered architecture with Controllers, Services, and Middleware separation.

**Main Entry Point**: `server/src/index.ts` (51 lines)

---

## CONTROLLERS IMPLEMENTED (14 files)

### 1. **Authentication Controller** (`controllers/auth.ts`)
- **Endpoints**:
  - `POST /api/auth/request-otp` - Request OTP code via Telegram
  - `POST /api/auth/verify-otp` - Verify OTP and create session
- **Status**: ✅ **FULLY IMPLEMENTED**
- **Dependencies**: AuthService, TelegramService
- **Notes**: Telegram-based OTP authentication for admin users

### 2. **Public Controller** (`controllers/public.ts`)
- **Endpoints**:
  - `GET /` - Server message
  - `GET /health` - Health check
  - `GET /server_time` - Server timestamp
- **Status**: ✅ **FULLY IMPLEMENTED**
- **Notes**: Simple public endpoints, no auth required

### 3. **Admin Controller** (`controllers/admin.ts`)
- **Endpoints**:
  - `GET /api/admin/info` - Admin info
  - `GET /api/admin/dashboard` - Admin dashboard
  - `GET /api/admin/stats` - Session statistics
- **Status**: ✅ **FULLY IMPLEMENTED**
- **Authentication**: Bearer token required
- **Notes**: Requires authMiddleware

### 4. **Jobs Controller** (`controllers/jobs.ts`)
- **Endpoints**:
  - `GET /api/jobs/stats` - Job search statistics
  - `GET /api/jobs/settings` - Job search settings
  - `PUT /api/jobs/settings` - Update settings
  - `GET /api/jobs/vacancies` - List vacancies (paginated)
  - `GET /api/jobs/vacancies/:id` - Get vacancy details with chat history
  - `GET /api/jobs/logs` - Job activity logs (paginated)
- **Status**: ✅ **FULLY IMPLEMENTED**
- **Database Relations**: JobVacancy, JobSearchStats, JobSearchSettings, JobActivityLog
- **Notes**: No auth protection - public endpoints

### 5. **Portfolio Controller** (`controllers/portfolio.ts`)
- **Endpoints**:
  - `GET /api/portfolio/` - Public portfolio data
  - `POST/PUT/DELETE /api/portfolio/about` - About section management
  - `POST/PUT/DELETE /api/portfolio/experience` - Experience entries
  - `POST/DELETE /api/portfolio/skills` - Skills management
  - `POST/DELETE /api/portfolio/contacts` - Contact information
  - `POST/DELETE /api/portfolio/cases` - Portfolio cases with images
  - `POST /api/portfolio/improve-about` - AI-powered text improvement
  - `GET /api/portfolio/hh-resumes` - HH.ru resume integration
- **Status**: ✅ **FULLY IMPLEMENTED**
- **Authentication**: Protected routes require Bearer token
- **AI Integration**: Uses AiService for text improvement
- **External Services**: HH.ru API integration
- **Database Models**: PortfolioAbout, PortfolioExperience, PortfolioSkill, PortfolioContact, PortfolioCase, PortfolioCaseImage

### 6. **CS2 Controller** (`controllers/cs2.ts`)
- **Endpoints**:
  - `POST /api/cs2/gsi` - Receive CS2 Game State Integration data
  - `GET /api/cs2/match` - Get current match state
  - `POST /api/cs2/match/clear` - Clear match data
- **Status**: ✅ **FULLY IMPLEMENTED**
- **Authentication**: Token validation for GSI data
- **External API**: Steam API integration for player stats
- **Features**:
  - Match state management (teams, scores, rounds)
  - Async player stats fetching
  - Bot detection for stats

### 7. **Studio Controller** (`controllers/studio.ts`)
- **Endpoints**:
  - `GET /api/studio/auth/steam` - Initiate Steam OpenID login
  - `GET /api/studio/auth/steam/callback` - Steam auth callback
  - `GET /api/studio/auth/me` - Get current user info
  - `GET /api/studio/projects` - List user projects
  - `POST /api/studio/projects` - Create new project
  - `GET /api/studio/projects/:id` - Get project details
  - `PUT /api/studio/projects/:id` - Update project
  - `DELETE /api/studio/projects/:id` - Delete project
- **Status**: ✅ **FULLY IMPLEMENTED**
- **Authentication**: Steam OpenID + Bearer token
- **Admin Check**: Compares steam_id to ADMIN_STEAM_ID env var
- **Session Management**: Custom session validation

### 8. **Publish Controller** (`controllers/publish.ts`)
- **Endpoints**:
  - `POST /api/studio/publish/convert` - Convert video to GIF
  - `POST /api/studio/publish/optimize` - Optimize existing GIF
  - `GET /api/studio/publish/status/:jobId` - Get job status
  - `GET /api/studio/publish/result/:jobId` - Get result GIF
  - `GET /api/studio/publish/download/:jobId` - Download result
- **Status**: ✅ **FULLY IMPLEMENTED**
- **Background Jobs**: Uses PublishService for async processing
- **Features**:
  - Video to GIF conversion
  - GIF optimization
  - Frame settings (weapon skin overlay for CS2)
  - Job status tracking
  - File size optimization

### 9. **Files Controller** (`controllers/files.ts`)
- **Endpoints**:
  - **Admin Protected**:
    - `GET /api/files/folders` - Get folder contents
    - `POST /api/files/folders` - Create folder
    - `PUT /api/files/folders/:id` - Rename folder
    - `DELETE /api/files/folders/:id` - Delete folder
    - `POST /api/files/upload` - Upload file
    - `PUT /api/files/:id` - Update file metadata
    - `DELETE /api/files/:id` - Delete file
    - `GET /api/files/info/:id` - Get file info
  - **Public/Protected**:
    - `GET /api/files/public/:id` - Get public file
    - `POST /api/files/private/:id` - Get private file with access code
    - `GET /api/files/check/:id` - Check file existence/accessibility
    - `GET /api/files/admin/:id` - Admin direct access
- **Status**: ✅ **FULLY IMPLEMENTED**
- **Features**:
  - Hierarchical folder structure
  - Public/private file access
  - Access code protection (SHA256 hashed)
  - File metadata management
  - Breadcrumb trail support

### 10. **Sync Controller** (`controllers/sync.ts`)
- **Endpoints**:
  - **Admin Routes**:
    - `GET /api/sync/folders` - List sync folders
    - `POST /api/sync/folders` - Create folder
    - `GET /api/sync/folders/:id` - Get folder details
    - `PUT /api/sync/folders/:id` - Rename folder
    - `POST /api/sync/folders/:id/regenerate-key` - Regenerate API key
    - `DELETE /api/sync/folders/:id` - Delete folder
    - `DELETE /api/sync/clients/:id` - Delete client
  - **Client Routes (API Key Auth)**:
    - `POST /api/sync/register` - Register sync client
    - `POST /api/sync/status` - Get sync diff
    - `GET /api/sync/files` - List files
    - `POST /api/sync/upload` - Upload file
    - `GET /api/sync/download/:fileId` - Download file
    - `DELETE /api/sync/files` - Delete file
- **Status**: ✅ **FULLY IMPLEMENTED**
- **Authentication**: Dual auth (admin + API key for clients)
- **Features**:
  - File sync management
  - Checksum-based diff computation
  - Device/client tracking
  - API key generation and rotation

### 11. **Links Controller** (`controllers/links.ts`)
- **Endpoints**:
  - **Admin Protected**:
    - `GET /api/links` - List all links
    - `POST /api/links` - Create short link
    - `PUT /api/links/:id` - Update link
    - `DELETE /api/links/:id` - Delete link
    - `GET /api/links/:id/stats` - Get link statistics
  - **Public**:
    - `GET /l/:code` - Redirect to original URL
- **Status**: ✅ **FULLY IMPLEMENTED**
- **Features**:
  - Short URL generation (internal + external via is.gd)
  - Click tracking with device/bot detection
  - Link expiration support
  - Custom JavaScript support
  - Studio redirect flags
  - User agent parsing
- **External Service**: is.gd URL shortener

### 12. **Anime Controller** (`controllers/anime.ts`)
- **Endpoints**:
  - `GET /api/anime/upcoming` - Get unwatched anime
  - `GET /api/anime/watched` - Get watched anime
  - `GET /api/anime/sync/progress` - Get sync progress
  - `POST /api/anime/sync` - Start sync task
- **Status**: ✅ **FULLY IMPLEMENTED**
- **Authentication**: Bearer token required
- **Background Job**: AnimeService.runSyncTask
- **External APIs**: Google Sheets + Shikimori
- **Features**:
  - Google Sheets data import
  - Anime metadata enrichment from Shikimori API
  - Progress tracking

### 13. **English Learning Controller** (`controllers/english.ts`)
- **Endpoints**:
  - **Categories**:
    
