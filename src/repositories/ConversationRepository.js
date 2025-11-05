import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, increment, orderBy, query, updateDoc, where } from 'firebase/firestore'
import { ConversationDTO } from '@/dto/ConversationDTO.js'
import { db } from '@/firebase'

/**
 * Conversation Repository - Clean data access layer for conversation operations
 * Handles all Firestore interactions and returns ConversationDTO objects
 */
export class ConversationRepository {
  constructor () {
    this.collectionRef = collection(db, this.collectionName)
  }

  /**
   * Get all conversations (admin only, rarely used)
   */
  async getAll () {
    try {
      console.log('ConversationRepository: Loading all conversations...')
      const q = query(this.collectionRef, orderBy('lastMessageAt', 'desc'))
      const snapshot = await getDocs(q)

      const conversations = ConversationDTO.fromFirestoreSnapshot(snapshot)
      console.log(`ConversationRepository: Loaded ${conversations.length} valid conversations`)

      return conversations
    } catch (error) {
      console.error('ConversationRepository: Error loading all conversations:', error)
      throw new Error(`Failed to load conversations: ${error.message}`)
    }
  }

  /**
   * Get single conversation by ID
   * @param {string} id - Conversation document ID
   */
  async getById (id) {
    try {
      console.log(`ConversationRepository: Loading conversation ${id}...`)
      const docRef = doc(db, this.collectionName, id)
      const docSnap = await getDoc(docRef)

      if (!docSnap.exists()) {
        console.log(`ConversationRepository: Conversation ${id} not found`)
        return null
      }

      const conversation = ConversationDTO.fromFirestore(docSnap)
      console.log(`ConversationRepository: Loaded conversation ${id}`)

      return conversation
    } catch (error) {
      console.error(`ConversationRepository: Error loading conversation ${id}:`, error)
      throw new Error(`Failed to load conversation ${id}: ${error.message}`)
    }
  }

  /**
   * Get all conversations for a specific user (non-archived only)
   * @param {string} userEmail - User's email address
   */
  async getUserConversations (userEmail) {
    try {
      console.log(`ConversationRepository: Loading conversations for ${userEmail}...`)

      const q = query(
        this.collectionRef,
        where('participants', 'array-contains', userEmail),
        where('archived', '==', false),
        orderBy('lastMessageAt', 'desc'),
      )
      const snapshot = await getDocs(q)

      const conversations = ConversationDTO.fromFirestoreSnapshot(snapshot)
      console.log(`ConversationRepository: Loaded ${conversations.length} conversations for ${userEmail}`)

      return conversations
    } catch (error) {
      console.error(`ConversationRepository: Error loading conversations for ${userEmail}:`, error)
      throw new Error(`Failed to load conversations for ${userEmail}: ${error.message}`)
    }
  }

  /**
   * Get conversations by type
   * @param {string} type - 'direct', 'class', or 'committee'
   * @param {string} userEmail - Optional: filter by user participation
   */
  async getByType (type, userEmail = null) {
    try {
      console.log(`ConversationRepository: Loading ${type} conversations...`)

      const constraints = [
        where('type', '==', type),
        orderBy('lastMessageAt', 'desc'),
      ]

      if (userEmail) {
        constraints.push(where('participants', 'array-contains', userEmail))
      }

      const q = query(this.collectionRef, ...constraints)
      const snapshot = await getDocs(q)

      const conversations = ConversationDTO.fromFirestoreSnapshot(snapshot)
      console.log(`ConversationRepository: Loaded ${conversations.length} ${type} conversations`)

      return conversations
    } catch (error) {
      console.error(`ConversationRepository: Error loading ${type} conversations:`, error)
      throw new Error(`Failed to load ${type} conversations: ${error.message}`)
    }
  }

  /**
   * Find conversation by context (class or committee)
   * @param {string} contextId - Context identifier (e.g., 'class-3a')
   */
  async findByContextId (contextId) {
    try {
      console.log(`ConversationRepository: Finding conversation for context ${contextId}...`)

      const q = query(
        this.collectionRef,
        where('contextId', '==', contextId),
      )
      const snapshot = await getDocs(q)

      if (snapshot.empty) {
        console.log(`ConversationRepository: No conversation found for context ${contextId}`)
        return null
      }

      const conversation = ConversationDTO.fromFirestore(snapshot.docs[0])
      console.log(`ConversationRepository: Found conversation ${conversation.id} for context ${contextId}`)

      return conversation
    } catch (error) {
      console.error(`ConversationRepository: Error finding conversation for context ${contextId}:`, error)
      throw new Error(`Failed to find conversation for context ${contextId}: ${error.message}`)
    }
  }

