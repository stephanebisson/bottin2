import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore'
import { CommitteeDTO } from '@/dto/CommitteeDTO.js'
import { db } from '@/firebase'

/**
 * Committee Repository - Clean data access layer for committee operations
 * Handles all Firestore interactions including subcollection members
 * Structure: committees/{committeeId}/members/{memberId}
 */
export class CommitteeRepository {
  constructor () {
    this.collectionRef = collection(db, this.collectionName)
  }

  /**
   * Get all committees with their members from subcollections
   */
  async getAll () {
    try {
      const snapshot = await getDocs(this.collectionRef)

      // Load all committees with their members in parallel
      const committeePromises = snapshot.docs.map(async committeeDoc => {
        const membersSnapshot = await getDocs(collection(committeeDoc.ref, 'members'))
        return CommitteeDTO.fromFirestoreWithMembers(committeeDoc, membersSnapshot)
      })

      const committees = await Promise.all(committeePromises)
      const validCommittees = committees.filter(c => c.isValid())

      return validCommittees
    } catch (error) {
      console.error('CommitteeRepository: Error loading all committees:', error)
      throw new Error(`Failed to load committees: ${error.message}`, { cause: error })
    }
  }

  /**
   * Get single committee by ID with its members
   * @param {string} id - Committee document ID
   */
  async getById (id) {
    try {
      const docRef = doc(db, this.collectionName, id)
      const docSnap = await getDoc(docRef)

      if (!docSnap.exists()) {
        return null
      }

      // Load members from subcollection
      const membersSnapshot = await getDocs(collection(docRef, 'members'))
      const committee = CommitteeDTO.fromFirestoreWithMembers(docSnap, membersSnapshot)

      return committee
    } catch (error) {
      console.error(`CommitteeRepository: Error loading committee ${id}:`, error)
      throw new Error(`Failed to load committee ${id}: ${error.message}`, { cause: error })
    }
  }

  /**
   * Get members of a committee
   * @param {string} committeeId - Committee document ID
   * Returns array of: { memberId, role, member_type }
   * Note: memberId is the parent or staff document ID
   */
  async getMembers (committeeId) {
    try {
      const committeeRef = doc(db, this.collectionName, committeeId)
      const membersSnapshot = await getDocs(collection(committeeRef, 'members'))

      const members = membersSnapshot.docs.map(memberDoc => ({
        memberId: memberDoc.id, // This is the parent/staff ID
        ...memberDoc.data(), // { role, member_type }
      }))

      return members
    } catch (error) {
      console.error(`CommitteeRepository: Error loading members for committee ${committeeId}:`, error)
      throw new Error(`Failed to load members for committee ${committeeId}: ${error.message}`, { cause: error })
    }
  }

  /**
   * Add a member to a committee
   * @param {string} committeeId - Committee document ID
   * @param {string} memberId - Member document ID (parent or staff ID)
   * @param {Object} memberData - Member data { email, role, member_type }
   */
  async addMember (committeeId, memberId, memberData) {
    try {
      const committeeRef = doc(db, this.collectionName, committeeId)
      const memberRef = doc(committeeRef, 'members', memberId)

      const memberToSave = CommitteeDTO.memberToFirestore(memberData)

      await setDoc(memberRef, memberToSave)
    } catch (error) {
      console.error(`CommitteeRepository: Error adding member ${memberId} to committee ${committeeId}:`, error)
      throw new Error(`Failed to add member to committee: ${error.message}`, { cause: error })
    }
  }

  /**
   * Remove a member from a committee
   * @param {string} committeeId - Committee document ID
   * @param {string} memberId - Member document ID (parent or staff ID)
   */
  async removeMember (committeeId, memberId) {
    try {
      const committeeRef = doc(db, this.collectionName, committeeId)
      const memberRef = doc(committeeRef, 'members', memberId)

      await deleteDoc(memberRef)
    } catch (error) {
      console.error(`CommitteeRepository: Error removing member ${memberId} from committee ${committeeId}:`, error)
      throw new Error(`Failed to remove member from committee: ${error.message}`, { cause: error })
    }
  }

  /**
   * Update a member's data in a committee
   * @param {string} committeeId - Committee document ID
   * @param {string} memberId - Member document ID (parent or staff ID)
   * @param {Object} memberData - Updated member data { email, role, member_type }
   */
  async updateMember (committeeId, memberId, memberData) {
    try {
      const committeeRef = doc(db, this.collectionName, committeeId)
      const memberRef = doc(committeeRef, 'members', memberId)

      const memberToSave = CommitteeDTO.memberToFirestore(memberData)

      await updateDoc(memberRef, memberToSave)
    } catch (error) {
      console.error(`CommitteeRepository: Error updating member ${memberId} in committee ${committeeId}:`, error)
      throw new Error(`Failed to update member in committee: ${error.message}`, { cause: error })
    }
  }

