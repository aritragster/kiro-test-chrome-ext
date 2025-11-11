# Implementation Plan

- [ ] 1. Update manifest and project configuration
  - Add "identity" permission to manifest.json for OAuth support
  - Add oauth2 configuration with client_id and scopes for Google Docs and Drive APIs
  - Add host_permissions for Google API endpoints
  - Create configuration file for Google Cloud project credentials
  - _Requirements: 1.1, 1.2_

- [ ] 2. Implement AuthService for Google OAuth
  - [ ] 2.1 Create AuthService class with token management
    - Write AuthService class with methods for authenticate, getToken, revokeToken
    - Implement chrome.identity.getAuthToken integration for OAuth flow
    - Add token storage and retrieval using chrome.storage.local
    - Implement token expiration checking and refresh logic
    - _Requirements: 1.1, 1.2, 6.5_
  
  - [ ] 2.2 Implement authentication state management
    - Write isAuthenticated method to check token validity
    - Implement getUserEmail method to retrieve user information
    - Add credential clearing on revocation
    - Handle OAuth errors and user cancellation
    - _Requirements: 1.3, 1.4, 1.5_

- [ ] 3. Implement GoogleDocsService for API integration
  - [ ] 3.1 Create GoogleDocsService class structure
    - Write GoogleDocsService class with API endpoint constants
    - Implement helper method for authenticated API requests
    - Add error handling for API responses
    - Implement rate limit detection and backoff logic
    - _Requirements: 2.4, 4.4_
  
  - [ ] 3.2 Implement document creation and retrieval
    - Write createDocument method to create new Google Docs
    - Implement getDocument method to fetch document metadata
    - Add getDocumentUrl method to generate shareable links
    - Store and retrieve document ID from chrome.storage.local
    - _Requirements: 2.4, 5.3, 5.4, 5.5_
  
  - [ ] 3.3 Implement note formatting for Google Docs
    - Write formatNotesAsDocContent method to convert notes to Docs API format
    - Implement grouping logic to organize notes by URL
    - Add formatting for headings, URLs, timestamps, and note content
    - Sort notes by creation timestamp within each URL group
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [ ] 3.4 Implement document content update
    - Write updateDocumentContent method using batchUpdate API
    - Implement logic to replace entire document content
    - Add retry logic for failed updates
    - Handle document not found errors by creating new document
    - _Requirements: 2.1, 2.2, 2.3, 4.3_

- [ ] 4. Implement SyncController for orchestration
  - [ ] 4.1 Create SyncController class with state management
    - Write SyncController class with sync state tracking
    - Implement getSyncStatus and getLastSyncTime methods
    - Add storage for sync metadata (last sync time, status, notes count)
    - Create state transition logic (idle → pending → syncing → success/error)
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  
  - [ ] 4.2 Implement automatic sync scheduling
    - Write scheduleSyncAfterDelay method with 5-second debounce
    - Implement cancelPendingSync to clear scheduled syncs
    - Add logic to trigger sync after note create/update/delete operations
    - Ensure only one sync operation runs at a time
    - _Requirements: 2.1, 2.2, 2.3_
  
  - [ ] 4.3 Implement performSync method
    - Write performSync method to orchestrate full sync operation
    - Fetch all notes from StorageService
    - Call GoogleDocsService to format and update document
    - Update sync status and timestamp on success
    - Handle errors with retry logic and user notification
    - _Requirements: 2.5, 4.2, 4.4, 4.5_

- [ ] 5. Extend UI with sync controls and status
  - [ ] 5.1 Add sync section HTML and styling
    - Add sync section to popup.html with auth and sync controls
    - Create CSS styles for sync status badges, buttons, and info display
    - Add loading spinner for sync in progress state
    - Style connected/disconnected states differently
    - _Requirements: 1.4, 4.1, 6.1, 6.2_
  
  - [ ] 5.2 Extend UIController with sync UI logic
    - Add DOM references for sync UI elements in UIController
    - Implement showAuthUI and showSyncUI methods to toggle views
    - Write updateSyncStatus method to display current sync state
    - Add displayLastSyncTime method with human-readable formatting
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  
  - [ ] 5.3 Implement authentication UI handlers
    - Write handleConnectGoogle method for connect button click
    - Implement handleDisconnect method for disconnect button click
    - Add UI updates to show connected user email
    - Display authentication errors to user
    - _Requirements: 1.1, 1.3, 1.4, 1.5_
  
  - [ ] 5.4 Implement sync action handlers
    - Write handleSyncNow method for manual sync button click
    - Implement handleOpenDocs method to open Google Doc in new tab
    - Add loading state display during sync operations
    - Show success/error messages after sync completion
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 5.1, 5.2_

- [ ] 6. Integrate sync with existing note operations
  - [ ] 6.1 Hook sync into note lifecycle events
    - Modify handleCreateNote to trigger scheduleSyncAfterDelay
    - Update handleEditNote save action to trigger sync
    - Modify handleDeleteNote to trigger sync after deletion
    - Ensure sync only triggers when user is authenticated
    - _Requirements: 2.1, 2.2, 2.3_
  
  - [ ] 6.2 Add initialization logic for sync feature
    - Check authentication status on popup initialization
    - Load and display last sync status and timestamp
    - Initialize SyncController and set up event listeners
    - Handle cases where user was previously authenticated
    - _Requirements: 1.4, 6.1, 6.2, 6.3_

- [ ] 7. Implement error handling and recovery
  - [ ] 7.1 Add comprehensive error handling
    - Implement user-friendly error messages for all error types
    - Add retry buttons for failed sync operations
    - Handle network failures with exponential backoff
    - Detect and handle token expiration with re-auth prompt
    - _Requirements: 1.3, 4.5, 6.5_
  
  - [ ] 7.2 Add error logging and debugging
    - Implement console logging for sync operations and errors
    - Add detailed error information for troubleshooting
    - Log API responses and state transitions
    - Ensure no sensitive data (tokens) are logged
    - _Requirements: 1.3, 4.5_
