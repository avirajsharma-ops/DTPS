/**
 * FILE PARSER - Universal file parsing for CSV, Excel, and JSON
 * 
 * Handles parsing of uploaded files into a standardized format
 * for model detection and validation.
 */

// Lazy-load xlsx (~300KB) only when actually needed
let _XLSX: typeof import('xlsx') | null = null;
async function getXLSX() {
  if (!_XLSX) {
    _XLSX = await import('xlsx');
  }
  return _XLSX;
}

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface ParsedRow {
  rowIndex: number;
  data: Record<string, any>;
  rawData: Record<string, any>;
}

export interface ParseResult {
  success: boolean;
  rows: ParsedRow[];
  headers: string[];
  totalRows: number;
  errors: string[];
  fileType: 'csv' | 'excel' | 'json' | 'unknown';
  fileName: string;
}

export interface ParseOptions {
  headerRow?: number; // 0-indexed, default 0
  skipEmptyRows?: boolean;
  trimValues?: boolean;
  convertTypes?: boolean;
  dateFormats?: string[];
}

// ============================================
// FILE PARSER CLASS
// ============================================

export class FileParser {
  private options: ParseOptions;

  constructor(options: ParseOptions = {}) {
    this.options = {
      headerRow: 0,
      skipEmptyRows: true,
      trimValues: true,
      convertTypes: true,
      dateFormats: ['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY'],
      ...options
    };
  }

  /**
   * Parse a file (auto-detect type)
   */
  async parse(
    file: File | Buffer | ArrayBuffer,
    fileName: string
  ): Promise<ParseResult> {
    const extension = fileName.split('.').pop()?.toLowerCase();

    try {
      switch (extension) {
        case 'csv':
          return await this.parseCSV(file, fileName);
        case 'xlsx':
        case 'xls':
          return await this.parseExcel(file, fileName);
        case 'json':
          return await this.parseJSON(file, fileName);
        default:
          // Try to detect by content
          return await this.parseAuto(file, fileName);
      }
    } catch (error: any) {
      return {
        success: false,
        rows: [],
        headers: [],
        totalRows: 0,
        errors: [`Failed to parse file: ${error.message}`],
        fileType: 'unknown',
        fileName
      };
    }
  }

  /**
   * Parse CSV file
   */
  private async parseCSV(
    file: File | Buffer | ArrayBuffer,
    fileName: string
  ): Promise<ParseResult> {
    const content = await this.getFileContent(file);
    const XLSX = await getXLSX();
    const workbook = XLSX.read(content, { type: 'string', raw: false });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    return this.parseSheet(sheet, fileName, 'csv');
  }

  /**
   * Parse Excel file
   */
  private async parseExcel(
    file: File | Buffer | ArrayBuffer,
    fileName: string
  ): Promise<ParseResult> {
    const buffer = await this.getFileBuffer(file);
    const XLSX = await getXLSX();
    const workbook = XLSX.read(buffer, { type: 'buffer', raw: false, cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    return this.parseSheet(sheet, fileName, 'excel');
  }

  /**
   * Parse JSON file
   */
  private async parseJSON(
    file: File | Buffer | ArrayBuffer,
    fileName: string
  ): Promise<ParseResult> {
    const content = await this.getFileContent(file);
    
    try {
      let data = JSON.parse(content);
      
      // Handle if root is an object with a data array
      if (!Array.isArray(data)) {
        if (data.data && Array.isArray(data.data)) {
          data = data.data;
        } else if (data.rows && Array.isArray(data.rows)) {
          data = data.rows;
        } else if (data.items && Array.isArray(data.items)) {
          data = data.items;
        } else {
          // Single object, wrap in array
          data = [data];
        }
      }

      if (!Array.isArray(data)) {
        return {
          success: false,
          rows: [],
          headers: [],
          totalRows: 0,
          errors: ['JSON file must contain an array of objects'],
          fileType: 'json',
          fileName
        };
      }

      // Extract headers from all objects
      const headerSet = new Set<string>();
      data.forEach((item: any) => {
        if (typeof item === 'object' && item !== null) {
          Object.keys(item).forEach(key => headerSet.add(key));
        }
      });
      const headers = Array.from(headerSet);

      // Parse rows
      const rows: ParsedRow[] = [];
      data.forEach((item: any, index: number) => {
        if (typeof item === 'object' && item !== null) {
          const parsedData = this.processRow(item, headers);
          if (!this.isEmptyRow(parsedData) || !this.options.skipEmptyRows) {
            rows.push({
              rowIndex: index + 1,
              data: parsedData,
              rawData: item
            });
          }
        }
      });

      return {
        success: true,
        rows,
        headers,
        totalRows: rows.length,
        errors: [],
        fileType: 'json',
        fileName
      };

    } catch (error: any) {
      return {
        success: false,
        rows: [],
        headers: [],
        totalRows: 0,
        errors: [`Invalid JSON: ${error.message}`],
        fileType: 'json',
        fileName
      };
    }
  }

  /**
   * Auto-detect and parse file
   */
  private async parseAuto(
    file: File | Buffer | ArrayBuffer,
    fileName: string
  ): Promise<ParseResult> {
    const content = await this.getFileContent(file);
    const trimmed = content.trim();

    // Try JSON first
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        return await this.parseJSON(file, fileName);
      } catch {
        // Not valid JSON, continue
      }
    }

    // Try CSV
    try {
      return await this.parseCSV(file, fileName);
    } catch {
      // Not valid CSV
    }

    return {
      success: false,
      rows: [],
      headers: [],
      totalRows: 0,
      errors: ['Unable to detect file format. Please use CSV, Excel (.xlsx/.xls), or JSON.'],
      fileType: 'unknown',
      fileName
    };
  }

