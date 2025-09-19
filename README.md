# School Directory System

A comprehensive web application for managing school directory information with parent information update workflows, built with Vue 3, Vuetify, and Firebase.

## 🎯 Overview

This application provides a complete school directory management system with:
- **Student, Parent, Staff, and Committee directories** with search and filtering
- **Annual parent information update workflow** with secure token-based forms
- **Multi-language support** (English/French)
- **Role-based authentication** and admin functionality
- **Responsive design** optimized for desktop and mobile
- **Email notification system** for workflow communications

## 🏗️ Architecture

### Frontend
- **Vue 3** with Composition API and `<script setup>` syntax
- **Vuetify 3** Material Design UI framework
- **Pinia** state management
- **Vue Router** with automatic route generation
- **Multi-language** internationalization (i18n)

### Backend
- **Firebase Authentication** for user management
- **Firebase Firestore** for data storage
- **Firebase Cloud Functions** for server-side logic
- **Firebase Hosting** for deployment

### Data Sources
- **Google Sheets integration** for data import/sync
- **Automated data processing** from spreadsheets to Firestore

## 🚀 Quick Start

### Prerequisites
- Node.js (v22+)
- Firebase CLI
- Google Cloud Service Account (for Sheets integration)

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd b2
   pnpm install
   ```

2. **Set up Firebase:**
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase init
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up credentials:**
   - Follow instructions in `credentials/README.md`
   - Place service account JSON files in the credentials directory

5. **Start development:**
   ```bash
   # Start Firebase emulators
   firebase emulators:start
   
   # In another terminal, start the dev server
   pnpm dev
   ```

## 📊 Data Management

### Google Sheets Sync
Sync data from Google Sheets to Firebase:

```bash
# Development (uses Firebase emulator)
pnpm run sync:dev

# Production (uses live Firebase)
pnpm run sync:prod
```

### Required Sheet Structure
The system expects Google Sheets with these collections:
- **Students** - Student information with parent email links
- **Parents** - Parent contact and family information  
- **Staff** - School staff directory
- **Classes** - Class assignments and teacher information
- **Committees** - Committee structure and memberships

## 🔐 Authentication System

### User Types
- **Parents** - Access to directory, profile management
- **Staff** - Directory access, potential admin privileges
- **Admins** - Full system access including workflow management

### Authorization
- Email-based authorization against parent/staff collections
- Admin access configurable by email domain or specific addresses
- JWT token-based API authentication for Cloud Functions

## 🔄 Annual Update Workflow

### Process Overview
1. **Admin initiates** workflow from admin panel
2. **System generates** secure update tokens for all parents
3. **Email notifications** sent with personalized update links
4. **Parents access** public forms via tokens (no login required)
5. **Information updated** with committee memberships, interests, directory preferences
6. **Account creation** invitation after form submission

### Features
- **Token-based security** with 30-day expiration
- **Address sharing** between parents in same family
- **Directory opt-out** functionality
- **Rate limiting** and duplicate submission protection
- **Multi-language** email templates
- **Progress tracking** and statistics in admin panel

## 📱 User Interface

### Pages
- **Home** - Dashboard with quick stats and search
- **Students** - Student directory with family groupings
- **Parents** - Parent directory with children information
- **Staff** - Staff directory with roles and departments
- **Classes** - Class listings with teacher and student info
- **Committees** - Committee structure and membership
- **Profile** - Personal information management (parents only)
- **Admin** - Workflow management and statistics
- **Update Forms** - Public parent information update

### Features
- **Advanced search** with accent-insensitive filtering
- **Responsive design** that works on mobile and desktop
- **Theme customization** with multiple color schemes
- **Language switching** between English and French
- **Highlighted search** results with matched terms

## ⚙️ Configuration

### Environment Variables
```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id

# Google Sheets Integration
GOOGLE_SHEETS_ID=your_sheet_id
GOOGLE_CLOUD_PROJECT_ID=your_project_id
```

### Firebase Functions Config
```bash
# Email service configuration
firebase functions:config:set email.user="noreply@yourschool.com"
firebase functions:config:set email.password="app_password"
firebase functions:config:set email.from="School Directory <noreply@yourschool.com>"

# Application URL for email links
firebase functions:config:set app.url="https://yourschool.web.app"
```

## 🛠️ Development Commands

```bash
# Development server
pnpm dev

# Build for production
pnpm build

# Deploy to Firebase
pnpm deploy

# Sync data from Google Sheets
pnpm run sync:dev    # Development
pnpm run sync:prod   # Production

# Firebase Functions
cd functions
npm run serve        # Local development
npm run deploy       # Deploy functions
npm run logs         # View logs
```

## 🗂️ Project Structure

```
b2/
├── src/
│   ├── components/          # Reusable Vue components
│   ├── pages/              # Page components (auto-routed)
│   ├── stores/             # Pinia stores
│   ├── locales/            # i18n translation files
│   ├── middleware/         # Route middleware
│   └── utils/              # Utility functions
├── functions/              # Firebase Cloud Functions
│   ├── auth.js            # Authentication functions
│   ├── workflow.js        # Workflow management
│   ├── email.js           # Email system
│   ├── parentUpdate.js    # Parent update forms
│   └── utils.js           # Utility functions
├── credentials/           # Service account credentials
├── firebase.json         # Firebase configuration
└── package.json          # Dependencies and scripts
```

## 📋 Admin Features

### Workflow Management
- Start annual parent information updates
- Monitor completion statistics
- Send email notifications
- View workflow history
- Rate limiting and security controls

### System Monitoring
- Real-time completion statistics
- Parent participation tracking
- Email delivery status
- Error monitoring and logging

## 🔒 Security Features

- **Token-based access** for update forms
- **Rate limiting** on sensitive operations
- **Input validation** and sanitization
- **Admin confirmation** requirements for workflow actions
- **Audit logging** for all administrative actions
- **Data isolation** between school years

## 📧 Email System

### Templates
- **Professional HTML** email templates
- **Multi-language** support (English/French)
- **Responsive design** for all email clients
- **Personalized content** with parent names and deadlines

### Configuration
Supports multiple email providers:
- Gmail (development)
- SendGrid (recommended for production)
- Mailgun
- Custom SMTP

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For support or questions about this school directory system:
- Check the documentation in each component/function
- Review the Firebase Functions README for API details
- Contact the school administration for access issues