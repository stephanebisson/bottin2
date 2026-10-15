<template>
  <div v-if="items.length > 0" class="mb-6">
    <div class="text-title-small text-medium-emphasis mb-2">
      <v-icon class="me-1" size="small">mdi-shield-account</v-icon>
      {{ $i18n('dashboard.adminTodo') }}
    </div>

    <div class="d-flex flex-wrap ga-2">
      <v-card
        v-for="item in items"
        :key="item.key"
        color="warning"
        :to="item.to"
        variant="tonal"
        width="180"
      >
        <v-card-text class="d-flex align-center ga-3">
          <span class="text-headline-small font-weight-bold">{{ item.count }}</span>
          <span class="text-body-medium">{{ $i18n(`dashboard.todo.${item.key}`, item.count) }}</span>
        </v-card-text>
      </v-card>
    </div>
  </div>
</template>

<script setup>
  import { computed } from 'vue'

  // Each count is null while loading; only cards with something to do are shown
  const props = defineProps({
    notEmailed: { type: Number, default: null },
    notUpdated: { type: Number, default: null },
    noChildren: { type: Number, default: null },
    unassigned: { type: Number, default: null },
    pendingFeedback: { type: Number, default: null },
  })

  const items = computed(() => [
    { key: 'notEmailed', count: props.notEmailed, to: '/admin/parents?emailStatus=notSent' },
    { key: 'notUpdated', count: props.notUpdated, to: '/admin/parents?submitted=no' },
    { key: 'noChildren', count: props.noChildren, to: '/admin/parents?noChildren=1' },
    { key: 'unassigned', count: props.unassigned, to: '/admin/students?unassigned=1' },
    { key: 'pendingFeedback', count: props.pendingFeedback, to: '/admin/feedback?status=pending' },
  ].filter(item => item.count > 0))
</script>
