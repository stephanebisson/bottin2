const admin = require('firebase-admin')

// Initialize Firebase Admin
admin.initializeApp()

const { setAdminClaimV2, getAdminStatusV2, listAdminsV2 } = require('./adminManagement')
const { startAnnualUpdate, getWorkflowStatus, startAnnualUpdateV2, getWorkflowStatusV2, updateWorkflowProgressV2 } = require('./annualUpdateWorkflow')
// Import all functions from separate modules
const { validateEmail, validateEmailV2 } = require('./auth')
const { updateCommitteeMembersV2 } = require('./committees')
const { sendParentEmailV2 } = require('./email')
const { validateUpdateTokenV2, processParentUpdateV2, processParentOptOutV2 } = require('./parentUpdate')
const { healthCheckV2 } = require('./utils')

// Export all functions
exports.validateEmail = validateEmail
exports.validateEmailV2 = validateEmailV2
exports.startAnnualUpdate = startAnnualUpdate
exports.getWorkflowStatus = getWorkflowStatus
exports.startAnnualUpdateV2 = startAnnualUpdateV2
exports.getWorkflowStatusV2 = getWorkflowStatusV2
exports.updateWorkflowProgressV2 = updateWorkflowProgressV2
exports.sendParentEmailV2 = sendParentEmailV2
exports.validateUpdateTokenV2 = validateUpdateTokenV2
exports.processParentUpdateV2 = processParentUpdateV2
exports.processParentOptOutV2 = processParentOptOutV2
exports.setAdminClaimV2 = setAdminClaimV2
exports.getAdminStatusV2 = getAdminStatusV2
exports.listAdminsV2 = listAdminsV2
exports.healthCheckV2 = healthCheckV2
exports.updateCommitteeMembersV2 = updateCommitteeMembersV2
