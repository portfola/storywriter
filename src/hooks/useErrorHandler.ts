/**
 * Error Handling Hooks
 * 
 * React hooks for consistent error handling in components
 */

import { useState, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { ErrorHandler, ErrorType, ErrorSeverity, AppError, ChildFriendlyErrors } from '@/src/utils/errorHandler';

export interface ErrorState {
  error: AppError | null;
  hasError: boolean;
  isRecoverable: boolean;
}

export interface ErrorHandlerOptions {
  showAlert?: boolean;
  alertTitle?: string;
  useChildFriendlyMessages?: boolean;
  onError?: (error: AppError) => void;
  autoReset?: boolean;
  resetTimeout?: number;
}

/**
 * Hook for handling errors in components
 */
export function useErrorHandler(options: ErrorHandlerOptions = {}) {
  const {
    showAlert = true,
    alertTitle = 'Error',
    useChildFriendlyMessages = false,
    onError,
    autoReset = false,
    resetTimeout = 5000
  } = options;

  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    hasError: false,
    isRecoverable: true
  });

  const resetTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const getChildFriendlyMessage = useCallback((errorType: ErrorType): string => {
    switch (errorType) {
      case ErrorType.STORY_GENERATION:
        return ChildFriendlyErrors.getRandomMessage('storyGeneration');
      case ErrorType.CONVERSATION:
        return ChildFriendlyErrors.getRandomMessage('conversation');
      case ErrorType.AUDIO:
        return ChildFriendlyErrors.getRandomMessage('audio');
      default:
        return ChildFriendlyErrors.getRandomMessage('storyGeneration');
    }
  }, []);

  const handleError = useCallback((
    error: unknown,
    type: ErrorType = ErrorType.SYSTEM,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: Record<string, unknown>
  ) => {
    const appError = ErrorHandler.fromUnknown(error, type, severity, context);
    
    // Log the error
    ErrorHandler.handleError(appError);
    
    // Update state
    setErrorState({
      error: appError,
      hasError: true,
      isRecoverable: severity !== ErrorSeverity.CRITICAL
    });

    // Show alert if configured
    if (showAlert) {
      const message = useChildFriendlyMessages 
        ? getChildFriendlyMessage(appError.type)
        : appError.userMessage;
      
      Alert.alert(alertTitle, message, [{ text: 'OK' }]);
    }

    // Call custom error handler if provided
    onError?.(appError);

    // Auto-reset if configured
    if (autoReset && severity !== ErrorSeverity.CRITICAL) {
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
      resetTimeoutRef.current = setTimeout(() => {
        clearError();
      }, resetTimeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAlert, alertTitle, useChildFriendlyMessages, getChildFriendlyMessage, onError, autoReset, resetTimeout]);

  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      hasError: false,
      isRecoverable: true
    });

    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = undefined;
    }
  }, []);

  return {
    ...errorState,
    handleError,
    clearError
  };
}

/**
 * Hook for handling async operations with error handling
 */
export function useAsyncError() {
  const [loading, setLoading] = useState(false);
  const errorHandler = useErrorHandler();

  const execute = useCallback(async <T>(
    operation: () => Promise<T>,
    errorType: ErrorType = ErrorType.SYSTEM,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: Record<string, unknown>
  ): Promise<T | null> => {
    setLoading(true);
    errorHandler.clearError();

    try {
      const result = await operation();
      return result;
    } catch (error) {
      errorHandler.handleError(error, errorType, severity, context);
      return null;
    } finally {
      setLoading(false);
    }
  }, [errorHandler]);

  return {
    loading,
    ...errorHandler,
    execute
  };
}

/**
 * Hook for consolidated error state management
 */
export function useErrorState() {
  const [errors, setErrors] = useState<Record<string, AppError>>({});

  const addError = useCallback((key: string, error: AppError) => {
    ErrorHandler.handleError(error);
    setErrors(prev => ({ ...prev, [key]: error }));
  }, []);

  const removeError = useCallback((key: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[key];
      return newErrors;
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  const hasErrors = Object.keys(errors).length > 0;
  const hasErrorOfType = useCallback((type: ErrorType) => {
    return Object.values(errors).some(error => error.type === type);
  }, [errors]);

  const getErrorsOfType = useCallback((type: ErrorType) => {
    return Object.values(errors).filter(error => error.type === type);
  }, [errors]);

  return {
    errors,
    hasErrors,
    addError,
    removeError,
    clearAllErrors,
    hasErrorOfType,
    getErrorsOfType
  };
}