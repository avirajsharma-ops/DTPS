/**
 * VALIDATION ENGINE - Strict validation for imported data
 * 
 * Validates data against Mongoose schemas with detailed error reporting.
 * Ensures zero dirty data and zero partial inserts.
 */

import { modelRegistry, ModelMatchResult, SchemaFieldInfo } from './modelRegistry';
import { ParsedRow } from './fileParser';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface ValidationError {
  row: number;
  modelName: string;
  field: string;
  message: string;
  value: any;
  errorType: 'required' | 'type' | 'format' | 'enum' | 'range' | 'extra' | 'unknown';
}

export interface RowValidationResult {
  rowIndex: number;
  data: Record<string, any>;
  detectedModel: string | null;
  modelConfidence: number;
  isValid: boolean;
  errors: ValidationError[];
  matchResults: ModelMatchResult[];
}

export interface ModelGroupedData {
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
  totalCount: number;
}

export interface ValidationResult {
  success: boolean;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  unmatchedRows: number;
  modelGroups: ModelGroupedData[];
  unmatchedData: Array<{
    rowIndex: number;
    data: Record<string, any>;
    matchAttempts: ModelMatchResult[];
  }>;
  allErrors: ValidationError[];
  canSave: boolean;
}

// ============================================
// VALIDATION ENGINE CLASS
// ============================================

export class ValidationEngine {
  private modelConfidenceThreshold: number = 60; // Minimum confidence to assign a model

  /**
   * Validate all parsed rows
   */
  async validateAll(
    rows: ParsedRow[],
    forceModel?: string // Optionally force all rows to a specific model
  ): Promise<ValidationResult> {
    const modelGroups: Map<string, ModelGroupedData> = new Map();
    const unmatchedData: Array<{
      rowIndex: number;
      data: Record<string, any>;
      matchAttempts: ModelMatchResult[];
    }> = [];
    const allErrors: ValidationError[] = [];

    // Initialize model groups
    const importableModels = modelRegistry.getImportable();
    for (const model of importableModels) {
      modelGroups.set(model.name, {
        modelName: model.name,
        displayName: model.displayName,
        rows: [],
        validCount: 0,
        invalidCount: 0,
        totalCount: 0
      });
    }

    // Process each row
    for (const row of rows) {
      const result = await this.validateRow(row, forceModel);
      
      if (result.detectedModel) {
        const group = modelGroups.get(result.detectedModel);
        if (group) {
          group.rows.push({
            rowIndex: result.rowIndex,
            data: result.data,
            isValid: result.isValid,
            errors: result.errors
          });
          group.totalCount++;
          if (result.isValid) {
            group.validCount++;
          } else {
            group.invalidCount++;
            allErrors.push(...result.errors);
          }
        }
      } else {
        unmatchedData.push({
          rowIndex: result.rowIndex,
          data: result.data,
          matchAttempts: result.matchResults
        });
        
        // Add error for unmatched row
        allErrors.push({
          row: result.rowIndex,
          modelName: 'Unknown',
          field: '_model',
          message: 'Row does not match any known model schema',
          value: null,
          errorType: 'unknown'
        });
      }
    }

    // Calculate totals
    const validRows = Array.from(modelGroups.values())
      .reduce((sum, g) => sum + g.validCount, 0);
    const invalidRows = Array.from(modelGroups.values())
      .reduce((sum, g) => sum + g.invalidCount, 0);

    // Filter out empty model groups
    const nonEmptyGroups = Array.from(modelGroups.values())
      .filter(g => g.totalCount > 0);

    return {
      success: allErrors.length === 0 && unmatchedData.length === 0,
      totalRows: rows.length,
      validRows,
      invalidRows,
      unmatchedRows: unmatchedData.length,
      modelGroups: nonEmptyGroups,
      unmatchedData,
      allErrors,
      canSave: allErrors.length === 0 && unmatchedData.length === 0
    };
  }

