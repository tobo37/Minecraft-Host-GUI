# Implementation Plan

- [x] 1. Fix critical ESLint error





  - Fix empty catch block in javaService.ts line 219 by adding error parameter
  - Verify zero ESLint errors with `bun lint`
  - _Requirements: 1.1, 1.2_

- [x] 2. Refactor serverService.ts into layered architecture




- [x] 2.1 Create type definitions and repository layer


  - Create `services/server/server.types.ts` with all interfaces (ServerMetadata, ServerInfo, CreateServerData, ServerProcess)
  - Create `services/server/serverRepository.ts` with file system operations (readServerDirectory, writeServerFile, deleteServerDirectory)
  - _Requirements: 5.1, 5.2, 5.5, 9.3_

- [x] 2.2 Extract server listing functionality


  - Create `services/server/serverList.ts` with listServers() function
  - Reduce complexity from 12 to under 10
  - Reduce nesting from 5 to 3 or less using guard clauses
  - _Requirements: 2.3, 3.2, 3.3, 4.2, 5.4_

- [x] 2.3 Extract server creation functionality


  - Create `services/server/serverCreate.ts` with createServer() function
  - Decompose into validateServerCreation(), setupServerDirectory(), extractServerFiles(), createServerMetadata(), cleanupTempFiles()
  - Reduce complexity from 21 to under 10
  - Ensure all functions are under 50 lines
  - _Requirements: 2.3, 3.2, 3.3, 3.5, 5.4_

- [x] 2.4 Extract server lifecycle functionality


  - Create `services/server/serverLifecycle.ts` with startServer() and stopServer() functions
  - Decompose startServer() from 261 lines into validateServerStart(), loadServerConfiguration(), ensureJavaAvailable(), launchServerProcess(), setupProcessHandlers()
  - Reduce each function to under 50 lines
  - Reduce complexity to under 10
  - _Requirements: 2.3, 2.4, 3.2, 3.4, 5.4_

- [x] 2.5 Create public API and update imports


  - Create `services/server/index.ts` with re-exports
  - Update all imports throughout codebase to use new structure
  - Verify server creation, start, and stop functionality works
  - _Requirements: 5.1, 12.1, 12.2_

- [x] 3. Refactor serverFileService.ts into focused modules





- [x] 3.1 Create type definitions and file list module


  - Create `services/serverFile/serverFile.types.ts` with interfaces (ServerFile, UploadResult, UploadChunk)
  - Create `services/serverFile/serverFileList.ts` with listServerFiles() and deleteServerFile()
  - _Requirements: 5.1, 9.3_

- [x] 3.2 Extract standard upload functionality


  - Create `services/serverFile/serverFileUpload.ts` with uploadServerFile()
  - Reduce from 83 to under 50 lines
  - Reduce complexity from 11 to under 10
  - _Requirements: 2.3, 3.2, 3.3_

- [x] 3.3 Extract chunked upload functionality


  - Create `services/serverFile/serverFileUploadChunked.ts` with uploadServerFileChunked()
  - Reduce from 104 to under 50 lines
  - Reduce complexity from 18 to under 10
  - Reduce nesting from 5 to 3 using guard clauses
  - _Requirements: 2.3, 3.2, 3.3, 3.6, 4.2, 4.4_

- [x] 3.4 Extract stream upload functionality


  - Create `services/serverFile/serverFileUploadStream.ts` with uploadServerFileStream()
  - Reduce from 99 to under 50 lines
  - Reduce complexity from 20 to under 10
  - _Requirements: 2.3, 3.2, 3.3_

- [x] 3.5 Create public API and verify uploads


  - Create `services/serverFile/index.ts` with re-exports
  - Update all imports throughout codebase
  - Test all three upload methods (standard, chunked, stream)
  - _Requirements: 12.2_

- [x] 4. Refactor startFileService.ts






- [x] 4.1 Decompose findStartFiles function

  - Split findStartFiles() (103 lines) into validateServerPath(), scanServerDirectory(), filterStartFiles()
  - Ensure each function is under 50 lines
  - _Requirements: 3.2_


- [x] 4.2 Decompose searchDirectory function

  - Reduce searchDirectory() from 53 lines to under 50
  - Reduce complexity from 18 to under 10
  - Reduce nesting from 4 to 3 using early returns
  - _Requirements: 3.2, 3.3, 4.2, 4.3_



