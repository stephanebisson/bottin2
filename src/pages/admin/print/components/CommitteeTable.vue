<template>
  <table :class="compact ? 'committee-table-compact' : 'committee-table'">
    <tbody>
      <!-- With role grouping -->
      <template v-if="groupByRole">
        <template v-for="roleGroup in roleGroups" :key="roleGroup.role">
          <!-- Role header row -->
          <tr class="role-header-row">
            <td class="role-header-cell" colspan="3">
              {{ roleGroup.role || 'Membre' }}
            </td>
          </tr>
          <!-- Member rows -->
          <tr v-for="member in roleGroup.members" :key="member.memberId" class="member-row">
            <td class="member-name-cell">
              {{ member.fullName }}
            </td>
            <td class="phone-cell">
              {{ formatPhone(member.phone) || '' }}
            </td>
            <td class="email-cell">
              {{ member.email || '' }}
            </td>
          </tr>
        </template>
      </template>

      <!-- Without role grouping (flat list, bold porte-parole) -->
      <template v-else>
        <tr v-for="member in members" :key="member.memberId" class="member-row" :class="{ 'member-bold': member.isPorteParole }">
          <td class="member-name-cell">
            {{ member.fullName }}
          </td>
          <td class="phone-cell">
            {{ formatPhone(member.phone) || '' }}
          </td>
          <td class="email-cell">
            {{ member.email || '' }}
          </td>
        </tr>
      </template>
    </tbody>
  </table>
</template>

<script setup>
  const props = defineProps({
    members: {
      type: Array,
      default: () => [],
    },
    roleGroups: {
      type: Array,
      default: () => [],
    },
    groupByRole: {
      type: Boolean,
      default: false,
    },
    compact: {
      type: Boolean,
      default: false,
    },
  })

  // Helper: Format phone number
  function formatPhone (phone) {
    if (!phone) return ''

    const cleaned = phone.toString().replace(/\D/g, '')

    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }

    return phone
  }
</script>

<style scoped>
/* Full Committee Table */
.committee-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10pt;
  line-height: 1.2;
}

.committee-table tbody tr {
  border-bottom: none;
}

.committee-table td {
  padding: 0.35rem 0.5rem;
  vertical-align: top;
}

/* Role header row */
.role-header-row {
  border-top: 1px solid #ddd;
}

.role-header-row:first-child {
  border-top: none;
}

.role-header-cell {
  font-weight: 600;
  font-size: 10pt;
  color: #000;
  padding: 0.35rem 0.5rem !important;
}

/* Member rows */
.member-row {
  border-bottom: none;
}

.member-name-cell {
  width: 40%;
  font-size: 10pt;
  line-height: 1.2;
}

.phone-cell {
  width: 25%;
}

.email-cell {
  width: 35%;
  word-break: break-word;
}

/* Compact Committee Table */
.committee-table-compact {
  width: 100%;
  border-collapse: collapse;
  font-size: 9pt;
  margin-bottom: 0.5rem;
}

.committee-table-compact tbody tr {
  border-bottom: none;
}

.committee-table-compact td {
  padding: 0.35rem 0.5rem;
  vertical-align: top;
}

.member-bold {
  font-weight: 700;
}
</style>