  /**
   * Validate a single row
   */
  async validateRow(
    row: ParsedRow,
    forceModel?: string
  ): Promise<RowValidationResult> {
    let detectedModel: string | null = null;
    let modelConfidence: number = 0;
    let matchResults: ModelMatchResult[] = [];

    console.log(`[ValidateRow] Starting validation for row ${row.rowIndex}`);
    console.log(`[ValidateRow] Row data keys: ${Object.keys(row.data).join(', ')}`);

    if (forceModel) {
      // Use the forced model
      const model = modelRegistry.get(forceModel);
      if (model) {
        detectedModel = forceModel;
        modelConfidence = 100;
        matchResults = [{
          modelName: forceModel,
          confidence: 100,
          matchedFields: Object.keys(row.data),
          missingRequired: [],
          extraFields: [],
          isValid: true
        }];
      }
    } else {
      // Detect model automatically
      matchResults = modelRegistry.detectModel(row.data);
      
      console.log(`[ValidateRow] Row ${row.rowIndex} detection results:`, {
        totalModels: matchResults.length,
        topModel: matchResults[0]?.modelName,
        topConfidence: matchResults[0]?.confidence,
        threshold: this.modelConfidenceThreshold,
        topMatched: matchResults[0]?.matchedFields.length,
        topMissing: matchResults[0]?.missingRequired.length,
        topExtra: matchResults[0]?.extraFields.length,
        rowFieldsCount: Object.keys(row.data).length
      });
      
      if (matchResults.length > 0 && 
          matchResults[0].confidence >= this.modelConfidenceThreshold) {
        detectedModel = matchResults[0].modelName;
        modelConfidence = matchResults[0].confidence;
        console.log(`[ValidateRow] ✅ Row ${row.rowIndex} MATCHED to ${detectedModel} with confidence ${modelConfidence}`);
      } else {
        console.log(`[ValidateRow] ❌ Row ${row.rowIndex} FAILED - confidence ${matchResults[0]?.confidence || 0} < threshold ${this.modelConfidenceThreshold}`);
      }
    }

    // If no model detected, return with error
    if (!detectedModel) {
      return {
        rowIndex: row.rowIndex,
        data: row.data,
        detectedModel: null,
        modelConfidence: 0,
        isValid: false,
        errors: [],
        matchResults
      };
    }

    // Clean the row data (remove fields not in schema)
    let cleanedData = this.cleanRowData(detectedModel, row.data);

    // Transform data (convert values to correct formats/enums)
    cleanedData = this.transformRowData(detectedModel, cleanedData);

    // Validate against detected model
    const validationResult = await modelRegistry.validateRow(
      detectedModel,
      cleanedData,
      row.rowIndex
    );

    // Convert errors to ValidationError format
    const errors: ValidationError[] = validationResult.errors.map(e => ({
      row: e.row,
      modelName: detectedModel!,
      field: e.field,
      message: e.message,
      value: e.value,
      errorType: this.categorizeError(e.message)
    }));

    return {
      rowIndex: row.rowIndex,
      data: cleanedData,
      detectedModel,
      modelConfidence,
      isValid: validationResult.isValid,
      errors,
      matchResults
    };
  }

  /**
   * Clean row data by removing fields not in the schema
   */
  private cleanRowData(modelName: string, data: Record<string, any>): Record<string, any> {
    const model = modelRegistry.get(modelName);
    if (!model) return data;

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
    for (const [key, value] of Object.entries(data)) {
      // Try exact match first
      if (allowedFields.has(key)) {
        cleaned[key] = value;
        continue;
      }

      // Try case-insensitive match (map to correct field name)
      let matchedField = Array.from(allowedFields).find(af => 
        af.toLowerCase() === key.toLowerCase()
      );
      if (matchedField) {
        cleaned[matchedField] = value;
        continue;
      }

      // Try normalized match (ignore underscores and case)
      const keyNormalized = normalizeFieldName(key);
      matchedField = Array.from(allowedFields).find(af => 
        normalizeFieldName(af) === keyNormalized
      );
      if (matchedField) {
        cleaned[matchedField] = value;
        continue;
      }

      // Check nested fields
      const isNested = Array.from(allowedFields).some(af => 
        key.startsWith(af + '.') || af.startsWith(key + '.')
      );
      if (isNested) {
        cleaned[key] = value;
      }
    }

    return cleaned;
  }

