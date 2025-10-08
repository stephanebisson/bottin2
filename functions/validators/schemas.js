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
  .pattern(/^[a-zA-Z\u00C0-\u017F\s\-']+$/) // Letters, accents, spaces, hyphens, apostrophes
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

// Committee ID validation (supports French committee names with accents, apostrophes, and spaces)
const committeeIdSchema = Joi.string()
  .min(1)
  .max(100)
  .pattern(/^[a-zA-Z0-9\u00C0-\u017F\s\-'_]+$/)

// Auth validation schemas
const emailValidationSchema = Joi.object({
  email: emailSchema,
})

// Parent update validation schemas
const parentUpdateSchema = Joi.object({
  token: tokenSchema,
  parentData: Joi.object({
    first_name: nameSchema,
    last_name: nameSchema,
    phone: phoneSchema,
    address: Joi.string().max(200).allow(''),
    city: Joi.string().max(100).allow(''),
    postal_code: postalCodeSchema,
    committees: Joi.array()
      .items(committeeIdSchema)
      .max(20)
      .unique()
      .default([]),
    committeeRoles: Joi.object()
      .pattern(committeeIdSchema, Joi.string().max(50))
      .default({}),
    interests: Joi.alternatives().try(
      Joi.array().items(Joi.string().max(100)).max(28).default([]), // Max 28 based on available interests
      Joi.string().max(500).allow(''),
    ).default([]),
    sameAddressAsOther: Joi.boolean().default(false),
  }).required(),
})

const tokenValidationSchema = Joi.object({
  token: tokenSchema,
})

const parentOptOutSchema = Joi.object({
  token: tokenSchema,
})

// Admin management schemas
const setAdminClaimSchema = Joi.object({
  uid: Joi.string().min(1).max(128).required(),
  isAdmin: Joi.boolean().default(true),
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

// School progression schemas
const startProgressionSchema = Joi.object({
  schoolYear: Joi.string()
    .pattern(/^\d{4}-\d{4}$/)
    .required()
    .messages({
      'string.pattern.base': 'School year must be in format YYYY-YYYY (e.g. 2024-2025)',
    }),
  adminEmail: emailSchema,
})

const assignTransitionClassSchema = Joi.object({
  workflowId: Joi.string().min(1).max(128).required(),
  studentId: Joi.string().min(1).max(128).required(),
  assignedClass: Joi.string().min(1).max(100).required(),
})

const addStudentSchema = Joi.object({
  workflowId: Joi.string().min(1).max(128).required(),
  student: Joi.object({
    first_name: nameSchema,
    last_name: nameSchema,
    grade: Joi.string().valid(
      'Maternelle', 'Jardin', '1', '2', '3', '4', '5', '6', '7', '8',
    ).required(),
    class: Joi.string().max(100).allow(''),
  }).required(),
  parent1: Joi.object({
    first_name: nameSchema,
    last_name: nameSchema,
    email: emailSchema,
    phone: phoneSchema,
    address: Joi.string().max(200).allow(''),
    city: Joi.string().max(100).allow(''),
    postal_code: postalCodeSchema,
  }).required(),
  parent2: Joi.object({
    first_name: nameSchema.allow(''),
    last_name: nameSchema.allow(''),
    email: emailSchema.allow(''),
    phone: phoneSchema,
    address: Joi.string().max(200).allow(''),
    city: Joi.string().max(100).allow(''),
    postal_code: postalCodeSchema,
  }).allow(null),
  useExistingParent1: Joi.boolean().default(false),
  useExistingParent2: Joi.boolean().default(false),
})

const markStudentsDepartingSchema = Joi.object({
  workflowId: Joi.string().min(1).max(128).required(),
  departingStudents: Joi.array()
    .items(Joi.string().min(1).max(128))
    .min(1)
    .unique()
    .required(),
})

const removeStudentSchema = Joi.object({
  workflowId: Joi.string().min(1).max(128).required(),
  studentId: Joi.string().min(1).max(128).required(),
})

const applyProgressionChangesSchema = Joi.object({
  workflowId: Joi.string().min(1).max(128).required(),
})

// Committee update schemas
const updateCommitteeMembersSchema = Joi.object({
  committeeId: Joi.string().min(1).max(128).required(),
  members: Joi.array()
    .items(Joi.object({
      email: emailSchema,
      role: Joi.string().max(50).default('Member'),
      member_type: Joi.string().valid('parent', 'staff').required(),
    }))
    .max(100)
    .default([]),
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

  // Admin schemas
  setAdminClaimSchema,

  // Email schemas
  sendEmailsSchema,

  // School progression schemas
  startProgressionSchema,
  assignTransitionClassSchema,
  addStudentSchema,
  markStudentsDepartingSchema,
  removeStudentSchema,
  applyProgressionChangesSchema,

  // Committee schemas
  updateCommitteeMembersSchema,

  // Annual update schemas
  startAnnualUpdateSchema,
  getWorkflowStatusSchema,
}
