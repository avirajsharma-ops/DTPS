/**
 * DATA IMPORT SERVICE - Transaction-safe data saving
 * 
 * Handles the actual saving of validated data to MongoDB
 * with full transaction support for atomic operations.
 */

import mongoose from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { modelRegistry } from './modelRegistry';
import { validationEngine, ValidationError } from './validationEngine';
import { FileGenerator } from './fileParser';
import dbConnect from '@/lib/db/connection';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface SaveResult {
  success: boolean;
  savedCounts: Record<string, number>;
  totalSaved: number;
  errors: ValidationError[];
  rollback: boolean;
  message: string;
}

export interface ImportSession {
  id: string;
  fileName: string;
  uploadedAt: Date;
  status: 'pending' | 'validated' | 'saved' | 'failed' | 'cleared';
  modelGroups: Array<{
    modelName: string;
    displayName: string;
    rows: Array<{
      rowIndex: number;
      data: Record<string, any>;
      isValid: boolean;
      errors: ValidationError[];
    }>;
    validCount: number;
    invalidCount: number;
  }>;
  unmatchedRows: Array<{
    rowIndex: number;
    data: Record<string, any>;
  }>;
  canSave: boolean;
  savedAt?: Date;
  savedCounts?: Record<string, number>;
}

// In-memory session storage with file persistence
let sessions: Map<string, ImportSession> = new Map();
const SESSIONS_FILE = path.join(process.cwd(), '.tmp', 'import-sessions.json');

// Ensure .tmp directory exists
function ensureSessionsDir() {
  const dir = path.dirname(SESSIONS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Load sessions from file on startup
function loadSessions() {
  try {
    ensureSessionsDir();
    if (fs.existsSync(SESSIONS_FILE)) {
      const data = fs.readFileSync(SESSIONS_FILE, 'utf-8');
      const sessionsData = JSON.parse(data);
      sessions = new Map(Object.entries(sessionsData));
      console.log(`[DataImport] Loaded ${sessions.size} sessions from disk`);
      return;
    }
  } catch (error) {
    console.error('[DataImport] Failed to load sessions from file:', error);
  }
  sessions = new Map();
}

// Save sessions to file
function saveSessions() {
  try {
    ensureSessionsDir();
    const sessionsData = Object.fromEntries(sessions);
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessionsData, null, 2), 'utf-8');
    console.log(`[DataImport] Saved ${sessions.size} sessions to disk`);
  } catch (error) {
    console.error('[DataImport] Failed to save sessions to file:', error);
  }
}

// Load sessions on startup
loadSessions();

// ============================================
// DATA IMPORT SERVICE CLASS
// ============================================

export class DataImportService {
  /**
   * Create a new import session
   */
  createSession(fileName: string): ImportSession {
    const session: ImportSession = {
      id: this.generateSessionId(),
      fileName,
      uploadedAt: new Date(),
      status: 'pending',
      modelGroups: [],
      unmatchedRows: [],
      canSave: false
    };

    sessions.set(session.id, session);
    saveSessions(); // Persist to disk
    console.log(`[DataImport] ✅ Created session ${session.id} for file: ${fileName}`);
    console.log(`[DataImport] Total sessions now: ${sessions.size}`);
    return session;
  }

  /**
   * Get a session by ID
   */
  getSession(sessionId: string): ImportSession | undefined {
    const session = sessions.get(sessionId);
    if (!session) {
      console.error(`[DataImport] ❌ Session ${sessionId} not found`);
      console.error(`[DataImport] Available session IDs: ${Array.from(sessions.keys()).join(', ') || 'NONE'}`);
      console.error(`[DataImport] Total sessions: ${sessions.size}`);
    } else {
      console.log(`[DataImport] ✅ Retrieved session ${sessionId}`);
    }
    return session;
  }

  /**
   * Get all sessions
   */
  getAllSessions(): ImportSession[] {
    return Array.from(sessions.values());
  }

  /**
   * Update session with validation results
   */
  updateSessionWithValidation(
    sessionId: string,
    validationResult: {
      modelGroups: Array<{
        modelName: string;
        displayName: string;
        rows: Array<{
          rowIndex: number;
          data: Record<string, any>;
          isValid: boolean;
          errors: ValidationError[];
        }>;
        validCount: number;
        invalidCount: number;
      }>;
      unmatchedData: Array<{
        rowIndex: number;
        data: Record<string, any>;
      }>;
      canSave: boolean;
    }
  ): ImportSession | null {
    const session = sessions.get(sessionId);
    if (!session) return null;

    session.modelGroups = validationResult.modelGroups;
    session.unmatchedRows = validationResult.unmatchedData;
    session.canSave = validationResult.canSave;
    session.status = 'validated';

    sessions.set(sessionId, session);
    saveSessions(); // Persist to disk
    return session;
  }

