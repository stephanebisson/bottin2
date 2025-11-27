<template>
  <!-- EF Staff: 3 columns (Title, Name, Email) -->
  <table v-if="variant === 'ef'" class="staff-table">
    <tbody>
      <tr v-for="member in members" :key="member.id">
        <td class="staff-title-cell">{{ member.title || '' }}</td>
        <td class="staff-name-cell">{{ member.first_name }} {{ member.last_name }}</td>
        <td class="staff-email-cell">{{ member.email || '' }}</td>
      </tr>
    </tbody>
  </table>

  <!-- SDG Responsables: 3 columns (Name/Title, Phone, Email) -->
  <table v-else-if="variant === 'sdg-resp'" class="staff-table-sdg">
    <tbody>
      <tr v-for="member in members" :key="member.id">
        <td class="sdg-name-title-cell">
          <div class="sdg-staff-name">{{ member.first_name }} {{ member.last_name }}</div>
          <div v-if="member.title" class="sdg-staff-title">{{ member.title }}</div>
        </td>
        <td class="sdg-phone-cell">{{ formatPhoneForDisplay(member.phone) || '' }}</td>
        <td class="sdg-email-cell">{{ member.email || '' }}</td>
      </tr>
    </tbody>
  </table>

  <!-- SDG Éducateurs: 2 columns (Name, Title) -->
  <table v-else-if="variant === 'sdg-edu'" class="staff-table-sdg-edu">
    <tbody>
      <tr v-for="member in members" :key="member.id">
        <td class="sdg-edu-name-cell">{{ member.first_name }} {{ member.last_name }}</td>
        <td class="sdg-edu-title-cell">{{ member.title || '' }}</td>
      </tr>
    </tbody>
  </table>
</template>

<script setup>
  import { formatPhoneForDisplay } from '@/utils/phoneFormatter'

  const props = defineProps({
    members: {
      type: Array,
      required: true,
    },
    variant: {
      type: String,
      required: true,
      validator: (value) => ['ef', 'sdg-resp', 'sdg-edu'].includes(value),
    },
  })

</script>

<style scoped>
/* EF Staff Table */
.staff-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 9pt;
  margin-bottom: 0.75rem;
}

.staff-table tbody tr {
  border-bottom: 1px solid #ddd;
}

.staff-table tbody tr:last-child {
  border-bottom: none;
}

.staff-table td {
  padding: 0.35rem 0.5rem;
  vertical-align: top;
}

.staff-title-cell {
  width: 30%;
  color: #000;
  font-style: italic;
}

.staff-name-cell {
  width: 30%;
  font-weight: 600;
}

.staff-email-cell {
  width: 40%;
  word-break: break-word;
}

/* SDG Staff Table - Different Layout */
.staff-table-sdg {
  width: 100%;
  border-collapse: collapse;
  font-size: 9pt;
  margin-bottom: 0.75rem;
}

.staff-table-sdg tbody tr {
  border-bottom: 1px solid #ddd;
}

.staff-table-sdg tbody tr:last-child {
  border-bottom: none;
}

.staff-table-sdg td {
  padding: 0.35rem 0.5rem;
  vertical-align: top;
}

.sdg-name-title-cell {
  width: 40%;
}

.sdg-staff-name {
  font-weight: 600;
  font-size: 10pt;
  margin-bottom: 0.1rem;
}

.sdg-staff-title {
  font-size: 9pt;
  color: #000;
  font-style: italic;
}

.sdg-phone-cell {
  width: 30%;
}

.sdg-email-cell {
  width: 30%;
  word-break: break-word;
}

/* SDG Éducateurs Table - 2 Column Layout */
.staff-table-sdg-edu {
  width: 100%;
  border-collapse: collapse;
  font-size: 9pt;
  margin-bottom: 0.75rem;
}

.staff-table-sdg-edu tbody tr {
  border-bottom: 1px solid #ddd;
}

.staff-table-sdg-edu tbody tr:last-child {
  border-bottom: none;
}

.staff-table-sdg-edu td {
  padding: 0.35rem 0.5rem;
  vertical-align: top;
}

.sdg-edu-name-cell {
  width: 50%;
  font-weight: 600;
}

.sdg-edu-title-cell {
  width: 50%;
  color: #000;
  font-style: italic;
}
</style>
