<template>
  <!-- Side column on desktop, first on mobile; absent when there's nothing to do -->
  <v-col
    v-if="hasItems"
    class="order-first order-md-last"
    cols="12"
    md="3"
  >
    <div class="text-title-small text-medium-emphasis mb-2">
      <v-icon class="me-1" size="small">mdi-shield-account</v-icon>
      {{ $i18n('dashboard.adminTodo') }}
    </div>

    <v-row density="compact">
      <v-col
        v-for="item in progressItems"
        :key="item.key"
        cols="6"
        md="12"
      >
        <v-card
          class="h-100"
          color="warning"
          :to="item.to"
          variant="tonal"
        >
          <v-card-text>
            <div class="text-body-medium">{{ $i18n(`dashboard.progress.${item.key}`) }}</div>

            <div class="d-flex align-baseline ga-2">
              <span class="text-headline-small font-weight-bold">{{ $i18n('dashboard.percent', item.percent) }}</span>
              <span class="text-body-small">{{ item.done }}/{{ item.total }}</span>
            </div>

            <v-progress-linear class="mt-2" :model-value="item.percent" rounded />
          </v-card-text>
        </v-card>
      </v-col>

      <v-col
        v-for="item in countItems"
        :key="item.key"
        cols="6"
        md="12"
      >
        <v-card
          class="h-100"
          color="warning"
          :to="item.to"
          variant="tonal"
        >
          <v-card-text class="d-flex align-center ga-3">
            <span class="text-headline-small font-weight-bold">{{ item.count }}</span>
            <span class="text-body-medium">{{ $i18n(`dashboard.todo.${item.key}`, item.count) }}</span>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-col>
</template>

<script setup>
  import { computed } from 'vue'

  // Each value is null while loading; only cards with something left to do are shown.
  // Progress values are { done, total }.
  const props = defineProps({
    emailSent: { type: Object, default: null },
    updated: { type: Object, default: null },
    classAssigned: { type: Object, default: null },
    noChildren: { type: Number, default: null },
    pendingFeedback: { type: Number, default: null },
  })

  const progressItems = computed(() => [
    { key: 'emailSent', progress: props.emailSent, to: '/admin/parents?emailStatus=notSent' },
    { key: 'updated', progress: props.updated, to: '/admin/parents?submitted=no' },
    { key: 'classAssigned', progress: props.classAssigned, to: '/admin/students?unassigned=1' },
  ]
    .filter(item => item.progress && item.progress.done < item.progress.total)
    // Rounded down so an unfinished task never shows 100%
    .map(({ progress, ...item }) => ({ ...item, ...progress, percent: Math.floor(progress.done / progress.total * 100) })))

  const countItems = computed(() => [
    { key: 'noChildren', count: props.noChildren, to: '/admin/parents?noChildren=1' },
    { key: 'pendingFeedback', count: props.pendingFeedback, to: '/admin/feedback?status=pending' },
  ].filter(item => item.count > 0))

  const hasItems = computed(() => progressItems.value.length + countItems.value.length > 0)

  defineExpose({ hasItems })
</script>
