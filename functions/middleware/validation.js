/**
 * Validation middleware for Firebase Cloud Functions
 * Provides request validation using Joi schemas
 */

/**
 * Validates request body against a Joi schema
 * @param {Object} schema - Joi validation schema
 * @param {Object} options - Validation options
 * @returns {Function} Middleware function for validation
 */
const validateRequest = (schema, options = {}) => {
  const defaultOptions = {
    abortEarly: false, // Return all validation errors
    stripUnknown: true, // Remove unknown properties
    allowUnknown: false, // Don't allow unknown properties
    ...options,
  }

  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, defaultOptions)

    if (error) {
      console.warn('Request validation failed:', {
        path: req.path,
        method: req.method,
        errors: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value,
        })),
      })

      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message.replace(/"/g, '\''), // Clean up quotes in messages
        })),
      })
    }

    // Replace req.body with validated and sanitized data
    req.body = value

    if (next) {
      next()
    }
  }
}

/**
 * Validates Firebase Functions v2 onRequest data
 * @param {Object} schema - Joi validation schema
 * @param {Object} data - Data to validate (req.body for HTTP functions, request.data for callable functions)
 * @param {String} functionName - Name of the function for logging
 * @returns {Object} Validated data or throws error
 */
const validateFunctionData = (schema, data, functionName = 'unknown') => {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
    allowUnknown: false,
  })

  if (error) {
    console.warn(`Function validation failed for ${functionName}:`, {
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      })),
    })

    const validationError = new Error('Validation failed')
    validationError.code = 'invalid-argument'
    validationError.details = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message.replace(/"/g, '\''),
    }))

    throw validationError
  }

  return value
}

/**
 * Validates Firebase Functions v2 callable function data with HttpsError
 * @param {Object} schema - Joi validation schema
 * @param {Object} data - Data to validate
 * @param {String} functionName - Name of the function for logging
 * @returns {Object} Validated data or throws HttpsError
 */
const validateCallableData = (schema, data, functionName = 'unknown') => {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
    allowUnknown: false,
  })

  if (error) {
    console.warn(`Callable function validation failed for ${functionName}:`, {
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      })),
    })

    // Import HttpsError dynamically to avoid import issues
    const { HttpsError } = require('firebase-functions/v2/https')

    throw new HttpsError('invalid-argument', 'Validation failed', {
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/"/g, '\''),
      })),
    })
  }

  return value
}

/**
 * Sanitizes string input to prevent basic injection attempts
 * @param {String} input - String to sanitize
 * @returns {String} Sanitized string
 */
const sanitizeString = input => {
  if (typeof input !== 'string') {
    return input
  }

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove basic HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers like onclick=
    .slice(0, 1000) // Limit length to prevent buffer overflow
}

/**
 * Sanitizes an object's string properties
 * @param {Object} obj - Object to sanitize
 * @returns {Object} Sanitized object
 */
const sanitizeObject = obj => {
  if (!obj || typeof obj !== 'object') {
    return obj
  }

  const sanitized = {}

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value)
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value)
    } else {
      sanitized[key] = value
    }
  }

  return sanitized
}

module.exports = {
  validateRequest,
  validateFunctionData,
  validateCallableData,
  sanitizeString,
  sanitizeObject,
}
