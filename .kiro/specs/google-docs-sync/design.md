# Google Docs Sync Integration - Design Document

## Overview

This feature adds Google Docs synchronization capabilities to the Web Notes extension, allowing users to back up their notes to a centralized Google Docs document. The integration uses Google's OAuth 2.0 for authentication and the Google Docs API for document creation and manipulation. Notes are organized by website with proper formatting and timestamps.

## Architecture

### High-Level Components

```
┌─────────────────┐
│   UI Layer      │
│  (popup.html)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────────┐
│  UIController   │◄────►│  SyncController  │
└────────┬────────┘      └────────┬─────────┘
         │                        │
         ▼                        ▼
┌─────────────────┐      ┌──────────────────┐
│ StorageService  │      │ GoogleDocsService│
└─────────────────┘      └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │  AuthService     │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │ Google APIs      │
                         │ (OAuth, Docs)    │
                         └──────────────────┘
```

### Component Responsibilities

1. **AuthService** - Handles OAuth 2.0 authentication flow, token management, and credential storage
2. **GoogleDocsService** - Manages Google Docs API interactions, document creation, and content formatting
3. **SyncController** - Orchestrates sync operations, manages sync state, and handles error recovery
4. **UIController** (extended) - Adds sync UI controls, status display, and user interactions

## Components and Interfaces

### 1. AuthService

**Purpose:** Manages Google OAuth 2.0 authentication and token lifecycle

**Methods:**
```javascript
class AuthService {
  async authenticate()           // Initiates OAuth flow, returns token
  async getToken()               // Retrieves stored token or refreshes if expired
  async revokeToken()            // Revokes token and clears credentials
  async isAuthenticated()        // Checks if user has valid token
  async getUserEmail()           // Retrieves authenticated user's email
}
```

**Storage Keys:**
- `google_oauth_token` - Encrypted OAuth token
- `google_user_email` - User's email address
- `google_token_expiry` - Token expiration timestamp

### 2. GoogleDocsService

**Purpose:** Handles all Google Docs API operations

**Methods:**
```javascript
class GoogleDocsService {
  async createDocument(title)                    // Creates new Google Doc
  async getDocument(documentId)                  // Retrieves document metadata
  async updateDocumentContent(documentId, notes) // Replaces entire document content
  async formatNotesAsDocContent(notes)           // Converts notes to Docs API format
  getDocumentUrl(documentId)                     // Returns shareable URL
}
```

**Document Structure:**
```
Web Notes - [Date]
═══════════════════

[Website Title 1]
URL: https://example.com/page1
─────────────────

Note Content 1
Created: Jan 15, 2025 at 2:30 PM
Last Modified: Jan 16, 2025 at 10:15 AM

Note Content 2
Created: Jan 14, 2025 at 5:45 PM

─────────────────

[Website Title 2]
URL: https://example.com/page2
─────────────────

Note Content 3
Created: Jan 13, 2025 at 9:00 AM
```

### 3. SyncController

**Purpose:** Orchestrates synchronization between local storage and Google Docs

**Methods:**
```javascript
class SyncController {
  async performSync()              // Executes full sync operation
  async scheduleSyncAfterDelay()   // Schedules sync with 5-second delay
  async getSyncStatus()            // Returns current sync state
  async getLastSyncTime()          // Returns last successful sync timestamp
  cancelPendingSync()              // Cancels scheduled sync
}
```

**Sync State Machine:**
```
IDLE → PENDING → SYNCING → SUCCESS → IDLE
                    ↓
                  ERROR → IDLE (with retry)
```

**Storage Keys:**
- `google_doc_id` - Master document ID
- `last_sync_timestamp` - Last successful sync time
- `sync_status` - Current sync state
- `pending_sync_timer` - Timer ID for delayed sync

### 4. UI Extensions

**New UI Elements:**
```html
<!-- Sync Section in popup.html -->
<section class="sync-section">
  <div class="sync-header">
    <h2>Google Docs Sync</h2>
    <span class="sync-status-badge">●</span>
  </div>
  
  <div class="auth-container" id="authContainer">
    <button id="connectGoogleBtn">Connect to Google</button>
    <div id="connectedInfo" style="display: none;">
      <span id="userEmail"></span>
      <button id="disconnectBtn">Disconnect</button>
    </div>
  </div>
  
  <div class="sync-controls" id="syncControls" style="display: none;">
    <button id="syncNowBtn">Sync Now</button>
    <button id="openDocsBtn">Open in Google Docs</button>
  </div>
  
  <div class="sync-info">
    <p id="syncStatusText">Not connected</p>
    <p id="lastSyncTime"></p>
  </div>
</section>
```

