const admin = require('firebase-admin')

// Initialize Firebase Admin
admin.initializeApp()

const { setAdminClaim, getAdminStatus, listAdmins } = require('./adminManagement')
const { startAnnualUpdate, getWorkflowStatus, startAnnualUpdateV2, getWorkflowStatusV2 } = require('./annualUpdateWorkflow')
// Import all functions from separate modules
const { validateEmail, validateEmailV2 } = require('./auth')
const { sendUpdateEmailsToSelected } = require('./email')
const { validateUpdateToken, processParentUpdate, processParentOptOut } = require('./parentUpdate')
const { healthCheck } = require('./utils')

// Export all functions
exports.validateEmail = validateEmail
exports.validateEmailV2 = validateEmailV2
exports.startAnnualUpdate = startAnnualUpdate
exports.getWorkflowStatus = getWorkflowStatus
exports.startAnnualUpdateV2 = startAnnualUpdateV2
exports.getWorkflowStatusV2 = getWorkflowStatusV2
exports.sendUpdateEmailsToSelected = sendUpdateEmailsToSelected
exports.validateUpdateToken = validateUpdateToken
exports.processParentUpdate = processParentUpdate
exports.processParentOptOut = processParentOptOut
exports.setAdminClaim = setAdminClaim
exports.getAdminStatus = getAdminStatus
exports.listAdmins = listAdmins
exports.healthCheck = healthCheck
