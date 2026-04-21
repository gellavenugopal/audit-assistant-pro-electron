/**
 * User-friendly error messages
 * Converts technical database errors into readable messages
 */

export const ERROR_MESSAGES = {
  // Database errors
  DB_CONNECTION: 'Unable to connect to the database. Please restart the application.',
  DB_QUERY_FAILED: 'Database operation failed. Please try again.',
  DB_CONSTRAINT: 'This operation violates data integrity rules.',
  DB_FOREIGN_KEY: 'Cannot perform this operation because related data exists.',
  DB_UNIQUE_VIOLATION: 'A record with these details already exists.',
  DB_NOT_FOUND: 'The requested record was not found.',
  DB_PERMISSION: 'You do not have permission to perform this operation.',
  
  // Client errors
  CLIENT_NOT_FOUND: 'Client not found.',
  CLIENT_CREATE_FAILED: 'Failed to create client. Please check all required fields.',
  CLIENT_UPDATE_FAILED: 'Failed to update client details. Please try again.',
  CLIENT_DELETE_FAILED: 'Failed to delete client. This client may have active engagements.',
  CLIENT_NAME_EXISTS: 'A client with this name already exists.',
  CLIENT_REQUIRED_FIELDS: 'Please fill in all required fields (Name and Constitution).',
  
  // Engagement errors
  ENGAGEMENT_NOT_FOUND: 'Engagement not found.',
  ENGAGEMENT_CREATE_FAILED: 'Failed to create engagement. Please check all required fields.',
  ENGAGEMENT_UPDATE_FAILED: 'Failed to update engagement details. Please try again.',
  ENGAGEMENT_DELETE_FAILED: 'Failed to delete engagement.',
  
  // User/Auth errors
  USER_NOT_FOUND: 'User not found.',
  INVALID_CREDENTIALS: 'Invalid email or password.',
  EMAIL_EXISTS: 'An account with this email already exists.',
  PASSWORD_TOO_WEAK: 'Password must be at least 6 characters long.',
  AUTH_REQUIRED: 'Please log in to continue.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  
  // File errors
  FILE_UPLOAD_FAILED: 'Failed to upload file. Please try again.',
  FILE_TOO_LARGE: 'File is too large. Maximum size is 10MB.',
  FILE_INVALID_TYPE: 'Invalid file type. Please upload a supported format.',
  FILE_NOT_FOUND: 'File not found.',
  
  // Generic errors
  NETWORK_ERROR: 'Network error. Please check your internet connection.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  PERMISSION_DENIED: 'You do not have permission to perform this action.',
  OPERATION_CANCELLED: 'Operation was cancelled.',
};

export type ErrorCode = keyof typeof ERROR_MESSAGES;

interface ErrorDetails {
  code?: string;
  message?: string;
  constraint?: string;
}

/**
 * Convert technical error to user-friendly message
 */
export function getUserFriendlyError(error: any): string {
  if (!error) return ERROR_MESSAGES.UNKNOWN_ERROR;
  
  // If error already has a friendly message, use it
  if (typeof error === 'string') {
    return error;
  }
  
  const errorMessage = error.message || '';
  const errorCode = error.code || '';
  
  // Database specific errors
  if (errorMessage.includes('UNIQUE constraint failed')) {
    if (errorMessage.includes('clients.name')) {
      return ERROR_MESSAGES.CLIENT_NAME_EXISTS;
    }
    if (errorMessage.includes('email')) {
      return ERROR_MESSAGES.EMAIL_EXISTS;
    }
    return ERROR_MESSAGES.DB_UNIQUE_VIOLATION;
  }
  
  if (errorMessage.includes('FOREIGN KEY constraint failed')) {
    return ERROR_MESSAGES.DB_FOREIGN_KEY;
  }
  
  if (errorMessage.includes('NOT NULL constraint failed')) {
    return ERROR_MESSAGES.CLIENT_REQUIRED_FIELDS;
  }
  
  if (errorMessage.includes('No rows returned') || errorMessage.includes('not found')) {
    return ERROR_MESSAGES.DB_NOT_FOUND;
  }
  
  // Auth errors
  if (errorMessage.includes('Invalid login credentials')) {
    return ERROR_MESSAGES.INVALID_CREDENTIALS;
  }
  
  if (errorMessage.includes('User already registered')) {
    return ERROR_MESSAGES.EMAIL_EXISTS;
  }
  
  if (errorMessage.includes('Password should be')) {
    return ERROR_MESSAGES.PASSWORD_TOO_WEAK;
  }
  
  // Network errors
  if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
    return ERROR_MESSAGES.NETWORK_ERROR;
  }
  
  // Function call errors
  if (errorMessage.includes('is not a function')) {
    return ERROR_MESSAGES.DB_QUERY_FAILED;
  }
  
  // Return the original message if it's already user-friendly
  if (errorMessage.length > 0 && errorMessage.length < 100 && !errorMessage.includes('Error:')) {
    return errorMessage;
  }
  
  return ERROR_MESSAGES.UNKNOWN_ERROR;
}

/**
 * Log error for debugging while showing friendly message to user
 */
export function handleError(error: any, context?: string): string {
  const friendlyMessage = getUserFriendlyError(error);
  
  // Log technical details for debugging
  console.error(`[${context || 'Error'}]`, {
    friendlyMessage,
    technicalError: error,
    stack: error?.stack,
  });
  
  return friendlyMessage;
}
