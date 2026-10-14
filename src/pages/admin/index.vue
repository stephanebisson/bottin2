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

      <!-- Staff Editor -->
      <v-col cols="12" lg="4" md="6">
        <v-card
          class="h-100 cursor-pointer admin-card"
          hover
          to="/admin/staff-update"
        >
          <v-card-text class="text-center pa-6">
            <v-icon class="mb-4" color="primary" size="64">mdi-account-tie-outline</v-icon>
            <h3 class="text-title-large font-weight-bold mb-2">{{ $i18n('admin.staffUpdate.title') }}</h3>

            <p class="text-body-medium text-medium-emphasis">
              {{ $i18n('admin.staffUpdate.description') }}
            </p>

            <div class="mt-4">
              <v-chip color="primary" size="small" variant="tonal">
                {{ $i18n('admin.staffUpdate.openEditor') }}
              </v-chip>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
  import { useRouter } from 'vue-router'

  definePage({ meta: { titleKey: 'admin.title' } })

  const router = useRouter()

  function handleLogsClick () {
    router.push('/admin/logs')
  }

  function handleParentsClick () {
    router.push('/admin/parents')
  }

  function handleStudentsClick () {
    router.push('/admin/students')
  }
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