  /**
   * Transform row data - convert values to correct formats and enum values
   */
  private transformRowData(modelName: string, data: Record<string, any>): Record<string, any> {
    const transformed = { ...data };

    // User-specific transformations
    if (modelName === 'User') {
      // Fix dateOfBirth format (remove malformed timestamps)
      if (transformed.dateOfBirth) {
        let dateStr = String(transformed.dateOfBirth);
        // Fix malformed ISO strings like "2001-05-16T00:00:0000Z"
        dateStr = dateStr.replace(/T00:00:0000Z/, 'T00:00:00Z');
        dateStr = dateStr.replace(/T00:00:0+Z/, 'T00:00:00Z');
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          transformed.dateOfBirth = date;
        } else {
          delete transformed.dateOfBirth; // Invalid date, remove it
        }
      }

      // Convert BMI number to category
      if (transformed.bmiCategory && typeof transformed.bmiCategory === 'number') {
        const bmi = transformed.bmiCategory;
        if (bmi < 18.5) {
          transformed.bmiCategory = 'Underweight';
        } else if (bmi < 25) {
          transformed.bmiCategory = 'Normal';
        } else if (bmi < 30) {
          transformed.bmiCategory = 'Overweight';
        } else {
          transformed.bmiCategory = 'Obese';
        }
      }

      // Convert general goal descriptions to enum values
      if (transformed.generalGoal && typeof transformed.generalGoal === 'string') {
        const goal = transformed.generalGoal.toLowerCase().trim();
        let mappedGoal = 'not-specified';

        if (goal.includes('weight loss') || goal.includes('weight-loss') || 
            goal.includes('lose') || goal.includes('kgs') ||
            goal.includes('kg loss') || goal.includes('reduce')) {
          mappedGoal = 'weight-loss';
        } else if (goal.includes('weight gain') || goal.includes('weight-gain') || 
                   goal.includes('gain') || goal.includes('increase')) {
          mappedGoal = 'weight-gain';
        } else if (goal.includes('disease') || goal.includes('medical') || 
                   goal.includes('condition') || goal.includes('management')) {
          mappedGoal = 'disease-management';
        } else if (goal.includes('muscle') || goal.includes('build')) {
          mappedGoal = 'muscle-gain';
        } else if (goal.includes('maintain') || goal.includes('keep') || 
                   goal.includes('same')) {
          mappedGoal = 'maintain-weight';
        }

        transformed.generalGoal = mappedGoal;
      }
    }

