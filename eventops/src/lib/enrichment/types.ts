/**
 * Email Pattern Detection Types
 */

export type EmailPatternType =
  | 'first.last'          // john.doe@company.com
  | 'firstlast'           // johndoe@company.com
  | 'first'               // john@company.com
  | 'f.last'              // j.doe@company.com
  | 'flast'               // jdoe@company.com
  | 'first.l'             // john.d@company.com
  | 'firstl'              // johnd@company.com
  | 'l.first'             // d.john@company.com
  | 'lfirst'              // djohn@company.com
  | 'first_last'          // john_doe@company.com
  | 'custom';

export interface EmailPattern {
  id: string;
  companyId: string;
  companyDomain: string;
  patternType: EmailPatternType;
  confidence: number;
  sampleSize: number;
  examples: string[];
  verifiedCount: number;
  bouncedCount: number;
  lastDetectedAt: Date;
}

export interface PatternDetectionResult {
  domain: string;
  totalEmails: number;
  detectedPatterns: EmailPattern[];
  primaryPattern: EmailPattern | null;
  recommendation: string;
}

export interface ApplicationResult {
  success: boolean;
  companyId: string;
  companyName: string;
  applied: number;
  skipped: number;
  pattern?: string;
  confidence?: number;
  sampleEmails?: string[];
  error?: string;
}

export interface BatchResult {
  total: number;
  successful: number;
  totalApplied: number;
  totalSkipped: number;
  results: ApplicationResult[];
}

export interface ValidationResult {
  valid: boolean;
  reason: string;
  confidence?: number;
  mxRecords?: string[];
}
