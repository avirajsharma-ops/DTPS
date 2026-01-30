/**
 * MODEL REGISTRY - Central registry for all Mongoose models
 * 
 * This provides automatic model detection and validation
 * for the data import system.
 */

import mongoose, { Model, Schema } from 'mongoose';
import User from '@/lib/db/models/User';
import Appointment from '@/lib/db/models/Appointment';
import Recipe from '@/lib/db/models/Recipe';
import MealPlan from '@/lib/db/models/MealPlan';
import Payment from '@/lib/db/models/Payment';
import ProgressEntry from '@/lib/db/models/ProgressEntry';
import FoodLog from '@/lib/db/models/FoodLog';
import Task from '@/lib/db/models/Task';
import Tag from '@/lib/db/models/Tag';
import Lead from '@/lib/db/models/Lead';
import ServicePlan from '@/lib/db/models/ServicePlan';
import Notification from '@/lib/db/models/Notification';
import DietTemplate from '@/lib/db/models/DietTemplate';
import Transformation from '@/lib/db/models/Transformation';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface SchemaFieldInfo {
  path: string;
  type: string;
  required: boolean;
  enum?: string[];
  default?: any;
  ref?: string;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  isArray: boolean;
  isNested: boolean;
  nestedFields?: SchemaFieldInfo[];
}

export interface RegisteredModel {
  name: string;
  model: Model<any>;
  schema: Schema;
  fields: SchemaFieldInfo[];
  requiredFields: string[];
  uniqueIdentifiers: string[]; // Fields that can uniquely identify this model
  importable: boolean; // Whether this model supports bulk import
  displayName: string;
  description: string;
}

export interface ModelMatchResult {
  modelName: string;
  confidence: number; // 0-100
  matchedFields: string[];
  missingRequired: string[];
  extraFields: string[];
  isValid: boolean;
}

// ============================================
// MODEL REGISTRY CLASS
// ============================================

class ModelRegistry {
  private models: Map<string, RegisteredModel> = new Map();
  private initialized: boolean = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize the registry with all importable models
   */
  private initialize(): void {
    if (this.initialized) return;

    // Register all importable models
    this.registerModel({
      name: 'User',
      model: User,
      importable: true,
      displayName: 'Users',
      description: 'User accounts (clients, dietitians, admins)',
      uniqueIdentifiers: ['email', 'phone']
    });

    this.registerModel({
      name: 'Lead',
      model: Lead,
      importable: true,
      displayName: 'Leads',
      description: 'Potential clients/leads',
      uniqueIdentifiers: ['email', 'phone']
    });

    this.registerModel({
      name: 'Appointment',
      model: Appointment,
      importable: true,
      displayName: 'Appointments',
      description: 'Scheduled appointments',
      uniqueIdentifiers: []
    });

    this.registerModel({
      name: 'Recipe',
      model: Recipe,
      importable: true,
      displayName: 'Recipes',
      description: 'Food recipes',
      uniqueIdentifiers: ['name']
    });

    this.registerModel({
      name: 'MealPlan',
      model: MealPlan,
      importable: true,
      displayName: 'Meal Plans',
      description: 'Client meal plans',
      uniqueIdentifiers: []
    });

    this.registerModel({
      name: 'Payment',
      model: Payment,
      importable: true,
      displayName: 'Payments',
      description: 'Payment records',
      uniqueIdentifiers: ['transactionId']
    });

    this.registerModel({
      name: 'ProgressEntry',
      model: ProgressEntry,
      importable: true,
      displayName: 'Progress Entries',
      description: 'Client progress tracking',
      uniqueIdentifiers: []
    });

    this.registerModel({
      name: 'FoodLog',
      model: FoodLog,
      importable: true,
      displayName: 'Food Logs',
      description: 'Food consumption logs',
      uniqueIdentifiers: []
    });

    this.registerModel({
      name: 'Task',
      model: Task,
      importable: true,
      displayName: 'Tasks',
      description: 'Task management',
      uniqueIdentifiers: []
    });

    this.registerModel({
      name: 'Tag',
      model: Tag,
      importable: true,
      displayName: 'Tags',
      description: 'Categorization tags',
      uniqueIdentifiers: ['name']
    });

    this.registerModel({
      name: 'ServicePlan',
      model: ServicePlan,
      importable: true,
      displayName: 'Service Plans',
      description: 'Service/subscription plans',
      uniqueIdentifiers: ['name']
    });

    this.registerModel({
      name: 'DietTemplate',
      model: DietTemplate,
      importable: true,
      displayName: 'Diet Templates',
      description: 'Diet plan templates',
      uniqueIdentifiers: ['name']
    });

    this.registerModel({
      name: 'Transformation',
      model: Transformation,
      importable: true,
      displayName: 'Transformations',
      description: 'Client transformation stories',
      uniqueIdentifiers: []
    });

    this.initialized = true;
  }

