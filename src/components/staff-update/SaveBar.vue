<template>
  <div
    class="save-bar"
    :class="{
      'save-bar--changes': hasChanges,
      'save-bar--clean': !hasChanges
    }"
  >
    <v-container>
      <div class="d-flex align-center justify-space-between">
        <!-- Status Message -->
        <div class="d-flex align-center">
          <v-icon
            class="mr-3"
            :color="hasChanges ? 'warning' : 'success'"
            size="large"
          >
            {{ hasChanges ? 'mdi-alert-circle' : 'mdi-check-circle' }}
          </v-icon>
          <div>
            <div class="text-h6 font-weight-bold">
              {{ hasChanges ? 'Modifications non enregistrées' : 'Tout est enregistré' }}
            </div>
            <div v-if="hasChanges" class="text-body-2">
              {{ changeCount }} {{ changeCount === 1 ? 'modification' : 'modifications' }} en attente
            </div>
            <div v-else class="text-body-2">
              Toutes les modifications ont été enregistrées
            </div>
          </div>
        </div>

        <!-- Save Button -->
        <v-btn
          color="success"
          :disabled="!hasChanges"
          :loading="saving"
          prepend-icon="mdi-content-save"
          size="large"
          variant="elevated"
          @click="$emit('save')"
        >
          Enregistrer tout
        </v-btn>
      </div>
    </v-container>
  </div>
</template>

<script setup>
  // Props
  defineProps({
    hasChanges: {
      type: Boolean,
      required: true,
    },
    changeCount: {
      type: Number,
      default: 0,
    },
    saving: {
      type: Boolean,
      default: false,
    },
  })

  // Emits
  defineEmits(['save'])
</script>

<style scoped>
.save-bar {
  position: sticky;
  top: 0;
  z-index: 100;
  padding: 20px 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
}

.save-bar--changes {
  background-color: #fff3cd;
  border-bottom: 3px solid #ffc107;
  animation: pulse-subtle 2s ease-in-out infinite;
}

.save-bar--clean {
  background-color: #d4edda;
  border-bottom: 3px solid #28a745;
}

@keyframes pulse-subtle {
  0%, 100% {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }
  50% {
    box-shadow: 0 2px 12px rgba(255, 193, 7, 0.4);
  }
}
</style>
