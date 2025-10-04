# B2 School Directory - E2E Testing Plan

## Executive Summary

This document outlines a comprehensive end-to-end testing strategy for the B2 School Directory Vue 3 + Firebase application to prevent regression and ensure critical user workflows function correctly.

## Current State Analysis

### Existing Test Infrastructure
- **Unit Testing**: Vitest with jsdom environment
- **Coverage**: V8 provider with HTML/JSON reports
- **Existing Tests**: 8 unit test files covering DTOs, utilities, and business logic
- **Framework**: Vue 3 Composition API + Vuetify 3 + Pinia

### Architecture Overview
- **Frontend**: Vue 3, Vuetify 3, Pinia stores, auto-imports
- **Backend**: Firebase Auth/Firestore/Functions, Node.js
- **Development**: Vite dev server, Firebase emulators (Auth:9099, Firestore:8080, Functions:5001)
- **Key Patterns**: DTO classes, Repository pattern, email-based primary keys

## Recommendation: Playwright

### Why Playwright Over Cypress
- **Cross-browser support**: Chrome, Firefox, Safari testing
- **Parallel execution**: Native support without paid tiers
- **Mobile emulation**: Built-in responsive testing
- **Multi-tab scenarios**: Better for email verification workflows
- **Network interception**: Robust Firebase API mocking
- **TypeScript support**: First-class TypeScript integration

## Test Infrastructure Design

### Project Structure
```
tests/
├── e2e/
│   ├── specs/
│   │   ├── auth/
│   │   │   ├── parent-registration.spec.ts
│   │   │   ├── staff-login.spec.ts
│   │   │   ├── password-reset.spec.ts
│   │   │   └── email-verification.spec.ts
│   │   ├── parent-update/
│   │   │   ├── token-update.spec.ts
│   │   │   ├── committee-management.spec.ts
│   │   │   └── address-syncing.spec.ts
│   │   ├── data-management/
│   │   │   ├── student-management.spec.ts
│   │   │   ├── staff-directory.spec.ts
│   │   │   └── committee-operations.spec.ts
│   │   └── admin/
│   │       ├── annual-update.spec.ts
│   │       └── school-progression.spec.ts
│   ├── fixtures/
│   │   ├── users.json
│   │   ├── students.json
│   │   ├── committees.json
│   │   └── test-data.json
│   ├── helpers/
│   │   ├── auth-helpers.ts
│   │   ├── database-helpers.ts
│   │   ├── email-helpers.ts
│   │   └── firebase-helpers.ts
│   ├── page-objects/
│   │   ├── auth-page.ts
│   │   ├── dashboard-page.ts
│   │   ├── update-form-page.ts
│   │   └── admin-pages.ts
│   └── setup/
│       ├── global-setup.ts
│       ├── test-setup.ts
│       └── teardown.ts
├── playwright.config.ts
└── README.md
```

### Configuration Files

#### playwright.config.ts
```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e/specs',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    port: 3000,
  },
});
```

## Critical User Journeys (12 Tests)

### 1. Authentication Flow (4 tests)

#### 1.1 Parent Registration Flow
**File**: `auth/parent-registration.spec.ts`
**Duration**: ~90s
**Steps**:
1. Navigate to registration page
2. Enter email address → trigger email validation
3. Fill registration form with valid data
4. Submit form → account creation
5. Verify email verification sent
6. Simulate email verification click
7. Verify successful login redirect

**Key Assertions**:
- Email validation API called correctly
- Firebase Auth account created
- Verification email sent
- User redirected to appropriate dashboard

#### 1.2 Staff/Admin Login
**File**: `auth/staff-login.spec.ts`
**Duration**: ~60s
**Steps**:
1. Navigate to login page
2. Enter staff credentials
3. Verify role-based dashboard access
4. Test navigation between admin sections
5. Verify logout functionality

**Key Assertions**:
- Correct user role detection
- Appropriate menu items displayed
- Admin-only sections accessible
- Session management working

#### 1.3 Password Reset Flow
**File**: `auth/password-reset.spec.ts`
**Duration**: ~75s
**Steps**:
1. Navigate to password reset
2. Enter email address
3. Verify reset email sent
4. Simulate reset link click
5. Set new password
6. Verify login with new password

**Key Assertions**:
- Reset email sent successfully
- Password update processed
- New password authentication works

#### 1.4 Email Verification Process
**File**: `auth/email-verification.spec.ts`
**Duration**: ~45s
**Steps**:
1. Create unverified account
2. Attempt login → blocked
3. Resend verification email
4. Simulate email link click
5. Verify account activation

### 2. Parent Update Workflow (3 tests)

#### 2.1 Token-based Update Process
**File**: `parent-update/token-update.spec.ts`
**Duration**: ~120s
**Steps**:
1. Generate update token via admin
2. Navigate to update URL with token
3. Verify parent data pre-populated
4. Update personal information
5. Modify address details
6. Submit form
7. Verify data saved to Firestore

**Key Assertions**:
- Token validation successful
- Form pre-population accurate
- Phone/postal code formatting applied
- Data persistence verified

#### 2.2 Committee Management
**File**: `parent-update/committee-management.spec.ts`
**Duration**: ~90s
**Steps**:
1. Access update form with existing committee memberships
2. Join new committees with role selection
3. Leave existing committees
4. Update roles in current committees
5. Submit changes
6. Verify committee updates in database

#### 2.3 Address Syncing
**File**: `parent-update/address-syncing.spec.ts`
**Duration**: ~75s
**Steps**:
1. Access update form with other parent having address
2. Toggle "same address" checkbox
3. Verify address fields behavior
4. Submit with address sync enabled
5. Verify both parents have same address

### 3. Data Management (3 tests)

