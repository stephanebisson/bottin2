<template>
  <!-- Staff of one group (EF or SDG), on as many pages as it needs -->
  <PrintFlow v-if="group.group === 'EF' || group.group === 'SDG'" :section-id="group.group === 'EF' ? 'section-staff' : 'section-sdg'">
    <!-- Group Header with the group's phone -->
    <template #header="{ page }">
      <div class="group-header">
        <h1 class="group-title">{{ group.name }}<template v-if="page > 0"> (suite)</template></h1>
        <span class="school-phone">{{ group.group === 'EF' ? schoolPhone : sdgPhone }}</span>
      </div>
    </template>

    <!-- SDG Info Header -->
    <div v-if="group.group === 'SDG'" class="sdg-header">
      <div class="sdg-logo-space">
        <img alt="SDG Logo" class="sdg-logo" src="@/assets/SDG_logo.jpg">
      </div>

      <div class="sdg-info">
        <div class="sdg-name">{{ SDG_INFO.name }}</div>
        <div class="sdg-address">{{ SDG_INFO.addressLine1 }}</div>
        <div class="sdg-address">{{ SDG_INFO.addressLine2 }}</div>
        <div class="sdg-email">{{ SDG_INFO.email }}</div>
        <div class="sdg-url">{{ SDG_INFO.url }}</div>
      </div>
    </div>

    <!-- Subgroups: title and members -->
    <template v-for="subgroup in group.subgroups" :key="subgroup.subgroup">
      <h2 class="subgroup-title">{{ subgroup.name }}</h2>
      <StaffTable class="subgroup-members" :members="subgroup.members" :variant="tableVariant(subgroup)" />
    </template>
  </PrintFlow>
</template>

<script setup>
  import { SDG_INFO } from '@/config/sdg'
  import StaffTable from './components/StaffTable.vue'
  import PrintFlow from './PrintFlow.vue'

  const props = defineProps({
    group: {
      type: Object,
      required: true,
    },
    schoolPhone: {
      type: String,
      default: '',
    },
    sdgPhone: {
      type: String,
      default: '',
    },
  })

  // EF staff: title, name, email; SDG: responsables with phones, éducateurs with titles
  function tableVariant (subgroup) {
    if (props.group.group === 'EF') return 'ef'
    return subgroup.subgroup === 'resp' ? 'sdg-resp' : 'sdg-edu'
  }
</script>

<style scoped>
/* Staff Section */
.group-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.7rem;
  padding-bottom: 0.35rem;
  border-bottom: 2px solid black;
}

.school-phone {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 11pt;
  font-weight: 600;
  color: #000;
}

/* Space between subgroups */
table.subgroup-members {
  margin-bottom: 1.4rem;
}

/* SDG Header Section */
.sdg-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0.3rem 0 1rem 0;
}

.sdg-logo-space {
  flex: 0 0 32%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sdg-logo {
  max-width: 100%;
  height: auto;
  object-fit: contain;
}

.sdg-info {
  flex: 0 0 63%;
  text-align: right;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  justify-content: center;
}

.sdg-name {
  font-size: 13pt;
  font-weight: 600;
  color: #000;
  margin-bottom: 0.35rem;
}

.sdg-address {
  font-size: 9.5pt;
  color: #000;
  line-height: 1.4;
}

.sdg-email {
  font-size: 9.5pt;
  color: #000;
  line-height: 1.4;
}

.sdg-phone {
  font-size: 10.5pt;
  font-weight: 600;
  color: #000;
}

.sdg-url {
  font-size: 9.5pt;
  color: #000;
  font-style: italic;
}
</style>
