<template>
  <v-card v-if="conversation" class="conversation-view d-flex flex-column" flat height="100%">
    <!-- Header -->
    <v-toolbar color="primary" density="compact">
      <v-btn icon="mdi-arrow-left" @click="$emit('close')" />

      <v-toolbar-title>
        <div>{{ conversationTitle }}</div>
        <div class="text-caption">
          {{ conversation.participantCount }} {{ $t('messages.participants') }}
        </div>
      </v-toolbar-title>

      <v-menu>
        <template #activator="{ props: menuProps }">
          <v-btn icon="mdi-dots-vertical" v-bind="menuProps" />
        </template>
        <v-list>
          <v-list-item @click="archiveConversation">
            <v-list-item-title>{{ $t('messages.archive') }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-toolbar>

    <!-- Messages Area -->
    <div
      ref="messagesContainer"
      class="messages-container flex-grow-1 overflow-y-auto pa-4"
      @scroll="handleScroll"
    >
      <!-- Loading Messages -->
      <div v-if="loadingMessages" class="text-center pa-4">
        <v-progress-circular color="primary" indeterminate size="32" />
      </div>

      <!-- Messages by Date -->
      <template v-else-if="messages.length > 0">
        <div v-for="(group, date) in messagesByDate" :key="date">
          <!-- Date Divider -->
          <div class="text-center my-4">
            <v-chip size="small" variant="tonal">{{ formatDate(date) }}</v-chip>
          </div>

          <!-- Messages -->
          <div
            v-for="message in group"
            :key="message.id"
            class="message-wrapper mb-3"
            :class="{ 'message-own': isOwnMessage(message) }"
          >
            <!-- Avatar for other users in group chats -->
            <v-avatar
              v-if="!isOwnMessage(message) && !conversation.isDirect"
              class="mr-2"
              :color="getAvatarColor(message.senderId)"
              size="32"
            >
              <span class="text-caption">{{ getInitials(message.senderName) }}</span>
            </v-avatar>

            <!-- Message Content -->
            <div class="message-content" :class="{ 'ml-auto': isOwnMessage(message) }">
              <!-- Sender Name (in group chats only) -->
              <div
                v-if="!isOwnMessage(message) && !conversation.isDirect"
                class="text-caption font-weight-bold mb-1"
              >
                {{ message.senderName }}
              </div>

              <!-- Message Bubble -->
              <v-card
                class="pa-3 message-bubble"
                :color="isOwnMessage(message) ? 'primary' : 'surface-variant'"
                elevation="1"
                rounded="lg"
              >
                <div class="text-body-2" :class="{ 'text-white': isOwnMessage(message) }">
                  {{ message.text }}
                </div>

                <!-- Timestamp & Status -->
                <div
                  class="d-flex align-center justify-end mt-1 text-caption"
                  :class="{ 'text-white': isOwnMessage(message), 'opacity-70': true }"
                >
                  <span>{{ formatTime(message.createdAt) }}</span>
                  <v-icon
                    v-if="isOwnMessage(message)"
                    class="ml-1"
                    :icon="message.readCount > 1 ? 'mdi-check-all' : 'mdi-check'"
                    size="16"
                  />
                  <span v-if="message.isEdited" class="ml-1">({{ $t('messages.edited') }})</span>
                </div>
              </v-card>
            </div>
          </div>
        </div>
      </template>

      <!-- No Messages -->
      <div v-else class="text-center pa-8">
        <v-icon color="grey-lighten-1" icon="mdi-message-outline" size="64" />
        <p class="text-body-1 text-medium-emphasis mt-4">{{ $t('messages.noMessages') }}</p>
        <p class="text-caption text-medium-emphasis">{{ $t('messages.startChatting') }}</p>
      </div>

      <!-- Scroll to Bottom Button -->
      <v-btn
        v-show="showScrollButton"
        class="scroll-to-bottom-btn"
        color="primary"
        icon="mdi-chevron-down"
        location="bottom right"
        position="fixed"
        size="small"
        @click="scrollToBottom"
      />
    </div>

    <!-- Message Input -->
    <v-divider />
    <div class="message-input pa-3">
      <v-textarea
        v-model="newMessageText"
        auto-grow
        density="comfortable"
        :disabled="sending"
        hide-details
        :max-rows="5"
        :placeholder="$t('messages.typeMessage')"
        rows="1"
        variant="outlined"
        @keydown.enter.exact.prevent="sendMessage"
        @keydown.enter.shift.exact="newMessageText += '\n'"
      >
        <template #append-inner>
          <v-btn
            color="primary"
            :disabled="!canSend"
            icon="mdi-send"
            :loading="sending"
            variant="text"
            @click="sendMessage"
          />
        </template>
      </v-textarea>

      <div class="d-flex justify-space-between mt-1">
        <div class="text-caption text-medium-emphasis">
          {{ $t('messages.enterToSend') }}
        </div>
        <div
          class="text-caption"
          :class="characterCountColor"
        >
          {{ $t('messages.characterCount', { count: characterCount, max: 2000 }) }}
        </div>
      </div>
    </div>
  </v-card>
</template>

<script setup>
  import { collection, limit as firestoreLimit, onSnapshot, orderBy, query, where } from 'firebase/firestore'
  import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
  import { useI18n } from '@/composables/useI18n'
  import { MessageDTO } from '@/dto/MessageDTO'
  import { db } from '@/firebase'
  import { ConversationRepository } from '@/repositories/ConversationRepository'
  import { MessageRepository } from '@/repositories/MessageRepository'

  const props = defineProps({
    conversation: {
      type: Object,
      required: true,
    },
    currentUserEmail: {
      type: String,
      required: true,
    },
    currentUserName: {
      type: String,
      required: true,
    },
  })

  const emit = defineEmits(['close', 'archive'])

  const { t, locale } = useI18n()

  const messageRepo = new MessageRepository()
  const conversationRepo = new ConversationRepository()

  const messages = ref([])
  const loadingMessages = ref(true)
  const newMessageText = ref('')
  const sending = ref(false)
  const messagesContainer = ref(null)
  const showScrollButton = ref(false)
  let unsubscribe = null

  const conversationTitle = computed(() => {
    if (props.conversation.isDirect) {
      const otherParticipant = props.conversation.participants.find(
        parentId => parentId !== props.currentUserEmail,
      )
      return props.conversation.participantNames[otherParticipant] || otherParticipant
    }
    return props.conversation.getLabel(locale.value)
  })

  const messagesByDate = computed(() => {
    const grouped = {}
    for (const message of messages.value) {
      const date = message.createdAt.toDate ? message.createdAt.toDate() : new Date(message.createdAt)
      const dateKey = date.toDateString()
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(message)
    }
    return grouped
  })

  const characterCount = computed(() => {
    return newMessageText.value.length
  })

  const characterCountColor = computed(() => {
    if (characterCount.value > 2000) {
      return 'text-error'
    }
    if (characterCount.value > 1800) {
      return 'text-warning'
    }
    return 'text-medium-emphasis'
  })

  const canSend = computed(() => {
    return newMessageText.value.trim().length > 0 &&
      newMessageText.value.length <= 2000 &&
      !sending.value
  })

  function isOwnMessage (message) {
    return message.senderId === props.currentUserEmail
  }

  function getInitials (name) {
    if (!name) return '?'
    const parts = name.split(' ')
    if (parts.length === 1) return name.slice(0, 2).toUpperCase()
    return (parts[0][0] + parts.at(-1)[0]).toUpperCase()
  }

  function getAvatarColor (senderId) {
    // Simple hash to get consistent color for each sender
    let hash = 0
    for (let i = 0; i < senderId.length; i++) {
      hash = senderId.codePointAt(i) + ((hash << 5) - hash)
    }
    const colors = ['primary', 'secondary', 'accent', 'info', 'success']
    return colors[Math.abs(hash) % colors.length]
  }

  function formatDate (dateString) {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return t('messages.today')
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return t('messages.yesterday')
    }
    return date.toLocaleDateString(locale.value, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
  }

  function formatTime (timestamp) {
    if (!timestamp) return ''
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleTimeString(locale.value, {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  async function sendMessage () {
    if (!canSend.value) return

    const messageText = newMessageText.value.trim()
    newMessageText.value = ''
    sending.value = true

    try {
      // Create message
      await messageRepo.create({
        conversationId: props.conversation.id,
        senderId: props.currentUserEmail,
        senderName: props.currentUserName,
        text: messageText,
        readBy: [props.currentUserEmail],
      })

      // Update conversation
      await conversationRepo.updateLastMessage(
        props.conversation.id,
        messageText.slice(0, 100),
        props.currentUserEmail,
      )

      // Increment unread count for other participants
      await conversationRepo.incrementUnreadCount(
        props.conversation.id,
        props.conversation.participants,
        props.currentUserEmail,
      )

      scrollToBottom()
    } catch (error) {
      console.error('Error sending message:', error)
      // Restore the message text so user can retry
      newMessageText.value = messageText
    } finally {
      sending.value = false
    }
  }

  function handleScroll () {
    if (!messagesContainer.value) return
    const { scrollTop, scrollHeight, clientHeight } = messagesContainer.value
    const scrolledFromBottom = scrollHeight - scrollTop - clientHeight
    showScrollButton.value = scrolledFromBottom > 200
  }

  function scrollToBottom () {
    nextTick(() => {
      if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
      }
    })
  }

  async function archiveConversation () {
    try {
      await conversationRepo.archive(props.conversation.id)
      emit('archive')
      emit('close')
    } catch (error) {
      console.error('Error archiving conversation:', error)
    }
  }

  async function loadMessages () {
    loadingMessages.value = true

    try {
      // Set up real-time listener
      const q = query(
        collection(db, 'messages'),
        where('conversationId', '==', props.conversation.id),
        orderBy('createdAt', 'asc'),
        firestoreLimit(100),
      )

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          messages.value = snapshot.docs
            .map(doc => {
              try {
                return MessageDTO.fromFirestore(doc)
              } catch (error) {
                console.warn('Failed to parse message:', error)
                return null
              }
            })
            .filter(msg => msg !== null)

          loadingMessages.value = false
          scrollToBottom()

          // Mark messages as read
          markMessagesAsRead()
        },
        (err) => {
          console.error('Error loading messages:', err)
          loadingMessages.value = false
        },
      )
    } catch (error) {
      console.error('Error setting up messages listener:', error)
      loadingMessages.value = false
    }
  }

  async function markMessagesAsRead () {
    try {
      const unreadMessages = messages.value.filter(
        msg => !msg.readBy.includes(props.currentUserEmail) && msg.senderId !== props.currentUserEmail,
      )

      for (const message of unreadMessages) {
        await messageRepo.markAsRead(message.id, props.currentUserEmail)
      }

      if (unreadMessages.length > 0) {
        await conversationRepo.markAsRead(props.conversation.id, props.currentUserEmail)
      }
    } catch (error) {
      console.error('Error marking messages as read:', error)
    }
  }

  watch(() => props.conversation?.id, (newId) => {
    if (newId) {
      // Clean up previous listener
      if (unsubscribe) {
        unsubscribe()
      }
      // Load messages for new conversation
      loadMessages()
    }
  }, { immediate: true })

  onUnmounted(() => {
    if (unsubscribe) {
      unsubscribe()
    }
  })
</script>

<style scoped>
.conversation-view {
  background-color: rgb(var(--v-theme-background));
}

.messages-container {
  background-color: rgb(var(--v-theme-surface));
}

.message-wrapper {
  display: flex;
  align-items: flex-start;
  max-width: 70%;
}

.message-wrapper.message-own {
  margin-left: auto;
  flex-direction: row-reverse;
}

.message-content {
  max-width: 100%;
}

.message-bubble {
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.scroll-to-bottom-btn {
  position: absolute;
  bottom: 120px;
  right: 24px;
}
</style>