  /**
   * Register a model with the registry
   */
  private registerModel(config: {
    name: string;
    model: Model<any>;
    importable: boolean;
    displayName: string;
    description: string;
    uniqueIdentifiers: string[];
  }): void {
    const schema = config.model.schema;
    const fields = this.extractSchemaFields(schema);
    const requiredFields = fields
      .filter(f => f.required && !f.path.startsWith('_'))
      .map(f => f.path);

    this.models.set(config.name, {
      name: config.name,
      model: config.model,
      schema: schema,
      fields: fields,
      requiredFields: requiredFields,
      uniqueIdentifiers: config.uniqueIdentifiers,
      importable: config.importable,
      displayName: config.displayName,
      description: config.description
    });

    // Debug logging for User model
    if (config.name === 'User') {
      console.log(`[ModelRegistry] Registered User model with ${fields.length} total fields`);
      console.log(`[ModelRegistry] User required fields: ${requiredFields.join(', ')}`);
      console.log(`[ModelRegistry] User total field list (first 20): ${fields.map(f => f.path).slice(0, 20).join(', ')}`);
    }
  }

  /**
   * Extract field information from a Mongoose schema
   */
  private extractSchemaFields(schema: Schema, prefix: string = ''): SchemaFieldInfo[] {
    const fields: SchemaFieldInfo[] = [];
    const paths = schema.paths;

    for (const [pathName, schemaType] of Object.entries(paths)) {
      // Skip internal fields
      if (pathName.startsWith('_') && pathName !== '_id') continue;
      if (pathName === '__v') continue;

      const fullPath = prefix ? `${prefix}.${pathName}` : pathName;
      const options = (schemaType as any).options || {};
      const instance = (schemaType as any).instance;

      const fieldInfo: SchemaFieldInfo = {
        path: fullPath,
        type: this.getFieldType(schemaType),
        required: options.required === true || 
                  (Array.isArray(options.required) && options.required[0] === true),
        enum: options.enum,
        default: options.default,
        ref: options.ref,
        min: options.min,
        max: options.max,
        minLength: options.minlength,
        maxLength: options.maxlength,
        isArray: instance === 'Array',
        isNested: instance === 'Embedded' || instance === 'Mixed'
      };

      // Handle nested schemas
      if ((schemaType as any).schema) {
        fieldInfo.nestedFields = this.extractSchemaFields(
          (schemaType as any).schema,
          fullPath
        );
      }

      fields.push(fieldInfo);
    }

    return fields;
  }

  /**
   * Get the field type as a string
   */
  private getFieldType(schemaType: any): string {
    const instance = schemaType.instance;
    
    if (instance === 'Array') {
      const caster = schemaType.caster;
      if (caster) {
        return `Array<${caster.instance || 'Mixed'}>`;
      }
      return 'Array';
    }
    
    return instance || 'Mixed';
  }

  /**
   * Get all registered models
   */
  getAll(): RegisteredModel[] {
    return Array.from(this.models.values());
  }

  /**
   * Get all importable models
   */
  getImportable(): RegisteredModel[] {
    return Array.from(this.models.values()).filter(m => m.importable);
  }

  /**
   * Get a specific model by name
   */
  get(name: string): RegisteredModel | undefined {
    return this.models.get(name);
  }

  /**
   * Get model by name (case-insensitive)
   */
  getByName(name: string): RegisteredModel | undefined {
    const normalizedName = name.toLowerCase();
    for (const [key, model] of this.models) {
      if (key.toLowerCase() === normalizedName) {
        return model;
      }
    }
    return undefined;
  }