  /**
   * Update a specific row in the session
   */
  async updateRow(
    sessionId: string,
    modelName: string,
    rowIndex: number,
    newData: Record<string, any>
  ): Promise<{
    success: boolean;
    row: {
      rowIndex: number;
      data: Record<string, any>;
      isValid: boolean;
      errors: ValidationError[];
    } | null;
    sessionCanSave: boolean;
  }> {
    const session = sessions.get(sessionId);
    if (!session) {
      console.error(`[DataImport] Session ${sessionId} not found for row update`);
      return { success: false, row: null, sessionCanSave: false };
    }

    const group = session.modelGroups.find(g => g.modelName === modelName);
    if (!group) {
      console.error(`[DataImport] Model group ${modelName} not found in session ${sessionId}`);
      console.error(`[DataImport] Available models: ${session.modelGroups.map(g => g.modelName).join(', ')}`);
      return { success: false, row: null, sessionCanSave: false };
    }

    const rowIdx = group.rows.findIndex(r => r.rowIndex === rowIndex);
    if (rowIdx === -1) {
      console.error(`[DataImport] Row ${rowIndex} not found in model ${modelName}`);
      console.error(`[DataImport] Available rows: ${group.rows.map(r => r.rowIndex).join(', ')}`);
      return { success: false, row: null, sessionCanSave: false };
    }

    // Clean and transform the data before re-validation
    let cleanedData = newData;
    
    // Clean the row data (remove fields not in schema)
    const model = modelRegistry.get(modelName);
    if (model) {
      const schemaFields = model.fields.map(f => f.path);
      const allowedFields = new Set([
        ...schemaFields,
        '_id',
        'createdAt',
        'updatedAt',
        '__v'
      ]);

      const normalizeFieldName = (field: string) => {
        return field.toLowerCase().replace(/_/g, '');
      };

      const cleaned: Record<string, any> = {};
      for (const [key, value] of Object.entries(newData)) {
        // Try exact match first
        if (allowedFields.has(key)) {
          cleaned[key] = value;
          continue;
        }

        // Try case-insensitive match
        let matchedField = Array.from(allowedFields).find(af => 
          af.toLowerCase() === key.toLowerCase()
        );
        if (matchedField) {
          cleaned[matchedField] = value;
          continue;
        }

        // Try normalized match
        const keyNormalized = normalizeFieldName(key);
        matchedField = Array.from(allowedFields).find(af => 
          normalizeFieldName(af) === keyNormalized
        );
        if (matchedField) {
          cleaned[matchedField] = value;
        }
      }
      
      cleanedData = cleaned;
    }

    // Re-validate the updated row
    const validationResult = await modelRegistry.validateRow(
      modelName,
      cleanedData,
      rowIndex
    );

    const updatedRow = {
      rowIndex,
      data: cleanedData,
      isValid: validationResult.isValid,
      errors: validationResult.errors.map(e => ({
        row: e.row,
        modelName,
        field: e.field,
        message: e.message,
        value: e.value,
        errorType: 'unknown' as const
      }))
    };

    // Update the row
    const wasValid = group.rows[rowIdx].isValid;
    group.rows[rowIdx] = updatedRow;

    // Update counts
    if (wasValid && !updatedRow.isValid) {
      group.validCount--;
      group.invalidCount++;
    } else if (!wasValid && updatedRow.isValid) {
      group.validCount++;
      group.invalidCount--;
    }

    // Check if session can now be saved
    session.canSave = this.checkCanSave(session);
    sessions.set(sessionId, session);
    saveSessions(); // Persist to disk

    console.log(`[DataImport] Row ${rowIndex} updated in session ${sessionId}, isValid: ${updatedRow.isValid}`);

    return {
      success: true,
      row: updatedRow,
      sessionCanSave: session.canSave
    };
  }

  /**
   * Remove a row from the session
   */
  removeRow(
    sessionId: string,
    modelName: string,
    rowIndex: number
  ): {
    success: boolean;
    sessionCanSave: boolean;
  } {
    const session = sessions.get(sessionId);
    if (!session) {
      return { success: false, sessionCanSave: false };
    }

    const group = session.modelGroups.find(g => g.modelName === modelName);
    if (!group) {
      return { success: false, sessionCanSave: false };
    }

    const rowIdx = group.rows.findIndex(r => r.rowIndex === rowIndex);
    if (rowIdx === -1) {
      return { success: false, sessionCanSave: false };
    }

    // Update counts before removing
    if (group.rows[rowIdx].isValid) {
      group.validCount--;
    } else {
      group.invalidCount--;
    }

    // Remove the row
    group.rows.splice(rowIdx, 1);

    // Check if session can now be saved
    session.canSave = this.checkCanSave(session);
    sessions.set(sessionId, session);
    saveSessions(); // Persist to disk

    return {
      success: true,
      sessionCanSave: session.canSave
    };
  }

