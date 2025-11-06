<template>
  <!-- EF Staff Page -->
  <PrintPage v-if="group.group === 'EF'" id="section-staff">
    <div class="staff-page">
      <div class="staff-group">
        <!-- Group Header with School Phone -->
        <div class="group-header">
          <h1 class="group-title">{{ group.name }}</h1>
          <span class="school-phone">{{ schoolPhone }}</span>
        </div>

        <!-- Subgroups -->
        <div v-for="subgroup in group.subgroups" :key="subgroup.subgroup" class="staff-subgroup">
          <!-- Subgroup Header -->
          <h2 class="subgroup-title">{{ subgroup.name }}</h2>

          <!-- Staff Members - 3 Column Table -->
          <StaffTable :members="subgroup.members" variant="ef" />
        </div>
      </div>
    </div>
  </PrintPage>

  <!-- SDG Staff Page -->
  <PrintPage v-else-if="group.group === 'SDG'" id="section-sdg">
    <div class="staff-page">
      <div class="staff-group">
        <!-- Group Header with SDG Phone -->
        <div class="group-header">
          <h1 class="group-title">{{ group.name }}</h1>
          <span class="school-phone">{{ sdgPhone }}</span>
        </div>

        <!-- SDG Info Header -->
        <div class="sdg-header">
          <div class="sdg-logo-space">
            <img alt="SDG Logo" class="sdg-logo" src="@/assets/SDG_logo.jpg">
          </div>
          <div class="sdg-info">
            <div class="sdg-name">{{ SDG_INFO.name }}</div>
            <div class="sdg-address">{{ SDG_INFO.addressLine1 }}</div>
            <div class="sdg-address">{{ SDG_INFO.addressLine2 }}</div>
            <div class="sdg-url">{{ SDG_INFO.url }}</div>
          </div>
        </div>

        <!-- Subgroups -->
        <div v-for="subgroup in group.subgroups" :key="subgroup.subgroup" class="staff-subgroup">
          <!-- Subgroup Header -->
          <h2 class="subgroup-title">{{ subgroup.name }}</h2>

          <!-- Use appropriate table variant based on subgroup -->
          <StaffTable :members="subgroup.members" :variant="subgroup.subgroup === 'resp' ? 'sdg-resp' : 'sdg-edu'" />
        </div>
      </div>
    </div>
  </PrintPage>
</template>

<script setup>
  import { SDG_INFO } from '@/config/sdg'
  import StaffTable from './components/StaffTable.vue'
  import PrintPage from './PrintPage.vue'

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
</script>

<style scoped>
/* Staff Section */
.staff-page {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.staff-group {
  margin-bottom: 1.5rem;
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid black;
}

.school-phone {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14pt;
  font-weight: 600;
  color: #000;
}

.staff-subgroup {
  margin-bottom: 1.25rem;
}

/* SDG Header Section */
.sdg-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 1.5rem 0 1.5rem 0;
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
  gap: 0.4rem;
  justify-content: center;
}

.sdg-name {
  font-size: 18pt;
  font-weight: 600;
  color: #000;
  margin-bottom: 0.5rem;
}

.sdg-address {
  font-size: 11pt;
  color: #000;
  line-height: 1.4;
}

.sdg-phone {
  font-size: 12pt;
  font-weight: 600;
  color: #000;
}

.sdg-url {
  font-size: 10pt;
  color: #000;
  font-style: italic;
}
</style>
