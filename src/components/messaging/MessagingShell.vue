<template>
  <v-navigation-drawer
    v-if="isOpen"
    v-model="isOpen"
    class="messaging-drawer-fixed"
    location="right"
    temporary
    :width="isMobile ? '90%' : panelWidth"
  >
    <!-- Resize Handle (desktop only) -->
    <div
      v-if="!isMobile"
      class="resize-handle"
      @mousedown="startResize"
    />

    <ConversationList
      v-if="!activeConversation"
      :chat-enabled="chatEnabled"
      :current-user-email="currentUserEmail"
      @select-conversation="openConversation"
    />
    <ConversationView
      v-else
      :conversation="activeConversation"
      :current-user-email="currentUserEmail"
      :current-user-name="currentUserName"
      @close="closeConversation"
    />
  </v-navigation-drawer>
</template>

<script setup>
  import { computed, onMounted, onUnmounted, ref } from 'vue'
  import { useDisplay } from 'vuetify'
  import { ConversationRepository } from '@/repositories/ConversationRepository'
  import ConversationList from './ConversationList.vue'
  import ConversationView from './ConversationView.vue'

  const props = defineProps({
    currentUserEmail: {
      type: String,
      required: true,
    },
    currentUserName: {
      type: String,
      required: true,
    },
    chatEnabled: {
      type: Boolean,
      default: false,
    },
  })

  const { mdAndUp } = useDisplay()

  const conversationRepo = new ConversationRepository()

  const isOpen = ref(false)
  const activeConversation = ref(null)
  const totalUnreadCount = ref(0)
  const panelWidth = ref(400)
  const isResizing = ref(false)

  const isMobile = computed(() => !mdAndUp.value)

  function toggleMessaging () {
    isOpen.value = !isOpen.value
  }

  function openConversation (conversation) {
    activeConversation.value = conversation
  }

  function closeConversation () {
    activeConversation.value = null
  }

  /**
   * Create or open a conversation
   * Called from MessageButton components
   */
  async function createConversation (conversationData) {
    try {
      let conversation

      if (conversationData.type === 'direct') {
        // Find or create direct conversation
        const otherParticipantEmail = conversationData.participants.find(
          email => email !== props.currentUserEmail,
        )
        const otherParticipantName = conversationData.participantNames[otherParticipantEmail]

        conversation = await conversationRepo.findOrCreateDirectConversation(
          props.currentUserEmail,
          otherParticipantEmail,
          { name: props.currentUserName },
          { name: otherParticipantName },
        )
      } else {
        // Find or create context conversation (class/committee)
        conversation = await conversationRepo.findOrCreateContextConversation(
          conversationData.type,
          conversationData.contextId,
          conversationData.contextLabel,
          conversationData.participants,
          conversationData.participantNames,
          props.currentUserEmail,
        )
      }

      // Open the conversation
      openConversation(conversation)

      // Open the messaging panel/drawer
      isOpen.value = true
    } catch (error) {
      console.error('Error creating conversation:', error)
    }
  }

  async function loadUnreadCount () {
    try {
      if (!props.currentUserEmail) {
        totalUnreadCount.value = 0
        return
      }
      const count = await conversationRepo.getTotalUnreadCount(props.currentUserEmail)
      totalUnreadCount.value = count
    } catch (error) {
      console.error('Error loading unread count:', error)
      totalUnreadCount.value = 0
    }
  }

  // Panel resizing (desktop only)
  function startResize (event) {
    isResizing.value = true
    document.addEventListener('mousemove', handleResize)
    document.addEventListener('mouseup', stopResize)
  }

  function handleResize (event) {
    if (!isResizing.value) return

    const windowWidth = window.innerWidth
    const newWidth = windowWidth - event.clientX

    // Constrain width between 300px and 800px
    panelWidth.value = Math.max(300, Math.min(800, newWidth))
  }

  function stopResize () {
    isResizing.value = false
    document.removeEventListener('mousemove', handleResize)
    document.removeEventListener('mouseup', stopResize)
  }

  let intervalId = null

  onMounted(() => {
    try {
      // Only load unread count if chat is enabled
      if (!props.chatEnabled) return

      loadUnreadCount()

      // Reload unread count every 30 seconds
      intervalId = setInterval(loadUnreadCount, 30_000)
    } catch (error) {
      console.error('Error in MessagingShell onMounted:', error)
    }
  })

  onUnmounted(() => {
    if (intervalId) {
      clearInterval(intervalId)
    }
  })

  // Expose methods and data to parent component
  defineExpose({
    openConversation,
    createConversation,
    toggleMessaging,
    totalUnreadCount,
  })
</script>

<style scoped>
/* Fixed messaging drawer - ensures it stays viewport-height and fixed position */
.messaging-drawer-fixed {
  position: fixed !important;
  top: 0;
  bottom: 0;
  right: 0;
  height: auto !important;
  max-height: none !important;
  z-index: 1001;
}

.resize-handle {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  cursor: ew-resize;
  background-color: transparent;
  transition: background-color 0.2s;
  z-index: 1000;
}

.resize-handle:hover {
  background-color: rgb(var(--v-theme-primary));
}
</style>
