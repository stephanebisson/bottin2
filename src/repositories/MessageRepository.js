import { addDoc, arrayUnion, collection, deleteDoc, doc, limit as firestoreLimit, getDoc, getDocs, orderBy, query, updateDoc, where } from 'firebase/firestore'
import { MessageDTO } from '@/dto/MessageDTO.js'
import { db } from '@/firebase'

/**
 * Message Repository - Clean data access layer for message operations
 * Handles all Firestore interactions and returns MessageDTO objects
 */
export class MessageRepository {
  constructor () {
    this.collectionRef = collection(db, this.collectionName)
  }

  /**
   * Get single message by ID
   * @param {string} id - Message document ID
   */
  async getById (id) {
    try {
      console.log(`MessageRepository: Loading message ${id}...`)
      const docRef = doc(db, this.collectionName, id)
      const docSnap = await getDoc(docRef)

      if (!docSnap.exists()) {
        console.log(`MessageRepository: Message ${id} not found`)
        return null
      }

      const message = MessageDTO.fromFirestore(docSnap)
      console.log(`MessageRepository: Loaded message ${id}`)

      return message
    } catch (error) {
      console.error(`MessageRepository: Error loading message ${id}:`, error)
      throw new Error(`Failed to load message ${id}: ${error.message}`)
    }
  }

  /**
   * Get messages for a conversation
   * @param {string} conversationId - Conversation ID
   * @param {number} limit - Maximum number of messages to load (default 50)
   */
  async getConversationMessages (conversationId, limit = 50) {
    try {
      console.log(`MessageRepository: Loading messages for conversation ${conversationId}...`)

      const q = query(
        this.collectionRef,
        where('conversationId', '==', conversationId),
        orderBy('createdAt', 'asc'),
        firestoreLimit(limit),
      )
      const snapshot = await getDocs(q)

      const messages = MessageDTO.fromFirestoreSnapshot(snapshot)
      console.log(`MessageRepository: Loaded ${messages.length} messages for conversation ${conversationId}`)

      return messages
    } catch (error) {
      console.error(`MessageRepository: Error loading messages for conversation ${conversationId}:`, error)
      throw new Error(`Failed to load messages for conversation ${conversationId}: ${error.message}`)
    }
  }

  /**
   * Get messages sent by a specific user
   * @param {string} senderId - Sender's parent ID
   * @param {number} limit - Maximum number of messages to load
   */
  async getBySenderId (senderId, limit = 50) {
    try {
      console.log(`MessageRepository: Loading messages from sender ${senderId}...`)

      const q = query(
        this.collectionRef,
        where('senderId', '==', senderId),
        orderBy('createdAt', 'desc'),
        firestoreLimit(limit),
      )
      const snapshot = await getDocs(q)

      const messages = MessageDTO.fromFirestoreSnapshot(snapshot)
      console.log(`MessageRepository: Loaded ${messages.length} messages from sender ${senderId}`)

      return messages
    } catch (error) {
      console.error(`MessageRepository: Error loading messages from sender ${senderId}:`, error)
      throw new Error(`Failed to load messages from sender ${senderId}: ${error.message}`)
    }
  }

  /**
   * Save message (create or update)
   */
  async save (messageDTO) {
    if (!(messageDTO instanceof MessageDTO)) {
      throw new TypeError('MessageRepository: Expected MessageDTO instance')
    }

    if (!messageDTO.isValid()) {
      const errors = messageDTO.getValidationErrors()
      throw new Error(`MessageRepository: Invalid message data: ${errors.join(', ')}`)
    }

    try {
      const firestoreData = messageDTO.toFirestore()

      if (messageDTO.id) {
        // Update existing message
        console.log(`MessageRepository: Updating message ${messageDTO.id}...`)
        const docRef = doc(db, this.collectionName, messageDTO.id)
        await updateDoc(docRef, firestoreData)
        console.log(`MessageRepository: Updated message ${messageDTO.id}`)
        return messageDTO.id
      } else {
        // Create new message
        console.log('MessageRepository: Creating new message...')
        const docRef = await addDoc(this.collectionRef, firestoreData)
        console.log(`MessageRepository: Created message with ID ${docRef.id}`)
        return docRef.id
      }
    } catch (error) {
      console.error('MessageRepository: Error saving message:', error)
      throw new Error(`Failed to save message: ${error.message}`)
    }
  }

  /**
   * Create new message
   * @param {Object} messageData - Message data object
   */
  async create (messageData) {
    const messageDTO = new MessageDTO(messageData)
    const id = await this.save(messageDTO)

    // Return the message with the generated ID
    return await this.getById(id)
  }

  /**
   * Update existing message
   * @param {string} id - Message ID
   * @param {Object} updates - Fields to update
   */
  async update (id, updates) {
    const existingMessage = await this.getById(id)
    if (!existingMessage) {
      throw new Error(`Message with ID ${id} not found`)
    }

    const updatedMessage = existingMessage.withUpdates(updates)
    await this.save(updatedMessage)

    return await this.getById(id)
  }

