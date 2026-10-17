<template>
  <div class="family">
    <!-- Students in this family -->
    <div class="family-students">
      <div v-for="student in family.students" :key="student.id" class="family-student-row">
        <div class="family-student-left">
          <div class="student-name">{{ student.last_name }}, {{ student.first_name }}</div>
        </div>

        <div class="family-student-right">
          {{ student.teacherName }}{{ student.level ? ', ' + formatGradeLevel(student.level, 'fr') : '' }}
        </div>
      </div>
    </div>

    <!-- Parents -->
    <div class="family-parents">
      <div v-if="family.parent1" class="family-parent">
        <div class="parent-name">{{ family.parent1.fullName }}</div>

        <div class="parent-contact">
          <span v-if="family.parent1.email" class="parent-email"><PrintEmail :email="family.parent1.email" /></span>
          <span v-if="family.parent1.phone" class="parent-phone">{{ formatPhoneForDisplay(family.parent1.phone) }}</span>
          <span v-if="formatAddress(family.parent1)" class="parent-address">{{ formatAddress(family.parent1) }}</span>
        </div>
      </div>

      <div v-if="family.parent2" class="family-parent">
        <div class="parent-name">{{ family.parent2.fullName }}</div>

        <div class="parent-contact">
          <span v-if="family.parent2.email" class="parent-email"><PrintEmail :email="family.parent2.email" /></span>
          <span v-if="family.parent2.phone" class="parent-phone">{{ formatPhoneForDisplay(family.parent2.phone) }}</span>
          <span v-if="formatAddress(family.parent2)" class="parent-address">{{ formatAddress(family.parent2) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { formatGradeLevel } from '@/utils/gradeFormatter.js'
  import { formatPhoneForDisplay } from '@/utils/phoneFormatter'
  import { formatPostalCodeForDisplay } from '@/utils/postalCodeFormatter'
  import PrintEmail from './PrintEmail.vue'

  defineProps({
    family: {
      type: Object,
      required: true,
    },
  })

  // Helper: Format address
  function formatAddress (parent) {
    if (!parent) return ''

    const addressParts = []

    if (parent.address) addressParts.push(parent.address)
    if (parent.city) addressParts.push(parent.city)
    // Non-breaking space: a postal code never splits across lines
    if (parent.postal_code) addressParts.push(formatPostalCodeForDisplay(parent.postal_code).replace(' ', '\u00A0'))

    return addressParts.length > 0 ? addressParts.join(', ') : ''
  }

</script>

<style scoped>
/* Natural height: FamiliesPages fills each page with as many families as fit */
.family {
  display: flex;
  flex-direction: column;
  padding: 0.5rem 0;
  border-top: 1px solid #ddd;
}

.family-students {
  font-size: var(--print-size-contact);
  margin-bottom: 0.35rem;
  line-height: 1.4;
}

.family-student-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.15rem;
}

.family-student-left {
  flex: 0 1 auto;
  display: flex;
  align-items: baseline;
  gap: 0.2rem;
}

.student-name {
  font-size: var(--print-size-heading);
  font-weight: bold;
  margin: 0;
  padding: 0;
  display: inline;
}

.family-student-right {
  flex: 0 0 auto;
  text-align: right;
  font-size: var(--print-size-detail);
  color: #000;
  margin-left: 0.7rem;
}

.family-parents {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
  margin-left: 0.7rem;
}

.family-parent {
  font-size: var(--print-size-contact);
}

.parent-name {
  font-weight: 600;
  margin-bottom: 0.1rem;
  font-size: var(--print-size-contact);
}

.parent-contact span {
  display: block;
  line-height: 1.3;
}

.parent-email {
  color: #000;
  font-size: var(--print-size-contact);
}

.parent-phone {
  color: #000;
  font-size: var(--print-size-contact);
}

.parent-address {
  color: #000;
  font-size: var(--print-size-detail);
}
</style>