  /**
   * Detect which model a row of data belongs to
   */
  detectModel(row: Record<string, any>): ModelMatchResult[] {
    // Include ALL fields, even if empty - we need to check if required fields are PRESENT
    const rowFields = Object.keys(row);
    
    console.log(`\n[ModelDetection] ===== NEW ROW DETECTION =====`);
    console.log(`[ModelDetection] Row fields (${rowFields.length}): ${rowFields.join(', ')}`);
    
    const results: ModelMatchResult[] = [];

    for (const [name, registeredModel] of this.models) {
      if (!registeredModel.importable) continue;

      const modelFields = registeredModel.fields
        .filter(f => !f.path.startsWith('_') && f.path !== 'createdAt' && f.path !== 'updatedAt')
        .map(f => f.path);

      // Normalize field names for matching
      const normalizeFieldName = (field: string) => {
        return field.toLowerCase().replace(/_/g, '');
      };

      // Match fields with normalized comparison
      const matchedFields = rowFields.filter(f => {
        const fNormalized = normalizeFieldName(f);
        
        // Exact match
        if (modelFields.includes(f)) return true;
        
        // Case-insensitive match
        if (modelFields.some(mf => mf.toLowerCase() === f.toLowerCase())) return true;
        
        // Normalized match (ignore underscores)
        if (modelFields.some(mf => normalizeFieldName(mf) === fNormalized)) return true;
        
        // Nested field match
        if (modelFields.some(mf => mf.startsWith(f + '.'))) return true;
        
        return false;
      });

      const missingRequired = registeredModel.requiredFields.filter(rf => {
        const rfNormalized = normalizeFieldName(rf);
        
        // Check exact match
        if (rowFields.includes(rf)) return false;
        
        // Check case-insensitive match
        if (rowFields.some(f => f.toLowerCase() === rf.toLowerCase())) return false;
        
        // Check normalized match
        if (rowFields.some(f => normalizeFieldName(f) === rfNormalized)) return false;
        
        // Check nested match
        if (rowFields.some(f => f.startsWith(rf + '.'))) return false;
        
        return true;
      });

      const extraFields = rowFields.filter(f => {
        const fNormalized = normalizeFieldName(f);
        
        // Check if matches any model field
        if (modelFields.includes(f)) return false;
        if (modelFields.some(mf => mf.toLowerCase() === f.toLowerCase())) return false;
        if (modelFields.some(mf => normalizeFieldName(mf) === fNormalized)) return false;
        if (modelFields.some(mf => mf.startsWith(f + '.'))) return false;
        if (modelFields.some(mf => f.startsWith(mf + '.'))) return false;
        
        return true;
      });

      // Calculate confidence score with improved weighting
      // PRIMARY GOAL: If all required fields are present, the row belongs to this model
      // SECONDARY: How many total fields match (coverage)
      // TERTIARY: Penalize for extra fields
      
      // All required fields matched = strong indicator this is the right model
      const hasAllRequired = missingRequired.length === 0 ? 1 : 0;
      
      // Ratio of matched fields to model fields (how much of the model schema we cover)
      const matchRatio = matchedFields.length / Math.max(modelFields.length, 1);
      
      // Penalty for missing required fields (each missing required field is a strike)
      let missingRequiredPenalty = missingRequired.length * 10; // 10 points per missing required
      
      // Smaller penalty for extra fields
      // If model has 50 fields and we have 60 extra, that's a ratio of 1.2, which is 36 penalty points
      // But we cap it at 20 to not over-penalize files with many unknown columns
      const extraFieldRatio = extraFields.length / Math.max(modelFields.length, 1);
      const extraFieldPenalty = Math.min(20, extraFieldRatio * 25);

      // NEW FORMULA: 
      // Base: 80 points (if all required found) 
      // + matchRatio * 20 points (coverage of model fields) 
      // - penalties
      const confidence = Math.max(0, Math.min(100, 
        80 * hasAllRequired +          // 80 points if all required found
        matchRatio * 20 -               // Up to 20 more points based on field coverage
        missingRequiredPenalty -        // Penalize for each missing required
        extraFieldPenalty               // Penalize for unknown extra fields
      ));

      // Debug logging
      console.log(`[ModelDetection-${name}] conf=${confidence.toFixed(1)} (allReq=${hasAllRequired*80}+match=${(matchRatio*20).toFixed(1)}-missing=${missingRequiredPenalty}-extra=${extraFieldPenalty.toFixed(1)}), matched=${matchedFields.length}/${modelFields.length}, missing=${missingRequired.length}/${registeredModel.requiredFields.length}, extra=${extraFields.length}`);
      
      if (name === 'User') {
        console.log(`  [User-Details] Required fields: ${registeredModel.requiredFields.join(', ')}`);
        console.log(`  [User-Details] Missing: ${missingRequired.length > 0 ? missingRequired.join(', ') : 'NONE'}`);
        console.log(`  [User-Details] Matched required: ${registeredModel.requiredFields.filter(rf => {
          const rfNorm = normalizeFieldName(rf);
          return rowFields.some(f => normalizeFieldName(f) === rfNorm);
        }).join(', ')}`);
      }

      results.push({
        modelName: name,
        confidence: confidence,
        matchedFields,
        missingRequired,
        extraFields,
        isValid: missingRequired.length === 0 && extraFields.length === 0
      });
    }

    // Sort by confidence (descending), then by number of matched fields (descending), then by required fields match
    results.sort((a, b) => {
      if (b.confidence !== a.confidence) {
        return b.confidence - a.confidence;
      }
      // Tiebreaker 1: prefer model with more matched fields
      if (b.matchedFields.length !== a.matchedFields.length) {
        return b.matchedFields.length - a.matchedFields.length;
      }
      // Tiebreaker 2: prefer model with no missing required fields
      if (b.missingRequired.length !== a.missingRequired.length) {
        return a.missingRequired.length - b.missingRequired.length;
      }
      return 0;
    });

    console.log(`[ModelDetection] TOP RESULT: ${results[0]?.modelName}(${results[0]?.confidence.toFixed(1)}) vs threshold 60`);
    console.log(`[ModelDetection] ===== END ROW DETECTION =====\n`);
    return results;
  }

