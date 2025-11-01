<template>
  <div class="conversation-list d-flex flex-column" style="height: 100%;">
    <!-- Header -->
    <v-toolbar color="surface" density="compact">
      <v-toolbar-title>{{ $t('messages.title') }}</v-toolbar-title>
    </v-toolbar>

    <!-- Search -->
    <div class="pa-2">
      <v-text-field
        v-model="searchQuery"
        clearable
        density="compact"
        hide-details
        :placeholder="$t('messages.search')"
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
      />
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="pa-4 text-center">
      <v-progress-circular color="primary" indeterminate />
      <p class="text-caption mt-2">{{ $t('common.loading') }}</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="pa-4 text-center">
      <v-icon color="error" icon="mdi-alert-circle" size="48" />
      <p class="text-body-2 mt-2">{{ $t('messages.errorLoadingConversations') }}</p>
      <v-btn
        class="mt-2"
        color="primary"
        size="small"
        variant="outlined"
        @click="loadConversations"
      >
        {{ $t('messages.retryLoading') }}
      </v-btn>
    </div>

    <!-- Conversation List -->
    <v-list v-else-if="filteredConversations.length > 0" class="flex-grow-1 overflow-y-auto">
      <v-list-item
        v-for="conversation in filteredConversations"
        :key="conversation.id"
        :class="{ 'bg-blue-lighten-5': conversation.hasUnreadMessages(currentUserEmail) }"
        @click="selectConversation(conversation)"
      >
        <!-- Avatar/Icon -->
        <template #prepend>
          <v-avatar :color="getConversationColor(conversation.type)">
            <v-icon color="white" :icon="getConversationIcon(conversation.type)" />
          </v-avatar>
        </template>

        <!-- Title & Preview -->
        <v-list-item-title class="d-flex align-center">
          <span :class="{ 'font-weight-bold': conversation.hasUnreadMessages(currentUserEmail) }">
            {{ getConversationLabel(conversation) }}
          </span>
          <v-chip
            v-if="conversation.hasUnreadMessages(currentUserEmail)"
            class="ml-2"
            color="error"
            size="x-small"
          >
            {{ conversation.getUnreadCountForUser(currentUserEmail) }}
          </v-chip>
        </v-list-item-title>

        <v-list-item-subtitle class="text-truncate">
          {{ conversation.lastMessagePreview || $t('messages.noMessages') }}
        </v-list-item-subtitle>

        <!-- Timestamp -->
        <template #append>
          <div class="text-caption text-medium-emphasis">
            {{ formatTimestamp(conversation.lastMessageAt) }}
          </div>
        </template>
      </v-list-item>
    </v-list>

    <!-- Empty State -->
    <div v-else class="flex-grow-1 d-flex flex-column align-center justify-center pa-8">
      <v-icon color="grey-lighten-1" icon="mdi-message-outline" size="64" />
      <p class="text-h6 text-medium-emphasis mt-4">
        {{ searchQuery ? $t('common.noResultsFound') : $t('messages.noConversations') }}
      </p>
      <p v-if="!searchQuery" class="text-body-2 text-medium-emphasis mt-2">
        {{ $t('messages.startChatting') }}
      </p>
    </div>
  </div>
</template>

<script setup>
  import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore'
  import { computed, onMounted, onUnmounted, ref } from 'vue'
  import { useI18n } from '@/composables/useI18n'
  import { ConversationDTO } from '@/dto/ConversationDTO'
  import { db } from '@/firebase'
  import { ConversationRepository } from '@/repositories/ConversationRepository'

  const props = defineProps({
    currentUserEmail: {
      type: String,
      required: true,
    },
  })

  const emit = defineEmits(['select-conversation'])

  const { t, locale } = useI18n()

  const conversationRepo = new ConversationRepository()

  const conversations = ref([])
  const loading = ref(true)
  const error = ref(false)
  const searchQuery = ref('')
  let unsubscribe = null

  const filteredConversations = computed(() => {
    if (!searchQuery.value) {
      return conversations.value
    }

    const searchLower = searchQuery.value.toLowerCase().trim()
    return conversations.value.filter(conversation =>
      conversation.getSearchableText().includes(searchLower),
    )
  })

  function getConversationLabel (conversation) {
    if (conversation.isDirect) {
      // For direct messages, show the other participant's name
      const otherParticipant = conversation.participants.find(
        email => email !== props.currentUserEmail,
      )
      return conversation.participantNames[otherParticipant] || otherParticipant
    }

    // For class/committee, use the context label
    return conversation.getLabel(locale.value)
  }

  function getConversationIcon (type) {
    switch (type) {
      case 'direct': {
        return 'mdi-account'
      }
      case 'class': {
        return 'mdi-school'
      }
      case 'committee': {
        return 'mdi-account-group'
      }
      default: {
        return 'mdi-message'
      }
    }
  }

  function getConversationColor (type) {
    switch (type) {
      case 'direct': {
        return 'primary'
      }
      case 'class': {
        return 'secondary'
      }
      case 'committee': {
        return 'accent'
      }
      default: {
        return 'grey'
      }
    }
  }

  function formatTimestamp (timestamp) {
    if (!timestamp) return ''

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60_000)
    const diffHours = Math.floor(diffMs / 3_600_000)
    const diffDays = Math.floor(diffMs / 86_400_000)

    // Less than 1 hour: "5m ago"
    if (diffMins < 60) {
      return `${diffMins}m`
    }

    // Less than 24 hours: "3h ago"
    if (diffHours < 24) {
      return `${diffHours}h`
    }

    // Less than 7 days: show day name
    if (diffDays < 7) {
      if (diffDays === 0) return t('messages.today')
      if (diffDays === 1) return t('messages.yesterday')
      return date.toLocaleDateString(locale.value, { weekday: 'short' })
    }

    // Older: show date
    return date.toLocaleDateString(locale.value, { month: 'short', day: 'numeric' })
  }

  function selectConversation (conversation) {
    emit('select-conversation', conversation)
  }

  async function loadConversations () {
    loading.value = true
    error.value = false

    try {
      // Set up real-time listener
      const q = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', props.currentUserEmail),
        where('archived', '==', false),
        orderBy('lastMessageAt', 'desc'),
      )

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          conversations.value = snapshot.docs
            .map(doc => {
              try {
                return ConversationDTO.fromFirestore(doc)
              } catch (error_) {
                console.warn('Failed to parse conversation:', error_)
                return null
              }
            })
            .filter(conv => conv !== null)

          loading.value = false
        },
        (err) => {
          console.error('Error loading conversations:', err)
          error.value = true
          loading.value = false
        },
      )
    } catch (error_) {
      console.error('Error setting up conversations listener:', error_)
      error.value = true
      loading.value = false
    }
  }

  onMounted(() => {
    loadConversations()
  })

  onUnmounted(() => {
    if (unsubscribe) {
      unsubscribe()
    }
  })
</script>

<style scoped>
.conversation-list {
  background-color: rgb(var(--v-theme-surface));
}
</style>
