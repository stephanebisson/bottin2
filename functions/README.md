# Firebase Cloud Functions

This directory contains the Firebase Cloud Functions for the school directory application, organized by functionality.

## File Structure

```
functions/
├── index.js              # Main entry point - imports and exports all functions
├── auth.js               # Authentication-related functions
├── workflow.js           # Annual update workflow management
├── email.js              # Email notification system
├── parentUpdate.js       # Parent information update forms
├── utils.js              # Utility functions (health checks, etc.)
├── package.json          # Dependencies and scripts
└── README.md            # This file
```

## Functions Overview

### Authentication (`auth.js`)
- `validateEmail` - Validates if an email is authorized to create an account

### Workflow Management (`workflow.js`)
- `startAnnualUpdate` - Initiates the annual parent information update workflow
- `getWorkflowStatus` - Retrieves current and historical workflow status

### Email System (`email.js`)
- `sendUpdateEmails` - Sends email notifications to parents with update links
- Email templates in English and French
- Configurable email service (Gmail, SendGrid, etc.)

### Parent Updates (`parentUpdate.js`)
- `validateUpdateToken` - Validates update tokens and returns parent data
- `processParentUpdate` - Processes parent information updates from public forms

### Utilities (`utils.js`)
- `healthCheck` - Simple health check endpoint

## Environment Configuration

### Email Service
Configure email service using Firebase Functions config:

```bash
# Set email configuration
firebase functions:config:set email.user="your-email@gmail.com"
firebase functions:config:set email.password="your-app-password"
firebase functions:config:set email.from="noreply@yourschool.com"

# Set application URL for email links
firebase functions:config:set app.url="https://your-app-domain.com"
```

### Development
For local development, create a `.env` file in the functions directory:

```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

## Deployment

Deploy all functions:
```bash
npm run deploy
```

Deploy specific functions:
```bash
firebase deploy --only functions:validateEmail
firebase deploy --only functions:startAnnualUpdate
```

## Security Features

- JWT token validation for admin functions
- Rate limiting on workflow creation and form submissions
- Token expiration (30 days)
- Duplicate submission prevention
- Input validation and sanitization

## API Endpoints

All functions are accessible via HTTPS endpoints:

- `validateEmail` - POST - Validates email authorization
- `startAnnualUpdate` - POST - Starts workflow (requires admin auth)
- `getWorkflowStatus` - GET - Gets workflow status (requires admin auth)
- `sendUpdateEmails` - POST - Sends notification emails (requires admin auth)
- `validateUpdateToken` - POST - Validates parent update token (public)
- `processParentUpdate` - POST - Processes parent form submission (public)
- `healthCheck` - GET - Health check (public)

## Error Handling

All functions include comprehensive error handling with appropriate HTTP status codes:

- `400` - Bad Request (missing/invalid parameters)
- `401` - Unauthorized (invalid/missing auth token)
- `404` - Not Found (invalid token/resource)
- `409` - Conflict (workflow already exists)
- `410` - Gone (expired token)
- `429` - Too Many Requests (rate limiting)
- `500` - Internal Server Error

## Logging

Functions use console.log/console.error for logging. Logs are available in:
- Firebase Console > Functions > Logs
- `firebase functions:log`

## Development Commands

```bash
# Install dependencies
npm install

# Serve functions locally
npm run serve

# Deploy to production
npm run deploy

# View logs
npm run logs
```