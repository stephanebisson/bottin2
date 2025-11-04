<template>
  <v-snackbar
    v-model="showPrompt"
    color="primary"
    location="bottom"
    :timeout="-1"
    :vertical="$vuetify.display.xs"
  >
    <div class="d-flex align-center">
      <v-icon class="mr-2">mdi-update</v-icon>
      <span>{{ $t('pwa.updateAvailable') }}</span>
    </div>

    <template #actions>
      <v-btn
        size="small"
        variant="text"
        @click="updateServiceWorker(true)"
      >
        {{ $t('pwa.update') }}
      </v-btn>
      <v-btn
        icon="mdi-close"
        size="small"
        variant="text"
        @click="showPrompt = false"
      />
    </template>
  </v-snackbar>
</template>

<script setup>
  import { useRegisterSW } from 'virtual:pwa-register/vue'

  const {
    offlineReady,
    needRefresh,
    updateServiceWorker,
  } = useRegisterSW()

  const showPrompt = computed(() => offlineReady.value || needRefresh.value)
</script>
