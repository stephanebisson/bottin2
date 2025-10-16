<template>
  <v-card
    class="staff-card"
    :class="{
      'staff-card--modified': isModified,
      'staff-card--new': staff._isNew
    }"
    elevation="2"
  >
    <v-card-text>
      <!-- Title Field -->
      <v-row>
        <v-col cols="12">
          <v-text-field
            density="comfortable"
            hide-details
            label="Titre"
            :model-value="staff.title"
            variant="outlined"
            @update:model-value="updateField('title', $event)"
          />
        </v-col>
      </v-row>

      <!-- Name Fields -->
      <v-row>
        <v-col cols="12" md="6">
          <v-text-field
            density="comfortable"
            :error-messages="firstNameError"
            hide-details="auto"
            label="Prénom *"
            :model-value="staff.first_name"
            variant="outlined"
            @update:model-value="updateField('first_name', $event)"
          />
        </v-col>
        <v-col cols="12" md="6">
          <v-text-field
            density="comfortable"
            :error-messages="lastNameError"
            hide-details="auto"
            :label="lastNameRequired ? 'Nom de famille *' : 'Nom de famille'"
            :model-value="staff.last_name"
            variant="outlined"
            @update:model-value="updateField('last_name', $event)"
          />
        </v-col>
      </v-row>

      <!-- Email Field -->
      <v-row>
        <v-col cols="12">
          <v-text-field
            density="comfortable"
            :error-messages="emailError"
            hide-details="auto"
            label="Courriel"
            :model-value="staff.email"
            type="email"
            variant="outlined"
            @update:model-value="updateField('email', $event)"
          />
        </v-col>
      </v-row>

      <!-- Phone Field -->
      <v-row>
        <v-col cols="12">
          <v-text-field
            density="comfortable"
            :error-messages="phoneError"
            hide-details="auto"
            label="Téléphone"
            :model-value="staff.phone"
            placeholder="(123) 456-7890"
            type="tel"
            variant="outlined"
            @blur="formatPhoneOnBlur"
            @input="handlePhoneInput"
          />
        </v-col>
      </v-row>

      <!-- Delete Button (only if not fixed) -->
      <v-row v-if="!isFixed">
        <v-col class="text-right" cols="12">
          <v-btn
            color="error"
            prepend-icon="mdi-delete"
            size="small"
            variant="text"
            @click="handleDelete"
          >
            Supprimer
          </v-btn>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script setup>
  import { computed } from 'vue'
  import { formatPhoneForDisplay, formatPhoneForStorage, isValidPhoneFormat } from '@/utils/phoneFormatter'

  // Props
  const props = defineProps({
    staff: {
      type: Object,
      required: true,
    },
    group: {
      type: String,
      required: true,
    },
    subgroup: {
      type: String,
      required: true,
    },
    isFixed: {
      type: Boolean,
      default: false,
    },
    isModified: {
      type: Boolean,
      default: false,
    },
  })

  // Emits
  const emit = defineEmits(['change', 'delete'])

  // Computed
  // Last name is only optional for SDG/edu
  const lastNameRequired = computed(() => {
    return !(props.group === 'SDG' && props.subgroup === 'edu')
  })

  // Validation
  const firstNameError = computed(() => {
    if (!props.staff.first_name || props.staff.first_name.trim() === '') {
      return 'Le prénom est requis'
    }
    return null
  })

  const lastNameError = computed(() => {
    if (lastNameRequired.value && (!props.staff.last_name || props.staff.last_name.trim() === '')) {
      return 'Le nom de famille est requis'
    }
    return null
  })

  const emailError = computed(() => {
    if (props.staff.email && props.staff.email.trim() !== '') {
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(props.staff.email)) {
        return 'Format de courriel invalide'
      }
    }
    return null
  })

  const phoneError = computed(() => {
    if (props.staff.phone && props.staff.phone.trim() !== '' && !isValidPhoneFormat(props.staff.phone)) {
      return 'Numéro de téléphone invalide (10 chiffres requis)'
    }
    return null
  })

  // Methods
  const updateField = (field, value) => {
    emit('change', {
      ...props.staff,
      [field]: value,
    })
  }

  const handleDelete = () => {
    emit('delete', props.staff.id)
  }

  // Phone formatting methods
  const formatPhoneOnBlur = () => {
    if (props.staff.phone) {
      // Format for display when user finishes editing
      const formatted = formatPhoneForDisplay(formatPhoneForStorage(props.staff.phone))
      updateField('phone', formatted)
    }
  }

  const handlePhoneInput = event => {
    // Allow users to type freely, validation happens on blur/submit
    const value = event.target ? event.target.value : event
    updateField('phone', value)
  }
</script>

<style scoped>
.staff-card {
  transition: all 0.3s ease;
  border: 1px solid #e0e0e0;
}

.staff-card--modified {
  border-left: 4px solid #2196f3;
  background-color: #f5f9ff;
}

.staff-card--new {
  background-color: #f1f8f4;
  border-left: 4px solid #4caf50;
}

.v-row {
  margin-top: 0;
  margin-bottom: 12px;
}

.v-row:last-child {
  margin-bottom: 0;
}
</style>