  /**
   * Remove an unmatched row from the session
   */
  removeUnmatchedRow(
    sessionId: string,
    rowIndex: number
  ): {
    success: boolean;
    sessionCanSave: boolean;
  } {
    const session = sessions.get(sessionId);
    if (!session) {
      return { success: false, sessionCanSave: false };
    }

    const idx = session.unmatchedRows.findIndex(r => r.rowIndex === rowIndex);
    if (idx === -1) {
      return { success: false, sessionCanSave: false };
    }

    session.unmatchedRows.splice(idx, 1);

    // Check if session can now be saved
    session.canSave = this.checkCanSave(session);
    sessions.set(sessionId, session);
    saveSessions(); // Persist to disk

    return {
      success: true,
      sessionCanSave: session.canSave
    };
  }

  /**
   * Save all validated data using MongoDB transactions
   */
  async saveAll(sessionId: string): Promise<SaveResult> {
    const session = sessions.get(sessionId);
    if (!session) {
      return {
        success: false,
        savedCounts: {},
        totalSaved: 0,
        errors: [],
        rollback: false,
        message: 'Session not found'
      };
    }

    if (!session.canSave) {
      return {
        success: false,
        savedCounts: {},
        totalSaved: 0,
        errors: [],
        rollback: false,
        message: 'Cannot save: validation errors exist'
      };
    }

    // Prepare data for final validation
    const modelGroups = session.modelGroups.map(g => ({
      modelName: g.modelName,
      rows: g.rows.map(r => ({ data: r.data }))
    }));

    // Final validation (backend safety check)
    const validationResult = await validationEngine.validateForSave(modelGroups);

    if (!validationResult.isValid) {
      return {
        success: false,
        savedCounts: {},
        totalSaved: 0,
        errors: validationResult.errors,
        rollback: false,
        message: 'Final validation failed'
      };
    }

    // Connect to database
    await dbConnect();

    // Use MongoDB transaction
    const mongoSession = await mongoose.startSession();
    const savedCounts: Record<string, number> = {};
    let totalSaved = 0;

    try {
      await mongoSession.withTransaction(async () => {
        for (const group of validationResult.validatedGroups) {
          const Model = modelRegistry.getMongooseModel(group.modelName);
          if (!Model) {
            throw new Error(`Model ${group.modelName} not found`);
          }

          // Check for duplicates and prepare rows for saving
          let rowsToSave = group.rows;
          
          if (group.modelName === 'User') {
            const bcrypt = require('bcryptjs');
            
            // Check for duplicates by email/phone before inserting
            const duplicateErrors = [];
            const validRowsToSave = [];
            
            for (const row of group.rows) {
              // Check if user with same email already exists
              if (row.email) {
                const existingUser = await Model.findOne({ email: row.email.toLowerCase() }, {}, { session: mongoSession });
                if (existingUser) {
                  duplicateErrors.push({
                    row: rowsToSave.indexOf(row) + 2,
                    modelName: 'User',
                    field: 'email',
                    message: `A user with email "${row.email}" already exists in the database`,
                    value: row.email,
                    errorType: 'duplicate' as const
                  });
                  continue;
                }
              }
              
              // Check if user with same phone already exists
              if (row.phone) {
                const existingUser = await Model.findOne({ phone: row.phone }, {}, { session: mongoSession });
                if (existingUser) {
                  duplicateErrors.push({
                    row: rowsToSave.indexOf(row) + 2,
                    modelName: 'User',
                    field: 'phone',
                    message: `A user with phone "${row.phone}" already exists in the database`,
                    value: row.phone,
                    errorType: 'duplicate' as const
                  });
                  continue;
                }
              }
              
              // Hash password if not already hashed
              let processedRow = row;
              if (row.password && !row.password.startsWith('$2')) {
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(row.password, salt);
                processedRow = { ...row, password: hashedPassword };
              }
              
              validRowsToSave.push(processedRow);
            }
            
            if (duplicateErrors.length > 0) {
              throw new Error(`Duplicate records found: ${duplicateErrors.map(e => `${e.field}=${e.value}`).join(', ')}`);
            }
            
            rowsToSave = validRowsToSave;
          }

          // Insert all rows for this model
          if (rowsToSave.length > 0) {
            const result = await Model.insertMany(rowsToSave, {
              session: mongoSession,
              ordered: true // Stop on first error
            });

            savedCounts[group.modelName] = result.length;
            totalSaved += result.length;
          }
        }
      });

      // Update session status
      session.status = 'saved';
      session.savedAt = new Date();
      session.savedCounts = savedCounts;
      sessions.set(sessionId, session);
      saveSessions(); // Persist to disk

      console.log(`[DataImport] Successfully saved ${totalSaved} records`);

      return {
        success: true,
        savedCounts,
        totalSaved,
        errors: [],
        rollback: false,
        message: `Successfully saved ${totalSaved} records`
      };

    } catch (error: any) {
      // Transaction automatically rolls back on error
      console.error(`[DataImport] Save failed:`, error);
      return {
        success: false,
        savedCounts: {},
        totalSaved: 0,
        errors: [{
          row: 0,
          modelName: 'Unknown',
          field: '_transaction',
          message: error.message || 'Transaction failed',
          value: null,
          errorType: 'unknown'
        }],
        rollback: true,
        message: `Transaction rolled back: ${error.message}`
      };

    } finally {
      await mongoSession.endSession();
    }
  }

