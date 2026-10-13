<template>
  <v-container>
    <div class="d-flex justify-space-between align-center mb-6">
      <div>
        <v-btn
          class="mb-2"
          prepend-icon="mdi-arrow-left"
          variant="text"
          @click="$router.push('/admin')"
        >
          {{ $i18n('admin.backToAdminDashboard') }}
        </v-btn>

        <h1 class="text-display-medium font-weight-bold">{{ $i18n('admin.staffUpdate.title') }}</h1>
      </div>
    </div>

    <div v-if="!isAuthorized" class="text-center py-12">
      <v-icon color="error" size="64">mdi-shield-alert</v-icon>
      <h2 class="text-headline-small mt-4 text-error">{{ $i18n('admin.accessDenied') }}</h2>
      <p class="text-body-large text-grey-darken-1 mt-2">{{ $i18n('admin.adminAccessRequired') }}</p>
      <p class="text-body-medium text-grey mt-2">{{ $i18n('admin.refreshPermissionsInstructions') }}</p>

      <v-btn class="mt-4" variant="outlined" @click="checkAdminStatus">
        {{ $i18n('admin.refreshAdminStatus') }}
      </v-btn>
    </div>

    <template v-else>
      <div v-if="saveError" class="mb-4">
        <v-alert
          closable
          color="error"
          icon="mdi-alert-circle"
          variant="tonal"
          @click:close="saveError = null"
        >
          {{ saveError }}
        </v-alert>
      </div>

      <GroupSection
        v-for="grp in groupData"
        :key="grp.group"
        class="mb-8"
        :group="grp.group"
        :modified-ids="modifiedIds"
        :name="grp.name"
        :subgroups="grp.subgroups"
        @change="handleChange"
      />

      <div class="d-flex justify-end mt-4 mb-8">
        <v-btn
          color="primary"
          :disabled="!hasChanges"
          :loading="saving"
          prepend-icon="mdi-content-save"
          size="large"
          @click="handleSave"
        >
          {{ $i18n('admin.staffUpdate.save') }}
        </v-btn>
      </div>
    </template>

    <v-dialog v-model="showLeaveDialog" max-width="400">
      <v-card>
        <v-card-title>{{ $i18n('admin.staffUpdate.unsavedChangesTitle') }}</v-card-title>
        <v-card-text>{{ $i18n('admin.staffUpdate.unsavedChangesText') }}</v-card-text>

        <v-card-actions>
          <v-spacer />

          <v-btn variant="text" @click="cancelLeave">
            {{ $i18n('admin.staffUpdate.stayOnPage') }}
          </v-btn>

          <v-btn color="error" variant="elevated" @click="confirmLeave">
            {{ $i18n('admin.staffUpdate.leaveWithoutSaving') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
  import { computed, onMounted, ref } from 'vue'
  import { useI18n } from 'vue-banana-i18n'
  import { onBeforeRouteLeave } from 'vue-router'
  import GroupSection from '@/components/staff-update/GroupSection.vue'
  import {
    GROUP_DISPLAY_NAMES,
    GROUP_SUBGROUP_MAPPING,
    STAFF_GROUPS,
    SUBGROUP_DISPLAY_NAMES,
    SUBGROUP_ICONS,
  } from '@/config/staffGroups'
  import { StaffRepository } from '@/repositories/StaffRepository.js'
  import { useAuthStore } from '@/stores/auth'
  import { useFirebaseDataStore } from '@/stores/firebaseData'

  const bananaI18n = useI18n()
  const $i18n = (key, ...params) => bananaI18n.i18n(key, ...params)

  const authStore = useAuthStore()
  const firebaseStore = useFirebaseDataStore()
  const staffRepository = new StaffRepository()

  const isAuthorized = ref(false)

  async function checkAdminStatus () {
    if (!authStore.isAuthenticated || !authStore.user) {
      isAuthorized.value = false
      return
    }
    try {
      const idTokenResult = await authStore.user.getIdTokenResult(true)
      isAuthorized.value = !!idTokenResult.claims.admin
    } catch {
      isAuthorized.value = false
    }
  }

  const modifications = ref(new Map())
  const saving = ref(false)
  const saveError = ref(null)

  const effectiveStaff = computed(() =>
    firebaseStore.staffDTO.map(s =>
      modifications.value.has(s.id) ? modifications.value.get(s.id) : s,
    ),
  )

  const groupData = computed(() =>
    STAFF_GROUPS.map(group => ({
      group,
      name: GROUP_DISPLAY_NAMES[group],
      subgroups: GROUP_SUBGROUP_MAPPING[group].map(subgroup => ({
        subgroup,
        name: SUBGROUP_DISPLAY_NAMES[subgroup],
        icon: SUBGROUP_ICONS[subgroup],
        isFixed: true,
        members: effectiveStaff.value.filter(s => s.group === group && s.subgroup === subgroup),
      })),
    })),
  )

  const modifiedIds = computed(() => new Set(modifications.value.keys()))
  const hasChanges = computed(() => modifications.value.size > 0)

  function handleChange (updatedStaff) {
    const original = firebaseStore.staffDTO.find(s => s.id === updatedStaff.id)
    if (!original) return
    modifications.value.set(updatedStaff.id, original.withUpdates(updatedStaff))
  }

  onMounted(async () => {
    await checkAdminStatus()
    firebaseStore.loadStaffDTO()
  })

  async function handleSave () {
    saving.value = true
    saveError.value = null
    try {
      await Promise.all([...modifications.value.values()].map(dto => staffRepository.save(dto)))
      modifications.value.clear()
      await firebaseStore.refreshStaffDTO()
    } catch (error) {
      console.error('Failed to save staff:', error)
      saveError.value = error.message || 'Failed to save changes'
    } finally {
      saving.value = false
    }
  }

  const showLeaveDialog = ref(false)
  let pendingNext = null

  onBeforeRouteLeave((to, from, next) => {
    if (!hasChanges.value) {
      next()
      return
    }
    pendingNext = next
    showLeaveDialog.value = true
  })

  function confirmLeave () {
    showLeaveDialog.value = false
    pendingNext?.()
    pendingNext = null
  }

  function cancelLeave () {
    showLeaveDialog.value = false
    pendingNext?.(false)
    pendingNext = null
  }
</script>
