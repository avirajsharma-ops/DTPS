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

export interface FieldMappingInfo {
  originalField: string;
  mappedField: string | null;
  value: any;
  status: 'mapped' | 'unmapped' | 'empty';
}

export interface RowValidationResult {
  rowIndex: number;
  data: Record<string, any>;
  detectedModel: string | null;
  modelConfidence: number;
  isValid: boolean;
  errors: ValidationError[];
  matchResults: ModelMatchResult[];
  fieldMapping: FieldMappingInfo[];
  unmappedFields: string[];
  emptyFields: string[];
}

export interface ModelGroupedData {
  modelName: string;
  displayName: string;
  rows: Array<{
    rowIndex: number;
    data: Record<string, any>;
    isValid: boolean;
    errors: ValidationError[];
    fieldMapping?: FieldMappingInfo[];
    unmappedFields?: string[];
    emptyFields?: string[];
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
            errors: result.errors,
            fieldMapping: result.fieldMapping,
            unmappedFields: result.unmappedFields,
            emptyFields: result.emptyFields
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
      
      console.log(`[ValidateRow] Row ${row.rowIndex} - Checked ${matchResults.length} models`);
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
      
      // Log all model attempts for debugging
      console.log(`[ValidateRow] All model match attempts for row ${row.rowIndex}:`);
      matchResults.slice(0, 5).forEach((m, i) => {
        const status = m.confidence >= this.modelConfidenceThreshold ? '✓' : '✗';
        console.log(`  ${status} ${i+1}. ${m.modelName}: ${m.confidence.toFixed(1)}%`);
      });
      if (matchResults.length > 5) {
        console.log(`  ... and ${matchResults.length - 5} more models`);
      }
      
      if (matchResults.length > 0 && 
          matchResults[0].confidence >= this.modelConfidenceThreshold) {
        detectedModel = matchResults[0].modelName;
        modelConfidence = matchResults[0].confidence;
        console.log(`[ValidateRow] ✅ Row ${row.rowIndex} MATCHED to ${detectedModel} with confidence ${modelConfidence.toFixed(1)}%`);
      } else {
        console.log(`[ValidateRow] ❌ Row ${row.rowIndex} UNMATCHED - best: ${matchResults[0]?.modelName}(${matchResults[0]?.confidence.toFixed(1)}%) < threshold ${this.modelConfidenceThreshold}%`);
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
        matchResults,
        fieldMapping: [],
        unmappedFields: [],
        emptyFields: []
      };
    }

    // Clean the row data (remove fields not in schema) and track field mapping
    const { cleaned: cleanedData, fieldMapping, unmappedFields, emptyFields } = this.cleanRowData(detectedModel, row.data);

    // Transform data (convert values to correct formats/enums)
    const transformedData = this.transformRowData(detectedModel, cleanedData);

    // Validate against detected model
    const validationResult = await modelRegistry.validateRow(
      detectedModel,
      transformedData,
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

    // Add warnings for unmapped fields if any
    if (unmappedFields.length > 0) {
      console.log(`[ValidateRow] Row ${row.rowIndex} has ${unmappedFields.length} unmapped fields: ${unmappedFields.join(', ')}`);
    }

    return {
      rowIndex: row.rowIndex,
      data: transformedData,
      detectedModel,
      modelConfidence,
      isValid: validationResult.isValid,
      errors,
      matchResults,
      fieldMapping,
      unmappedFields,
      emptyFields
    };
  }

