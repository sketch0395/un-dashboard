# Organized Test Files

This directory contains all test files organized by category for better maintainability and easier navigation.

## Directory Structure

### 📁 **automated**
Automated test scripts and continuous integration tests
- Comprehensive test suites
- Automated validation scripts
- CI/CD test files

### 📁 **verification**
Verification and validation scripts
- `verify-*` scripts for confirming fixes
- Post-implementation validation tests
- System verification utilities

### 📁 **debug**
Debug and diagnostic tools
- `debug-*` scripts for investigating issues
- Diagnostic utilities
- Troubleshooting tools
- Module resolution tests
- Port and configuration tests

### 📁 **manual**
Manual testing files and guides
- Manual test procedures
- Step-by-step test scripts
- Interactive testing tools

### 📁 **integration**
Integration and end-to-end tests
- Full system integration tests
- End-to-end workflow tests
- Cross-component testing
- Client-side integration tests
- Frontend stability tests

### 📁 **collaboration**
Collaboration system tests
- Real-time collaboration tests
- WebSocket collaboration tests
- Multi-user interaction tests
- Collaboration persistence tests
- Topology collaboration tests

### 📁 **topology**
Network topology visualization tests
- Topology rendering tests
- D3.js visualization tests
- Topology data loading tests
- Network graph display tests

### 📁 **auth**
Authentication and authorization tests
- Login/logout functionality tests
- Session management tests
- Cross-port authentication tests
- Admin authentication tests
- Auth token management tests

### 📁 **admin**
Admin panel and management tests
- Admin user creation tests
- Admin password management
- Admin panel functionality tests
- User management tests

### 📁 **database**
Database operations and integration tests
- MongoDB integration tests
- Database persistence tests
- Data migration tests
- Duplicate prevention tests
- Database connection tests

### 📁 **device**
Device management and data tests
- Device API tests
- Device editing functionality tests
- Device data management tests
- Device type integration tests
- Device modal tests

### 📁 **scan-history**
Scan history and persistence tests
- Scan history UI tests
- Scan persistence tests
- Scan format validation tests
- User-specific scan history tests
- Scan sharing functionality tests

### 📁 **shared-scans**
Shared scans collaboration tests
- Shared scan API tests
- Scan sharing authentication tests
- Collaborative scan features tests

### 📁 **websocket**
WebSocket communication tests
- WebSocket connection tests
- Real-time messaging tests
- Heartbeat and connection stability tests
- Simple WebSocket functionality tests

### 📁 **legacy**
Legacy and archived test files
- Outdated test files kept for reference
- Previous implementation tests
- Deprecated functionality tests

### 📁 **html-tests**
HTML-based test files and browser tests
- Browser-based test pages
- HTML test interfaces
- Frontend testing pages

### 📁 **scripts**
Utility scripts and test helpers
- Test data creation scripts
- Setup and teardown scripts
- Administrative utility scripts
- Quick test helpers

### 📁 **documentation**
Test-related documentation and fix summaries
- **collaboration/** - Collaboration system fix documentation (15 files)
- **topology/** - Network topology testing guides (2 files)
- **auth/** - Authentication fix documentation (2 files)
- **database/** - Database integration fix documentation (3 files)
- **device/** - Device management fix documentation (5 files)
- **integration/** - Implementation and final test documentation (3 files)
- **manual-guides/** - Manual testing guides and procedures (2 files)
- **general/** - General fixes and error resolution documentation (8 files)

## Usage Guidelines

### Running Tests
- Use specific category directories to run related tests
- Check individual test files for specific run instructions
- Many tests require the server to be running on specific ports

### Test Categories by Priority
1. **verification/** - Run these after implementing fixes
2. **integration/** - Run these for comprehensive system testing
3. **collaboration/** - Run these when testing collaborative features
4. **auth/** - Run these when testing authentication changes

### Common Test Patterns
- Tests prefixed with `test-` are typically runnable scripts
- Tests prefixed with `debug-` are diagnostic tools
- Tests prefixed with `verify-` are post-fix validation scripts
- Files ending in `.mjs` use ES6 modules
- Files ending in `.html` are browser-based tests

## Test Environment Requirements

### Server Requirements
- Main application server running on port 3000
- Network server running on port 4000
- WebSocket collaboration server running
- MongoDB database accessible

### Dependencies
- Node.js with required packages installed
- Browser for HTML-based tests
- MongoDB running locally or accessible remotely

## Maintenance Notes

### Adding New Tests
- Place new tests in the appropriate category directory
- Update this README if adding new categories
- Follow existing naming conventions
- Include documentation comments in test files

### Cleaning Up
- Review and archive obsolete tests to `legacy/`
- Update tests when fixing issues they were designed to catch
- Remove duplicate or redundant tests

---

**Last Updated:** June 13, 2025  
**Total Test Files Organized:** 250+  

This organization was created to improve maintainability and make it easier to find relevant tests when debugging specific system components.