#### 3.1 Student Management
**File**: `data-management/student-management.spec.ts`
**Duration**: ~100s
**Steps**:
1. Login as admin
2. Navigate to students section
3. Add new student with parent links
4. Edit existing student information
5. Verify parent-student relationships
6. Test student search functionality

#### 3.2 Staff Directory
**File**: `data-management/staff-directory.spec.ts`
**Duration**: ~85s
**Steps**:
1. Access staff management
2. Add new staff member
3. Assign roles and permissions
4. Update contact information
5. Test staff search and filtering

#### 3.3 Committee Operations
**File**: `data-management/committee-operations.spec.ts`
**Duration**: ~95s
**Steps**:
1. Create new committee
2. Add members with roles
3. Update committee information
4. Remove members
5. Archive/delete committee

### 4. Admin Functions (2 tests)

#### 4.1 Annual Update Workflow
**File**: `admin/annual-update.spec.ts`
**Duration**: ~180s
**Steps**:
1. Login as admin
2. Configure annual update settings
3. Trigger email campaign
4. Monitor sending progress
5. Verify sample emails sent
6. Check completion statistics

#### 4.2 School Progression
**File**: `admin/school-progression.spec.ts`
**Duration**: ~120s
**Steps**:
1. Access school progression tool
2. Review student advancement list
3. Approve/modify grade transitions
4. Execute progression batch
5. Verify student records updated
6. Check graduation handling

## Test Data Strategy

### Fixtures Structure
```json
// fixtures/users.json
{
  "parents": [
    {
      "email": "test.parent1@example.com",
      "first_name": "Test",
      "last_name": "Parent",
      "phone": "5141234567",
      "committees": ["school-council"],
      "children": ["student-001"]
    }
  ],
  "staff": [
    {
      "email": "test.admin@b2school.ca",
      "role": "admin",
      "permissions": ["manage-users", "manage-data"]
    }
  ]
}
```

### Database Seeding
- Isolated test data per spec
- Clean database state before each test
- Pre-configured committees and interests
- Sample student/parent relationships

## Technical Implementation

### Package Installation
```bash
pnpm add -D @playwright/test
pnpm exec playwright install
```

### Key Utilities

#### Firebase Helpers
```typescript
// helpers/firebase-helpers.ts
export async function seedTestData(data: TestData) {
  // Populate Firebase emulator with test data
}

export async function clearTestData() {
  // Clean up test data after tests
}
```

#### Email Testing
```typescript
// helpers/email-helpers.ts
export async function interceptEmails(page: Page) {
  // Mock email service calls
  // Capture email content for verification
}
```

### Network Mocking Strategy
- Mock external API calls (Google Sheets sync)
- Use Firebase emulators for backend services
- Intercept email service calls
- Simulate slow network conditions

## Testing Environments

### Local Development
- Firebase emulators running on standard ports
- Vite dev server on localhost:3000
- Full browser automation with UI

### CI/CD Pipeline
- GitHub Actions integration
- Parallel test execution
- Cross-browser testing
- Artifact collection (screenshots, traces)

### Mobile Testing
- Responsive design validation
- Touch interaction testing
- Viewport-specific layouts
- Mobile navigation patterns

## Metrics & Reporting

### Test Execution
- **Total Runtime**: ~15-20 minutes (with parallelization)
- **Success Criteria**: 100% pass rate for critical paths
- **Flake Tolerance**: <5% flaky test rate
- **Coverage**: All major user journeys

### Reports Generated
- HTML test report with screenshots
- Trace files for debugging failures
- Performance metrics
- Cross-browser compatibility results

## Implementation Timeline

### Phase 1: Setup (2-3 days)
- Install and configure Playwright
- Set up Firebase emulator integration
- Create test data fixtures
- Implement core helper functions

### Phase 2: Core Tests (5-7 days)
- Authentication flow tests (2 days)
- Parent update workflow tests (2 days)
- Data management tests (2 days)
- Admin function tests (1-2 days)

### Phase 3: Integration (1 day)
- CI/CD pipeline setup
- Cross-browser testing configuration
- Performance optimization
- Documentation finalization

### Ongoing Maintenance
- **Weekly**: Review test results, update failing tests
- **Monthly**: Add new test cases for new features
- **Quarterly**: Review and optimize test suite performance

## Cost-Benefit Analysis

### Benefits
- **Regression Prevention**: Catch breaking changes before production
- **Confidence**: Deploy with confidence knowing critical paths work
- **Documentation**: Tests serve as living documentation of workflows
- **Multi-browser**: Ensure compatibility across user environments
- **Mobile**: Validate responsive design functionality

### Costs
- **Initial Setup**: ~8-10 days development time
- **Ongoing Maintenance**: ~2-4 hours per month
- **CI Resources**: Additional 15-20 minutes per build
- **Infrastructure**: Playwright license (free for most use cases)

### ROI Estimate
- **Prevented Issues**: ~2-3 production bugs per month
- **Debug Time Saved**: ~4-6 hours per month
- **User Experience**: Improved reliability and user satisfaction
- **Confidence**: Faster feature delivery with automated testing safety net

## Getting Started Checklist

- [ ] Install Playwright and dependencies
- [ ] Set up test project structure
- [ ] Configure Firebase emulator integration  
- [ ] Create initial test fixtures
- [ ] Implement authentication tests first
- [ ] Set up CI/CD pipeline
- [ ] Document test execution procedures
- [ ] Train team on test maintenance

## Conclusion

This E2E testing plan provides comprehensive coverage of B2 School Directory's critical user workflows while being maintainable and efficient. The Playwright-based approach offers excellent cross-browser support, parallel execution, and robust network mocking capabilities essential for testing Firebase-integrated applications.

The investment in E2E testing will pay dividends through improved reliability, faster development cycles, and increased confidence in deployments.