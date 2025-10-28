<template>
  <div class="subgroup-section mb-8">
    <!-- Subgroup Header -->
    <div class="d-flex align-center mb-4">
      <v-icon class="mr-3" color="primary" size="large">
        {{ icon }}
      </v-icon>
      <div>
        <h3 class="text-h5 font-weight-bold text-primary">
          {{ name }}
        </h3>
        <p class="text-body-2 text-grey-darken-1 ma-0">
          {{ members.length }} {{ members.length === 1 ? 'membre' : 'membres' }}
        </p>
      </div>
    </div>

    <!-- Staff Cards Grid -->
    <v-row>
      <v-col
        v-for="member in members"
        :key="member.id"
        cols="12"
        lg="6"
      >
        <StaffCard
          :group="group"
          :is-fixed="isFixed"
          :is-modified="modifiedIds.has(member.id)"
          :staff="member"
          :subgroup="subgroup"
          @change="handleChange"
          @delete="handleDelete"
        />
      </v-col>

      <!-- Empty State for Fixed Sections -->
      <v-col v-if="isFixed && members.length === 0" cols="12">
        <v-card class="pa-6 text-center" variant="outlined">
          <v-icon color="grey-darken-2" size="48">mdi-account-off</v-icon>
          <p class="text-body-1 text-grey-darken-1 mt-2 mb-0">
            Aucun membre du personnel assigné
          </p>
        </v-card>
      </v-col>
    </v-row>

    <!-- Add Button for Variable Sections -->
    <div v-if="!isFixed" class="mt-4">
      <v-btn
        color="primary"
        prepend-icon="mdi-plus"
        variant="outlined"
        @click="handleAdd"
      >
        Ajouter un membre
      </v-btn>
    </div>
  </div>
</template>

<script setup>
  import StaffCard from './StaffCard.vue'

  // Props
  const props = defineProps({
    group: {
      type: String,
      required: true,
    },
    subgroup: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    icon: {
      type: String,
      required: true,
    },
    members: {
      type: Array,
      required: true,
    },
    isFixed: {
      type: Boolean,
      default: false,
    },
    modifiedIds: {
      type: Set,
      default: () => new Set(),
    },
  })

  // Emits
  const emit = defineEmits(['change', 'delete', 'add'])

  // Methods
  function handleChange (updatedStaff) {
    emit('change', updatedStaff)
  }

  function handleDelete (staffId) {
    emit('delete', staffId)
  }

  function handleAdd () {
    emit('add', {
      group: props.group,
      subgroup: props.subgroup,
    })
  }
</script>

<style scoped>
.subgroup-section {
  padding-left: 16px;
}
</style>
