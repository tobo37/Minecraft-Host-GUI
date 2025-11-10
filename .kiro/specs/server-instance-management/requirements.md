# Requirements Document

## Introduction

This feature enhances the Minecraft Server Management Interface to support custom naming for server instances, improved metadata persistence, and better user experience for managing multiple modpack servers. The system already supports ZIP upload, server creation, start/stop operations, and configuration management. This enhancement focuses on making server instances more identifiable and manageable through custom names and improved metadata storage.

## Glossary

- **Server Instance**: A single Minecraft server installation created from a ZIP file, stored in the `server/` directory
- **Server Metadata**: Persistent information about a server instance including custom name, creation date, description, and modpack information
- **Custom Name**: A user-defined, human-readable identifier for a server instance (e.g., "ATM9 Survival", "Tekkit Creative")
- **Project Path**: The directory name where server files are stored (currently date-based like "2024-11-10")
- **Modpack**: A collection of Minecraft mods packaged together, often distributed as a server ZIP file
- **Web Interface**: The React-based GUI for managing Minecraft servers
- **Docker Volume**: The persistent storage mount (`/app/server`) that preserves data across container restarts

## Requirements

### Requirement 1: Custom Server Instance Naming

**User Story:** As a server administrator, I want to assign custom names to my server instances, so that I can easily identify different modpacks and server purposes without relying on date-based folder names.

#### Acceptance Criteria

1. WHEN creating a new server instance, THE Web Interface SHALL display an input field for entering a custom server name
2. WHEN a user provides a custom name during server creation, THE System SHALL store the custom name in the server metadata file
3. WHEN a custom name is not provided, THE System SHALL use the modpack ZIP filename as the default display name
4. WHILE displaying server instances in the project selection view, THE Web Interface SHALL show the custom name as the primary identifier
5. WHERE a server instance has a custom name, THE Web Interface SHALL display both the custom name and the project path for reference

### Requirement 2: Enhanced Server Metadata Persistence

**User Story:** As a server administrator, I want my server configuration and metadata to persist across container restarts, so that I don't lose important information about my server instances.

#### Acceptance Criteria

1. WHEN a server instance is created, THE System SHALL create a metadata file (`.metadata.json`) in the server directory
2. THE System SHALL store the following information in the metadata file: custom name, creation timestamp, source ZIP filename, description, and last modified timestamp
3. WHEN the container restarts, THE System SHALL read metadata from existing server directories
4. WHILE listing server instances, THE System SHALL load and display metadata for each server
5. WHEN metadata file is missing or corrupted, THE System SHALL generate default metadata from available information

### Requirement 3: Server Instance Renaming

**User Story:** As a server administrator, I want to rename existing server instances, so that I can update names as server purposes change without recreating the server.

#### Acceptance Criteria

1. WHEN viewing a server instance in the management interface, THE Web Interface SHALL provide a rename option
2. WHEN a user initiates rename, THE Web Interface SHALL display an input dialog with the current name pre-filled
3. WHEN a new name is submitted, THE System SHALL update the metadata file with the new name and current timestamp
4. THE System SHALL validate that the new name is not empty and contains only valid characters
5. WHEN rename is successful, THE Web Interface SHALL immediately reflect the new name without requiring page refresh

### Requirement 4: Server Instance Description

**User Story:** As a server administrator, I want to add descriptions to my server instances, so that I can document server purpose, modpack version, and other relevant information.

#### Acceptance Criteria

1. WHEN creating or editing a server instance, THE Web Interface SHALL provide a text area for entering a description
2. THE System SHALL store the description in the server metadata file
3. WHEN viewing server details, THE Web Interface SHALL display the description if present
4. THE System SHALL support descriptions up to 500 characters in length
5. WHEN no description is provided, THE Web Interface SHALL display a placeholder message

### Requirement 5: Improved Project Selection Interface

**User Story:** As a server administrator, I want to see detailed information about each server instance in the project selection view, so that I can quickly identify and select the correct server.

#### Acceptance Criteria

1. WHEN displaying the project selection view, THE Web Interface SHALL show custom names as the primary heading for each server card
2. THE Web Interface SHALL display the following metadata for each server: custom name, description (truncated if long), creation date, source ZIP filename, and current status
3. WHEN a server has no custom name, THE Web Interface SHALL display the source ZIP filename as the name
4. THE Web Interface SHALL sort servers by last modified date (most recent first) by default
5. WHEN hovering over a server card, THE Web Interface SHALL highlight the card to indicate it is selectable

### Requirement 6: Metadata Migration for Existing Servers

**User Story:** As a server administrator with existing server instances, I want the system to automatically create metadata for my old servers, so that I can use new features without manual intervention.

#### Acceptance Criteria

1. WHEN the system detects a server directory without a metadata file, THE System SHALL generate a default metadata file
2. THE System SHALL extract the creation date from the `.created` file if present
3. THE System SHALL use the directory name as the initial custom name for migrated servers
4. WHEN migration is complete, THE System SHALL log the migration action for debugging purposes
5. THE System SHALL perform migration checks during server listing operations

### Requirement 7: Server Instance Deletion with Confirmation

**User Story:** As a server administrator, I want to delete server instances I no longer need, so that I can free up disk space and keep my server list organized.

#### Acceptance Criteria

1. WHEN viewing a server instance, THE Web Interface SHALL provide a delete option
2. WHEN a user initiates deletion, THE Web Interface SHALL display a confirmation dialog with the server name and warning message
3. THE Web Interface SHALL require the user to type the server name to confirm deletion
4. WHEN deletion is confirmed, THE System SHALL remove the entire server directory from the filesystem
5. IF the server is currently running, THE System SHALL stop the server before deletion

### Requirement 8: Server Status Indicators in Project List

**User Story:** As a server administrator, I want to see which servers are currently running in the project selection view, so that I can quickly assess server states without opening each one.

#### Acceptance Criteria

1. WHEN displaying the project selection view, THE Web Interface SHALL check the running status of each server
2. THE Web Interface SHALL display a visual indicator (colored badge or icon) showing whether each server is running or stopped
3. WHEN a server is running, THE Web Interface SHALL display a green "Running" badge
4. WHEN a server is stopped, THE Web Interface SHALL display a gray "Stopped" badge
5. THE Web Interface SHALL update status indicators every 5 seconds while the project selection view is open