  /**
   * Parse an Excel/CSV sheet
   */
  private async parseSheet(
    sheet: any,
    fileName: string,
    fileType: 'csv' | 'excel'
  ): Promise<ParseResult> {
    // Use XLSX to convert sheet to array format where first row is headers
    const XLSX = await getXLSX();
    const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
      raw: false,
      defval: ''
    });

    if (jsonData.length === 0) {
      return {
        success: false,
        rows: [],
        headers: [],
        totalRows: 0,
        errors: ['File is empty'],
        fileType,
        fileName
      };
    }

    // Extract headers from the first object's keys
    const rawHeaders = Object.keys(jsonData[0]);
    
    if (!rawHeaders || rawHeaders.length === 0) {
      return {
        success: false,
        rows: [],
        headers: [],
        totalRows: 0,
        errors: ['No headers found in the file'],
        fileType,
        fileName
      };
    }

    // Clean headers
    const headers = rawHeaders.map((h, i) => {
      const cleaned = this.cleanHeader(String(h || `column_${i}`));
      console.log(`[FileParser-Header] "${h}" -> "${cleaned}"`);
      return cleaned || `column_${i}`;
    });

    // Parse data rows
    const rows: ParsedRow[] = [];
    jsonData.forEach((rowData: Record<string, any>, index: number) => {
      const cleanedRowData: Record<string, any> = {};
      
      // Map raw headers to cleaned headers
      rawHeaders.forEach((rawHeader, headerIndex) => {
        const cleanedHeader = headers[headerIndex];
        cleanedRowData[cleanedHeader] = rowData[rawHeader];
      });

      const processedData = this.processRow(cleanedRowData, headers);
      
      if (!this.isEmptyRow(processedData) || !this.options.skipEmptyRows) {
        rows.push({
          rowIndex: index + 2, // +2 because first row is headers (row 1) and we start from row 2
          data: processedData,
          rawData: rowData
        });
      }
    });

    console.log(`\n[FileParser] ===== PARSING COMPLETE =====`);
    console.log(`[FileParser] Total raw headers: ${rawHeaders.length}`);
    console.log(`[FileParser] Raw headers: ${rawHeaders.join(', ')}`);
    console.log(`[FileParser] Cleaned headers: ${headers.join(', ')}`);
    console.log(`[FileParser] Parsed ${rows.length} data rows from ${fileName}`);
    console.log(`[FileParser] ===== END PARSING =====\n`);

    return {
      success: true,
      rows,
      headers,
      totalRows: rows.length,
      errors: [],
      fileType,
      fileName
    };
  }

  /**
   * Process a single row of data
   */
  private processRow(
    row: Record<string, any>,
    headers: string[]
  ): Record<string, any> {
    const processed: Record<string, any> = {};

    for (const header of headers) {
      let value = row[header];

      // Trim string values
      if (this.options.trimValues && typeof value === 'string') {
        value = value.trim();
      }

      // Convert types if enabled
      if (this.options.convertTypes) {
        value = this.convertValue(value, header);
      }

      // Handle empty strings
      if (value === '') {
        value = null;
      }

      processed[header] = value;
    }

    // Convert indexed fields (like field[0]) to arrays and dot notation to nested objects
    const converted = this.convertIndexedFieldsToArrays(processed);

    return converted;
  }

  /**
   * Convert a value to its appropriate type
   */
  private convertValue(value: any, header: string): any {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const strValue = String(value).trim();

    // Boolean detection
    if (strValue.toLowerCase() === 'true') return true;
    if (strValue.toLowerCase() === 'false') return false;
    if (strValue.toLowerCase() === 'yes') return true;
    if (strValue.toLowerCase() === 'no') return false;

    // Number detection
    if (/^-?\d+$/.test(strValue)) {
      return parseInt(strValue, 10);
    }
    if (/^-?\d+\.\d+$/.test(strValue)) {
      return parseFloat(strValue);
    }

    // Date detection (common formats)
    const headerLower = header.toLowerCase();
    if (headerLower.includes('date') || 
        headerLower.includes('time') || 
        headerLower.includes('at') ||
        headerLower.endsWith('_at')) {
      const date = this.parseDate(strValue);
      if (date) return date;
    }

    // Array detection (comma-separated)
    if (strValue.includes(',') && !strValue.includes('"')) {
      // Check if header suggests array
      if (headerLower.includes('tags') || 
          headerLower.includes('list') || 
          headerLower.includes('items') ||
          headerLower.endsWith('s')) {
        return strValue.split(',').map(s => s.trim()).filter(s => s);
      }
    }

    // JSON object/array detection
    if ((strValue.startsWith('{') && strValue.endsWith('}')) ||
        (strValue.startsWith('[') && strValue.endsWith(']'))) {
      try {
        return JSON.parse(strValue);
      } catch {
        // Not valid JSON, return as string
      }
    }

    return strValue;
  }

  /**
   * Parse a date string
   */
  private parseDate(value: string): Date | null {
    // ISO format
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) return date;
    }

    // DD/MM/YYYY or DD-MM-YYYY
    const ddmmyyyy = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (ddmmyyyy) {
      const date = new Date(
        parseInt(ddmmyyyy[3]),
        parseInt(ddmmyyyy[2]) - 1,
        parseInt(ddmmyyyy[1])
      );
      if (!isNaN(date.getTime())) return date;
    }

    // MM/DD/YYYY
    const mmddyyyy = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (mmddyyyy) {
      const date = new Date(
        parseInt(mmddyyyy[3]),
        parseInt(mmddyyyy[1]) - 1,
        parseInt(mmddyyyy[2])
      );
      if (!isNaN(date.getTime())) return date;
    }

    return null;
  }

  /**
   * Clean a header string and preserve array notation and dot notation
   */
  private cleanHeader(header: string): string {
    // Preserve brackets and dots - they're important for array and nested fields
    let cleaned = header
      .trim()
      .replace(/\s+/g, '_')
      // Remove invalid characters but KEEP [ ] . for array/nested notation
      .replace(/[^a-zA-Z0-9_\[\]\.]/g, '');

    // Don't convert to camelCase if it has brackets or dots (preserve original structure)
    if (cleaned.includes('[') || cleaned.includes('.')) {
      console.log(`[cleanHeader] "${header}" -> "${cleaned}" (preserved notation)`);
      return cleaned;
    }

    // Convert snake_case to camelCase only for simple fields
    let camelCased = this.snakeToCamelCase(cleaned);
    
    console.log(`[cleanHeader] "${header}" -> "${cleaned}" -> "${camelCased}"`);
    
    return camelCased;
  }

  /**
   * Convert snake_case string to camelCase
   * Handles both snake_case and plainlowercase inputs
   */
  private snakeToCamelCase(str: string): string {
    // First, handle snake_case conversion
    let result = str.toLowerCase().replace(/_([a-z0-9])/g, (match, letter) => {
      return letter.toUpperCase();
    });
    
    return result;
  }

  /**
   * Convert indexed fields (like field[0], field[1]) into proper arrays
   * and dot notation (like goals.calories) into nested objects
   */
  private convertIndexedFieldsToArrays(data: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    const arrayFields: Map<string, any[]> = new Map();
    const nestedFields: Map<string, Record<string, any>> = new Map();

    for (const [key, value] of Object.entries(data)) {
      // Check for array notation like field[0], field[1]
      const arrayMatch = key.match(/^(.+)\[(\d+)\]$/);
      if (arrayMatch) {
        const fieldName = arrayMatch[1];
        const index = parseInt(arrayMatch[2], 10);
        
        if (!arrayFields.has(fieldName)) {
          arrayFields.set(fieldName, []);
        }
        const arr = arrayFields.get(fieldName)!;
        // Ensure array is big enough
        while (arr.length <= index) {
          arr.push(null);
        }
        arr[index] = value;
        continue;
      }

      // Check for dot notation like goals.calories, settings.darkMode
      if (key.includes('.')) {
        const parts = key.split('.');
        const rootField = parts[0];
        const nestedPath = parts.slice(1).join('.');
        
        if (!nestedFields.has(rootField)) {
          nestedFields.set(rootField, {});
        }
        this.setNestedValue(nestedFields.get(rootField)!, nestedPath, value);
        continue;
      }

      // Regular field
      result[key] = value;
    }

    // Add array fields to result (filter out null values)
    for (const [fieldName, arr] of arrayFields) {
      result[fieldName] = arr.filter(v => v !== null && v !== undefined && v !== '');
    }

    // Add nested fields to result
    for (const [fieldName, nested] of nestedFields) {
      result[fieldName] = nested;
    }

    return result;
  }

  /**
   * Set a nested value in an object using dot notation path
   */
  private setNestedValue(obj: Record<string, any>, path: string, value: any): void {
    const parts = path.split('.');
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part] || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part];
    }
    
    current[parts[parts.length - 1]] = value;
  }

  /**
   * Check if a row is empty
   */
  private isEmptyRow(row: Record<string, any>): boolean {
    return Object.values(row).every(v => 
      v === null || v === undefined || v === ''
    );
  }

  /**
   * Get file content as string
   */
  private async getFileContent(file: File | Buffer | ArrayBuffer): Promise<string> {
    if (file instanceof File) {
      return await file.text();
    }
    if (Buffer.isBuffer(file)) {
      return file.toString('utf-8');
    }
    if (file instanceof ArrayBuffer) {
      return new TextDecoder().decode(file);
    }
    throw new Error('Unsupported file type');
  }

  /**
   * Get file content as Buffer
   */
  private async getFileBuffer(file: File | Buffer | ArrayBuffer): Promise<Buffer> {
    if (file instanceof File) {
      const arrayBuffer = await file.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }
    if (Buffer.isBuffer(file)) {
      return file;
    }
    if (file instanceof ArrayBuffer) {
      return Buffer.from(file);
    }
    throw new Error('Unsupported file type');
  }
}