  /**
   * Replace all members in a committee (bulk update)
   * @param {string} committeeId - Committee document ID
   * @param {Array} members - Array of member objects { memberId, role, member_type }
   * Note: memberId must be the parent or staff document ID
   */
  async replaceMembers (committeeId, members) {
    try {
      const committeeRef = doc(db, this.collectionName, committeeId)

      // Get existing members
      const existingMembersSnapshot = await getDocs(collection(committeeRef, 'members'))

      // Delete all existing members
      const deletePromises = existingMembersSnapshot.docs.map(memberDoc =>
        deleteDoc(memberDoc.ref),
      )
      await Promise.all(deletePromises)

      // Add new members
      const addPromises = members.map(member => {
        if (!member.memberId) {
          throw new Error('memberId is required for each member')
        }
        const memberRef = doc(committeeRef, 'members', member.memberId)
        const memberToSave = CommitteeDTO.memberToFirestore(member)
        return setDoc(memberRef, memberToSave)
      })
      await Promise.all(addPromises)
    } catch (error) {
      console.error(`CommitteeRepository: Error replacing members in committee ${committeeId}:`, error)
      throw new Error(`Failed to replace members in committee: ${error.message}`, { cause: error })
    }
  }

  /**
   * Save committee (create or update)
   * Note: This only saves the committee document, not the members
   * Use addMember/removeMember/replaceMembers for member management
   */
  async save (committeeDTO) {
    if (!(committeeDTO instanceof CommitteeDTO)) {
      throw new TypeError('CommitteeRepository: Expected CommitteeDTO instance')
    }

    if (!committeeDTO.isValid()) {
      const errors = committeeDTO.getValidationErrors()
      throw new Error(`CommitteeRepository: Invalid committee data: ${errors.join(', ')}`)
    }

    try {
      const firestoreData = committeeDTO.toFirestore()

      if (committeeDTO.id) {
        // Update existing committee
        const docRef = doc(db, this.collectionName, committeeDTO.id)
        await updateDoc(docRef, firestoreData)
        return committeeDTO.id
      } else {
        // Create new committee
        const docRef = await addDoc(this.collectionRef, firestoreData)
        return docRef.id
      }
    } catch (error) {
      console.error('CommitteeRepository: Error saving committee:', error)
      throw new Error(`Failed to save committee ${committeeDTO.name}: ${error.message}`, { cause: error })
    }
  }

  /**
   * Create new committee
   */
  async create (committeeData) {
    const committeeDTO = new CommitteeDTO(committeeData)
    const id = await this.save(committeeDTO)

    // Return the committee DTO with the generated ID (no need to re-fetch)
    return new CommitteeDTO({
      ...committeeData,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  /**
   * Update existing committee
   */
  async update (id, updates) {
    const existingCommittee = await this.getById(id)
    if (!existingCommittee) {
      throw new Error(`Committee with ID ${id} not found`)
    }

    const updatedCommittee = existingCommittee.withUpdates(updates)
    await this.save(updatedCommittee)

    return await this.getById(id)
  }

  /**
   * Delete committee - permanently remove from database including all members
   * Use with caution!
   */
  async delete (id) {
    try {
      const committeeRef = doc(db, this.collectionName, id)

      // Delete all members first
      const membersSnapshot = await getDocs(collection(committeeRef, 'members'))
      const deletePromises = membersSnapshot.docs.map(memberDoc => deleteDoc(memberDoc.ref))
      await Promise.all(deletePromises)

      // Delete the committee document
      await deleteDoc(committeeRef)
    } catch (error) {
      console.error(`CommitteeRepository: Error deleting committee ${id}:`, error)
      throw new Error(`Failed to delete committee ${id}: ${error.message}`, { cause: error })
    }
  }

  /**
   * Search committees by text (searches name)
   */
  async search (searchText) {
    if (!searchText || searchText.trim().length === 0) {
      return []
    }

    try {
      // Load all committees and filter client-side
      const committees = await this.getAll()

      const searchLower = searchText.toLowerCase().trim()
      const filtered = committees.filter(committee =>
        committee.getSearchableText().includes(searchLower),
      )

      return filtered
    } catch (error) {
      console.error('CommitteeRepository: Error searching committees:', error)
      throw new Error(`Failed to search committees: ${error.message}`, { cause: error })
    }
  }

  /**
   * Get repository statistics
   */
  async getStats () {
    try {
      const allCommittees = await this.getAll()

      const memberTypeStats = {
        parents: 0,
        staff: 0,
      }

      for (const committee of allCommittees) {
        memberTypeStats.parents += committee.parentMembers.length
        memberTypeStats.staff += committee.staffMembers.length
      }

      return {
        total: allCommittees.length,
        totalMembers: allCommittees.reduce((sum, c) => sum + c.memberCount, 0),
        averageMembersPerCommittee: allCommittees.length > 0
          ? (allCommittees.reduce((sum, c) => sum + c.memberCount, 0) / allCommittees.length).toFixed(1)
          : 0,
        membersByType: memberTypeStats,
        lastUpdated: new Date(),
      }
    } catch (error) {
      console.error('CommitteeRepository: Error getting stats:', error)
      throw new Error(`Failed to get committee statistics: ${error.message}`, { cause: error })
    }
  }

  collectionName = 'committees'
}
