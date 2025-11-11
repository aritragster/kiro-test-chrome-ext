import StorageService from '../storage/StorageService.js';

/**
 * UIController manages the popup UI and handles user interactions
 */
class UIController {
  constructor() {
    this.storageService = new StorageService();
    this.currentUrl = '';
    this.currentPageTitle = '';
    this.searchDebounceTimer = null;
    
    // DOM element references
    this.searchInput = document.getElementById('searchInput');
    this.noteInput = document.getElementById('noteInput');
    this.saveButton = document.getElementById('saveButton');
    this.notesContainer = document.getElementById('notesContainer');
    this.emptyState = document.getElementById('emptyState');
    this.errorContainer = document.getElementById('errorContainer');
  }

  /**
   * Initializes the UI controller by setting up event listeners and loading notes
   */
  async initialize() {
    try {
      // Get current tab URL and title
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) {
        this.displayError('Unable to access current tab information. Please refresh the page and try again.');
        return;
      }
      
      if (!tab.url) {
        this.displayError('Cannot access this page. The extension may not have permission for this URL.');
        return;
      }
      
      this.currentUrl = tab.url;
      this.currentPageTitle = tab.title || 'Untitled';
      
      // Set up event listeners
      this.saveButton.addEventListener('click', () => this.handleCreateNote());
      this.searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
      
      // Load notes for current page
      await this.loadNotesForCurrentPage();
    } catch (error) {
      console.error('Error initializing UI:', error);
      this.displayError('Failed to initialize extension. Please close and reopen the popup, or refresh the page.');
    }
  }

  /**
   * Loads and displays notes for the current page
   */
  async loadNotesForCurrentPage() {
    try {
      const notes = await this.storageService.getNotesByUrl(this.currentUrl);
      this.renderNotes(notes);
    } catch (error) {
      console.error('Error loading notes:', error);
      this.displayError('Failed to load notes');
    }
  }

  /**
   * Renders notes in the DOM
   * @param {Array} notes - Array of note objects to render
   */
  renderNotes(notes) {
    // Clear existing notes
    this.notesContainer.innerHTML = '';
    
    // Show/hide empty state
    if (notes.length === 0) {
      this.emptyState.style.display = 'block';
      return;
    }
    
    this.emptyState.style.display = 'none';
    
    // Render each note
    notes.forEach(note => {
      const noteElement = this.createNoteElement(note);
      this.notesContainer.appendChild(noteElement);
    });
  }

  /**
   * Creates a DOM element for a note
   * @param {Object} note - The note object
   * @returns {HTMLElement} The note element
   */
  createNoteElement(note) {
    const noteDiv = document.createElement('div');
    noteDiv.className = 'note-item';
    noteDiv.dataset.noteId = note.id;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'note-content';
    contentDiv.textContent = note.content;
    
    const metaDiv = document.createElement('div');
    metaDiv.className = 'note-meta';
    
    const createdDate = this.formatDate(note.createdAt);
    let metaText = `Created: ${createdDate}`;
    
    // Show last-modified timestamp if note was edited
    if (note.updatedAt > note.createdAt) {
      const updatedDate = this.formatDate(note.updatedAt);
      metaText += ` • Last modified: ${updatedDate}`;
    }
    
    metaDiv.textContent = metaText;
    
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'note-actions';
    
    const editButton = document.createElement('button');
    editButton.className = 'btn btn-small';
    editButton.textContent = 'Edit';
    editButton.addEventListener('click', () => this.handleEditNote(note.id));
    
    const deleteButton = document.createElement('button');
    deleteButton.className = 'btn btn-small btn-danger';
    deleteButton.textContent = 'Delete';
    deleteButton.addEventListener('click', () => this.handleDeleteNote(note.id));
    
    actionsDiv.appendChild(editButton);
    actionsDiv.appendChild(deleteButton);
    
    noteDiv.appendChild(contentDiv);
    noteDiv.appendChild(metaDiv);
    noteDiv.appendChild(actionsDiv);
    
    return noteDiv;
  }

  /**
   * Formats a timestamp into a human-readable date string
   * @param {number} timestamp - Unix timestamp in milliseconds
   * @returns {string} Formatted date string
   */
  formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  }

  /**
   * Handles creating a new note
   */
  async handleCreateNote() {
    const content = this.noteInput.value.trim();
    
    // Validate content is not empty
    if (!content) {
      this.displayError('Please enter some content for your note');
      return;
    }
    
    try {
      await this.storageService.createNote(content, this.currentUrl, this.currentPageTitle);
      
      // Clear input field
      this.noteInput.value = '';
      
      // Show confirmation message
      this.displayConfirmation('Note saved successfully!');
      
      // Refresh notes list
      await this.loadNotesForCurrentPage();
    } catch (error) {
      console.error('Error creating note:', error);
      this.displayError('Failed to save note. Please try again.');
    }
  }

  /**
   * Handles editing a note
   * @param {string} noteId - The ID of the note to edit
   */
  async handleEditNote(noteId) {
    const noteElement = document.querySelector(`[data-note-id="${noteId}"]`);
    if (!noteElement) return;
    
    const contentDiv = noteElement.querySelector('.note-content');
    const actionsDiv = noteElement.querySelector('.note-actions');
    const originalContent = contentDiv.textContent;
    
    // Replace content with editable textarea
    const textarea = document.createElement('textarea');
    textarea.className = 'note-textarea';
    textarea.value = originalContent;
    textarea.rows = 4;
    
    contentDiv.replaceWith(textarea);
    
    // Replace action buttons with save/cancel
    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-small btn-primary';
    saveBtn.textContent = 'Save';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-small';
    cancelBtn.textContent = 'Cancel';
    
    // Save handler
    saveBtn.addEventListener('click', async () => {
      const newContent = textarea.value.trim();
      
      if (!newContent) {
        this.displayError('Note content cannot be empty');
        return;
      }
      
      try {
        await this.storageService.updateNote(noteId, newContent);
        await this.loadNotesForCurrentPage();
      } catch (error) {
        console.error('Error updating note:', error);
        this.displayError('Failed to update note. Please try again.');
      }
    });
    
    // Cancel handler
    cancelBtn.addEventListener('click', () => {
      textarea.replaceWith(contentDiv);
      actionsDiv.innerHTML = '';
      
      const editButton = document.createElement('button');
      editButton.className = 'btn btn-small';
      editButton.textContent = 'Edit';
      editButton.addEventListener('click', () => this.handleEditNote(noteId));
      
      const deleteButton = document.createElement('button');
      deleteButton.className = 'btn btn-small btn-danger';
      deleteButton.textContent = 'Delete';
      deleteButton.addEventListener('click', () => this.handleDeleteNote(noteId));
      
      actionsDiv.appendChild(editButton);
      actionsDiv.appendChild(deleteButton);
    });
    
    actionsDiv.innerHTML = '';
    actionsDiv.appendChild(saveBtn);
    actionsDiv.appendChild(cancelBtn);
    
    textarea.focus();
  }

  /**
   * Handles deleting a note with confirmation
   * @param {string} noteId - The ID of the note to delete
   */
  async handleDeleteNote(noteId) {
    // Display confirmation dialog
    const confirmed = confirm('Are you sure you want to delete this note? This action cannot be undone.');
    
    if (!confirmed) {
      return;
    }
    
    try {
      await this.storageService.deleteNote(noteId);
      await this.loadNotesForCurrentPage();
    } catch (error) {
      console.error('Error deleting note:', error);
      this.displayError('Failed to delete note. Please try again.');
    }
  }

  /**
   * Handles search with debouncing
   * @param {string} query - The search query
   */
  handleSearch(query) {
    // Clear existing timer
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    
    // Set new timer for 300ms debounce
    this.searchDebounceTimer = setTimeout(async () => {
      try {
        const notes = await this.storageService.searchNotes(query, this.currentUrl);
        this.renderNotes(notes);
      } catch (error) {
        console.error('Error searching notes:', error);
        this.displayError('Failed to search notes');
      }
    }, 300);
  }

  /**
   * Displays an error message to the user
   * @param {string} message - The error message to display
   */
  displayError(message) {
    this.errorContainer.textContent = message;
    this.errorContainer.style.display = 'block';
    this.errorContainer.className = 'error-message';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      this.errorContainer.style.display = 'none';
    }, 5000);
  }

  /**
   * Displays a confirmation message to the user
   * @param {string} message - The confirmation message to display
   */
  displayConfirmation(message) {
    this.errorContainer.textContent = message;
    this.errorContainer.style.display = 'block';
    this.errorContainer.className = 'confirmation-message';
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      this.errorContainer.style.display = 'none';
    }, 3000);
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const controller = new UIController();
  controller.initialize();
});