  /**
   * Find or create a direct conversation between two users
   * @param {string} user1Email - First user's email
   * @param {string} user2Email - Second user's email
   * @param {Object} user1Data - { name: string } - First user's data
   * @param {Object} user2Data - { name: string } - Second user's data
   */
  async findOrCreateDirectConversation (user1Email, user2Email, user1Data, user2Data) {
    try {
      console.log(`ConversationRepository: Finding/creating direct conversation between ${user1Email} and ${user2Email}...`)

      // Try to find existing conversation
      const q = query(
        this.collectionRef,
        where('type', '==', 'direct'),
        where('participants', 'array-contains', user1Email),
      )
      const snapshot = await getDocs(q)

      // Check if any of the results include both users
      const existingConversation = snapshot.docs.find(doc => {
        const data = doc.data()
        return data.participants.includes(user2Email)
      })

      if (existingConversation) {
        const conversation = ConversationDTO.fromFirestore(existingConversation)
        console.log(`ConversationRepository: Found existing direct conversation ${conversation.id}`)
        return conversation
      }

      // Create new conversation
      const conversationData = {
        type: 'direct',
        contextId: '',
        contextLabel: { en: '', fr: '' },
        participants: [user1Email, user2Email],
        participantNames: {
          [user1Email]: user1Data.name,
          [user2Email]: user2Data.name,
        },
        unreadCount: {
          [user1Email]: 0,
          [user2Email]: 0,
        },
        lastMessageAt: new Date(),
        lastMessagePreview: '',
        lastMessageSenderId: '',
        archived: false,
        createdBy: user1Email,
      }

      const conversationDTO = new ConversationDTO(conversationData)
      const id = await this.save(conversationDTO)

      const newConversation = await this.getById(id)
      console.log(`ConversationRepository: Created new direct conversation ${id}`)

      return newConversation
    } catch (error) {
      console.error(`ConversationRepository: Error finding/creating direct conversation:`, error)
      throw new Error(`Failed to find/create direct conversation: ${error.message}`)
    }
  }

  /**
   * Find or create a context conversation (class or committee)
   * @param {string} type - 'class' or 'committee'
   * @param {string} contextId - Context identifier
   * @param {Object} contextLabel - { en: string, fr: string }
   * @param {string[]} participants - Array of participant emails
   * @param {Object} participantNames - Object mapping emails to names
   * @param {string} createdBy - Creator's email
   */
  async findOrCreateContextConversation (type, contextId, contextLabel, participants, participantNames, createdBy) {
    try {
      console.log(`ConversationRepository: Finding/creating ${type} conversation for ${contextId}...`)

      // Try to find existing conversation
      const existing = await this.findByContextId(contextId)

      if (existing) {
        console.log(`ConversationRepository: Found existing ${type} conversation ${existing.id}`)
        return existing
      }

      // Create new conversation
      const conversationData = {
        type,
        contextId,
        contextLabel,
        participants,
        participantNames,
        unreadCount: Object.fromEntries(participants.map(email => [email, 0])),
        lastMessageAt: new Date(),
        lastMessagePreview: '',
        lastMessageSenderId: '',
        archived: false,
        createdBy,
      }

      const conversationDTO = new ConversationDTO(conversationData)
      const id = await this.save(conversationDTO)

      const newConversation = await this.getById(id)
      console.log(`ConversationRepository: Created new ${type} conversation ${id}`)

      return newConversation
    } catch (error) {
      console.error(`ConversationRepository: Error finding/creating ${type} conversation:`, error)
      throw new Error(`Failed to find/create ${type} conversation: ${error.message}`)
    }
  }

  /**
   * Save conversation (create or update)
   */
  async save (conversationDTO) {
    if (!(conversationDTO instanceof ConversationDTO)) {
      throw new TypeError('ConversationRepository: Expected ConversationDTO instance')
    }

    if (!conversationDTO.isValid()) {
      const errors = conversationDTO.getValidationErrors()
      throw new Error(`ConversationRepository: Invalid conversation data: ${errors.join(', ')}`)
    }

    try {
      const firestoreData = conversationDTO.toFirestore()

      if (conversationDTO.id) {
        // Update existing conversation
        console.log(`ConversationRepository: Updating conversation ${conversationDTO.id}...`)
        const docRef = doc(db, this.collectionName, conversationDTO.id)
        await updateDoc(docRef, firestoreData)
        console.log(`ConversationRepository: Updated conversation ${conversationDTO.id}`)
        return conversationDTO.id
      } else {
        // Create new conversation
        console.log('ConversationRepository: Creating new conversation...')
        const docRef = await addDoc(this.collectionRef, firestoreData)
        console.log(`ConversationRepository: Created conversation with ID ${docRef.id}`)
        return docRef.id
      }
    } catch (error) {
      console.error('ConversationRepository: Error saving conversation:', error)
      throw new Error(`Failed to save conversation: ${error.message}`)
    }
  }

  /**
   * Update conversation
   */
  async update (id, updates) {
    const existingConversation = await this.getById(id)
    if (!existingConversation) {
      throw new Error(`Conversation with ID ${id} not found`)
    }

    const updatedConversation = existingConversation.withUpdates(updates)
    await this.save(updatedConversation)

    return await this.getById(id)
  }

