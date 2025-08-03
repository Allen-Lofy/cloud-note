# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cloud Note is a lightweight web-based note-taking application similar to Obsidian Cloud. It supports Markdown editing with LaTeX math formulas, file management, and user authentication with admin privileges.

## Architecture

### Frontend (Vue 3 + Vite)
- **Framework**: Vue 3 with Composition API
- **Build Tool**: Vite
- **State Management**: Pinia stores located in `frontend/src/stores/`
- **Routing**: Vue Router configuration in `frontend/src/router/`
- **Styling**: Tailwind CSS with custom stripe background design
- **Key Libraries**: 
  - Marked (Markdown parsing)
  - KaTeX (LaTeX math formula rendering)
  - Highlight.js (code syntax highlighting)
  - Lucide Vue Next (icons)

### Backend (Node.js + Express)
- **Framework**: Express.js with ES modules
- **Database**: JSON file-based storage (`backend/data/db.json`)
- **Authentication**: JWT tokens with bcryptjs password hashing
- **File Storage**: Local filesystem (`backend/uploads/` and `backend/data/notes/`)
- **API Structure**: REST API with routes in `backend/routes/`

### Data Management
- **Database**: MySQL 8.0+ with connection pooling and transaction support
- **Legacy Support**: JSON-based database functions still available in `backend/utils/db.js` for migration
- **File Operations**: Files stored with dual representation (metadata in MySQL + content in filesystem)
- **User Roles**: Standard users and admin role with management capabilities
- **Backup System**: Automated backup functionality for both SQL and JSON formats

## Common Development Commands

### Local Development
```bash
# Install all dependencies (root, frontend, backend)
npm run install:all

# Start development servers (both frontend and backend)
npm run dev

# Start individual services
npm run dev:frontend  # Frontend dev server (port 3000)
npm run dev:backend   # Backend dev server (port 3001)
```

### Production Build
```bash
# Build frontend for production
npm run build

# Start production backend
npm run start
```

### Backend-specific Commands
```bash
cd backend

# Development with auto-reload
npm run dev

# Production start
npm run start

# Database management scripts
node scripts/init-db.js        # Initialize MySQL database structure
node scripts/migrate-to-mysql.js # Migrate from JSON to MySQL
node scripts/test-mysql.js     # Test MySQL connection
node scripts/upgrade-db.js     # Upgrade database schema
node scripts/test-backup.js    # Test backup functionality
```

### Frontend-specific Commands
```bash
cd frontend

# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

## Development Notes

### Authentication System
- Default admin credentials: username `admin`, password `password`
- JWT tokens stored in localStorage on frontend
- Admin role required for user management and system statistics

### File Management
- Hierarchical folder structure with parent-child relationships
- Files contain both metadata (in JSON database) and content
- Support for drag-and-drop file operations and right-click context menus
- Auto-save functionality for markdown files

### API Endpoints
Key API routes are organized in:
- `/api/auth/*` - User authentication (login, register, profile)
- `/api/files/*` - File and folder CRUD operations, upload/download
- `/api/admin/*` - Admin-only user management and statistics

### Deployment Configuration
- Nginx configuration provided in `cloud-note.conf`
- Designed for Ubuntu server deployment at `/root/cloud-note`
- PM2 process management recommended for production
- Environment variables configured in `backend/.env`

### Technology Stack Notes
- Frontend uses ES modules and modern Vue 3 features
- Backend uses ES modules (type: "module" in package.json)
- No TypeScript - pure JavaScript implementation
- Tailwind CSS for responsive design with custom stripe background
- File uploads handled via Multer middleware

### LaTeX and Markdown Processing
- **Critical Implementation Detail**: LaTeX blocks (`$$...$$`) are protected from Markdown processing using HTML comment placeholders (`<!--LATEX_BLOCK_N-->`) to preserve line breaks and special characters
- Markdown is processed by `marked` library with syntax highlighting via `highlight.js`
- LaTeX rendering handled by KaTeX with `throwOnError: false` for graceful error handling
- Both Dashboard.vue and Editor.vue implement identical LaTeX processing logic in their `renderedContent` computed properties

### State Management Architecture
- **Auth Store** (`frontend/src/stores/auth.js`): Manages user authentication, JWT tokens in localStorage, and admin role checking
- **Files Store** (`frontend/src/stores/files.js`): Handles file tree operations, CRUD operations, and hierarchical folder navigation
- Stores use Pinia with composition-style syntax and async actions

### File System Integration
- Files are stored with dual representation: metadata in JSON database + content in filesystem
- File operations support drag-and-drop, right-click context menus, and breadcrumb navigation
- Upload handling via Multer with configurable storage destinations
- Auto-save functionality implemented with 30-second intervals