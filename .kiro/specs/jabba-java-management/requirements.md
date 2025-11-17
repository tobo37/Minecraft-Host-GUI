# Requirements Document

## Introduction

This feature modernizes the Docker container to use Jabba (Java Version Manager) instead of pre-installed Java versions. The system will install Bun and Jabba in the container, start with OpenJDK 17 as default, and allow users to switch Java versions through the web interface. The selected Java version will be displayed in the GUI, and installation buttons will be hidden once a version is already installed.

## Glossary

- **Jabba**: A cross-platform Java version manager that allows installation and switching between multiple Java versions
- **Container**: The Docker container environment running the Minecraft Server Manager application
- **GUI**: The web-based graphical user interface for managing the Minecraft server
- **OpenJDK**: Open-source implementation of the Java Platform, Standard Edition
- **Java Version Selector**: The UI component that displays available Java versions and allows switching between them
- **Installation Status**: The state indicating whether a specific Java version is already installed via Jabba

## Requirements

### Requirement 1

**User Story:** As a system administrator, I want the Docker container to use Jabba for Java version management instead of pre-installed Java, so that I can dynamically manage Java versions without rebuilding the container.

#### Acceptance Criteria

1. WHEN the Container is built, THE Container SHALL install Jabba and Bun without any pre-installed Java version
2. WHEN the Container starts for the first time, THE Container SHALL install OpenJDK version 17 as the default Java version using Jabba
3. WHEN the Container starts, THE Container SHALL set OpenJDK version 17 as the active Java version in the environment
4. THE Container SHALL expose Jabba commands to the application runtime for Java version management operations
5. THE Container SHALL persist Jabba installations across container restarts through volume mounts

### Requirement 2

**User Story:** As a user, I want to see which Java version is currently active in the GUI, so that I know which Java runtime my Minecraft server is using.

#### Acceptance Criteria

1. WHEN the GUI loads, THE Java Version Selector SHALL query the active Java version from Jabba
2. WHEN a Java version is active, THE Java Version Selector SHALL display the version number and distribution name in the appropriate UI section
3. WHEN the active Java version changes, THE Java Version Selector SHALL update the displayed version within 2 seconds
4. THE Java Version Selector SHALL display version information in the format "Java [version] ([distribution])"

### Requirement 3

**User Story:** As a user, I want to switch between different Java versions through the web interface, so that I can test my Minecraft server with different Java runtimes.

#### Acceptance Criteria

1. WHEN the user selects a Java version from the available options, THE Java Version Selector SHALL initiate the installation process if the version is not installed
2. WHEN a Java version installation completes successfully, THE Java Version Selector SHALL switch the active Java version to the newly installed version
3. IF a Java version installation fails, THEN THE Java Version Selector SHALL display an error message with failure details
4. WHEN a Java version is already installed, THE Java Version Selector SHALL switch to that version without reinstalling

### Requirement 4

**User Story:** As a user, I want installation buttons to be hidden for Java versions that are already installed, so that I don't accidentally trigger duplicate installations.

#### Acceptance Criteria

1. WHEN the GUI loads, THE Java Version Selector SHALL query all installed Java versions from Jabba
2. WHEN a Java version is already installed, THE Java Version Selector SHALL hide or disable the installation button for that version
3. WHEN a Java version is not installed, THE Java Version Selector SHALL display an active installation button for that version
4. WHEN a Java version installation completes, THE Java Version Selector SHALL update the button state to reflect the installed status within 2 seconds

### Requirement 5

**User Story:** As a developer running the application without Docker, I want the Java version management features to work seamlessly, so that I can develop and test locally without container dependencies.

#### Acceptance Criteria

1. WHEN the application starts outside a Container, THE application SHALL detect whether Jabba is installed on the host system
2. IF Jabba is not installed on the host system, THEN THE Java Version Selector SHALL display a message indicating that Jabba is required for Java version management
3. WHEN Jabba is installed on the host system, THE Java Version Selector SHALL function identically to the containerized environment
4. THE application SHALL use the same Jabba commands and APIs regardless of whether it runs in a Container or on the host system

### Requirement 6

**User Story:** As a system administrator, I want the Java version management to integrate with the existing server lifecycle, so that server start operations use the correct Java version.

#### Acceptance Criteria

1. WHEN a Minecraft server starts, THE Server Lifecycle Service SHALL use the currently active Java version from Jabba
2. WHEN the active Java version changes while a server is running, THE Server Lifecycle Service SHALL continue using the previous Java version until the server restarts
3. WHEN a server start command is executed, THE Server Lifecycle Service SHALL verify that a Java version is active before attempting to start the server
4. IF no Java version is active, THEN THE Server Lifecycle Service SHALL return an error message indicating that Java must be installed first
