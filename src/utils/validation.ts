import { Response } from 'express';
import { ZodError } from 'zod';

export interface ValidationIssue {
  field: string;
  message: string;
  code: string;
}

export const formatZodIssues = (error: ZodError): ValidationIssue[] =>
  error.issues.map((issue) => ({
    field: issue.path.join('.') || 'body',
    message: issue.message,
    code: issue.code,
  }));

export const sendValidationError = (
  res: Response,
  error: unknown,
  message = 'Dados inválidos'
): boolean => {
  if (!(error instanceof ZodError)) {
    return false;
  }

  res.status(400).json({
    success: false,
    message,
    code: 'VALIDATION_ERROR',
    errors: formatZodIssues(error),
  });

  return true;
};