  /**
   * Update last message info
   * @param {string} id - Conversation ID
   * @param {string} preview - Message preview text
   * @param {string} senderId - Sender's email
   */
  async updateLastMessage (id, preview, senderId) {
    try {
      console.log(`ConversationRepository: Updating last message for conversation ${id}...`)
      const docRef = doc(db, this.collectionName, id)

      await updateDoc(docRef, {
        lastMessagePreview: preview,
        lastMessageSenderId: senderId,
        lastMessageAt: new Date(),
      })

      console.log(`ConversationRepository: Updated last message for conversation ${id}`)
    } catch (error) {
      console.error(`ConversationRepository: Error updating last message for ${id}:`, error)
      throw new Error(`Failed to update last message for ${id}: ${error.message}`)
    }
  }

  /**
   * Increment unread count for users (except sender)
   * @param {string} id - Conversation ID
   * @param {string[]} userEmails - Array of user emails
   * @param {string} senderEmail - Sender's email (excluded from increment)
   */
  async incrementUnreadCount (id, userEmails, senderEmail) {
    try {
      console.log(`ConversationRepository: Incrementing unread count for conversation ${id}...`)
      const docRef = doc(db, this.collectionName, id)

      const updates = {}
      for (const email of userEmails) {
        if (email !== senderEmail) {
          updates[`unreadCount.${email}`] = increment(1)
        }
      }

      await updateDoc(docRef, updates)
      console.log(`ConversationRepository: Incremented unread count for conversation ${id}`)
    } catch (error) {
      console.error(`ConversationRepository: Error incrementing unread count for ${id}:`, error)
      throw new Error(`Failed to increment unread count for ${id}: ${error.message}`)
    }
  }

  /**
   * Mark conversation as read by user
   * @param {string} id - Conversation ID
   * @param {string} userEmail - User's email
   */
  async markAsRead (id, userEmail) {
    try {
      console.log(`ConversationRepository: Marking conversation ${id} as read by ${userEmail}...`)
      const docRef = doc(db, this.collectionName, id)

      await updateDoc(docRef, {
        [`unreadCount.${userEmail}`]: 0,
      })

      console.log(`ConversationRepository: Marked conversation ${id} as read by ${userEmail}`)
    } catch (error) {
      console.error(`ConversationRepository: Error marking conversation ${id} as read:`, error)
      throw new Error(`Failed to mark conversation ${id} as read: ${error.message}`)
    }
  }

  /**
   * Archive conversation
   * @param {string} id - Conversation ID
   */
  async archive (id) {
    return await this.update(id, { archived: true })
  }

  /**
   * Unarchive conversation
   * @param {string} id - Conversation ID
   */
  async unarchive (id) {
    return await this.update(id, { archived: false })
  }

  /**
   * Delete conversation - permanently remove from database
   * Use with caution!
   */
  async delete (id) {
    try {
      console.log(`ConversationRepository: Deleting conversation ${id}...`)
      const docRef = doc(db, this.collectionName, id)
      await deleteDoc(docRef)
      console.log(`ConversationRepository: Deleted conversation ${id}`)
    } catch (error) {
      console.error(`ConversationRepository: Error deleting conversation ${id}:`, error)
      throw new Error(`Failed to delete conversation ${id}: ${error.message}`)
    }
  }

  /**
   * Get total unread count for a user across all conversations
   * @param {string} userEmail - User's email
   */
  async getTotalUnreadCount (userEmail) {
    try {
      console.log(`ConversationRepository: Getting total unread count for ${userEmail}...`)
      const conversations = await this.getUserConversations(userEmail, false)

      const totalUnread = conversations.reduce((sum, conv) => {
        return sum + conv.getUnreadCountForUser(userEmail)
      }, 0)

      console.log(`ConversationRepository: Total unread count for ${userEmail}: ${totalUnread}`)
      return totalUnread
    } catch (error) {
      console.error(`ConversationRepository: Error getting total unread count for ${userEmail}:`, error)
      throw new Error(`Failed to get total unread count for ${userEmail}: ${error.message}`)
    }
  }

  /**
   * Search conversations by text
   */
  async search (searchText, userEmail) {
    if (!searchText || searchText.trim().length === 0) {
      return []
    }

    try {
      console.log(`ConversationRepository: Searching conversations for "${searchText}"...`)

      // Load user's conversations and filter client-side
      const userConversations = await this.getUserConversations(userEmail)

      const searchLower = searchText.toLowerCase().trim()
      const filtered = userConversations.filter(conversation =>
        conversation.getSearchableText().includes(searchLower),
      )

      console.log(`ConversationRepository: Found ${filtered.length} conversations matching "${searchText}"`)
      return filtered
    } catch (error) {
      console.error('ConversationRepository: Error searching conversations:', error)
      throw new Error(`Failed to search conversations: ${error.message}`)
    }
  }

  collectionName = 'conversations';
}
