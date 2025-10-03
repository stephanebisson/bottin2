# Testing Guide

This project includes comprehensive unit tests for critical algorithms and business logic to reduce regression risk.

## Running Tests

### Install Dependencies

```bash
npm install
```

### Test Commands

```bash
# Run tests once
npm run test:run

# Run tests in watch mode (re-run on file changes)  
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests with UI (browser interface)
npm run test:ui

# Run tests interactively
npm test
```

## Test Coverage

The test suite covers the following high-priority algorithms:

### Data Formatting & Validation Utilities ⭐⭐⭐
- **Phone Formatter** (`src/utils/phoneFormatter.test.js`)
  - Tests various phone number formats and edge cases
  - Real-time input formatting with cursor position tracking
  - Validation logic for different phone number patterns

- **Postal Code Formatter** (`src/utils/postalCodeFormatter.test.js`)
  - Canadian postal code pattern validation (A9A 9A9)
  - Format normalization and display formatting
  - Progressive input formatting during typing

- **Search Utilities** (`src/utils/search.test.js`)
  - Accent-insensitive text normalization 
  - Multi-field search functionality
  - Text highlighting for search results

### Data Transfer Objects (DTOs) ⭐⭐⭐
- **ParentDTO** (`src/dto/ParentDTO.test.js`)
  - Data sanitization and validation
  - Business logic methods (contact updates, interest management)
  - Firestore transformation methods

- **StudentDTO** (`src/dto/StudentDTO.test.js`)
  - Student data validation and sanitization
  - School progression business logic
  - Parent relationship management

### School Management Algorithms ⭐⭐
- **School Progression** (`functions/schoolProgression.test.js`)
  - Grade-level progression rules (1→2, 3→4, 5→6, graduation)
  - Orphaned parent cleanup algorithm
  - Workflow state management and statistics

- **Data Synchronization** (`scripts/sheets-sync.test.js`)
  - Google Sheets to Firestore transformation logic
  - Parent-student lookup algorithms
  - Committee membership parsing

## Test Structure

Tests follow these principles:
- **Short & Readable**: Each test focuses on one behavior
- **Data-Driven**: Uses `test.each()` for input/output matrices
- **Descriptive Names**: Clear test descriptions
- **Edge Cases**: Comprehensive coverage of error conditions

## Coverage Reports

Run `npm run test:coverage` to generate detailed coverage reports:
- **Text**: Console summary
- **HTML**: Browse to `coverage/index.html` for detailed report
- **JSON**: Machine-readable coverage data in `coverage/coverage.json`

## Test Files

```
src/
├── utils/
│   ├── phoneFormatter.test.js      # Phone formatting tests
│   ├── postalCodeFormatter.test.js # Postal code tests  
│   └── search.test.js              # Search functionality tests
├── dto/
│   ├── ParentDTO.test.js           # Parent business logic tests
│   └── StudentDTO.test.js          # Student business logic tests
functions/
└── schoolProgression.test.js       # School progression algorithm tests
scripts/
└── sheets-sync.test.js            # Data synchronization tests
```

## Benefits

- **Prevent Regressions**: Catch breaking changes in critical algorithms
- **Validate Business Rules**: Ensure school progression logic works correctly  
- **Test Edge Cases**: Handle malformed data and error conditions gracefully
- **Document Behavior**: Tests serve as executable documentation
- **Confident Refactoring**: Make changes knowing tests will catch issues

## CI/CD Integration

To run tests in CI/CD pipelines:

```bash
# Run tests and fail build if any test fails
npm run test:run

# Generate coverage and upload to coverage service
npm run test:coverage
```

The test suite is designed to be fast and reliable for automated workflows.