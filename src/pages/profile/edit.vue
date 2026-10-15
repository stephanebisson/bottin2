<template>
  <v-container>
    <!-- Loading State -->
    <div v-if="loading" class="d-flex justify-center py-8">
      <v-progress-circular color="primary" indeterminate size="64" />
    </div>

    <!-- Error State (the form stays on screen so nothing typed is lost) -->
    <v-alert
      v-if="error"
      class="mb-4"
      closable
      :text="errorMessage"
      type="error"
      @click:close="error = null"
    />

    <div v-if="data">
      <p class="text-body-large text-medium-emphasis mb-6">
        {{ $i18n('updateForm.instructions') }}
      </p>

      <ParentUpdateForm
        v-bind="data"
        cancelable
        :opting-out="optingOut"
        :submitting="submitting"
        @cancel="router.push('/profile')"
        @opt-out="handleDone(optOut)"
        @submit="parentData => handleDone(() => submit(parentData))"
      />
    </div>
  </v-container>
</template>

<script setup>
  import { computed, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { useParentUpdate } from '@/composables/useParentUpdate'
  import { useTranslate } from '@/composables/useTranslate'
  import { useAuthStore } from '@/stores/auth'
  import { useFirebaseDataStore } from '@/stores/firebaseData'

  definePage({ meta: { titleKey: 'profile.editTitle', hideRefresh: true } })

  const $i18n = useTranslate()
  const router = useRouter()
  const authStore = useAuthStore()
  const firebaseStore = useFirebaseDataStore()

  // No token: the signed-in parent's ID token identifies them
  const { loading, submitting, optingOut, error, errorKey, data, load, submit, optOut } = useParentUpdate()

  // A 404 here means no parent record matches the signed-in email, not an expired link
  const errorMessage = computed(() => error.value === 'expired_token'
    ? $i18n('profile.noProfileFoundMessage')
    : $i18n(`updateForm.error.${errorKey.value}.message`))

  // Save (or opt out), refresh what the profile page shows, and go back to it
  async function handleDone (action) {
    const result = await action()
    if (!result) return
    await Promise.all([
      firebaseStore.loadCurrentParent(authStore.user.email),
      firebaseStore.loadParentsDTO(true),
      firebaseStore.loadCommitteesDTO(true),
    ])
    router.push('/profile')
  }

  onMounted(load)
</script>
