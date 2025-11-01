# Messaging System Documentation

This messaging system provides context-native messaging throughout the B2 School Directory app. It supports direct parent-to-parent messaging, class-wide messaging, and committee messaging.

## Architecture

### Components

1. **MessagingShell.vue** - Master container, integrated in the main layout
2. **ConversationList.vue** - Inbox showing all conversations
3. **ConversationView.vue** - Chat interface for active conversation
4. **MessageButton.vue** - Entry point buttons placed throughout the app

### Data Layer

- **ConversationDTO** - Conversation data model with validation
- **MessageDTO** - Message data model (1-2000 characters)
- **ConversationRepository** - CRUD operations for conversations
- **MessageRepository** - CRUD operations for messages

### Firestore Collections

```
conversations/
  {conversationId}
    - type: 'direct' | 'class' | 'committee'
    - contextId: 'class-3a' | 'committee-pta' | ''
    - contextLabel: { en: '...', fr: '...' }
    - participants: ['email1@example.com', 'email2@example.com']
    - participantNames: { 'email@example.com': 'Jane Doe' }
    - unreadCount: { 'email@example.com': 3 }
    - lastMessageAt: timestamp
    - lastMessagePreview: '...'
    - archived: false

messages/
  {messageId}
    - conversationId: 'conv-id'
    - senderId: 'email@example.com'
    - senderName: 'Jane Doe'
    - text: 'Message content'
    - readBy: ['email@example.com']
    - createdAt: timestamp
    - edited: false
```

---

## Usage

### Adding Message Buttons to Your Components

Import and use the `MessageButton` component wherever you want users to start conversations.

#### Example 1: Direct Parent-to-Parent Message

```vue
<template>
  <v-card>
    <v-card-title>{{ parent.firstName }} {{ parent.lastName }}</v-card-title>
    <v-card-text>
      <p>Email: {{ parent.email }}</p>
      <p>Children: {{ parent.children.join(', ') }}</p>
    </v-card-text>
    <v-card-actions>
      <MessageButton
        type="direct"
        :participants="[parent.email, currentUserEmail]"
        :participant-names="{
          [parent.email]: `${parent.firstName} ${parent.lastName}`,
          [currentUserEmail]: currentUserName
        }"
        @start-conversation="handleStartConversation"
      />
    </v-card-actions>
  </v-card>
</template>

<script setup>
import { inject } from 'vue'
import MessageButton from '@/components/messaging/MessageButton.vue'

const props = defineProps({
  parent: { type: Object, required: true },
  currentUserEmail: { type: String, required: true },
  currentUserName: { type: String, required: true },
})

// Get reference to MessagingShell from layout
const messagingShell = inject('messagingShell', null)

function handleStartConversation(conversationData) {
  if (messagingShell) {
    messagingShell.createConversation(conversationData)
  }
}
</script>
```

#### Example 2: Class-Wide Message (All Parents in a Class)

```vue
<template>
  <v-card>
    <v-card-title>{{ classData.name }}</v-card-title>
    <v-card-text>
      <p>Teacher: {{ classData.teacher }}</p>
      <p>Students: {{ classData.studentCount }}</p>
    </v-card-text>
    <v-card-actions>
      <MessageButton
        type="class"
        :context-id="`class-${classData.id}`"
        :context-label="{
          en: `Class ${classData.name} Parents`,
          fr: `Parents de la classe ${classData.name}`
        }"
        :participants="getAllParentEmails(classData.students)"
        :participant-names="getParentNamesMap(classData.students)"
        :show-participant-count="true"
        @start-conversation="handleStartConversation"
      />
    </v-card-actions>
  </v-card>
</template>

<script setup>
import { inject, computed } from 'vue'
import MessageButton from '@/components/messaging/MessageButton.vue'

const props = defineProps({
  classData: { type: Object, required: true },
  allParents: { type: Array, required: true },
})

const messagingShell = inject('messagingShell', null)

function getAllParentEmails(students) {
  // Get all unique parent emails from students
  const emails = new Set()
  students.forEach(student => {
    if (student.parent1Email) emails.add(student.parent1Email)
    if (student.parent2Email) emails.add(student.parent2Email)
  })
  return Array.from(emails).filter(email => email) // Remove nulls
}

function getParentNamesMap(students) {
  const names = {}
  students.forEach(student => {
    if (student.parent1Email && student.parent1Name) {
      names[student.parent1Email] = student.parent1Name
    }
    if (student.parent2Email && student.parent2Name) {
      names[student.parent2Email] = student.parent2Name
    }
  })
  return names
}

function handleStartConversation(conversationData) {
  if (messagingShell) {
    messagingShell.createConversation(conversationData)
  }
}
</script>
```

