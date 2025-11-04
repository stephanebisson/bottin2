<template>
  <v-btn
    :color="color"
    :prepend-icon="icon"
    :size="size"
    :variant="variant"
    @click="handleClick"
  >
    {{ label }}
    <v-badge
      v-if="participantCount && showParticipantCount"
      class="ml-1"
      color="secondary"
      :content="participantCount"
      inline
    />
  </v-btn>
</template>

<script setup>
  import { computed } from 'vue'
  import { useI18n } from '@/composables/useI18n'

  const props = defineProps({
    // Conversation type: 'direct', 'class', or 'committee'
    type: {
      type: String,
      required: true,
      validator: (value) => ['direct', 'class', 'committee'].includes(value),
    },
    // Context ID for class/committee conversations (e.g., 'class-3a')
    contextId: {
      type: String,
      default: '',
    },
    // Context labels for class/committee (e.g., { en: 'Class 3A', fr: 'Classe 3A' })
    contextLabel: {
      type: Object,
      default: () => ({ en: '', fr: '' }),
    },
    // Array of participant parent IDs
    participants: {
      type: Array,
      required: true,
    },
    // Object mapping parent IDs to names { 'parentId123': 'Jane Doe' }
    participantNames: {
      type: Object,
      default: () => ({}),
    },
    // Button label (optional, will use default based on type if not provided)
    label: {
      type: String,
      default: '',
    },
    // Button icon
    icon: {
      type: String,
      default: 'mdi-message',
    },
    // Button variant
    variant: {
      type: String,
      default: 'outlined',
    },
    // Button color
    color: {
      type: String,
      default: 'primary',
    },
    // Button size
    size: {
      type: String,
      default: 'default',
    },
    // Show participant count badge
    showParticipantCount: {
      type: Boolean,
      default: true,
    },
  })

  const emit = defineEmits(['click', 'start-conversation'])

  const { t, locale } = useI18n()

  const participantCount = computed(() => {
    return props.participants.length
  })

  const buttonLabel = computed(() => {
    if (props.label) {
      return props.label
    }

    // Default labels based on type
    switch (props.type) {
      case 'direct': {
        return t('messages.messageParent')
      }
      case 'class': {
        return t('messages.messageAllClassParents')
      }
      case 'committee': {
        return t('messages.messageCommitteeMembers')
      }
      default: {
        return t('messages.startConversation')
      }
    }
  })

  function handleClick () {
    const conversationData = {
      type: props.type,
      contextId: props.contextId,
      contextLabel: props.contextLabel,
      participants: props.participants,
      participantNames: props.participantNames,
    }

    emit('click', conversationData)
    emit('start-conversation', conversationData)
  }
</script>
