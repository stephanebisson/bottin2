<template>
  <v-container>
    <!-- Access Control -->
    <!-- Admin Dashboard -->
    <!-- Welcome Section -->
    <v-card class="mb-6" color="primary" variant="tonal">
      <v-card-text>
        <div class="d-flex align-center">
          <v-icon class="mr-4" size="48">mdi-shield-account</v-icon>

          <div>
            <h2 class="text-headline-small font-weight-bold">{{ $i18n('admin.welcomeTitle') }}</h2>

            <p class="text-body-large mt-2">
              {{ $i18n('admin.welcomeDescription') }}
            </p>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <!-- Admin Tools Grid -->
    <v-row>
      <!-- Audit Log -->
      <v-col cols="12" lg="4" md="6">
        <v-card
          class="h-100 cursor-pointer admin-card"
          hover
          @click="handleLogsClick"
        >
          <v-card-text class="text-center pa-6">
            <v-icon class="mb-4" color="primary" size="64">mdi-history</v-icon>
            <h3 class="text-title-large font-weight-bold mb-2">{{ $i18n('admin.auditLog.title') }}</h3>

            <p class="text-body-medium text-medium-emphasis">
              {{ $i18n('admin.auditLog.description') }}
            </p>

            <div class="mt-4">
              <v-chip color="primary" size="small" variant="tonal">
                {{ $i18n('admin.auditLog.title') }}
              </v-chip>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Parents Directory -->
      <v-col cols="12" lg="4" md="6">
        <v-card
          class="h-100 cursor-pointer admin-card"
          hover
          @click="handleParentsClick"
        >
          <v-card-text class="text-center pa-6">
            <v-icon class="mb-4" color="primary" size="64">mdi-account-group</v-icon>
            <h3 class="text-title-large font-weight-bold mb-2">{{ $i18n('admin.parentsDirectory.title') }}</h3>

            <p class="text-body-medium text-medium-emphasis">
              {{ $i18n('admin.parentsDirectory.description') }}
            </p>

            <!-- Quick Stats -->
            <div class="mt-4">
              <v-chip color="primary" size="small" variant="tonal">
                {{ $i18n('admin.parentsDirectory.viewAllParents') }}
              </v-chip>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Students Table -->
      <v-col cols="12" lg="4" md="6">
        <v-card
          class="h-100 cursor-pointer admin-card"
          hover
          @click="handleStudentsClick"
        >
          <v-card-text class="text-center pa-6">
            <v-icon class="mb-4" color="primary" size="64">mdi-school-outline</v-icon>
            <h3 class="text-title-large font-weight-bold mb-2">{{ $i18n('admin.studentsTable.title') }}</h3>

            <p class="text-body-medium text-medium-emphasis">
              {{ $i18n('admin.studentsTable.description') }}
            </p>

            <!-- Quick Stats -->
            <div class="mt-4">
              <v-chip color="primary" size="small" variant="tonal">
                {{ $i18n('admin.studentsTable.viewAllStudents') }}
              </v-chip>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Staff Update -->
      <v-col cols="12" lg="4" md="6">
        <v-card class="h-100 admin-card">
          <v-card-text class="text-center pa-6">
            <v-icon class="mb-4" color="primary" size="64">mdi-account-tie-outline</v-icon>
            <h3 class="text-title-large font-weight-bold mb-2">{{ $i18n('admin.staffUpdate.title') }}</h3>

            <p class="text-body-medium text-medium-emphasis">
              {{ $i18n('admin.staffUpdate.description') }}
            </p>

            <!-- Staff Update Link -->
            <div v-if="staffUpdateToken" class="mt-4">
              <v-btn
                color="primary"
                prepend-icon="mdi-link"
                size="small"
                variant="tonal"
                @click="openStaffUpdateLink"
              >
                {{ $i18n('admin.staffUpdate.openLink') }}
              </v-btn>

              <v-btn
                class="mt-2"
                prepend-icon="mdi-content-copy"
                size="small"
                variant="text"
                @click="copyStaffUpdateLink"
              >
                {{ $i18n('admin.staffUpdate.copyLink') }}
              </v-btn>
            </div>

            <div v-else class="mt-4">
              <v-chip size="small" variant="tonal">
                {{ $i18n('admin.staffUpdate.noToken') }}
              </v-chip>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

    </v-row>
  </v-container>
</template>

<script setup>
  import { onMounted, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { getFunctionsBaseUrl } from '@/config/functions'
  import { useAuthStore } from '@/stores/auth'

  definePage({ meta: { titleKey: 'admin.title' } })

  const router = useRouter()
  const authStore = useAuthStore()

  const staffUpdateToken = ref(null)

  function handleLogsClick () {
    router.push('/admin/logs')
  }

  function handleParentsClick () {
    router.push('/admin/parents')
  }

  function handleStudentsClick () {
    router.push('/admin/students')
  }

  async function loadStaffUpdateToken () {
    try {
      const baseUrl = getFunctionsBaseUrl()
      const response = await fetch(`${baseUrl}/getStaffUpdateToken`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${await authStore.user.getIdToken()}`,
        },
      })
      if (!response.ok) return
      const data = await response.json()
      staffUpdateToken.value = data.token
    } catch {
      // token unavailable — silently ignore
    }
  }

  function openStaffUpdateLink () {
    if (!staffUpdateToken.value) return
    window.open(`${window.location.origin}/staff-update/${staffUpdateToken.value}`, '_blank')
  }

  async function copyStaffUpdateLink () {
    if (!staffUpdateToken.value) return
    const url = `${window.location.origin}/staff-update/${staffUpdateToken.value}`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const el = document.createElement('textarea')
      el.value = url
      document.body.append(el)
      el.select()
      document.execCommand('copy')
      el.remove()
    }
  }

  onMounted(async () => {
    await loadStaffUpdateToken()
  })
</script>

<style scoped>
  .admin-card {
    transition: all 0.3s ease;
  }

  .admin-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }

  .cursor-pointer {
    cursor: pointer;
  }
</style>
