<template>
  <div class="mb-6">
    <div class="text-title-small text-medium-emphasis mb-2">
      <v-icon class="me-1" size="small">mdi-shield-account</v-icon>
      {{ $i18n('dashboard.adminTodo') }}
    </div>

    <v-row density="compact">
      <v-col
        v-for="item in items"
        :key="item.key"
        cols="6"
        md="3"
      >
        <v-card
          class="h-100"
          :color="item.count === 0 ? 'success' : 'warning'"
          :to="item.to"
          variant="tonal"
        >
          <v-card-text class="d-flex align-center ga-3">
            <v-progress-circular v-if="item.count === null" indeterminate size="28" width="3" />
            <v-icon v-else-if="item.count === 0" size="28">mdi-check-circle</v-icon>
            <span v-else class="text-headline-small font-weight-bold">{{ item.count }}</span>
            <span class="text-body-medium">{{ item.label }}</span>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
  import { computed } from 'vue'
  import { useI18n } from 'vue-banana-i18n'

  // Each count is null while loading
  const props = defineProps({
    notEmailed: { type: Number, default: null },
    notUpdated: { type: Number, default: null },
    unassigned: { type: Number, default: null },
    pendingFeedback: { type: Number, default: null },
  })

  const bananaI18n = useI18n()
  const $i18n = (key, ...params) => bananaI18n.i18n(key, ...params)

  const items = computed(() => [
    {
      key: 'notEmailed',
      count: props.notEmailed,
      label: props.notEmailed === 0 ? $i18n('dashboard.todo.notEmailedDone') : $i18n('dashboard.todo.notEmailed', props.notEmailed ?? 0),
      to: '/admin/parents?emailStatus=notSent',
    },
    {
      key: 'notUpdated',
      count: props.notUpdated,
      label: props.notUpdated === 0 ? $i18n('dashboard.todo.notUpdatedDone') : $i18n('dashboard.todo.notUpdated', props.notUpdated ?? 0),
      to: '/admin/parents?submitted=no',
    },
    {
      key: 'unassigned',
      count: props.unassigned,
      label: props.unassigned === 0 ? $i18n('dashboard.todo.unassignedDone') : $i18n('dashboard.todo.unassigned', props.unassigned ?? 0),
      to: '/admin/students?unassigned=1',
    },
    {
      key: 'pendingFeedback',
      count: props.pendingFeedback,
      label: props.pendingFeedback === 0 ? $i18n('dashboard.todo.pendingFeedbackDone') : $i18n('dashboard.todo.pendingFeedback', props.pendingFeedback ?? 0),
      to: '/admin/feedback?status=pending',
    },
  ])
</script>
