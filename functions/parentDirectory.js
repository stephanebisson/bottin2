const { getFirestore } = require('firebase-admin/firestore')
const { onDocumentWritten } = require('firebase-functions/v2/firestore')
const { FUNCTIONS_REGION } = require('./config')

// Fields every signed-in user can see
const PUBLIC_FIELDS = ['first_name', 'last_name', 'interests', 'optedOut', 'lastUpdated', 'createdAt', 'updatedAt']

// Fields shown only once the parent has confirmed them with the update form
const CONTACT_FIELDS = ['phone', 'email', 'address', 'city', 'postal_code']

/**
 * The directory copy of a parent: what parents and staff can read. Contact
 * information is left out until the parent has submitted the update form
 * (lastUpdated is set). Fields not listed above are never copied.
 *
 * @param {object} data - the /parents document data
 * @returns {object} the /parentDirectory document data
 */
function toDirectoryEntry (data) {
  const fields = data.lastUpdated ? [...PUBLIC_FIELDS, ...CONTACT_FIELDS] : PUBLIC_FIELDS
  const entry = {}
  for (const field of fields) {
    if (data[field] !== undefined) {
      entry[field] = data[field]
    }
  }
  return entry
}

/**
 * Keep /parentDirectory in sync with /parents. Only admins can read /parents;
 * everyone else reads the directory, so unconfirmed contact information never
 * reaches their browser.
 */
exports.syncParentDirectory = onDocumentWritten({
  region: FUNCTIONS_REGION,
  document: 'parents/{parentId}',
}, async event => {
  const directoryRef = getFirestore().collection('parentDirectory').doc(event.params.parentId)
  const data = event.data.after.data()
  await (data ? directoryRef.set(toDirectoryEntry(data)) : directoryRef.delete())
})

exports.toDirectoryEntry = toDirectoryEntry
