<template>
  <v-card>
    <v-card-title>
      {{ student ? $i18n('admin.studentsTable.editStudent') : $i18n('admin.studentsTable.newStudent') }}
    </v-card-title>

    <v-card-text>
      <v-text-field
        v-model="form.first_name"
        autofocus
        class="mb-2"
        density="compact"
        :label="$i18n('admin.studentsTable.headers.firstName')"
        variant="outlined"
      />

      <v-text-field
        v-model="form.last_name"
        class="mb-2"
        density="compact"
        :label="$i18n('admin.studentsTable.headers.lastName')"
        variant="outlined"
      />

      <div class="d-flex ga-2">
        <v-select
          v-model="form.className"
          class="mb-2 flex-grow-1"
          clearable
          density="compact"
          :item-title="c => `${c.classCode || c.value} - ${c.teacher}`"
          item-value="value"
          :items="classOptions"
          :label="$i18n('admin.studentsTable.headers.class')"
          variant="outlined"
          @update:model-value="onClassChange"
        />

        <v-select
          v-model="form.level"
          class="mb-2"
          density="compact"
          :items="levelOptions"
          :label="$i18n('admin.studentsTable.headers.level')"
          style="max-width: 110px"
          variant="outlined"
        />
      </div>

      <v-autocomplete
        v-model="form.parent1_id"
        class="mb-2"
        clearable
        density="compact"
        item-title="fullName"
        item-value="id"
        :items="parentOptions"
        :label="$i18n('admin.parent1')"
        variant="outlined"
      />

      <v-autocomplete
        v-model="form.parent2_id"
        clearable
        density="compact"
        item-title="fullName"
        item-value="id"
        :items="parentOptions"
        :label="$i18n('admin.parent2')"
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
  import { computed, ref } from 'vue'
  import { useTranslate } from '@/composables/useTranslate'
  import { getValidLevelsForClass } from '@/config/classLevels'
  import { StudentRepository } from '@/repositories/StudentRepository'

  // student: the StudentDTO to edit, or null to add a new student
  const props = defineProps({
    student: {
      type: Object,
      default: null,
    },
    classOptions: {
      type: Array,
      required: true,
    },
    parentOptions: {
      type: Array,
      required: true,
    },
  })

  // saved: { student, created } with the saved StudentDTO
  const emit = defineEmits(['close', 'saved'])

  const $i18n = useTranslate()

  const form = ref({
    first_name: props.student?.first_name || '',
    last_name: props.student?.last_name || '',
    className: props.student?.className || null,
    level: props.student?.level ?? null,
    parent1_id: props.student?.parent1_id || null,
    parent2_id: props.student?.parent2_id || null,
  })
  const saving = ref(false)
  const error = ref(null)

  // Levels allowed for the chosen class, or all levels without a class
  const levelOptions = computed(() => {
    const levels = form.value.className ? getValidLevelsForClass(form.value.className) : [1, 2, 3, 4, 5, 6]
    return levels.map(level => ({ title: String(level), value: level }))
  })

  function onClassChange (classLetter) {
    if (!classLetter) return
    const validLevels = getValidLevelsForClass(classLetter)
    if (!validLevels.includes(form.value.level)) {
      form.value.level = validLevels.length === 1 ? validLevels[0] : null
    }
  }

  async function save () {
    const data = {
      first_name: form.value.first_name.trim(),
      last_name: form.value.last_name.trim(),
      className: form.value.className || '',
      level: form.value.level,
      parent1_id: form.value.parent1_id || null,
      parent2_id: form.value.parent2_id || null,
    }
    if (!data.first_name) {
      error.value = $i18n('admin.studentsTable.validation.firstNameRequired')
      return
    }
    if (!data.last_name) {
      error.value = $i18n('admin.studentsTable.validation.lastNameRequired')
      return
    }
    if (!props.student && !data.parent1_id && !data.parent2_id) {
      error.value = $i18n('admin.studentsTable.validation.parentRequired')
      return
    }

    saving.value = true
    error.value = null
    try {
      const studentRepository = new StudentRepository()
      const saved = props.student
        ? await studentRepository.update(props.student.id, data)
        : await studentRepository.create(data)
      emit('saved', { student: saved, created: !props.student })
    } catch {
      error.value = $i18n(props.student ? 'admin.studentsTable.updateError' : 'admin.studentsTable.createError')
    } finally {
      saving.value = false
    }
  }
</script>
