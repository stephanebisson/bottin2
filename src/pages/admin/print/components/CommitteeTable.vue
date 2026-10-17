<template>
  <table :class="compact ? 'committee-table-compact' : 'committee-table'">
    <tbody>
      <!-- With role grouping -->
      <template v-if="groupByRole">
        <template v-for="roleGroup in roleGroups" :key="roleGroup.role">
          <!-- Role header row -->
          <tr class="role-header-row">
            <td class="role-header-cell" colspan="3">
              {{ getRoleDisplay(roleGroup.role || 'Membre', roleGroup.members.length) }}
            </td>
          </tr>
          <!-- Member rows -->
          <tr v-for="member in roleGroup.members" :key="member.memberId" class="member-row">
            <td class="member-name-cell">
              {{ member.fullName }}
            </td>

            <td class="phone-cell">
              {{ formatPhoneForDisplay(member.phone) || '' }}
            </td>

            <td class="email-cell">
              <PrintEmail :email="member.email || ''" />
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
            {{ formatPhoneForDisplay(member.phone) || '' }}
          </td>

          <td class="email-cell">
            <PrintEmail :email="member.email || ''" />
          </td>
        </tr>
      </template>
    </tbody>
  </table>
</template>

<script setup>
  import { getRoleDisplay } from '@/utils/committeeRoleHelpers'
  import { formatPhoneForDisplay } from '@/utils/phoneFormatter'
  import PrintEmail from './PrintEmail.vue'

  defineProps({
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

</script>

<style scoped>
/* Full Committee Table */
.committee-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 9.5pt;
  line-height: 1.2;
}

.committee-table tbody tr {
  border-bottom: none;
}

.committee-table td {
  padding: 0.25rem 0.35rem;
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
  font-size: 9.5pt;
  color: #000;
  padding: 0.25rem 0.35rem !important;
}

/* Member rows */
.member-row {
  border-bottom: none;
}

.member-name-cell {
  width: 38%;
  font-size: 9.5pt;
  line-height: 1.2;
}

.phone-cell {
  width: 20%;
  white-space: nowrap;
}

.email-cell {
  width: 42%;
  word-break: break-word;
}

/* Compact Committee Table */
.committee-table-compact {
  width: 100%;
  border-collapse: collapse;
  font-size: 9pt;
  margin-bottom: 0.35rem;
}

.committee-table-compact tbody tr {
  border-bottom: none;
}

.committee-table-compact td {
  padding: 0.25rem 0.35rem;
  vertical-align: top;
}

.member-bold {
  font-weight: 700;
}
</style>