  /**
   * Edit message text
   * @param {string} id - Message ID
   * @param {string} newText - New message text
   */
  async editText (id, newText) {
    try {
      console.log(`MessageRepository: Editing message ${id}...`)
      const docRef = doc(db, this.collectionName, id)

      await updateDoc(docRef, {
        text: newText,
        edited: true,
        editedAt: new Date(),
      })

      console.log(`MessageRepository: Edited message ${id}`)
      return await this.getById(id)
    } catch (error) {
      console.error(`MessageRepository: Error editing message ${id}:`, error)
      throw new Error(`Failed to edit message ${id}: ${error.message}`)
    }
  }

  /**
   * Mark message as read by a user
   * @param {string} id - Message ID
   * @param {string} parentId - Parent's ID
   */
  async markAsRead (id, parentId) {
    try {
      console.log(`MessageRepository: Marking message ${id} as read by ${parentId}...`)
      const docRef = doc(db, this.collectionName, id)

      await updateDoc(docRef, {
        readBy: arrayUnion(parentId),
      })

      console.log(`MessageRepository: Marked message ${id} as read by ${parentId}`)
    } catch (error) {
      console.error(`MessageRepository: Error marking message ${id} as read:`, error)
      throw new Error(`Failed to mark message ${id} as read: ${error.message}`)
    }
  }

  /**
   * Mark all messages in a conversation as read by a user
   * @param {string} conversationId - Conversation ID
   * @param {string} parentId - Parent's ID
   */
  async markConversationAsRead (conversationId, parentId) {
    try {
      console.log(`MessageRepository: Marking all messages in conversation ${conversationId} as read by ${parentId}...`)

      const messages = await this.getConversationMessages(conversationId, 100)
      const unreadMessages = messages.filter(msg => !msg.isReadBy(parentId) && msg.senderId !== parentId)

      for (const message of unreadMessages) {
        await this.markAsRead(message.id, parentId)
      }

      console.log(`MessageRepository: Marked ${unreadMessages.length} messages as read in conversation ${conversationId}`)
    } catch (error) {
      console.error(`MessageRepository: Error marking conversation ${conversationId} as read:`, error)
      throw new Error(`Failed to mark conversation ${conversationId} as read: ${error.message}`)
    }
  }

  /**
   * Delete message - permanently remove from database
   * Use with caution!
   */
  async delete (id) {
    try {
      console.log(`MessageRepository: Deleting message ${id}...`)
      const docRef = doc(db, this.collectionName, id)
      await deleteDoc(docRef)
      console.log(`MessageRepository: Deleted message ${id}`)
    } catch (error) {
      console.error(`MessageRepository: Error deleting message ${id}:`, error)
      throw new Error(`Failed to delete message ${id}: ${error.message}`)
    }
  }

  /**
   * Delete all messages in a conversation
   * @param {string} conversationId - Conversation ID
   */
  async deleteConversationMessages (conversationId) {
    try {
      console.log(`MessageRepository: Deleting all messages in conversation ${conversationId}...`)

      const messages = await this.getConversationMessages(conversationId, 1000)

      for (const message of messages) {
        await this.delete(message.id)
      }

      console.log(`MessageRepository: Deleted ${messages.length} messages from conversation ${conversationId}`)
    } catch (error) {
      console.error(`MessageRepository: Error deleting messages from conversation ${conversationId}:`, error)
      throw new Error(`Failed to delete messages from conversation ${conversationId}: ${error.message}`)
    }
  }

  /**
   * Search messages in a conversation
   * @param {string} conversationId - Conversation ID
   * @param {string} searchText - Text to search for
   */
  async searchInConversation (conversationId, searchText) {
    if (!searchText || searchText.trim().length === 0) {
      return []
    }

    try {
      console.log(`MessageRepository: Searching messages in conversation ${conversationId} for "${searchText}"...`)

      const messages = await this.getConversationMessages(conversationId, 1000)

      const searchLower = searchText.toLowerCase().trim()
      const filtered = messages.filter(message =>
        message.getSearchableText().includes(searchLower),
      )

      console.log(`MessageRepository: Found ${filtered.length} messages matching "${searchText}" in conversation ${conversationId}`)
      return filtered
    } catch (error) {
      console.error(`MessageRepository: Error searching messages in conversation ${conversationId}:`, error)
      throw new Error(`Failed to search messages in conversation ${conversationId}: ${error.message}`)
    }
  }

  /**
   * Get conversation statistics
   * @param {string} conversationId - Conversation ID
   */
  async getConversationStats (conversationId) {
    try {
      const messages = await this.getConversationMessages(conversationId, 1000)

      const senderStats = {}
      for (const message of messages) {
        senderStats[message.senderId] = (senderStats[message.senderId] || 0) + 1
      }

      return {
        total: messages.length,
        bySender: senderStats,
        lastMessage: messages.length > 0 ? messages.at(-1) : null,
      }
    } catch (error) {
      console.error(`MessageRepository: Error getting stats for conversation ${conversationId}:`, error)
      throw new Error(`Failed to get stats for conversation ${conversationId}: ${error.message}`)
    }
  }

  collectionName = 'messages';
}