// Export singleton instance
export const fileParser = new FileParser();

// ============================================
// FILE GENERATOR - Generate CSV/JSON files
// ============================================

export class FileGenerator {
  /**
   * Generate a CSV string from data
   */
  static generateCSV(
    data: Record<string, any>[],
    headers?: string[]
  ): string {
    if (data.length === 0) return '';

    // Get headers from data if not provided
    const csvHeaders = headers || this.extractHeaders(data);

    // Build CSV
    const rows: string[] = [];
    
    // Header row
    rows.push(csvHeaders.map(h => this.escapeCSV(h)).join(','));

    // Data rows
    for (const row of data) {
      const values = csvHeaders.map(header => {
        const value = row[header];
        return this.escapeCSV(this.formatValue(value));
      });
      rows.push(values.join(','));
    }

    return rows.join('\n');
  }

  /**
   * Generate JSON string from data
   */
  static generateJSON(
    data: Record<string, any>[],
    pretty: boolean = true
  ): string {
    return JSON.stringify(data, null, pretty ? 2 : 0);
  }

  /**
   * Generate an Excel buffer from data
   */
  static async generateExcel(
    data: Record<string, any>[],
    sheetName: string = 'Sheet1'
  ): Promise<Buffer> {
    const XLSX = await getXLSX();
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  /**
   * Extract headers from data
   */
  private static extractHeaders(data: Record<string, any>[]): string[] {
    const headerSet = new Set<string>();
    data.forEach(row => {
      Object.keys(row).forEach(key => headerSet.add(key));
    });
    return Array.from(headerSet);
  }

  /**
   * Escape a value for CSV
   */
  private static escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * Format a value for CSV output
   */
  private static formatValue(value: any): string {
    if (value === null || value === undefined) return '';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') {
      if (value instanceof Date) {
        return value.toISOString();
      }
      return JSON.stringify(value);
    }
    return String(value);
  }
}
