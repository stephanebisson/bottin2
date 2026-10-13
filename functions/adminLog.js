const { FieldValue, getFirestore } = require('firebase-admin/firestore')
const { getCurrentSchoolYear } = require('./schoolYear')

const db = getFirestore()

/**
 * Write an audit log entry to /actionLogs.
 *
 * @param {object} params
 * @param {string} params.actionType   - e.g. 'progress_student', 'send_update_email'
 * @param {string} params.actor        - admin email
 * @param {'student'|'parent'} params.entityType
 * @param {string} params.entityId     - Firestore document ID of the affected record
 * @param {string} params.entityName   - human-readable name for display in the log
 * @param {string} [params.schoolYear] - defaults to current school year
 * @param {object} [params.details]    - action-specific payload (before/after values, etc.)
 */
async function logAction (params) {
  const {
    actionType,
    actor,
    entityType,
    entityId,
    entityName,
    schoolYear = getCurrentSchoolYear(),
    details = {},
  } = params

  await db.collection('actionLogs').add({
    actionType,
    actor,
    entityType,
    entityId,
    entityName,
    schoolYear,
    timestamp: FieldValue.serverTimestamp(),
    details,
  })
}

module.exports = { logAction, getCurrentSchoolYear }
