<template>
  <div class="parent-info" :class="variant">
    <!-- Header with name and chips (for compact variant) -->
    <div v-if="variant === 'compact'" class="d-flex justify-space-between align-start mb-2">
      <div class="d-flex align-center flex-wrap">
        <div class="text-body-2 font-weight-medium me-2">
          <HighlightedText
            :query="searchQuery"
            :text="parentName"
          />
        </div>
      </div>
      <v-chip
        v-if="showRole && role"
        :color="role === 'Chair' || role === 'Co-Chair' ? 'primary' : 'grey'"
        size="x-small"
        variant="outlined"
      >
        {{ role }}
      </v-chip>
      <v-chip
        v-else-if="showMemberType && memberType"
        :color="memberType === 'staff' ? 'blue' : 'grey'"
        size="x-small"
        variant="outlined"
      >
        {{ memberType === 'staff' ? $i18n('committees.staff') : $i18n('committees.parent') }}
      </v-chip>
    </div>

    <!-- Parent Name (for other variants) -->
    <div v-else class="text-subtitle-2 font-weight-bold mb-1">
      <HighlightedText
        :query="searchQuery"
        :text="parentName"
      />
    </div>

    <!-- Committees (if showCommittees) -->
    <div
      v-if="showCommittees && committees.length > 0"
      class="text-caption mb-1 text-primary font-italic"
    >
      {{ committees.join(', ') }}
    </div>

    <!-- Contact Info (if showContact) -->
    <div v-if="showContact" class="contact-info">
      <div v-if="parent.email" :class="variant === 'compact' ? 'text-caption d-flex align-center mb-1' : 'text-body-2 d-flex align-center mb-1'">
        <v-icon class="me-1" :size="variant === 'compact' ? 12 : 16">mdi-email</v-icon>
        <a class="text-decoration-none" :href="`mailto:${parent.email}`">{{ parent.email }}</a>
      </div>
      <div v-if="parent.phone" :class="variant === 'compact' ? 'text-caption d-flex align-center mb-1' : 'text-body-2 d-flex align-center mb-1'">
        <v-icon class="me-1" :size="variant === 'compact' ? 12 : 16">mdi-phone</v-icon>
        <a class="text-decoration-none" :href="`tel:${parent.phone}`">{{ formatPhone(parent.phone) }}</a>
      </div>
    </div>

    <!-- Address (if showAddress) -->
    <div v-if="showAddress && formattedAddress" class="text-body-2 d-flex align-center mb-1">
      <v-icon class="me-1" size="16">mdi-map-marker</v-icon>
      <span>{{ formattedAddress }}</span>
    </div>

    <!-- Interests (if showInterests) -->
    <div v-if="showInterests && parent.interests?.length" class="text-body-2 d-flex align-center mb-2">
      <v-icon class="me-1" size="16">mdi-heart</v-icon>
      <span>{{ displayedInterests }}</span>
    </div>

    <!-- Message Button (if showMessageButton and parent has email and chat enabled) -->
    <div v-if="showMessageButton && parent.email && parent.hasChatEnabled && currentUserEmail && parent.email !== currentUserEmail" class="mt-2">
      <MessageButton
        :participant-names="{
          [parent.email]: parentName,
          [currentUserEmail]: currentUserName
        }"
        :participants="[parent.email, currentUserEmail]"
        :show-participant-count="false"
        size="small"
        type="direct"
        :variant="variant === 'compact' ? 'text' : 'outlined'"
        @start-conversation="handleStartConversation"
      />
    </div>

  </div>
</template>

<script setup>
  import { computed, inject } from 'vue'
  import HighlightedText from '@/components/HighlightedText.vue'
  import MessageButton from '@/components/messaging/MessageButton.vue'
  import { getInterestNames } from '@/config/interests'

  // Get messaging shell reference
  const messagingShell = inject('messagingShell', null)

  const props = defineProps({
    parent: {
      type: Object,
      required: true,
    },
    searchQuery: {
      type: String,
      default: '',
    },
    variant: {
      type: String,
      default: 'detailed',
      validator: value => ['detailed', 'compact', 'minimal'].includes(value),
    },
    showCommittees: {
      type: Boolean,
      default: false,
    },
    showContact: {
      type: Boolean,
      default: true,
    },
    showAddress: {
      type: Boolean,
      default: false,
    },
    showInterests: {
      type: Boolean,
      default: false,
    },
    showMemberType: {
      type: Boolean,
      default: false,
    },
    showRole: {
      type: Boolean,
      default: false,
    },
    showMessageButton: {
      type: Boolean,
      default: false,
    },
    committees: {
      type: Array,
      default: () => [],
    },
    memberType: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      default: null,
    },
    currentUserEmail: {
      type: String,
      default: '',
    },
    currentUserName: {
      type: String,
      default: '',
    },
  })

  const parentName = computed(() => {
    if (props.parent.fullName) {
      return props.parent.fullName
    }
    if (props.parent.first_name && props.parent.last_name) {
      return `${props.parent.first_name} ${props.parent.last_name}`
    }
    return props.parent.email || 'Unknown'
  })

  const formattedAddress = computed(() => {
    if (!props.parent) return ''

    const addressParts = []
    if (props.parent.address) addressParts.push(props.parent.address)
    if (props.parent.city) addressParts.push(props.parent.city)
    if (props.parent.postal_code) addressParts.push(props.parent.postal_code)

    return addressParts.length > 0 ? addressParts.join(', ') : ''
  })

  function formatPhone (phone) {
    if (!phone) return ''

    const cleaned = phone.toString().replace(/\D/g, '')

    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }

    return phone
  }

  const displayedInterests = computed(() => {
    if (!props.parent.interests?.length) return ''
    return getInterestNames(props.parent.interests).join(', ')
  })

  // Handle starting a conversation
  function handleStartConversation (conversationData) {
    if (messagingShell?.value) {
      messagingShell.value.createConversation(conversationData)
    }
  }
</script>

<style scoped>
.parent-info.detailed {
  padding: 8px;
  background-color: rgba(0, 0, 0, 0.02);
  border-radius: 4px;
  height: 100%;
}

.parent-info.compact {
  padding: 12px;
  background-color: rgba(0, 0, 0, 0.02);
  border-radius: 4px;
  border-left: 3px solid;
  border: 1px solid rgba(0,0,0,0.12);
}

.parent-info.minimal {
  /* No special styling for minimal variant */
}

.contact-info a {
  color: inherit;
  text-decoration: none;
}

.contact-info a:hover {
  color: rgb(var(--v-theme-primary));
}
</style>
