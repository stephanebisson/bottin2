<template>
  <div class="student-class-info">
    <span v-if="student.level" class="part">{{ formatGradeLevel(student.level, bananaI18n.locale) }}</span>
    <a v-if="teacher" class="part plain-link" :href="teacher.email ? `mailto:${teacher.email}` : undefined">{{ teacher.fullName }}</a>
    <span v-if="classItem?.classCode" class="part class-code">{{ classItem.classCode }}</span>
  </div>
</template>

<script setup>
  import { computed } from 'vue'
  import { useI18n } from 'vue-banana-i18n'
  import { useFirebaseDataStore } from '@/stores/firebaseData'
  import { formatGradeLevel } from '@/utils/gradeFormatter'

  // A student's level, teacher and class code, the same way everywhere
  const props = defineProps({
    student: {
      type: Object,
      required: true,
    },
  })

  const bananaI18n = useI18n()
  const firebaseStore = useFirebaseDataStore()

  const classItem = computed(() => firebaseStore.classes.find(c => c.classLetter === props.student.className))
  const teacher = computed(() => classItem.value && firebaseStore.staffDTO.find(s => s.id === classItem.value.teacher))
</script>

<style scoped>
/* Parts separated by a middle dot; each part stays on one line when wrapping */
.part {
  white-space: nowrap;
}

.part + .part::before {
  content: '·';
  margin: 0 0.5em;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

/* Teacher is a mailto link that looks like a plain name */
.plain-link {
  color: inherit;
  text-decoration: none;
}

.class-code {
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  font-size: 0.75rem;
  letter-spacing: 0.03em;
}
</style>