  /**
   * Clean row data by removing fields not in the schema
   * and properly handling nested objects/arrays
   * Also tracks field mapping for reporting
   */
  private cleanRowData(modelName: string, data: Record<string, any>): {
    cleaned: Record<string, any>;
    fieldMapping: FieldMappingInfo[];
    unmappedFields: string[];
    emptyFields: string[];
  } {
    const model = modelRegistry.get(modelName);
    if (!model) return { 
      cleaned: data, 
      fieldMapping: [], 
      unmappedFields: [], 
      emptyFields: [] 
    };

    const schemaFields = model.fields.map(f => f.path);
    const allowedFields = new Set([
      ...schemaFields,
      '_id',
      'createdAt',
      'updatedAt',
      '__v'
    ]);

    // Common field aliases for better matching
    const fieldAliases: Record<string, string[]> = {
      'firstName': ['first_name', 'firstname', 'fname', 'first'],
      'lastName': ['last_name', 'lastname', 'lname', 'last', 'surname'],
      'email': ['email_address', 'emailaddress', 'mail', 'e-mail'],
      'phone': ['phone_number', 'phonenumber', 'mobile', 'mobile_number', 'contact', 'contact_number'],
      'dateOfBirth': ['date_of_birth', 'dob', 'birth_date', 'birthdate', 'birthday'],
      'height': ['height_cm', 'heightcm', 'height_in_cm', 'user_height'],
      'weight': ['weight_kg', 'weightkg', 'weight_in_kg', 'user_weight', 'current_weight'],
      'heightFeet': ['height_feet', 'heightfeet', 'feet', 'height_ft', 'ht_feet'],
      'heightInch': ['height_inch', 'heightinch', 'inch', 'inches', 'height_in', 'ht_inch'],
      'heightCm': ['height_cm_str', 'cm', 'centimeters'],
      'weightKg': ['weight_kg_str', 'wt_kg', 'weight_kgs'],
      'targetWeightKg': ['target_weight_kg', 'targetweight', 'goal_weight_kg'],
      'activityLevel': ['activity_level', 'activitylevel', 'activity', 'physical_activity', 'exercise_level'],
      'activityRate': ['activity_rate', 'activityrate'],
      'gender': ['sex'],
      'role': ['user_role', 'userrole', 'account_type'],
      'status': ['user_status', 'userstatus', 'account_status'],
      'clientStatus': ['client_status', 'engagement_status'],
      'healthGoals': ['health_goals', 'goals', 'fitness_goals'],
      'generalGoal': ['general_goal', 'main_goal', 'primary_goal'],
      'bmiCategory': ['bmi_category', 'bmi_status'],
      'bmr': ['basal_metabolic_rate'],
      'bodyFat': ['body_fat', 'bodyfat', 'body_fat_percentage', 'fat_percentage'],
      'idealWeight': ['ideal_weight', 'target_weight', 'goal_weight'],
      'targetBmi': ['target_bmi', 'goal_bmi'],
      'occupation': ['job', 'profession', 'work'],
      'maritalStatus': ['marital_status', 'married'],
      'anniversary': ['wedding_anniversary', 'anniversary_date'],
      'source': ['lead_source', 'how_found', 'referral'],
      'referralSource': ['referral_source', 'referred_by'],
      'alternativePhone': ['alternative_phone', 'alt_phone', 'secondary_phone'],
      'alternativeEmail': ['alternative_email', 'alt_email', 'secondary_email'],
      'zoconut_id': ['zoconutid', 'zoconut'],
      'avatar': ['profile_image', 'profile_picture', 'photo'],
      'bio': ['biography', 'about', 'description'],
      'experience': ['years_experience', 'exp', 'work_experience'],
      'consultationFee': ['consultation_fee', 'fee', 'price'],
      'dietType': ['diet_type', 'dietary_preference', 'food_preference'],
      'onboardingCompleted': ['onboarding_completed', 'onboarded'],
    };

    // Create reverse lookup for aliases
    const aliasToField: Record<string, string> = {};
    for (const [field, aliases] of Object.entries(fieldAliases)) {
      for (const alias of aliases) {
        aliasToField[alias.toLowerCase()] = field;
      }
    }

    // Get root-level schema field names (for nested object matching)
    const rootFields = new Set(
      schemaFields.map(f => f.split('.')[0])
    );

    const normalizeFieldName = (field: string) => {
      return field.toLowerCase().replace(/_/g, '').replace(/-/g, '');
    };

    const cleaned: Record<string, any> = {};
    const fieldMapping: FieldMappingInfo[] = [];
    const unmappedFields: string[] = [];
    const emptyFields: string[] = [];

    for (const [key, value] of Object.entries(data)) {
      // Check if value is empty
      const isEmpty = value === null || value === undefined || value === '' || 
        (typeof value === 'string' && value.trim() === '');
      
      // Track empty fields even if they're valid schema fields
      if (isEmpty) {
        // Check if it maps to a schema field
        const schemaMatch = Array.from(allowedFields).find(af => 
          af.toLowerCase() === key.toLowerCase() || normalizeFieldName(af) === normalizeFieldName(key)
        );
        if (schemaMatch) {
          emptyFields.push(schemaMatch);
          fieldMapping.push({
            originalField: key,
            mappedField: schemaMatch,
            value: value,
            status: 'empty'
          });
        }
        continue; // Skip empty values
      }

      // Try exact match first
      if (allowedFields.has(key)) {
        cleaned[key] = value;
        fieldMapping.push({
          originalField: key,
          mappedField: key,
          value: value,
          status: 'mapped'
        });
        continue;
      }

      // Try case-insensitive match (map to correct field name)
      let matchedField = Array.from(allowedFields).find(af => 
        af.toLowerCase() === key.toLowerCase()
      );
      if (matchedField) {
        cleaned[matchedField] = value;
        fieldMapping.push({
          originalField: key,
          mappedField: matchedField,
          value: value,
          status: 'mapped'
        });
        continue;
      }

      // Try normalized match (ignore underscores, hyphens, and case)
      const keyNormalized = normalizeFieldName(key);
      matchedField = Array.from(allowedFields).find(af => 
        normalizeFieldName(af) === keyNormalized
      );
      if (matchedField) {
        cleaned[matchedField] = value;
        fieldMapping.push({
          originalField: key,
          mappedField: matchedField,
          value: value,
          status: 'mapped'
        });
        continue;
      }

      // Try alias matching
      const aliasMatch = aliasToField[key.toLowerCase()];
      if (aliasMatch && allowedFields.has(aliasMatch)) {
        cleaned[aliasMatch] = value;
        fieldMapping.push({
          originalField: key,
          mappedField: aliasMatch,
          value: value,
          status: 'mapped'
        });
        continue;
      }

      // Check if this is a nested object that matches a root schema field
      if (typeof value === 'object' && !Array.isArray(value) && rootFields.has(key)) {
        cleaned[key] = value;
        fieldMapping.push({
          originalField: key,
          mappedField: key,
          value: value,
          status: 'mapped'
        });
        continue;
      }

      // Check if this is an array field
      if (Array.isArray(value)) {
        const arrayField = schemaFields.find(f => 
          f === key || f.toLowerCase() === key.toLowerCase()
        );
        if (arrayField) {
          cleaned[arrayField] = value;
          fieldMapping.push({
            originalField: key,
            mappedField: arrayField,
            value: value,
            status: 'mapped'
          });
          continue;
        }
        
        // Also check without case sensitivity
        const matchedArrayField = Array.from(allowedFields).find(af => 
          af.toLowerCase() === key.toLowerCase()
        );
        if (matchedArrayField) {
          cleaned[matchedArrayField] = value;
          fieldMapping.push({
            originalField: key,
            mappedField: matchedArrayField,
            value: value,
            status: 'mapped'
          });
          continue;
        }
      }

      // Check nested fields (dot notation)
      const isNested = Array.from(allowedFields).some(af => 
        key.startsWith(af + '.') || af.startsWith(key + '.')
      );
      if (isNested) {
        cleaned[key] = value;
        fieldMapping.push({
          originalField: key,
          mappedField: key,
          value: value,
          status: 'mapped'
        });
        continue;
      }

      // Field could not be mapped
      unmappedFields.push(key);
      fieldMapping.push({
        originalField: key,
        mappedField: null,
        value: value,
        status: 'unmapped'
      });
    }

    return { cleaned, fieldMapping, unmappedFields, emptyFields };
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

      // Convert activity level to enum values
      if (transformed.activityLevel && typeof transformed.activityLevel === 'string') {
        const activity = transformed.activityLevel.toLowerCase().trim().replace(/\s+/g, '_');
        let mappedActivity = '';

        // Map common variations to enum values
        if (activity.includes('sedentary') || activity.includes('inactive') || activity.includes('none')) {
          mappedActivity = 'sedentary';
        } else if (activity.includes('lightly') || activity.includes('light') || activity.includes('low')) {
          mappedActivity = 'lightly_active';
        } else if (activity.includes('moderately') || activity.includes('moderate') || activity.includes('medium')) {
          mappedActivity = 'moderately_active';
        } else if (activity.includes('very') || activity.includes('high') || activity.includes('intense')) {
          mappedActivity = 'very_active';
        } else if (activity.includes('extremely') || activity.includes('athlete') || activity.includes('professional')) {
          mappedActivity = 'extremely_active';
        } else if (['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active'].includes(activity)) {
          mappedActivity = activity;
        }

        transformed.activityLevel = mappedActivity;
      }

      // Ensure heightFeet and heightInch are strings
      if (transformed.heightFeet !== undefined && transformed.heightFeet !== null) {
        transformed.heightFeet = String(transformed.heightFeet);
      }
      if (transformed.heightInch !== undefined && transformed.heightInch !== null) {
        transformed.heightInch = String(transformed.heightInch);
      }
      if (transformed.heightCm !== undefined && transformed.heightCm !== null) {
        transformed.heightCm = String(transformed.heightCm);
      }
      if (transformed.weightKg !== undefined && transformed.weightKg !== null) {
        transformed.weightKg = String(transformed.weightKg);
      }
      if (transformed.targetWeightKg !== undefined && transformed.targetWeightKg !== null) {
        transformed.targetWeightKg = String(transformed.targetWeightKg);
      }

      // Handle healthGoals - must be array of strings
      if (transformed.healthGoals !== undefined) {
        let goals = transformed.healthGoals;
        
        // If it's a string that looks like JSON, try to parse it
        if (typeof goals === 'string') {
          try {
            // Try to parse as JSON
            const parsed = JSON.parse(goals.replace(/'/g, '"'));
            if (Array.isArray(parsed)) {
              // If it's an array of objects (like goals with calories, protein, etc.), skip it
              if (parsed.length > 0 && typeof parsed[0] === 'object') {
                // This is probably a "goals" object, not healthGoals strings
                // Move to the goals field if it exists, otherwise remove
                if (!transformed.goals) {
                  transformed.goals = parsed[0];
                }
                delete transformed.healthGoals;
              } else {
                // It's an array of strings/primitives, convert to strings
                transformed.healthGoals = parsed.map((g: any) => String(g));
              }
            } else if (typeof parsed === 'object') {
              // Single object - move to goals
              if (!transformed.goals) {
                transformed.goals = parsed;
              }
              delete transformed.healthGoals;
            } else {
              // Single value - wrap in array
              transformed.healthGoals = [String(parsed)];
            }
          } catch (e) {
            // Not valid JSON - could be comma-separated string
            if (goals.includes(',')) {
              transformed.healthGoals = goals.split(',').map((g: string) => g.trim()).filter(Boolean);
            } else if (goals.trim()) {
              transformed.healthGoals = [goals.trim()];
            } else {
              delete transformed.healthGoals;
            }
          }
        } else if (Array.isArray(goals)) {
          // Filter out objects (like {calories: 1800, ...}) and keep only strings
          const stringGoals = goals.filter((g: any) => typeof g === 'string' || typeof g === 'number');
          if (stringGoals.length > 0) {
            transformed.healthGoals = stringGoals.map((g: any) => String(g));
          } else if (goals.length > 0 && typeof goals[0] === 'object') {
            // Array of goal objects - move first one to goals
            if (!transformed.goals) {
              transformed.goals = goals[0];
            }
            delete transformed.healthGoals;
          } else {
            delete transformed.healthGoals;
          }
        } else if (typeof goals === 'object' && goals !== null) {
          // Single object - move to goals
          if (!transformed.goals) {
            transformed.goals = goals;
          }
          delete transformed.healthGoals;
        }
      }

      // Handle assignedDietitians - validate ObjectIds
      if (transformed.assignedDietitians !== undefined) {
        let dietitians = transformed.assignedDietitians;
        
        // Helper function to validate ObjectId format (24 hex chars)
        const isValidObjectId = (id: string): boolean => {
          if (typeof id !== 'string') return false;
          // Remove any ObjectId wrapper text
          const cleanId = id.replace(/new ObjectId\(['"]?|['"]?\)/g, '').trim();
          return /^[0-9a-fA-F]{24}$/.test(cleanId);
        };

        // Helper to clean ObjectId string
        const cleanObjectId = (id: string): string => {
          if (typeof id !== 'string') return '';
          return id.replace(/new ObjectId\(['"]?|['"]?\)/g, '').trim();
        };

        if (typeof dietitians === 'string') {
          try {
            // Try to parse as JSON
            const parsed = JSON.parse(dietitians.replace(/'/g, '"').replace(/new ObjectId\(/g, '"').replace(/\)/g, '"'));
            if (Array.isArray(parsed)) {
              dietitians = parsed;
            } else {
              dietitians = [parsed];
            }
          } catch (e) {
            // Could be comma-separated
            if (dietitians.includes(',')) {
              dietitians = dietitians.split(',').map((d: string) => d.trim());
            } else if (dietitians.trim()) {
              dietitians = [dietitians.trim()];
            } else {
              dietitians = [];
            }
          }
        }

        if (Array.isArray(dietitians)) {
          // Filter to only valid ObjectIds
          const validIds = dietitians
            .map((d: any) => {
              if (typeof d === 'object' && d !== null) {
                // Could be ObjectId object
                return d.toString ? d.toString() : String(d);
              }
              return cleanObjectId(String(d));
            })
            .filter((id: string) => isValidObjectId(id));
          
          if (validIds.length > 0) {
            transformed.assignedDietitians = validIds;
          } else {
            delete transformed.assignedDietitians;
          }
        } else {
          delete transformed.assignedDietitians;
        }
      }

      // Handle assignedHealthCounselors - same logic as dietitians
      if (transformed.assignedHealthCounselors !== undefined) {
        let counselors = transformed.assignedHealthCounselors;
        
        const isValidObjectId = (id: string): boolean => {
          if (typeof id !== 'string') return false;
          const cleanId = id.replace(/new ObjectId\(['"]?|['"]?\)/g, '').trim();
          return /^[0-9a-fA-F]{24}$/.test(cleanId);
        };

        const cleanObjectId = (id: string): string => {
          if (typeof id !== 'string') return '';
          return id.replace(/new ObjectId\(['"]?|['"]?\)/g, '').trim();
        };

        if (typeof counselors === 'string') {
          try {
            const parsed = JSON.parse(counselors.replace(/'/g, '"').replace(/new ObjectId\(/g, '"').replace(/\)/g, '"'));
            if (Array.isArray(parsed)) {
              counselors = parsed;
            } else {
              counselors = [parsed];
            }
          } catch (e) {
            if (counselors.includes(',')) {
              counselors = counselors.split(',').map((c: string) => c.trim());
            } else if (counselors.trim()) {
              counselors = [counselors.trim()];
            } else {
              counselors = [];
            }
          }
        }

        if (Array.isArray(counselors)) {
          const validIds = counselors
            .map((c: any) => {
              if (typeof c === 'object' && c !== null) {
                return c.toString ? c.toString() : String(c);
              }
              return cleanObjectId(String(c));
            })
            .filter((id: string) => isValidObjectId(id));
          
          if (validIds.length > 0) {
            transformed.assignedHealthCounselors = validIds;
          } else {
            delete transformed.assignedHealthCounselors;
          }
        } else {
          delete transformed.assignedHealthCounselors;
        }
      }

      // Handle tags - validate ObjectIds
      if (transformed.tags !== undefined) {
        let tags = transformed.tags;
        
        const isValidObjectId = (id: string): boolean => {
          if (typeof id !== 'string') return false;
          const cleanId = id.replace(/new ObjectId\(['"]?|['"]?\)/g, '').trim();
          return /^[0-9a-fA-F]{24}$/.test(cleanId);
        };

        const cleanObjectId = (id: string): string => {
          if (typeof id !== 'string') return '';
          return id.replace(/new ObjectId\(['"]?|['"]?\)/g, '').trim();
        };

        if (typeof tags === 'string') {
          try {
            const parsed = JSON.parse(tags.replace(/'/g, '"').replace(/new ObjectId\(/g, '"').replace(/\)/g, '"'));
            if (Array.isArray(parsed)) {
              tags = parsed;
            } else {
              tags = [parsed];
            }
          } catch (e) {
            if (tags.includes(',')) {
              tags = tags.split(',').map((t: string) => t.trim());
            } else if (tags.trim()) {
              tags = [tags.trim()];
            } else {
              tags = [];
            }
          }
        }

        if (Array.isArray(tags)) {
          const validIds = tags
            .map((t: any) => {
              if (typeof t === 'object' && t !== null) {
                return t.toString ? t.toString() : String(t);
              }
              return cleanObjectId(String(t));
            })
            .filter((id: string) => isValidObjectId(id));
          
          if (validIds.length > 0) {
            transformed.tags = validIds;
          } else {
            delete transformed.tags;
          }
        } else {
          delete transformed.tags;
        }
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
