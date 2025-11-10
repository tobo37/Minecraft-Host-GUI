    # Implementation Plan

- [x] 1. Create metadata service and type definitions

  - Create `src/services/metadataService.ts` with functions for reading, writing, and migrating metadata
  - Update `src/services/types.ts` to add `ServerMetadata` interface and extend `Server` interface with new fields
  - Implement validation functions for custom names and descriptions
  - _Requirements: 1.2, 2.2, 6.2_

- [x] 2. Enhance server creation with metadata support

  - [x] 2.1 Update `createServer` function in `serverService.ts`

    - Accept `customName` and `description` parameters
    - Create `.metadata.json` file after server extraction
    - Use ZIP filename as default if no custom name provided
    - _Requirements: 1.1, 1.2, 2.1, 2.2_

  - [x] 2.2 Update WelcomePage component

    - Add custom name input field with label and placeholder
    - Add description textarea with character counter
    - Pass custom name and description to server creation API
    - _Requirements: 1.1, 4.1, 4.2_

- [x] 3. Implement metadata reading and migration

  - [x] 3.1 Update `listServers` function in `serverService.ts`

    - Read `.metadata.json` for each server directory
    - Call migration function if metadata file missing
    - Include metadata fields in server list response
    - _Requirements: 2.3, 6.1, 6.2, 6.3_

  - [x] 3.2 Implement metadata migration logic

    - Read `.created` file for creation timestamp
    - Use directory name as default custom name
    - Generate default metadata structure
    - Write `.metadata.json` file
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 4. Add server status checking to project list

  - Update `listServers` to check running status for each server using `runningServers` Map
  - Include status field in server list response
  - _Requirements: 8.1, 8.2_

- [ ] 5. Enhance ProjectSelection component with metadata display

  - [ ] 5.1 Update server card layout

    - Display custom name as primary heading
    - Show description (truncated if long)
    - Display creation date, source ZIP, and project path
    - Add status badge (green for running, gray for stopped)
    - _Requirements: 5.1, 5.2, 5.3, 8.3, 8.4_

  - [ ] 5.2 Implement status polling
    - Poll server status every 5 seconds while on project selection page
    - Update status badges without full page refresh
    - _Requirements: 8.5_

- [ ] 6. Create API endpoints for metadata updates

  - [ ] 6.1 Add POST `/api/server/metadata` endpoint

    - Accept project path, custom name, and description
    - Validate input parameters
    - Update `.metadata.json` file
    - Return updated metadata
    - _Requirements: 3.2, 3.3, 3.4_

  - [ ] 6.2 Add DELETE `/api/server/delete` endpoint
    - Accept project path parameter
    - Check if server is running and stop if necessary
    - Validate path to prevent traversal attacks
    - Delete entire server directory recursively
    - _Requirements: 7.2, 7.4, 7.5_

- [ ] 7. Implement server rename functionality

  - [ ] 7.1 Add rename dialog to ServerManagement component

    - Create modal dialog with input field
    - Pre-fill with current custom name
    - Validate new name on submit
    - Call metadata update API
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ] 7.2 Update server info display
    - Show custom name and description in server info section
    - Add "Rename" button next to custom name
    - Add "Edit Description" button or inline editing
    - _Requirements: 3.5, 4.3_

- [ ] 8. Implement server deletion functionality

  - [ ] 8.1 Add delete confirmation dialog

    - Create modal with warning message
    - Require typing server name to confirm
    - Show server name and path in dialog
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ] 8.2 Add delete button to ServerManagement component
    - Place delete button at bottom of page (red styling)
    - Open confirmation dialog on click
    - Call delete API after confirmation
    - Navigate back to project list after successful deletion
    - _Requirements: 7.1, 7.2, 7.4, 7.5_

- [ ] 9. Update internationalization

  - Add German and English translations for new UI elements
  - Include labels for custom name, description, rename, delete
  - Add dialog titles and messages
  - _Requirements: All UI-related requirements_

- [ ] 10. Update steering documentation
  - Update `structure.md` to document metadata service and new API endpoints
  - Update `tech.md` if any new dependencies are added
  - Document metadata file format and migration strategy
  - _Requirements: Documentation_