- [x] 4.3 Decompose setStartFile function

  - Split setStartFile() (57 lines) into validateStartFile() and updateMetadata()
  - Ensure each function is under 50 lines
  - _Requirements: 3.2_

- [x] 5. Refactor configService.ts





  - Decompose listConfigFiles() (93 lines) into validateConfigPath(), scanConfigDirectory(), parseConfigFiles(), formatConfigList()
  - Ensure all functions are under 50 lines
  - _Requirements: 3.2_

- [x] 6. Refactor metadataApiService.ts






- [x] 6.1 Decompose updateServerMetadata function

  - Split updateServerMetadata() (96 lines, complexity 16) into validateMetadata(), loadExistingMetadata(), mergeMetadata(), saveMetadata()
  - Reduce complexity to under 10
  - Ensure all functions are under 50 lines
  - _Requirements: 3.2, 3.3_

- [x] 6.2 Decompose deleteServerInstance function

  - Split deleteServerInstance() (63 lines) into validateDeletion(), stopServerIfRunning(), removeServerFiles()
  - Ensure all functions are under 50 lines
  - _Requirements: 3.2_

- [x] 7. Refactor JavaManagement.tsx into feature structure




- [x] 7.1 Create Java feature directory and extract hooks


  - Create `features/java/` directory
  - Create `features/java/useJavaInfo.ts` hook for Java info fetching logic
  - Create `features/java/useJabbaInstall.ts` hook for installation logic
  - _Requirements: 6.2, 6.3, 7.1, 7.2, 7.3, 7.5_

- [x] 7.2 Extract Java UI components


  - Create `features/java/JavaInfo.tsx` for Java information display
  - Create `features/java/JabbaInstall.tsx` for installation UI
  - Create `features/java/JavaVersionSelector.tsx` for version selection
  - Ensure each component is under 150 lines
  - _Requirements: 2.5, 6.1, 6.4_

- [x] 7.3 Refactor main JavaManagement component


  - Simplify `features/java/JavaManagement.tsx` to under 100 lines
  - Use extracted hooks and components
  - Reduce complexity from 13 to under 10
  - Verify Java management functionality works
  - _Requirements: 2.5, 3.2, 3.3, 6.5, 12.4_
-

- [ ] 8. Refactor ConfigurationManagement.tsx into feature structure

- [x] 8.1 Create config feature directory and extract hook


  - Create `features/config/` directory
  - Create `features/config/useConfigFiles.ts` hook for config file operations
  - _Requirements: 6.2, 7.1, 7.4, 7.5_

- [x] 8.2 Extract config UI components


  - Create `features/config/ConfigFileList.tsx` for file list display
  - Create `features/config/ConfigEditor.tsx` for editor UI
  - Ensure each component is under 100 lines
  - _Requirements: 6.1, 6.4_

- [-] 8.3 Refactor main ConfigurationManagement component

  - Simplify `features/config/ConfigurationManagement.tsx` to under 80 lines
  - Use extracted hook and components
  - Reduce complexity from 13 to under 10
  - Verify configuration editing works
  - _Requirements: 2.4, 3.2, 3.3, 6.5, 12.3_

- [ ] 9. Refactor ProjectSelection.tsx

  - Extract `ServerCard.tsx` component for individual server cards
  - Create `useServerList.ts` hook for server list management
  - Reduce main component size from 146 lines
  - _Requirements: 6.1, 7.1_

- [ ] 10. Optimize server sub-components
- [ ] 10.1 Refactor DeleteDialog.tsx
  - Extract validation logic into custom hook
  - _Requirements: 7.1_

- [ ] 10.2 Refactor RenameDialog.tsx
  - Extract validation logic into custom hook
  - _Requirements: 7.1_

- [ ] 10.3 Refactor ServerControls.tsx
  - Extract button group into separate component
  - _Requirements: 6.1_

- [ ] 10.4 Refactor ServerInfoCard.tsx
  - Split into ServerInfoHeader.tsx, ServerInfoDetails.tsx, ServerInfoActions.tsx
  - Reduce complexity from 14 to under 10
  - _Requirements: 3.2, 3.3, 6.1_

- [ ] 10.5 Refactor ServerLogs.tsx
  - Extract log parsing into utility function
  - Reduce complexity from 18 to under 10
  - _Requirements: 3.2, 3.3_