#### Example 3: Committee Chat

```vue
<template>
  <v-card>
    <v-card-title>{{ committee.name }}</v-card-title>
    <v-card-text>
      <p>{{ $t('committees.memberCount', { count: committee.members.length }) }}</p>
    </v-card-text>
    <v-card-actions>
      <MessageButton
        type="committee"
        :context-id="`committee-${committee.id}`"
        :context-label="{
          en: `${committee.nameEn} Committee`,
          fr: `Comité ${committee.nameFr}`
        }"
        :participants="getMemberEmails(committee.members)"
        :participant-names="getMemberNamesMap(committee.members)"
        label="Committee Chat"
        icon="mdi-forum"
        @start-conversation="handleStartConversation"
      />
    </v-card-actions>
  </v-card>
</template>

<script setup>
import { inject } from 'vue'
import MessageButton from '@/components/messaging/MessageButton.vue'

const props = defineProps({
  committee: { type: Object, required: true },
})

const messagingShell = inject('messagingShell', null)

function getMemberEmails(members) {
  return members
    .map(member => member.email)
    .filter(email => email) // Only members with email
}

function getMemberNamesMap(members) {
  const names = {}
  members.forEach(member => {
    if (member.email && member.name) {
      names[member.email] = member.name
    }
  })
  return names
}

function handleStartConversation(conversationData) {
  if (messagingShell) {
    messagingShell.createConversation(conversationData)
  }
}
</script>
```

---

## Providing MessagingShell Context

To make the MessagingShell accessible via `inject()`, update your layout:

```vue
<!-- src/layouts/default.vue -->
<script setup>
import { ref, provide } from 'vue'
// ... other imports

const messagingShellRef = ref(null)

// Provide to all child components
provide('messagingShell', messagingShellRef)
</script>

<template>
  <v-app>
    <!-- ... app bar, nav drawer -->

    <MessagingShell
      ref="messagingShellRef"
      :current-user-email="authStore.userEmail"
      :current-user-name="authStore.userDisplayName"
    />
  </v-app>
</template>
```

---

## MessageButton Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `type` | String | Yes | `'direct'`, `'class'`, or `'committee'` |
| `contextId` | String | No | Context identifier for class/committee (e.g., `'class-3a'`) |
| `contextLabel` | Object | No | Bilingual labels: `{ en: '...', fr: '...' }` |
| `participants` | Array | Yes | Array of participant emails |
| `participantNames` | Object | No | Map of emails to names: `{ 'email': 'Name' }` |
| `label` | String | No | Custom button label (uses default based on type if not provided) |
| `icon` | String | No | Button icon (default: `'mdi-message'`) |
| `variant` | String | No | Vuetify button variant (default: `'outlined'`) |
| `color` | String | No | Button color (default: `'primary'`) |
| `size` | String | No | Button size (default: `'default'`) |
| `showParticipantCount` | Boolean | No | Show participant count badge (default: `true`) |

---

## Features

### Real-Time Updates
- Conversations and messages update in real-time using Firebase listeners
- Unread counts update automatically
- New messages appear instantly

### Read Receipts
- Messages show checkmark when sent
- Double checkmark when read by others
- Unread count tracked per user

### Responsive Design
- **Mobile**: Drawer overlay for conversation list and fullscreen for chat
- **Desktop**: Resizable split-screen panel on the right side

### Internationalization
- All UI strings support English and French
- Context labels stored bilingually in conversations

### Character Limits
- Minimum: 1 character
- Maximum: 2000 characters
- Live character counter in input

---

## Firestore Security Rules

The system enforces strict security:

```javascript
// Only conversation participants can read/write
match /conversations/{convId} {
  allow read: if request.auth.token.email in resource.data.participants;
  allow create: if request.auth.token.email in request.resource.data.participants;
  allow update: if request.auth.token.email in resource.data.participants;
}

// Only conversation members can read messages, only senders can create
match /messages/{msgId} {
  allow read: if userInConversation(resource.data.conversationId);
  allow create: if userIsVerifiedSender();
}
```

---

## Future Enhancements

Possible additions:
- File attachments (images, PDFs)
- Typing indicators
- Push notifications
- Message editing/deletion
- Message search across conversations
- Archive/mute controls per conversation
- Staff-to-parent messaging (when staff accounts are enabled)

---

## Support

For questions or issues, contact the development team or refer to the main project documentation.
