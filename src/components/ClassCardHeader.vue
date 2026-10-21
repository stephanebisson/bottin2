<template>
  <!-- The band atop a class card: the name the students chose, then the teacher and the official class code -->
  <div class="class-header" :class="classItem ? 'bg-primary' : 'bg-surface-variant'">
    <slot name="top" />

    <div class="d-flex align-start ga-2">
      <div class="class-name flex-grow-1">{{ classItem?.className ?? placeholder }}</div>

      <slot name="actions" />
    </div>

    <div v-if="classItem" class="class-subtitle d-flex flex-wrap align-center">
      <span v-if="teacher" class="text-no-wrap">
        <slot name="teacher" :teacher="teacher">
          <a class="plain-link" :href="teacher.email ? `mailto:${teacher.email}` : undefined">{{ teacher.fullName }}</a>
        </slot>
      </span>

      <span class="class-code">{{ classItem.classCode }}</span>
    </div>
  </div>
</template>

<script setup>
  import { computed } from 'vue'
  import { useFirebaseDataStore } from '@/stores/firebaseData'

  // Shared by the classes page and the home page's family cards, so both keep the same look
  const props = defineProps({
    // null for a student who has no class yet: a neutral band showing the placeholder
    classItem: {
      type: Object,
      default: null,
    },
    placeholder: {
      type: String,
      default: '',
    },
  })

  const firebaseStore = useFirebaseDataStore()

  const teacher = computed(() => props.classItem && firebaseStore.staffDTO.find(s => s.id === props.classItem.teacher))
</script>

<style scoped>
.class-header {
  padding: 12px 16px 10px;
}

/* The name the students chose: playful, set apart from the official class code */
.class-name {
  font-family: 'Nunito', 'Roboto', sans-serif;
  font-weight: 800;
  font-size: 1.5rem;
  line-height: 1.15;
  /* A light tint of the secondary color; browsers without color-mix fall back to white */
  color: white;
  color: color-mix(in srgb, rgb(var(--v-theme-secondary)) 40%, white);
  text-wrap: balance;
  overflow-wrap: anywhere;
}

.bg-surface-variant .class-name {
  color: inherit;
}

.class-subtitle {
  column-gap: 12px;
  margin-top: 4px;
  font-size: 0.875rem;
}

.class-code {
  margin-left: auto;
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  font-size: 0.75rem;
  letter-spacing: 0.03em;
  opacity: 0.65;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

/* The teacher is a mailto link that looks like a plain name */
.plain-link {
  color: inherit;
  text-decoration: none;
}

@media (max-width: 599px) {
  .class-header {
    padding-left: 12px;
    padding-right: 12px;
  }
}
</style>