- [ ] 10.6 Refactor StartFileDialog.tsx
  - Extract StartFileList.tsx component
  - Create useStartFileSearch.ts hook
  - _Requirements: 6.1, 7.1_

- [ ] 11. Optimize custom hooks
- [ ] 11.1 Split useServerStatus.ts
  - Separate into useServerPolling.ts and useServerLogs.ts
  - Reduce from 123 lines
  - _Requirements: 7.1_

- [ ] 11.2 Consider splitting useServerFileUpload.ts
  - Optionally separate into useRegularUpload.ts and useStreamUpload.ts
  - Currently 98 lines, may be acceptable as-is
  - _Requirements: 7.1_

- [ ] 11.3 Optimize useStartFile.ts
  - Extract validation logic
  - Move API calls to service layer
  - _Requirements: 7.1_

- [ ] 12. Replace console.log with structured logger
- [ ] 12.1 Update serverService.ts logging
  - Import logger from @/lib/logger
  - Replace all console.log with logger.info
  - Replace all console.error with logger.error
  - Replace all console.warn with logger.warn
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 12.2 Update serverFileService.ts logging
  - Import logger and replace all console statements
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 12.3 Update remaining service files
  - Update javaService.ts, metadataService.ts, metadataApiService.ts, configService.ts
  - Update src/index.ts
  - Verify no console.log warnings remain
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 13. Fix React Hook dependencies
- [ ] 13.1 Fix useEffect dependencies in components
  - Fix ConfigurationManagement.tsx loadConfigFiles dependency
  - Fix JavaManagement.tsx fetchJavaInfo dependency
  - Add dependencies or eslint-disable comments with justification
  - _Requirements: 10.1, 10.2, 10.3_

- [ ] 13.2 Fix useEffect dependencies in hooks
  - Fix useServerInfo.ts fetchServerInfo dependency
  - Fix useServerStatus.ts checkServerStatus and startLogPolling dependencies
  - Fix WelcomePage.tsx loadServerFiles dependency
  - _Requirements: 10.1, 10.2, 10.4, 10.5_

- [ ] 14. Remove TypeScript any types
- [ ] 14.1 Define interfaces for all data structures
  - Create interfaces for any types in services/types.ts
  - Create interfaces for any types in service files
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ] 14.2 Replace any with specific types
  - Fix any in services/types.ts:43
  - Fix any in services/serverService.ts:12
  - Fix any in services/serverFileService.ts
  - Fix any in services/metadataApiService.ts:99
  - Fix any in hooks/useStartFile.ts (2 occurrences)
  - Fix any in components/server/ServerOverview.tsx:54
  - Use unknown where type is truly unknown
  - _Requirements: 9.1, 9.2, 9.5_

- [ ] 15. Clean up unused variables
  - Prefix intentionally unused catch block parameters with underscore (_error)
  - Fix unused variables in services/configService.ts (2 occurrences)
  - Fix unused variables in services/serverFileService.ts (4 occurrences)
  - Fix unused variable in services/serverService.ts (serverDir)
  - Verify no no-unused-vars warnings remain
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ] 16. Reduce code nesting depth
- [ ] 16.1 Apply guard clauses to serverService.ts
  - Identify functions with nesting >3
  - Refactor using early returns
  - _Requirements: 4.1, 4.2_

- [ ] 16.2 Apply guard clauses to serverFileService.ts
  - Identify functions with nesting >3
  - Refactor using early returns
  - _Requirements: 4.1, 4.2_

- [ ] 16.3 Apply guard clauses to remaining services
  - Fix nesting in javaService.ts
  - Fix nesting in startFileService.ts searchDirectory function
  - Verify no max-depth warnings remain
  - _Requirements: 4.1, 4.2_

- [ ] 17. Final verification and testing
- [ ] 17.1 Run complete linting check
  - Execute `bun lint` and verify 0 errors, <20 warnings
  - _Requirements: 1.1, 1.3_

- [ ] 17.2 Verify all functionality
  - Test server creation from ZIP file
  - Test server start and stop
  - Test server log viewing
  - Test configuration file editing
  - Test Java management
  - Test all three file upload methods
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ] 17.3 Verify metrics targets
  - Confirm no files exceed 300 lines
  - Confirm no functions exceed 50 lines
  - Confirm all complexity ≤10
  - Confirm all nesting ≤3
  - _Requirements: 2.1, 2.2, 3.1, 4.1_
