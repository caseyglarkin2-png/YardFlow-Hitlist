/**
 * Email Configuration Validator
 *
 * Sprint 59: Validates SendGrid environment variables at runtime.
 * Catches common misconfigurations like wrong variable names.
 */

export interface EmailConfigValidation {
  valid: boolean;
  apiKeySet: boolean;
  apiKeyLength: number;
  fromEmailSet: boolean;
  fromEmailValid: boolean;
  fromEmail: string | null;
  errors: string[];
  warnings: string[];
}

/**
 * Validates email configuration environment variables.
 * Returns detailed validation result with clear error messages.
 *
 * @example
 * ```typescript
 * const config = validateEmailConfig();
 * if (!config.valid) {
 *   console.error('Email misconfigured:', config.errors);
 * }
 * ```
 */
export function validateEmailConfig(): EmailConfigValidation {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;

  const errors: string[] = [];
  const warnings: string[] = [];

  // Check API key
  const apiKeySet = !!apiKey;
  const apiKeyLength = apiKey?.length || 0;

  if (!apiKeySet) {
    errors.push('SENDGRID_API_KEY is not set');

    // Check for common misconfiguration: wrong variable name
    const wrongNames = [
      'SENDGRID_API_KEY_CASEY',
      'SENDGRID_KEY',
      'SG_API_KEY',
      'SEND_GRID_API_KEY',
    ];

    for (const wrongName of wrongNames) {
      if (process.env[wrongName]) {
        errors.push(
          `Found ${wrongName} but code expects SENDGRID_API_KEY - rename the variable in Railway`
        );
      }
    }
  } else if (apiKeyLength < 20) {
    errors.push(
      `SENDGRID_API_KEY appears invalid (length: ${apiKeyLength}, expected 50+)`
    );
  } else if (!apiKey.startsWith('SG.')) {
    warnings.push(
      'SENDGRID_API_KEY does not start with "SG." - verify this is a valid SendGrid key'
    );
  }

  // Warn about whitespace in API key (common copy-paste issue)
  if (apiKey && (apiKey.startsWith(' ') || apiKey.endsWith(' ') || apiKey !== apiKey.trim())) {
    warnings.push('SENDGRID_API_KEY has leading/trailing whitespace - may cause auth failures');
  }

  // Check from email
  const fromEmailSet = !!fromEmail;
  const fromEmailValid = fromEmail
    ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail)
    : false;

  if (!fromEmailSet) {
    warnings.push(
      'SENDGRID_FROM_EMAIL not set - will use default casey@freightroll.com'
    );
  } else if (!fromEmailValid) {
    errors.push(`SENDGRID_FROM_EMAIL "${fromEmail}" is not a valid email`);
  }

  // Warn about potentially unverified senders
  const unverifiedSenders = ['jake@freightroll.com'];
  if (fromEmail && unverifiedSenders.includes(fromEmail.toLowerCase())) {
    warnings.push(
      `SENDGRID_FROM_EMAIL is ${fromEmail} - ensure this sender is verified in SendGrid`
    );
  }

  // Warn about wrong domain (case-insensitive)
  if (fromEmail && !fromEmail.toLowerCase().endsWith('@freightroll.com')) {
    warnings.push(
      `SENDGRID_FROM_EMAIL "${fromEmail}" is not from @freightroll.com domain`
    );
  }

  return {
    valid: errors.length === 0,
    apiKeySet,
    apiKeyLength,
    fromEmailSet,
    fromEmailValid,
    fromEmail: fromEmail || null,
    errors,
    warnings,
  };
}

/**
 * Get a summary suitable for logging.
 */
export function getEmailConfigSummary(): string {
  const config = validateEmailConfig();

  if (config.valid && config.warnings.length === 0) {
    return `Email config OK: from=${config.fromEmail}`;
  }

  const issues = [...config.errors, ...config.warnings];
  return `Email config issues: ${issues.join('; ')}`;
}
