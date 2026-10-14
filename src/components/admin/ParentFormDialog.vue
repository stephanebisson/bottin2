<template>
  <v-card>
    <v-card-title>
      {{ parent ? $i18n('admin.parentsDirectory.editParent') : $i18n('admin.parentsDirectory.addNewParent') }}
    </v-card-title>

    <v-card-text>
      <v-text-field
        v-model="form.first_name"
        autofocus
        class="mb-2"
        density="compact"
        :label="$i18n('common.firstName')"
        variant="outlined"
      />

      <v-text-field
        v-model="form.last_name"
        class="mb-2"
        density="compact"
        :label="$i18n('common.lastName')"
        variant="outlined"
      />

      <v-text-field
        v-model="form.email"
        class="mb-2"
        density="compact"
        :label="$i18n('common.email')"
        :placeholder="$i18n('common.optional')"
        type="email"
        variant="outlined"
      />

      <v-text-field
        v-model="form.phone"
        density="compact"
        :label="$i18n('common.phone')"
        :placeholder="$i18n('common.optional')"
        type="tel"
        variant="outlined"
      />

      <v-alert
        v-if="error"
        class="mt-3"
        type="error"
        variant="tonal"
      >
        {{ error }}
      </v-alert>
    </v-card-text>

    <v-card-actions>
      <v-spacer />

      <v-btn :disabled="saving" variant="text" @click="emit('close')">
        {{ $i18n('common.cancel') }}
      </v-btn>

      <v-btn
        color="primary"
        :loading="saving"
        variant="tonal"
        @click="save"
      >
        {{ $i18n('common.save') }}
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup>
  import { ref } from 'vue'
  import { useTranslate } from '@/composables/useTranslate'
  import { ParentRepository } from '@/repositories/ParentRepository.js'

  // parent: the ParentDTO to edit, or null to add a new parent
  const props = defineProps({
    parent: {
      type: Object,
      default: null,
    },
  })

  // saved: { parent, created } with the saved ParentDTO
  const emit = defineEmits(['close', 'saved'])

  const $i18n = useTranslate()
  const parentRepository = new ParentRepository()

  const form = ref({
    first_name: props.parent?.first_name || '',
    last_name: props.parent?.last_name || '',
    email: props.parent?.email || '',
    phone: props.parent?.phone || '',
  })
  const saving = ref(false)
  const error = ref(null)

  async function save () {
    const data = {
      first_name: form.value.first_name.trim(),
      last_name: form.value.last_name.trim(),
      email: form.value.email.trim(),
      phone: form.value.phone.trim(),
    }
    if (!data.first_name || !data.last_name) {
      error.value = $i18n('admin.parentsDirectory.validation.required')
      return
    }
    const emailPattern = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/
    if (data.email && !emailPattern.test(data.email)) {
      error.value = $i18n('admin.parentsDirectory.validation.invalidEmail')
      return
    }

    saving.value = true
    error.value = null
    try {
      const saved = props.parent
        ? await parentRepository.update(props.parent.id, data)
        : await parentRepository.create(data)
      emit('saved', { parent: saved, created: !props.parent })
    } catch (error_) {
      error.value = error_.message
    } finally {
      saving.value = false
    }
  }
</script>