## Data Models

### SyncState
```javascript
{
  status: 'idle' | 'pending' | 'syncing' | 'success' | 'error',
  lastSyncTime: number | null,
  lastError: string | null,
  notesSynced: number
}
```

### AuthCredentials
```javascript
{
  token: string,
  email: string,
  expiresAt: number
}
```

### GoogleDocMetadata
```javascript
{
  documentId: string,
  title: string,
  createdAt: number,
  url: string
}
```

## Error Handling

### Authentication Errors
- **Token Expired:** Automatically attempt to refresh token, prompt re-auth if refresh fails
- **User Cancels OAuth:** Display message explaining sync requires authentication
- **Invalid Credentials:** Clear stored credentials and prompt re-authentication

### Sync Errors
- **Network Failure:** Retry up to 3 times with exponential backoff (5s, 10s, 20s)
- **API Rate Limit:** Queue sync for retry after rate limit window
- **Document Not Found:** Create new document and retry sync
- **Permission Denied:** Prompt user to re-authenticate with correct scopes

### Error Display
- Show user-friendly error messages in popup
- Provide actionable retry options
- Log detailed errors to console for debugging

## Testing Strategy

### Unit Tests
1. **AuthService Tests**
   - Token storage and retrieval
   - Token expiration handling
   - OAuth flow simulation

2. **GoogleDocsService Tests**
   - Document creation with mock API
   - Content formatting validation
   - API error handling

3. **SyncController Tests**
   - Sync scheduling and cancellation
   - State transitions
   - Error recovery logic

### Integration Tests
1. **End-to-End Sync Flow**
   - Create note → Auto-sync → Verify in Google Docs
   - Update note → Auto-sync → Verify changes
   - Delete note → Auto-sync → Verify removal

2. **Authentication Flow**
   - Connect → Sync → Disconnect → Verify cleanup
   - Token expiration → Re-auth → Resume sync

### Manual Testing Checklist
- [ ] OAuth flow completes successfully
- [ ] Notes sync to Google Docs with correct formatting
- [ ] Manual sync button works
- [ ] Open in Google Docs button navigates correctly
- [ ] Sync status updates in real-time
- [ ] Disconnect clears all credentials
- [ ] Error messages display appropriately
- [ ] Auto-sync triggers after note changes

## Security Considerations

1. **Token Storage:** OAuth tokens stored in chrome.storage.local (encrypted by Chrome)
2. **Minimal Scopes:** Request only necessary Google API scopes (docs, drive.file)
3. **Token Revocation:** Properly revoke tokens on disconnect
4. **HTTPS Only:** All API calls use HTTPS
5. **No Sensitive Data Logging:** Avoid logging tokens or user data

## Performance Considerations

1. **Debounced Sync:** 5-second delay prevents excessive API calls
2. **Batch Updates:** Single API call updates entire document
3. **Cached Document ID:** Store document ID to avoid search operations
4. **Lazy Loading:** Only load Google APIs when sync feature is used
5. **Background Sync:** Consider using service worker for background sync (future enhancement)

## API Integration Details

### Required Google Cloud Setup
1. Create project in Google Cloud Console
2. Enable Google Docs API and Google Drive API
3. Configure OAuth consent screen
4. Create OAuth 2.0 credentials (Chrome Extension)
5. Add authorized redirect URIs

### Chrome Extension OAuth Flow
```javascript
// Uses chrome.identity.getAuthToken()
// Automatically handles OAuth popup and token exchange
// No need for manual redirect URI handling
```

### Google Docs API Endpoints
- **Create Document:** `POST https://docs.googleapis.com/v1/documents`
- **Get Document:** `GET https://docs.googleapis.com/v1/documents/{documentId}`
- **Batch Update:** `POST https://docs.googleapis.com/v1/documents/{documentId}:batchUpdate`

### Rate Limits
- Google Docs API: 300 requests per minute per user
- Strategy: Implement exponential backoff for rate limit errors

## Future Enhancements

1. **Conflict Resolution:** Handle manual edits in Google Docs
2. **Selective Sync:** Allow users to choose which notes to sync
3. **Multiple Documents:** Organize notes across multiple docs by domain
4. **Real-time Sync:** Use Google Drive API push notifications
5. **Export Options:** Support other formats (PDF, Markdown)
6. **Sync History:** Track sync operations and changes
