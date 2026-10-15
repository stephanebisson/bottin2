<template>
  <v-container>
    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <v-progress-circular color="primary" indeterminate size="64" />
      <p class="text-title-large mt-4">{{ $i18n('updateForm.loadingInfo') }}</p>
    </div>

    <!-- Error State with Friendly Messages -->
    <div v-else-if="error" class="text-center py-12">
      <v-icon color="warning" size="64">mdi-information-outline</v-icon>
      <h2 class="text-headline-large mt-4 text-warning">{{ $i18n(`updateForm.error.${errorKey}.title`) }}</h2>
      <p class="text-body-large mt-2 text-medium-emphasis">{{ $i18n(`updateForm.error.${errorKey}.message`) }}</p>

      <!-- Action buttons based on error type -->
      <div class="mt-6">
        <v-btn
          v-if="errorType === 'network' || errorType === 'temporary'"
          class="me-2"
          color="primary"
          prepend-icon="mdi-refresh"
          variant="flat"
          @click="retry"
        >
          {{ $i18n('common.retry') }}
        </v-btn>

        <v-btn
          color="secondary"
          prepend-icon="mdi-home"
          variant="outlined"
          @click="$router.push('/')"
        >
          {{ $i18n('updateForm.goHome') }}
        </v-btn>
      </div>

      <!-- Contact info for persistent issues -->
      <v-alert
        v-if="retryCount >= 2"
        class="mt-6 mx-auto"
        color="info"
        icon="mdi-email"
        max-width="500"
        variant="tonal"
      >
        {{ $i18n('updateForm.error.contactOffice') }}
      </v-alert>
    </div>

    <!-- Update Form -->
    <div v-else-if="data">
      <!-- Welcome -->
      <div class="mb-6">
        <h2 class="text-headline-small font-weight-bold mb-2">
          {{ $i18n('updateForm.welcome', `${data.parent.first_name} ${data.parent.last_name}`) }}
        </h2>

        <p class="text-body-large text-medium-emphasis">
          {{ $i18n('updateForm.instructions') }}
        </p>
      </div>

      <ParentUpdateForm
        v-bind="data"
        :opting-out="optingOut"
        :submitting="submitting"
        @opt-out="handleOptOut"
        @submit="handleSubmit"
      />
    </div>
  </v-container>
</template>

<script setup>
  import { onMounted } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useParentUpdate } from '@/composables/useParentUpdate'

  definePage({ meta: { titleKey: 'updateForm.title', hideRefresh: true } })

  const route = useRoute()
  const router = useRouter()

  const {
    loading,
    submitting,
    optingOut,
    error,
    errorType,
    errorKey,
    retryCount,
    data,
    load,
    retry,
    submit,
    optOut,
  } = useParentUpdate(route.params.token)

  // Both go to the confirmation page, which offers to create an online directory account
  async function handleSubmit (parentData) {
    const result = await submit(parentData)
    if (!result) return
    router.push({
      path: '/update-success',
      query: { account: result.accountStatus, email: data.value.parent.email },
    })
  }

  async function handleOptOut () {
    const result = await optOut()
    if (!result) return
    router.push({
      path: '/update-success',
      query: { account: result.accountStatus, email: data.value.parent.email, optedOut: '1' },
    })
  }

  onMounted(load)
</script>