  /**
   * Get schema fields for a model (for generating templates)
   */
  getSchemaFields(modelName: string): SchemaFieldInfo[] {
    const model = this.get(modelName);
    return model ? model.fields : [];
  }

  /**
   * Get required fields for a model
   */
  getRequiredFields(modelName: string): string[] {
    const model = this.get(modelName);
    return model ? model.requiredFields : [];
  }

  /**
   * Validate a single row against a model's schema
   */
  async validateRow(
    modelName: string, 
    row: Record<string, any>,
    rowIndex: number
  ): Promise<{
    isValid: boolean;
    errors: Array<{
      row: number;
      field: string;
      message: string;
      value: any;
    }>;
  }> {
    const registeredModel = this.get(modelName);
    if (!registeredModel) {
      return {
        isValid: false,
        errors: [{
          row: rowIndex,
          field: '_model',
          message: `Model "${modelName}" not found in registry`,
          value: modelName
        }]
      };
    }

    const errors: Array<{
      row: number;
      field: string;
      message: string;
      value: any;
    }> = [];

    try {
      // Get allowed schema fields
      const schemaFields = registeredModel.fields.map(f => f.path);
      const allowedFields = new Set([
        ...schemaFields,
        '_id',
        'createdAt',
        'updatedAt',
        '__v'
      ]);

      // Filter row data to only include allowed fields
      // This removes extra columns from the import file
      const cleanedRow: Record<string, any> = {};
      for (const [key, value] of Object.entries(row)) {
        const isAllowed = allowedFields.has(key) || 
          Array.from(allowedFields).some(af => 
            key.startsWith(af + '.') || af.startsWith(key + '.')
          );
        
        if (isAllowed) {
          cleanedRow[key] = value;
        }
      }

      // Create a document instance for validation
      const doc = new registeredModel.model(cleanedRow);
      
      // Run Mongoose validation
      const validationError = doc.validateSync();
      
      if (validationError) {
        for (const [field, error] of Object.entries(validationError.errors)) {
          errors.push({
            row: rowIndex,
            field: field,
            message: (error as any).message || 'Validation failed',
            value: cleanedRow[field]
          });
        }
      }

      // Check for empty required fields
      for (const reqField of registeredModel.requiredFields) {
        const value = cleanedRow[reqField];
        if (value === '' || value === null || value === undefined) {
          // Check if error already exists
          const alreadyReported = errors.some(e => e.field === reqField);
          if (!alreadyReported) {
            errors.push({
              row: rowIndex,
              field: reqField,
              message: `"${reqField}" is required and cannot be empty`,
              value: value
            });
          }
        }
      }

    } catch (error: any) {
      errors.push({
        row: rowIndex,
        field: '_general',
        message: error.message || 'Unknown validation error',
        value: null
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get the Mongoose model instance
   */
  getMongooseModel(modelName: string): Model<any> | undefined {
    const registeredModel = this.get(modelName);
    return registeredModel?.model;
  }
}

// Export singleton instance
export const modelRegistry = new ModelRegistry();

// Export types
export type { ModelRegistry };
