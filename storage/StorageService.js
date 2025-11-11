/**
 * Generates a unique identifier (UUID v4)
 * @returns {string} A unique identifier
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * StorageService handles all note storage operations using Chrome's local storage API
 */
class StorageService {
  constructor() {
    this.storageKey = 'notes';
  }

  /**
   * Sanitizes user input to prevent XSS attacks
   * @param {string} input - The input string to sanitize
   * @returns {string} Sanitized string
   */
  sanitizeInput(input) {
    if (typeof input !== 'string') {
      return '';
    }
    
    // Remove any HTML tags and trim whitespace
    return input.replace(/<[^>]*>/g, '').trim();
  }

  /**
   * Validates a note object to ensure data integrity
   * @param {Object} note - The note object to validate
   * @returns {boolean} True if note is valid, false otherwise
   */
  isValidNote(note) {
    if (!note || typeof note !== 'object') {
      return false;
    }
    
    // Check required fields exist and have correct types
    if (typeof note.id !== 'string' || !note.id) {
      return false;
    }
    
    if (typeof note.content !== 'string') {
      return false;
    }
    
    if (typeof note.url !== 'string' || !note.url) {
      return false;
    }
    
    if (typeof note.pageTitle !== 'string') {
      return false;
    }
    
    if (typeof note.createdAt !== 'number' || note.createdAt <= 0) {
      return false;
    }
    
    if (typeof note.updatedAt !== 'number' || note.updatedAt <= 0) {
      return false;
    }
    
    // Validate that updatedAt is not before createdAt
    if (note.updatedAt < note.createdAt) {
      return false;
    }
    
    return true;
  }

  /**
   * Filters and validates notes from storage
   * @param {Object} notes - Object containing notes
   * @returns {Object} Filtered object with only valid notes
   */
  filterValidNotes(notes) {
    if (!notes || typeof notes !== 'object') {
      return {};
    }
    
    const validNotes = {};
    
    for (const [id, note] of Object.entries(notes)) {
      if (this.isValidNote(note)) {
        validNotes[id] = note;
      } else {
        console.warn(`Invalid note detected and filtered out. ID: ${id}`, note);
      }
    }
    
    return validNotes;
  }

  /**
   * Creates a new note and stores it
   * @param {string} content - The note content
   * @param {string} url - The webpage URL
   * @param {string} pageTitle - The webpage title
   * @returns {Promise<Object>} The created note object
   */
  async createNote(content, url, pageTitle) {
    try {
      // Sanitize inputs to prevent XSS
      const sanitizedContent = this.sanitizeInput(content);
      const sanitizedUrl = this.sanitizeInput(url);
      const sanitizedPageTitle = this.sanitizeInput(pageTitle);
      
      // Validate sanitized content is not empty
      if (!sanitizedContent) {
        throw new Error('Note content cannot be empty');
      }
      
      if (!sanitizedUrl) {
        throw new Error('URL cannot be empty');
      }
      
      const noteId = generateUUID();
      const timestamp = Date.now();
      
      const note = {
        id: noteId,
        content: sanitizedContent,
        url: sanitizedUrl,
        pageTitle: sanitizedPageTitle,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      // Get existing notes
      const result = await chrome.storage.local.get(this.storageKey);
      const notes = this.filterValidNotes(result[this.storageKey] || {});
      
      // Add new note
      notes[noteId] = note;
      
      // Save to storage
      await chrome.storage.local.set({ [this.storageKey]: notes });
      
      return note;
    } catch (error) {
      console.error('Error creating note:', error);
      throw new Error('Failed to create note');
    }
  }

  /**
   * Retrieves all notes for a specific URL
   * @param {string} url - The webpage URL to filter by
   * @returns {Promise<Array>} Array of notes sorted by creation date (newest first)
   */
  async getNotesByUrl(url) {
    try {
      const result = await chrome.storage.local.get(this.storageKey);
      const allNotes = result[this.storageKey] || {};
      
      // Validate and filter out corrupted notes
      const validNotes = this.filterValidNotes(allNotes);
      
      // Filter notes by URL and convert to array
      const filteredNotes = Object.values(validNotes)
        .filter(note => note.url === url)
        .sort((a, b) => b.createdAt - a.createdAt);
      
      return filteredNotes;
    } catch (error) {
      console.error('Error retrieving notes:', error);
      throw new Error('Failed to retrieve notes');
    }
  }

  /**
   * Updates an existing note's content
   * @param {string} id - The note ID
   * @param {string} content - The new content
   * @returns {Promise<Object>} The updated note object
   */
  async updateNote(id, content) {
    try {
      // Sanitize input to prevent XSS
      const sanitizedContent = this.sanitizeInput(content);
      
      // Validate sanitized content is not empty
      if (!sanitizedContent) {
        throw new Error('Note content cannot be empty');
      }
      
      const result = await chrome.storage.local.get(this.storageKey);
      const allNotes = result[this.storageKey] || {};
      
      // Validate and filter out corrupted notes
      const notes = this.filterValidNotes(allNotes);
      
      if (!notes[id]) {
        throw new Error('Note not found');
      }
      
      // Update note content and timestamp
      notes[id].content = sanitizedContent;
      notes[id].updatedAt = Date.now();
      
      // Save to storage
      await chrome.storage.local.set({ [this.storageKey]: notes });
      
      return notes[id];
    } catch (error) {
      console.error('Error updating note:', error);
      throw new Error('Failed to update note');
    }
  }

  /**
   * Deletes a note by ID
   * @param {string} id - The note ID to delete
   * @returns {Promise<void>}
   */
  async deleteNote(id) {
    try {
      const result = await chrome.storage.local.get(this.storageKey);
      const allNotes = result[this.storageKey] || {};
      
      // Validate and filter out corrupted notes
      const notes = this.filterValidNotes(allNotes);
      
      if (!notes[id]) {
        throw new Error('Note not found');
      }
      
      // Remove note
      delete notes[id];
      
      // Save to storage
      await chrome.storage.local.set({ [this.storageKey]: notes });
    } catch (error) {
      console.error('Error deleting note:', error);
      throw new Error('Failed to delete note');
    }
  }

  /**
   * Searches notes by content and page title
   * @param {string} query - The search query
   * @param {string} url - The current URL to filter by
   * @returns {Promise<Array>} Array of matching notes
   */
  async searchNotes(query, url) {
    try {
      const result = await chrome.storage.local.get(this.storageKey);
      const allNotes = result[this.storageKey] || {};
      
      // Validate and filter out corrupted notes
      const validNotes = this.filterValidNotes(allNotes);
      
      // Convert to array and filter by URL
      let filteredNotes = Object.values(validNotes).filter(note => note.url === url);
      
      // If query is provided, filter by content and pageTitle
      if (query && query.trim() !== '') {
        const lowerQuery = query.toLowerCase();
        filteredNotes = filteredNotes.filter(note => 
          note.content.toLowerCase().includes(lowerQuery) ||
          note.pageTitle.toLowerCase().includes(lowerQuery)
        );
      }
      
      // Sort by creation date (newest first)
      return filteredNotes.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      console.error('Error searching notes:', error);
      throw new Error('Failed to search notes');
    }
  }
}

export default StorageService;
