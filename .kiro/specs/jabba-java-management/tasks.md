# Implementation Plan: Jabba Java Management

- [x] 1. Modernize Docker container to use Jabba

  - Update Dockerfile to use Debian base image instead of eclipse-temurin
  - Install Bun and Jabba in the container
  - Configure Jabba to install OpenJDK 17 as default during build
  - Update container startup command to load Jabba environment before starting Bun
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Enhance backend Jabba version management

  - [x] 2.1 Update jabbaVersions.ts to check if version is already installed

    - Modify `installJabbaVersion()` to query installed versions before attempting installation
    - Return `alreadyInstalled: true` in response if version exists
    - Skip installation process if version is already present
    - _Requirements: 3.4, 4.1_

  - [x] 2.2 Improve error handling in jabbaVersions.ts

    - Add validation for version format before installation
    - Capture and return detailed error messages from Jabba commands
    - Add logging for all version management operations
    - _Requirements: 3.3, 6.4_

  - [x] 2.3 Enhance jabbaUtils.ts environment loading

    - Ensure `getJabbaEnv()` validates that the requested version is installed
    - Add error handling for missing Java versions
    - Add logging for environment variable setup
    - _Requirements: 6.1, 6.3_

- [x] 3. Improve server lifecycle Java integration

  - [x] 3.1 Add Java availability validation before server start

    - Create validation function to check if configured Java version is installed
    - Return clear error message if Java version is missing
    - Add fallback check for system Java if no Jabba version configured
    - _Requirements: 6.3, 6.4_

  - [x] 3.2 Enhance Java version logging in server startup

    - Log which Java version (Jabba or system) is being used
    - Log JAVA_HOME and PATH when using Jabba
    - Add warning logs if Java version from metadata is not available
    - _Requirements: 2.1, 2.2, 6.1_

- [x] 4. Update frontend Java version selector UI

  - [x] 4.1 Implement installed version detection in JavaVersionSelector

    - Check if each recommended version exists in `jabbaInfo.versions`
    - Conditionally render "Install" button only for non-installed versions
    - Show "Switch" button or "Active" badge for installed versions
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 4.2 Add visual indicators for installation status

    - Add checkmark icon (✓) for installed versions
    - Add circle icon (○) for not-installed versions
    - Style active version with distinct color/badge
    - _Requirements: 4.2, 4.3_

  - [x] 4.3 Update useJabbaInstall hook to handle already-installed versions

    - Check `alreadyInstalled` flag in API response
    - Skip installation and directly switch to version if already installed
    - Update error handling to provide user-friendly messages
    - _Requirements: 3.4, 4.4_

- [x] 5. Add Java version display to server overview

  - [x] 5.1 Display active Java version in ServerOverview component

    - Add Java version field to server information section
    - Fetch current Java version from metadata
    - Show "System Default" if no Jabba version is configured
    - _Requirements: 2.1, 2.2, 2.4_

  - [x] 5.2 Add link to Java Management from server overview

    - Add "Change" button next to Java version display
    - Navigate to Java Management page when clicked
    - Maintain server context for easy navigation back
    - _Requirements: 2.3_

- [ ] 6. Ensure non-Docker environment compatibility

  - [ ] 6.1 Add Jabba detection for local development

    - Check if Jabba is installed on host system at startup
    - Display appropriate message in UI if Jabba is not available
    - Allow application to function with system Java as fallback
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ] 6.2 Update JavaManagement component for non-Docker scenarios
    - Show installation instructions if Jabba is not detected
    - Provide link to Jabba installation guide
    - Gracefully handle missing Jabba without breaking UI
    - _Requirements: 5.2_

- [ ] 7. Update translations for new UI elements

  - Add German and English translations for "Java Version" label
  - Add translations for "System Default" fallback text
  - Add translations for "Already Installed" status messages
  - Add translations for Jabba installation instructions
  - _Requirements: 2.4, 4.2, 5.2_

- [ ] 8. Add integration tests for Jabba functionality

  - [ ] 8.1 Test Docker container build and Jabba installation

    - Verify Jabba is installed in container
    - Verify OpenJDK 17 is installed and set as default
    - Verify Bun is available and functional
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ] 8.2 Test Java version installation and switching

    - Test installing a new Java version via API
    - Test switching between installed versions
    - Test error handling for invalid versions
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ] 8.3 Test server startup with different Java versions
    - Test server starts with default Java
    - Test server starts with specific Jabba version
    - Test error handling when Java version is missing
    - _Requirements: 6.1, 6.3, 6.4_