  /**
   * Clear a session (remove all data)
   */
  clearSession(sessionId: string): boolean {
    const session = sessions.get(sessionId);
    if (!session) return false;

    session.status = 'cleared';
    session.modelGroups = [];
    session.unmatchedRows = [];
    session.canSave = false;
    sessions.set(sessionId, session);
    saveSessions(); // Persist to disk
    
    return true;
  }

  /**
   * Delete a session completely
   */
  deleteSession(sessionId: string): boolean {
    const deleted = sessions.delete(sessionId);
    if (deleted) {
      saveSessions(); // Persist to disk
    }
    return deleted;
  }

  /**
   * Generate model-wise export files
   */
  generateExportFiles(sessionId: string): Array<{
    modelName: string;
    fileName: string;
    csvContent: string;
    jsonContent: string;
  }> {
    const session = sessions.get(sessionId);
    if (!session) return [];

    const exports: Array<{
      modelName: string;
      fileName: string;
      csvContent: string;
      jsonContent: string;
    }> = [];

    for (const group of session.modelGroups) {
      const data = group.rows.map(r => r.data);
      
      exports.push({
        modelName: group.modelName,
        fileName: `${group.modelName}_export`,
        csvContent: FileGenerator.generateCSV(data),
        jsonContent: FileGenerator.generateJSON(data)
      });
    }

    // Add unmatched data export
    if (session.unmatchedRows.length > 0) {
      const unmatchedData = session.unmatchedRows.map(r => r.data);
      exports.push({
        modelName: 'Unmatched',
        fileName: 'unmatched_rows',
        csvContent: FileGenerator.generateCSV(unmatchedData),
        jsonContent: FileGenerator.generateJSON(unmatchedData)
      });
    }

    return exports;
  }

  /**
   * Get import template for a model
   */
  getImportTemplate(modelName: string): {
    headers: string[];
    exampleRow: Record<string, any>;
    csvTemplate: string;
  } | null {
    const model = modelRegistry.get(modelName);
    if (!model) return null;

    const headers: string[] = [];
    const exampleRow: Record<string, any> = {};

    for (const field of model.fields) {
      // Skip internal fields
      if (field.path.startsWith('_') || 
          field.path === 'createdAt' || 
          field.path === 'updatedAt') {
        continue;
      }

      headers.push(field.path);

      // Generate example value
      if (field.type === 'String') {
        exampleRow[field.path] = field.enum ? field.enum[0] : 'example';
      } else if (field.type === 'Number') {
        exampleRow[field.path] = field.min ?? 0;
      } else if (field.type === 'Boolean') {
        exampleRow[field.path] = false;
      } else if (field.type === 'Date') {
        exampleRow[field.path] = new Date().toISOString().split('T')[0];
      } else if (field.type === 'ObjectId') {
        exampleRow[field.path] = '507f1f77bcf86cd799439011';
      } else {
        exampleRow[field.path] = '';
      }
    }

    const csvTemplate = FileGenerator.generateCSV([exampleRow], headers);

    return { headers, exampleRow, csvTemplate };
  }

  /**
   * Check if session can be saved
   */
  private checkCanSave(session: ImportSession): boolean {
    // No unmatched rows allowed
    if (session.unmatchedRows.length > 0) return false;

    // All rows in all groups must be valid
    for (const group of session.modelGroups) {
      if (group.invalidCount > 0) return false;
      if (group.rows.some(r => !r.isValid)) return false;
    }

    // Must have at least one row to save
    const totalRows = session.modelGroups.reduce(
      (sum, g) => sum + g.rows.length, 0
    );
    if (totalRows === 0) return false;

    return true;
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const dataImportService = new DataImportService();
