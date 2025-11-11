# Web Notes Chrome Extension

A lightweight Chrome extension that lets you capture and manage notes while browsing websites. Keep your thoughts organized and tied to the pages you're viewing.

## Features

- **Quick Note Capture**: Add notes instantly while browsing any webpage
- **URL-Based Organization**: Notes are automatically associated with the current page
- **Search Functionality**: Find notes quickly by searching content or page titles
- **Edit & Delete**: Manage your notes with easy editing and deletion
- **Timestamps**: Track when notes were created and last modified
- **Clean UI**: Simple, intuitive interface that doesn't get in your way
- **Secure**: Input sanitization and XSS protection built-in

## Installation

### From Source

1. Clone this repository:
```bash
git clone https://github.com/aritragster/kiro-test-chrome-ext.git
cd kiro-test-chrome-ext
```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" (toggle in top-right corner)

4. Click "Load unpacked" and select the extension directory

5. The Web Notes icon should appear in your Chrome toolbar

## Usage

1. **Create a Note**: Click the extension icon, type your note, and click "Save Note"

2. **View Notes**: All notes for the current page are displayed automatically

3. **Search Notes**: Use the search bar to filter notes by content or page title

4. **Edit a Note**: Click "Edit" on any note, make changes, and save

5. **Delete a Note**: Click "Delete" and confirm to remove a note

## Project Structure

```
├── manifest.json           # Extension configuration
├── popup/
│   ├── popup.html         # Extension popup UI
│   ├── popup.js           # UI controller and event handlers
│   └── popup.css          # Styling
├── storage/
│   └── StorageService.js  # Data persistence layer
├── assets/
│   └── icon.png          # Extension icon
└── .kiro/
    └── specs/            # Feature specifications and design docs
```

## Technical Details

- **Manifest Version**: 3
- **Storage**: Chrome Local Storage API
- **Architecture**: Service-based with separation of concerns
- **Security**: Input sanitization, XSS prevention, data validation

## Development

This project was built using the Kiro IDE with a spec-driven development approach. The complete requirements, design, and implementation plan can be found in `.kiro/specs/web-notes-extension/`.

### Key Components

- **StorageService**: Handles all CRUD operations for notes with built-in validation
- **UIController**: Manages the popup interface and user interactions
- **Data Validation**: Ensures data integrity with comprehensive validation rules

## Permissions

- `storage`: Store notes locally
- `tabs`: Access current tab information
- `activeTab`: Get URL and title of active page

## Privacy

All notes are stored locally on your device using Chrome's storage API. No data is sent to external servers.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