    return transformed;
  }

  /**
   * Re-validate specific model group data
   */
  async revalidateModelGroup(
    modelName: string,
    rows: Array<{ rowIndex: number; data: Record<string, any> }>
  ): Promise<{
    validRows: Array<{ rowIndex: number; data: Record<string, any> }>;
    invalidRows: Array<{
      rowIndex: number;
      data: Record<string, any>;
      errors: ValidationError[];
    }>;
    allValid: boolean;
  }> {
    const validRows: Array<{ rowIndex: number; data: Record<string, any> }> = [];
    const invalidRows: Array<{
      rowIndex: number;
      data: Record<string, any>;
      errors: ValidationError[];
    }> = [];

    for (const row of rows) {
      const result = await modelRegistry.validateRow(
        modelName,
        row.data,
        row.rowIndex
      );

      if (result.isValid) {
        validRows.push(row);
      } else {
        invalidRows.push({
          ...row,
          errors: result.errors.map(e => ({
            row: e.row,
            modelName,
            field: e.field,
            message: e.message,
            value: e.value,
            errorType: this.categorizeError(e.message)
          }))
        });
      }
    }

    return {
      validRows,
      invalidRows,
      allValid: invalidRows.length === 0
    };
  }

  /**
   * Validate data before final save (backend safety check)
   */
  async validateForSave(
    modelGroups: Array<{
      modelName: string;
      rows: Array<{ data: Record<string, any> }>;
    }>
  ): Promise<{
    isValid: boolean;
    errors: ValidationError[];
    validatedGroups: Array<{
      modelName: string;
      rows: Array<Record<string, any>>;
    }>;
  }> {
    const errors: ValidationError[] = [];
    const validatedGroups: Array<{
      modelName: string;
      rows: Array<Record<string, any>>;
    }> = [];

    for (const group of modelGroups) {
      const validatedRows: Array<Record<string, any>> = [];

      for (let i = 0; i < group.rows.length; i++) {
        const row = group.rows[i];
        const result = await modelRegistry.validateRow(
          group.modelName,
          row.data,
          i + 1
        );

        if (!result.isValid) {
          errors.push(...result.errors.map(e => ({
            row: e.row,
            modelName: group.modelName,
            field: e.field,
            message: e.message,
            value: e.value,
            errorType: this.categorizeError(e.message)
          })));
        } else {
          validatedRows.push(row.data);
        }
      }

      if (validatedRows.length > 0) {
        validatedGroups.push({
          modelName: group.modelName,
          rows: validatedRows
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      validatedGroups
    };
  }

  /**
   * Categorize error type from message
   */
  private categorizeError(message: string): ValidationError['errorType'] {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('required') || lowerMessage.includes('cannot be empty')) {
      return 'required';
    }
    if (lowerMessage.includes('type') || lowerMessage.includes('cast')) {
      return 'type';
    }
    if (lowerMessage.includes('format') || lowerMessage.includes('invalid')) {
      return 'format';
    }
    if (lowerMessage.includes('enum') || lowerMessage.includes('allowed')) {
      return 'enum';
    }
    if (lowerMessage.includes('min') || lowerMessage.includes('max') || 
        lowerMessage.includes('range') || lowerMessage.includes('length')) {
      return 'range';
    }
    if (lowerMessage.includes('not defined') || lowerMessage.includes('extra')) {
      return 'extra';
    }
    
    return 'unknown';
  }

  /**
   * Get field suggestions for fixing errors
   */
  getFieldSuggestions(
    modelName: string,
    field: string,
    errorType: ValidationError['errorType']
  ): {
    expectedType: string;
    allowedValues?: string[];
    example?: any;
    hint: string;
  } | null {
    const model = modelRegistry.get(modelName);
    if (!model) return null;

    const fieldInfo = model.fields.find(f => f.path === field);
    if (!fieldInfo) return null;

    const result: any = {
      expectedType: fieldInfo.type,
      hint: ''
    };

    if (fieldInfo.enum) {
      result.allowedValues = fieldInfo.enum;
      result.hint = `Must be one of: ${fieldInfo.enum.join(', ')}`;
    }

    if (fieldInfo.type === 'String') {
      result.example = 'example text';
      if (fieldInfo.minLength || fieldInfo.maxLength) {
        result.hint = `Length must be between ${fieldInfo.minLength || 0} and ${fieldInfo.maxLength || 'unlimited'}`;
      }
    } else if (fieldInfo.type === 'Number') {
      result.example = 123;
      if (fieldInfo.min !== undefined || fieldInfo.max !== undefined) {
        result.hint = `Value must be between ${fieldInfo.min ?? '-∞'} and ${fieldInfo.max ?? '∞'}`;
      }
    } else if (fieldInfo.type === 'Boolean') {
      result.example = true;
      result.allowedValues = ['true', 'false'];
      result.hint = 'Use true or false';
    } else if (fieldInfo.type === 'Date') {
      result.example = '2024-01-15';
      result.hint = 'Use ISO date format (YYYY-MM-DD)';
    } else if (fieldInfo.type === 'ObjectId' || fieldInfo.ref) {
      result.example = '507f1f77bcf86cd799439011';
      result.hint = `Reference to ${fieldInfo.ref || 'another document'}`;
    }

    return result;
  }
}

// Export singleton instance
export const validationEngine = new ValidationEngine();
