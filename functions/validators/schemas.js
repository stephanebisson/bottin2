const Joi = require('joi')

/**
 * Validation schemas for all API endpoints
 * Using Joi for comprehensive input validation
 */

// Common patterns
const emailSchema = Joi.string()
  .email({ tlds: { allow: false } }) // Allow all TLDs
  .max(255)
  .required()

const tokenSchema = Joi.string()
  .min(20) // Reasonable minimum for tokens
  .max(255)
  .required()

const nameSchema = Joi.string()
  .trim()
  .min(1)
  .max(50)
  .pattern(/^[a-z\u00C0-\u017F\s\-']+$/i) // Letters, accents, spaces, hyphens, apostrophes
  .required()

const phoneSchema = Joi.string()
  .pattern(/^\d{10}$/)
  .allow('')
  .messages({
    'string.pattern.base': 'Phone must be exactly 10 numerical digits',
  })

const postalCodeSchema = Joi.string()
  .pattern(/^[A-Z]\d[A-Z]\d[A-Z]\d$/i)
  .allow('')
  .messages({
    'string.pattern.base': 'Postal code must be in Canadian format A9A9A9 (e.g., H1A2B3)',
  })

// Auth validation schemas
const emailValidationSchema = Joi.object({
  email: emailSchema,
})

// Parent update validation schemas
const parentUpdateSchema = Joi.object({
  // Absent when the signed-in parent's ID token identifies them instead
  token: tokenSchema.optional(),
  parentData: Joi.object({
    first_name: nameSchema,
    last_name: nameSchema,
    phone: phoneSchema,
    address: Joi.string().max(200).allow(''),
    city: Joi.string().max(100).allow(''),
    postal_code: postalCodeSchema,
    interests: Joi.alternatives().try(
      Joi.array().items(Joi.string().max(100)).max(50).default([]), // More than the number of available interests
      Joi.string().max(500).allow(''),
    ).default([]),
    // No longer offered; ignored if a form loaded before its removal still sends it
    sameAddressAsOther: Joi.any().strip(),
  }).required(),
})

const tokenValidationSchema = Joi.object({
  // Absent when the signed-in parent's ID token identifies them instead
  token: tokenSchema.optional(),
})

const parentOptOutSchema = Joi.object({
  // Absent when the signed-in parent's ID token identifies them instead
  token: tokenSchema.optional(),
})

// Feedback validation schemas: the message is all the client sends (same limits as the feedback page)
const feedbackSchema = Joi.object({
  message: Joi.string().trim().min(10).max(2000).required(),
})

// Email workflow schemas
const sendEmailsSchema = Joi.object({
  workflowId: Joi.string().min(1).max(128).required(),
  parentEmails: Joi.array()
    .items(emailSchema)
    .min(1)
    .max(1000) // Reasonable limit
    .unique()
    .required(),
})

// Annual update workflow schemas
const startAnnualUpdateSchema = Joi.object({
  schoolYear: Joi.string()
    .pattern(/^\d{4}-\d{4}$/)
    .required()
    .messages({
      'string.pattern.base': 'School year must be in format YYYY-YYYY (e.g. 2024-2025)',
    }),
  adminEmail: emailSchema,
})

const getWorkflowStatusSchema = Joi.object({
  workflowId: Joi.string().min(1).max(128).required(),
})

module.exports = {
  // Auth schemas
  emailValidationSchema,

  // Parent update schemas
  parentUpdateSchema,
  tokenValidationSchema,
  parentOptOutSchema,

  // Feedback schemas
  feedbackSchema,

  // Email schemas
  sendEmailsSchema,

  // Annual update schemas
  startAnnualUpdateSchema,
  getWorkflowStatusSchema,
}
