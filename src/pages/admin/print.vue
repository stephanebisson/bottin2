<template>
  <div v-if="!isAuthorized" class="access-denied">
    <div class="access-denied-content">
      <h1>Accès refusé</h1>
      <p>Vous devez être administrateur pour accéder à cette page.</p>
    </div>
  </div>

  <div v-else-if="loading" class="loading">
    <div class="loading-content">
      <p>Chargement des données du bottin...</p>
    </div>
  </div>

  <div v-else class="print-directory">
    <!-- Title Page -->
    <PrintPage :first-page="true" :no-footer="true">
      <div class="title-page">
        <div class="title-box">
          <div class="title-content">
            <h1 class="main-title">
              <div class="title-word">Le</div>
              <div class="title-word">Gros</div>
              <div class="title-word">Bottin</div>
            </h1>
            <h2 class="subtitle">2025 2026</h2>
          </div>
          <div class="title-logo">
            <img alt="Étoile filante Logo" src="@/assets/EF_logo.jpg">
          </div>
        </div>
      </div>
    </PrintPage>

    <!-- Table of Contents -->
    <PrintPage>
      <div class="toc">
        <h1 class="section-title">Table des matières</h1>
        <div class="toc-items">
          <div class="toc-item">
            <span class="toc-label">Personnel</span>
            <span class="toc-dots" />
            <span class="toc-page" data-section="staff">___</span>
          </div>
          <div class="toc-item">
            <span class="toc-label">Comités</span>
            <span class="toc-dots" />
            <span class="toc-page" data-section="committees">___</span>
          </div>
          <div class="toc-item">
            <span class="toc-label">Classes</span>
            <span class="toc-dots" />
            <span class="toc-page" data-section="classes">___</span>
          </div>
          <div class="toc-item">
            <span class="toc-label">Familles</span>
            <span class="toc-dots" />
            <span class="toc-page" data-section="families">___</span>
          </div>
          <div class="toc-item">
            <span class="toc-label">Annexes</span>
            <span class="toc-dots" />
            <span class="toc-page" data-section="appendix">___</span>
          </div>
        </div>
      </div>
    </PrintPage>

    <!-- Staff Section - EF -->
    <PrintPage id="section-staff">
      <div class="staff-page">
        <div v-for="group in groupedStaff.filter(g => g.group === 'EF')" :key="group.group" class="staff-group">
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
            <table class="staff-table">
              <tbody>
                <tr v-for="member in subgroup.members" :key="member.id">
                  <td class="staff-title-cell">{{ member.title || '' }}</td>
                  <td class="staff-name-cell">{{ member.first_name }} {{ member.last_name }}</td>
                  <td class="staff-email-cell">{{ member.email || '' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PrintPage>

    <!-- Staff Section - SDG -->
    <PrintPage>
      <div class="staff-page">
        <div v-for="group in groupedStaff.filter(g => g.group === 'SDG')" :key="group.group" class="staff-group">
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

            <!-- Responsables: 3 columns (Name/Title, Phone, Email) -->
            <table v-if="subgroup.subgroup === 'resp'" class="staff-table-sdg">
              <tbody>
                <tr v-for="member in subgroup.members" :key="member.id">
                  <td class="sdg-name-title-cell">
                    <div class="sdg-staff-name">{{ member.first_name }} {{ member.last_name }}</div>
                    <div v-if="member.title" class="sdg-staff-title">{{ member.title }}</div>
                  </td>
                  <td class="sdg-phone-cell">{{ formatPhone(member.phone) || '' }}</td>
                  <td class="sdg-email-cell">{{ member.email || '' }}</td>
                </tr>
              </tbody>
            </table>

            <!-- Éducateurs: 2 columns (Name, Title) -->
            <table v-else-if="subgroup.subgroup === 'edu'" class="staff-table-sdg-edu">
              <tbody>
                <tr v-for="member in subgroup.members" :key="member.id">
                  <td class="sdg-edu-name-cell">{{ member.first_name }} {{ member.last_name }}</td>
                  <td class="sdg-edu-title-cell">{{ member.title || '' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PrintPage>

    <!-- Committees Section -->
    <!-- Conseil d'établissement - Full Page -->
    <PrintPage v-if="conseilEtablissement" id="section-committees">
      <div class="committee-full-page">
        <!-- Committee Header -->
        <div class="committee-header">
          <h1 class="committee-title">{{ conseilEtablissement.name }}</h1>
          <span v-if="conseilEtablissement.email" class="committee-email">{{ conseilEtablissement.email }}</span>
        </div>

        <!-- Parent Members Section -->
        <div v-if="conseilEtablissement.parentMembers.length > 0" class="committee-section">
          <h2 class="section-subtitle">Parents</h2>
          <table class="committee-table">
            <tbody>
              <template v-for="roleGroup in groupMembersByRole(conseilEtablissement.parentMembers)" :key="roleGroup.role">
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
            </tbody>
          </table>
        </div>

        <!-- Staff Members Section -->
        <div v-if="conseilEtablissement.staffMembers.length > 0" class="committee-section">
          <h2 class="section-subtitle">Personnel</h2>
          <table class="committee-table">
            <tbody>
              <template v-for="roleGroup in groupMembersByRole(conseilEtablissement.staffMembers)" :key="roleGroup.role">
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
            </tbody>
          </table>
        </div>
      </div>
    </PrintPage>

    <!-- Fondation - Full Page -->
    <PrintPage v-if="fondation">
      <div class="committee-full-page">
        <!-- Committee Header -->
        <div class="committee-header">
          <h1 class="committee-title">{{ fondation.name }}</h1>
          <span v-if="fondation.url" class="committee-url">{{ fondation.url }}</span>
          <span v-else-if="fondation.email" class="committee-email">{{ fondation.email }}</span>
        </div>

        <!-- Members (no parent/staff grouping) -->
        <div v-if="fondation.enrichedMembers.length > 0" class="committee-section">
          <table class="committee-table">
            <tbody>
              <template v-for="roleGroup in groupMembersByRole(fondation.enrichedMembers)" :key="roleGroup.role">
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
            </tbody>
          </table>
        </div>
      </div>
    </PrintPage>

    <!-- Other Committees - Page 1 -->
    <PrintPage>
      <div class="committees-section">
        <h1 class="section-title">Comités</h1>

        <!-- En lien avec le projet éducatif -->
        <h2 class="committee-category-title">En lien avec le projet éducatif</h2>
        <div v-for="committee in getCommitteesByNames(['Admissions', 'CAMPÉR'])" :key="committee.id" class="committee">
          <!-- Committee Name and Email/URL -->
          <div class="committee-header-inline">
            <h3 class="committee-name">
              {{ committee.name }}
              <span v-if="committee.description" class="committee-description">({{ committee.description }})</span>
            </h3>
            <span v-if="committee.url" class="committee-url-inline">{{ committee.url }}</span>
            <span v-else-if="committee.email" class="committee-email-inline">{{ committee.email }}</span>
          </div>

          <!-- Members (no parent/staff grouping, no role grouping) -->
          <div v-if="committee.enrichedMembers.length > 0" class="committee-section-compact">
            <table class="committee-table-compact">
              <tbody>
                <!-- Member rows (no role grouping, bold porte-parole) -->
                <tr v-for="member in committee.enrichedMembers" :key="member.memberId" class="member-row" :class="{ 'member-bold': member.isPorteParole }">
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
              </tbody>
            </table>
          </div>
        </div>

        <!-- Communications -->
        <h2 class="committee-category-title">Communications</h2>
        <div v-for="committee in getCommitteesByNames(['Bottin', 'Groupe Facebook', 'OPP'])" :key="committee.id" class="committee">
          <!-- Committee Name and Email/URL -->
          <div class="committee-header-inline">
            <h3 class="committee-name">
              {{ committee.name }}
              <span v-if="committee.description" class="committee-description">({{ committee.description }})</span>
            </h3>
            <span v-if="committee.url" class="committee-url-inline">{{ committee.url }}</span>
            <span v-else-if="committee.email" class="committee-email-inline">{{ committee.email }}</span>
          </div>

          <!-- Members (no parent/staff grouping, no role grouping) -->
          <div v-if="committee.enrichedMembers.length > 0" class="committee-section-compact">
            <table class="committee-table-compact">
              <tbody>
                <!-- Member rows (no role grouping, bold porte-parole) -->
                <tr v-for="member in committee.enrichedMembers" :key="member.memberId" class="member-row" :class="{ 'member-bold': member.isPorteParole }">
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
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PrintPage>

    <!-- Other Committees - Page 2 -->
    <PrintPage>
      <div class="committees-section">
        <!-- Activités à l'école -->
        <h2 class="committee-category-title">Activités à l'école</h2>
        <div v-for="committee in getCommitteesByNames(['Ateliers', 'Bazar', 'Bibliothèque'])" :key="committee.id" class="committee">
          <!-- Committee Name and Email/URL -->
          <div class="committee-header-inline">
            <h3 class="committee-name">
              {{ committee.name }}
              <span v-if="committee.description" class="committee-description">({{ committee.description }})</span>
            </h3>
            <span v-if="committee.url" class="committee-url-inline">{{ committee.url }}</span>
            <span v-else-if="committee.email" class="committee-email-inline">{{ committee.email }}</span>
          </div>

          <!-- Members (no parent/staff grouping, no role grouping) -->
          <div v-if="committee.enrichedMembers.length > 0" class="committee-section-compact">
            <table class="committee-table-compact">
              <tbody>
                <!-- Member rows (no role grouping, bold porte-parole) -->
                <tr v-for="member in committee.enrichedMembers" :key="member.memberId" class="member-row" :class="{ 'member-bold': member.isPorteParole }">
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
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PrintPage>

    <!-- Other Committees - Page 3 -->
    <PrintPage>
      <div class="committees-section">
        <div v-for="committee in getCommitteesByNames(['JEDI', 'FEVES', 'Comité des usagers SDG'])" :key="committee.id" class="committee">
          <!-- Committee Name and Email/URL -->
          <div class="committee-header-inline">
            <h3 class="committee-name">
              {{ committee.name }}
              <span v-if="committee.description" class="committee-description">({{ committee.description }})</span>
            </h3>
            <span v-if="committee.url" class="committee-url-inline">{{ committee.url }}</span>
            <span v-else-if="committee.email" class="committee-email-inline">{{ committee.email }}</span>
          </div>

          <!-- Members (no parent/staff grouping, no role grouping) -->
          <div v-if="committee.enrichedMembers.length > 0" class="committee-section-compact">
            <table class="committee-table-compact">
              <tbody>
                <!-- Member rows (no role grouping, bold porte-parole) -->
                <tr v-for="member in committee.enrichedMembers" :key="member.memberId" class="member-row" :class="{ 'member-bold': member.isPorteParole }">
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
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PrintPage>

    <!-- Classes Section - Page 1: 1e-2e -->
    <PrintPage id="section-classes">
      <template #header>
        <div class="class-page-header">
          <h1 class="section-title">Liste des classes</h1>
          <span class="class-level-badge">1<sup>e</sup>-2<sup>e</sup></span>
        </div>
      </template>

      <div class="classes-content">
        <div v-for="classItem in getClassesByLevelRange([1, 2])" :key="classItem.id" class="class-block">
          <!-- Class Name -->
          <h2 class="class-title">{{ classItem.className }}</h2>

          <!-- Teacher -->
          <div v-if="classItem.teacher" class="class-info-line">
            <strong>Enseignant :</strong> {{ getTeacherName(classItem.teacher) }}
          </div>

          <!-- Parent Reps -->
          <div v-if="classItem.parent_rep_1 || classItem.parent_rep_2" class="class-parent-reps-section">
            <strong>Représentants des parents :</strong>
            <div class="parent-reps-grid">
              <div v-if="classItem.parent_rep_1" class="parent-rep-card">
                <div class="parent-rep-name">{{ getParentName(classItem.parent_rep_1) }}</div>
                <div v-if="getParentData(classItem.parent_rep_1)" class="parent-rep-details">
                  <div v-if="getParentData(classItem.parent_rep_1).phone">{{ formatPhone(getParentData(classItem.parent_rep_1).phone) }}</div>
                  <div v-if="getParentData(classItem.parent_rep_1).email">{{ getParentData(classItem.parent_rep_1).email }}</div>
                </div>
              </div>
              <div v-if="classItem.parent_rep_2" class="parent-rep-card">
                <div class="parent-rep-name">{{ getParentName(classItem.parent_rep_2) }}</div>
                <div v-if="getParentData(classItem.parent_rep_2)" class="parent-rep-details">
                  <div v-if="getParentData(classItem.parent_rep_2).phone">{{ formatPhone(getParentData(classItem.parent_rep_2).phone) }}</div>
                  <div v-if="getParentData(classItem.parent_rep_2).email">{{ getParentData(classItem.parent_rep_2).email }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Students in 2 columns -->
          <div class="class-students-section">
            <div class="students-two-columns">
              <div v-for="student in getClassStudents(classItem.classLetter)" :key="student.id" class="student-item" :class="{ 'student-rep': isStudentRep(student.id, classItem) }">
                {{ student.first_name }} {{ student.last_name }}<template v-if="isStudentRep(student.id, classItem)"> (R)</template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PrintPage>

    <!-- Classes Section - Page 2: 3e-4e -->
    <PrintPage>
      <template #header>
        <div class="class-page-header">
          <h1 class="section-title">Liste des classes</h1>
          <span class="class-level-badge">3<sup>e</sup>-4<sup>e</sup></span>
        </div>
      </template>

      <div class="classes-content">
        <div v-for="classItem in getClassesByLevelRange([3, 4])" :key="classItem.id" class="class-block">
          <!-- Class Name -->
          <h2 class="class-title">{{ classItem.className }}</h2>

          <!-- Teacher -->
          <div v-if="classItem.teacher" class="class-info-line">
            <strong>Enseignant :</strong> {{ getTeacherName(classItem.teacher) }}
          </div>

          <!-- Parent Reps -->
          <div v-if="classItem.parent_rep_1 || classItem.parent_rep_2" class="class-parent-reps-section">
            <strong>Représentants des parents :</strong>
            <div class="parent-reps-grid">
              <div v-if="classItem.parent_rep_1" class="parent-rep-card">
                <div class="parent-rep-name">{{ getParentName(classItem.parent_rep_1) }}</div>
                <div v-if="getParentData(classItem.parent_rep_1)" class="parent-rep-details">
                  <div v-if="getParentData(classItem.parent_rep_1).phone">{{ formatPhone(getParentData(classItem.parent_rep_1).phone) }}</div>
                  <div v-if="getParentData(classItem.parent_rep_1).email">{{ getParentData(classItem.parent_rep_1).email }}</div>
                </div>
              </div>
              <div v-if="classItem.parent_rep_2" class="parent-rep-card">
                <div class="parent-rep-name">{{ getParentName(classItem.parent_rep_2) }}</div>
                <div v-if="getParentData(classItem.parent_rep_2)" class="parent-rep-details">
                  <div v-if="getParentData(classItem.parent_rep_2).phone">{{ formatPhone(getParentData(classItem.parent_rep_2).phone) }}</div>
                  <div v-if="getParentData(classItem.parent_rep_2).email">{{ getParentData(classItem.parent_rep_2).email }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Students in 2 columns -->
          <div class="class-students-section">
            <div class="students-two-columns">
              <div v-for="student in getClassStudents(classItem.classLetter)" :key="student.id" class="student-item" :class="{ 'student-rep': isStudentRep(student.id, classItem) }">
                {{ student.first_name }} {{ student.last_name }}<template v-if="isStudentRep(student.id, classItem)"> (R)</template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PrintPage>

    <!-- Classes Section - Page 3: 5e-6e -->
    <PrintPage>
      <template #header>
        <div class="class-page-header">
          <h1 class="section-title">Liste des classes</h1>
          <span class="class-level-badge">5<sup>e</sup>-6<sup>e</sup></span>
        </div>
      </template>

      <div class="classes-content">
        <div v-for="classItem in getClassesByLevelRange([5, 6])" :key="classItem.id" class="class-block">
          <!-- Class Name -->
          <h2 class="class-title">{{ classItem.className }}</h2>

          <!-- Teacher -->
          <div v-if="classItem.teacher" class="class-info-line">
            <strong>Enseignant :</strong> {{ getTeacherName(classItem.teacher) }}
          </div>

          <!-- Parent Reps -->
          <div v-if="classItem.parent_rep_1 || classItem.parent_rep_2" class="class-parent-reps-section">
            <strong>Représentants des parents :</strong>
            <div class="parent-reps-grid">
              <div v-if="classItem.parent_rep_1" class="parent-rep-card">
                <div class="parent-rep-name">{{ getParentName(classItem.parent_rep_1) }}</div>
                <div v-if="getParentData(classItem.parent_rep_1)" class="parent-rep-details">
                  <div v-if="getParentData(classItem.parent_rep_1).phone">{{ formatPhone(getParentData(classItem.parent_rep_1).phone) }}</div>
                  <div v-if="getParentData(classItem.parent_rep_1).email">{{ getParentData(classItem.parent_rep_1).email }}</div>
                </div>
              </div>
              <div v-if="classItem.parent_rep_2" class="parent-rep-card">
                <div class="parent-rep-name">{{ getParentName(classItem.parent_rep_2) }}</div>
                <div v-if="getParentData(classItem.parent_rep_2)" class="parent-rep-details">
                  <div v-if="getParentData(classItem.parent_rep_2).phone">{{ formatPhone(getParentData(classItem.parent_rep_2).phone) }}</div>
                  <div v-if="getParentData(classItem.parent_rep_2).email">{{ getParentData(classItem.parent_rep_2).email }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Students in 2 columns -->
          <div class="class-students-section">
            <div class="students-two-columns">
              <div v-for="student in getClassStudents(classItem.classLetter)" :key="student.id" class="student-item" :class="{ 'student-rep': isStudentRep(student.id, classItem) }">
                {{ student.first_name }} {{ student.last_name }}<template v-if="isStudentRep(student.id, classItem)"> (R)</template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PrintPage>

    <!-- Families Section - Dynamic Pages -->
    <PrintPage v-for="(page, pageIndex) in paginatedFamilies" :id="page.isFirstPage ? 'section-families' : undefined" :key="`family-page-${pageIndex}`">
      <template #header>
        <!-- Section title only on first page -->
        <h1 v-if="page.isFirstPage" class="section-title">Liste alphabétique des enfants</h1>

        <!-- Letter range header -->
        <h1 class="families-letter-header">{{ page.letterRange }}</h1>
      </template>

      <!-- 4 families per page, each taking 25% height -->
      <div v-for="(family, index) in page.families" :key="`family-${pageIndex}-${index}`" class="family">
        <!-- Students in this family -->
        <div class="family-students">
          <span v-for="(student, sIndex) in family.students" :key="student.id">
            <strong>{{ student.last_name }}, {{ student.first_name }}</strong>
            <span class="student-class">({{ student.className }}{{ student.level ? ', ' + student.level : '' }})</span><template v-if="sIndex < family.students.length - 1"> · </template>
          </span>
        </div>

        <!-- Parents -->
        <div class="family-parents">
          <div v-if="family.parent1" class="family-parent">
            <div class="parent-name">{{ family.parent1.fullName }}</div>
            <div class="parent-contact">
              <span v-if="family.parent1.email" class="parent-email">{{ family.parent1.email }}</span>
              <span v-if="family.parent1.phone" class="parent-phone">{{ formatPhone(family.parent1.phone) }}</span>
              <span v-if="formatAddress(family.parent1)" class="parent-address">{{ formatAddress(family.parent1) }}</span>
            </div>
          </div>
          <div v-if="family.parent2" class="family-parent">
            <div class="parent-name">{{ family.parent2.fullName }}</div>
            <div class="parent-contact">
              <span v-if="family.parent2.email" class="parent-email">{{ family.parent2.email }}</span>
              <span v-if="family.parent2.phone" class="parent-phone">{{ formatPhone(family.parent2.phone) }}</span>
              <span v-if="formatAddress(family.parent2)" class="parent-address">{{ formatAddress(family.parent2) }}</span>
            </div>
          </div>
        </div>
      </div>
    </PrintPage>

    <!-- Appendixes -->
    <PrintPage id="section-appendix">
      <div class="appendix-section">
        <h1 class="section-title">Annexe A</h1>
        <div class="placeholder-section">
          <p class="placeholder-text">
            [À REMPLIR : Contenu de l'annexe A]
          </p>
        </div>
      </div>
    </PrintPage>

    <PrintPage>
      <div class="appendix-section">
        <h1 class="section-title">Annexe B</h1>
        <div class="placeholder-section">
          <p class="placeholder-text">
            [À REMPLIR : Contenu de l'annexe B]
          </p>
        </div>
      </div>
    </PrintPage>

    <!-- Back Page -->
    <PrintPage :no-footer="true">
      <div class="back-page">
        <div class="placeholder-section">
          <h1>PAGE ARRIÈRE</h1>
          <p class="placeholder-text">
            [À REMPLIR : Informations similaires à la page titre]
          </p>
        </div>
      </div>
    </PrintPage>
  </div>
</template>

<script setup>
  import { computed, onMounted, ref } from 'vue'
  import { SCHOOL_LOCATION } from '@/config/school'
  import { SDG_INFO } from '@/config/sdg'
  import { GROUP_DISPLAY_NAMES, GROUP_SUBGROUP_MAPPING, STAFF_GROUPS, SUBGROUP_DISPLAY_NAMES } from '@/config/staffGroups'
  import { useAuthStore } from '@/stores/auth'
  import { useFirebaseDataStore } from '@/stores/firebaseData'

  // ============================================================================
  // TABLE OF CONTENTS PAGE NUMBERS
  // ============================================================================
  // Update these numbers after doing a print preview to see actual page numbers
  const TOC_PAGE_NUMBERS = {
    staff: 3, // Personnel section
    committees: 5, // Comités section
    classes: 6, // Classes section
    families: 8, // Familles section
    appendix: 15, // Annexes section
  }
  // ============================================================================

  // Store references
  const authStore = useAuthStore()
  const firebaseStore = useFirebaseDataStore()

  // State
  const isAuthorized = ref(false)
  const loading = ref(true)

  // Check admin status
  async function checkAdminStatus () {
    if (!authStore.isAuthenticated || !authStore.user) {
      isAuthorized.value = false
      return
    }

    try {
      const idTokenResult = await authStore.user.getIdTokenResult(true)
      isAuthorized.value = !!idTokenResult.claims.admin
    } catch (error) {
      console.error('Failed to check admin status:', error)
      isAuthorized.value = false
    }
  }

  // Staff grouping (hierarchical: groups contain subgroups)
  const groupedStaff = computed(() => {
    const hierarchicalGroups = []

    // Process each group in the defined order (EF, SDG)
    for (const group of STAFF_GROUPS) {
      const subgroups = GROUP_SUBGROUP_MAPPING[group]
      const groupSubgroups = []

      // Process each subgroup in order
      for (const subgroup of subgroups) {
        // Find staff members for this group/subgroup combination
        const members = firebaseStore.staffDTO.filter(member =>
          member.group === group && member.subgroup === subgroup,
        )

        if (members.length > 0) {
          // Sort members by order field, then alphabetically by last name, first name
          const sortedMembers = members.toSorted((a, b) => {
            // Primary sort: by order field
            const orderA = a.order || 99
            const orderB = b.order || 99
            if (orderA !== orderB) {
              return orderA - orderB
            }
            // Secondary sort: alphabetically by name
            const nameA = `${a.last_name}, ${a.first_name}`.toLowerCase()
            const nameB = `${b.last_name}, ${b.first_name}`.toLowerCase()
            return nameA.localeCompare(nameB)
          })

          groupSubgroups.push({
            subgroup,
            name: SUBGROUP_DISPLAY_NAMES[subgroup] || subgroup,
            members: sortedMembers,
          })
        }
      }

      // Only add group if it has subgroups with members
      if (groupSubgroups.length > 0) {
        hierarchicalGroups.push({
          group,
          name: GROUP_DISPLAY_NAMES[group] || group,
          subgroups: groupSubgroups,
        })
      }
    }

    // Add staff without group/subgroup at the end
    const ungroupedMembers = firebaseStore.staffDTO.filter(member =>
      !member.group || !member.subgroup,
    )

    if (ungroupedMembers.length > 0) {
      hierarchicalGroups.push({
        group: null,
        name: 'Autre Personnel',
        subgroups: [{
          subgroup: null,
          name: 'Autre Personnel',
          members: ungroupedMembers.toSorted((a, b) => {
            const orderA = a.order || 99
            const orderB = b.order || 99
            if (orderA !== orderB) {
              return orderA - orderB
            }
            const nameA = `${a.last_name}, ${a.first_name}`.toLowerCase()
            const nameB = `${b.last_name}, ${b.first_name}`.toLowerCase()
            return nameA.localeCompare(nameB)
          }),
        }],
      })
    }

    return hierarchicalGroups
  })

  // Committees with enriched member information
  const enrichedCommittees = computed(() => {
    return firebaseStore.committeesDTO.map(committee => {
      // Enrich members with full information from parents and staff
      const enrichedMembers = committee.members
        .map(member => {
          // Look up by memberId (parent/staff document ID)
          if (member.member_type === 'parent') {
            const parentMatch = firebaseStore.parentsDTO.find(p => p.id === member.memberId)
            if (parentMatch) {
              return {
                ...member,
                email: parentMatch.email,
                fullName: parentMatch.fullName,
                phone: parentMatch.phone,
                memberType: 'parent',
                isPorteParole: member.role?.toLowerCase() === 'porte-parole',
              }
            }
          } else if (member.member_type === 'staff') {
            const staffMatch = firebaseStore.staffDTO.find(s => s.id === member.memberId)
            if (staffMatch) {
              return {
                ...member,
                email: staffMatch.email,
                fullName: staffMatch.fullName,
                phone: staffMatch.phone,
                memberType: 'staff',
                isPorteParole: member.role?.toLowerCase() === 'porte-parole',
              }
            }
          }

          // If not found in either collection
          return {
            ...member,
            email: null,
            fullName: `[${member.memberId}]`,
            phone: null,
            memberType: 'unknown',
            isPorteParole: member.role?.toLowerCase() === 'porte-parole',
          }
        })
        .toSorted((a, b) => {
          // First sort by member type (parents first, then staff)
          if (a.memberType !== b.memberType) {
            if (a.memberType === 'parent' && b.memberType === 'staff') return -1
            if (a.memberType === 'staff' && b.memberType === 'parent') return 1
            if (a.memberType === 'unknown') return 1
            if (b.memberType === 'unknown') return -1
          }
          // Then sort by name within the same member type
          return a.fullName.localeCompare(b.fullName)
        })

      // Separate members by type
      const parentMembers = enrichedMembers.filter(member => member.memberType === 'parent')
      const staffMembers = enrichedMembers.filter(member => member.memberType === 'staff')
      const unknownMembers = enrichedMembers.filter(member => member.memberType === 'unknown')

      return {
        ...committee,
        enrichedMembers,
        parentMembers,
        staffMembers,
        unknownMembers,
      }
    }).toSorted((a, b) => a.name.localeCompare(b.name))
  })

  // Conseil d'établissement (special treatment - full page)
  const conseilEtablissement = computed(() => {
    return enrichedCommittees.value.find(c => c.name === "Conseil d'établissement") || null
  })

  // Fondation (special treatment - full page)
  const fondation = computed(() => {
    return enrichedCommittees.value.find(c => c.name === "Fondation") || null
  })

  // Other committees (not Conseil d'établissement or Fondation)
  const otherCommittees = computed(() => {
    return enrichedCommittees.value.filter(c =>
      c.name !== "Conseil d'établissement" && c.name !== "Fondation"
    )
  })

  // Helper: Get committees by names
  function getCommitteesByNames (names) {
    return enrichedCommittees.value.filter(c => names.includes(c.name))
  }

  // Helper: Get classes by level range
  function getClassesByLevelRange (levels) {
    return firebaseStore.classes.filter(classItem => {
      // Get students in this class to determine levels
      const students = firebaseStore.studentsDTO.filter(s => s.className === classItem.classLetter)
      // Check if any student in this class has a level in the specified range
      return students.some(s => levels.includes(Number(s.level)))
    })
  }

  // Helper: Get students for a class (sorted alphabetically)
  function getClassStudents (classLetter) {
    return firebaseStore.studentsDTO
      .filter(s => s.className === classLetter)
      .toSorted((a, b) => {
        const nameA = `${a.first_name} ${a.last_name}`.toLowerCase()
        const nameB = `${b.first_name} ${b.last_name}`.toLowerCase()
        return nameA.localeCompare(nameB)
      })
  }

  // Helper: Check if student is a student rep
  function isStudentRep (studentId, classItem) {
    return classItem.student_rep_1 === studentId || classItem.student_rep_2 === studentId
  }

  // Helper: Group members by role
  function groupMembersByRole (members) {
    // Group members by role
    const grouped = members.reduce((acc, member) => {
      const role = member.role || ''
      if (!acc[role]) {
        acc[role] = []
      }
      acc[role].push(member)
      return acc
    }, {})

    // Convert to array and sort by role name
    return Object.keys(grouped)
      .toSorted()
      .map(role => ({
        role,
        members: grouped[role],
      }))
  }

  // Helper: Get classes taught by a staff member
  function getClassesTaught (staffId) {
    return firebaseStore.classes
      .filter(classItem => classItem.teacher === staffId)
      .map(classItem => classItem.classLetter)
      .toSorted()
  }

  // Helper: Get teacher name
  function getTeacherName (teacherId) {
    const teacher = firebaseStore.staffDTO.find(s => s.id === teacherId)
    return teacher ? teacher.fullName : teacherId
  }

  // Helper: Get parent name
  function getParentName (parentId) {
    const parent = firebaseStore.parentsDTO.find(p => p.id === parentId)
    return parent ? parent.fullName : parentId
  }

  // Helper: Get parent data
  function getParentData (parentId) {
    return firebaseStore.parentsDTO.find(p => p.id === parentId) || null
  }

  // Helper: Get students by level for a class
  function getStudentsByLevel (classLetter) {
    const classStudents = firebaseStore.studentsDTO.filter(student => student.className === classLetter)

    // Group students by level
    const grouped = classStudents.reduce((acc, student) => {
      const level = student.level ? String(student.level) : 'Unknown'
      if (!acc[level]) {
        acc[level] = []
      }
      acc[level].push(student)
      return acc
    }, {})

    // Sort each level's students by name
    for (const level of Object.keys(grouped)) {
      grouped[level].sort((a, b) => {
        const nameA = `${a.first_name} ${a.last_name}`.toLowerCase()
        const nameB = `${b.first_name} ${b.last_name}`.toLowerCase()
        return nameA.localeCompare(nameB)
      })
    }

    // Convert to array and sort by level number
    const sortedLevels = Object.keys(grouped)
      .filter(level => level !== 'Unknown')
      .toSorted((a, b) => Number.parseInt(a) - Number.parseInt(b))
      .map(level => ({
        level,
        students: grouped[level],
      }))

    // Add Unknown level at the end if it exists
    if (grouped['Unknown']) {
      sortedLevels.push({
        level: 'Unknown',
        students: grouped['Unknown'],
      })
    }

    return sortedLevels
  }

  // Helper: Format grade level
  function formatGradeLevel (level) {
    if (!level || level === 'Unknown') return level

    const numLevel = Number(level)

    switch (numLevel) {
      case 1: { return '1ère année' }
      case 2: { return '2ème année' }
      case 3: { return '3ème année' }
      case 4: { return '4ème année' }
      case 5: { return '5ème année' }
      case 6: { return '6ème année' }
      default: { return `${level}ème année` }
    }
  }

  // Family grouping (students grouped by siblings)
  const groupedFamilies = computed(() => {
    const processed = new Set()
    const groups = []

    const sortedStudents = [...firebaseStore.studentsDTO].toSorted((a, b) => {
      const aName = `${a.last_name}, ${a.first_name}`.toLowerCase()
      const bName = `${b.last_name}, ${b.first_name}`.toLowerCase()
      return aName.localeCompare(bName)
    })

    for (const student of sortedStudents) {
      if (processed.has(student.id)) continue

      const siblings = sortedStudents.filter(s =>
        !processed.has(s.id) && (
          (student.parent1_id && (s.parent1_id === student.parent1_id || s.parent2_id === student.parent1_id))
          || (student.parent2_id && (s.parent1_id === student.parent2_id || s.parent2_id === student.parent2_id))
        ),
      )

      if (siblings.length === 0) {
        groups.push({
          students: [student],
          parent1: getStudentParent(student, 1),
          parent2: getStudentParent(student, 2),
        })
        processed.add(student.id)
      } else {
        siblings.sort((a, b) => {
          const aName = `${a.last_name}, ${a.first_name}`.toLowerCase()
          const bName = `${b.last_name}, ${b.first_name}`.toLowerCase()
          return aName.localeCompare(bName)
        })

        groups.push({
          students: siblings,
          parent1: getStudentParent(siblings[0], 1),
          parent2: getStudentParent(siblings[0], 2),
        })

        for (const sibling of siblings) processed.add(sibling.id)
      }
    }

    return groups
  })

  // Paginated families (4 families per page with letter range headers)
  const paginatedFamilies = computed(() => {
    const families = groupedFamilies.value
    const pages = []

    for (let i = 0; i < families.length; i += 4) {
      const pageFamilies = families.slice(i, i + 4)

      // Get all unique first letters from student last names on this page
      const letters = new Set()
      for (const family of pageFamilies) {
        for (const student of family.students) {
          if (student.last_name) {
            letters.add(student.last_name.charAt(0).toUpperCase())
          }
        }
      }

      // Sort letters alphabetically and join with hyphens
      const letterRange = [...letters].toSorted().join('-')

      pages.push({
        families: pageFamilies,
        letterRange,
        isFirstPage: i === 0,
      })
    }

    return pages
  })

  // Helper: Get student's parent
  function getStudentParent (student, parentNumber) {
    const parentIdField = parentNumber === 1 ? 'parent1_id' : 'parent2_id'
    const parentId = student[parentIdField]

    if (!parentId) return null

    return firebaseStore.parentsDTO.find(p => p.id === parentId) || null
  }

  // Helper: Format address
  function formatAddress (parent) {
    if (!parent) return ''

    const addressParts = []

    if (parent.address) addressParts.push(parent.address)
    if (parent.city) addressParts.push(parent.city)
    if (parent.postal_code) addressParts.push(parent.postal_code)

    return addressParts.length > 0 ? addressParts.join(', ') : ''
  }

  // Helper: Format phone number
  function formatPhone (phone) {
    if (!phone) return ''

    const cleaned = phone.toString().replace(/\D/g, '')

    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }

    return phone
  }

  // Get formatted school phone
  const schoolPhone = computed(() => formatPhone(SCHOOL_LOCATION.phone))

  // Get formatted SDG phone
  const sdgPhone = computed(() => formatPhone(SDG_INFO.phone))

  // Load all data
  async function loadData () {
    try {
      loading.value = true
      await Promise.all([
        firebaseStore.loadStaffDTO(),
        firebaseStore.loadCommitteesDTO(),
        firebaseStore.loadParentsDTO(),
        firebaseStore.loadStudentsDTO(),
        firebaseStore.loadAllData(), // For classes
      ])
    } catch (error) {
      console.error('Failed to load directory data:', error)
    } finally {
      loading.value = false
    }
  }

  // Populate TOC page numbers before print
  function populateTOCPageNumbers () {
    // Update TOC entries with the page numbers defined at the top of this file
    for (const section of Object.keys(TOC_PAGE_NUMBERS)) {
      const tocElement = document.querySelector(`[data-section="${section}"]`)
      if (tocElement) {
        tocElement.textContent = TOC_PAGE_NUMBERS[section]
      }
    }
  }

  onMounted(async () => {
    await checkAdminStatus()
    if (isAuthorized.value) {
      await loadData()

      // Wait for content to render, then populate TOC once
      setTimeout(() => {
        populateTOCPageNumbers()
      }, 500)
    } else {
      loading.value = false
    }
  })
</script>

<style scoped>
/* Reset and base styles for print */
.print-directory {
  /* Page setup */
  width: 8.5in;
  margin: 0 auto;
  background: white;
  color: black;
  font-family: Avenir, 'Avenir Next', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 10pt;
  line-height: 1.4;
}

/* Screen-only: Document viewer background */
@media screen {
  .print-directory {
    background: #525252;
    width: 100%;
    min-height: 100vh;
    padding: 2rem 0;
  }
}

/* Access Denied */
.access-denied {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.access-denied-content {
  text-align: center;
  padding: 2rem;
}

.access-denied h1 {
  font-size: 2rem;
  margin-bottom: 1rem;
  color: #d32f2f;
}

/* Loading */
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.loading-content {
  text-align: center;
  font-size: 1.2rem;
}

/* Section titles */
.section-title {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 24pt;
  font-weight: bold;
  margin: 0 0 1rem 0;
  padding: 0.5rem 0;
  border-top: 3px solid black;
  border-bottom: 2px solid black;
}

/* All h1 elements should have top border */
h1 {
  border-top: 3px solid black;
  padding-top: 0.5rem;
}

/* Page breaks */
.page-break {
  page-break-before: always;
  padding: 0.75in;
}

.page-break:first-child {
  page-break-before: auto;
}

/* Title Page */
.title-page {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.title-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 100%;
  border: 4px dotted #222;
  padding: 2rem;
  background: #fafafa;
}

.title-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.main-title {
  font-family: Didot, 'Bodoni MT', 'Bodoni 72', Georgia, serif;
  font-size: 72pt;
  font-weight: bold;
  text-align: center;
  line-height: 0.95;
  margin: 0;
  text-transform: uppercase;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.title-word {
  display: block;
}

.subtitle {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 36pt;
  font-weight: 300;
  text-align: center;
  margin: 1.5rem 0 0 0;
  letter-spacing: 0.15em;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.title-logo {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 1.5rem 0 0 0;
}

.title-logo img {
  width: 40%;
  max-height: 2.5in;
  height: auto;
  object-fit: contain;
  object-position: center;
}

/* Table of Contents */
.toc {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.toc-items {
  margin-top: 2rem;
}

.toc-item {
  display: flex;
  align-items: baseline;
  margin-bottom: 1rem;
  font-size: 14pt;
}

.toc-label {
  font-weight: bold;
  white-space: nowrap;
}

.toc-dots {
  flex: 1;
  border-bottom: 1px dotted #999;
  margin: 0 0.5rem;
  min-width: 2rem;
}

.toc-page {
  font-weight: bold;
  white-space: nowrap;
  min-width: 3rem;
  text-align: right;
}

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

.group-title {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 20pt;
  font-weight: bold;
  margin: 0;
  color: #000;
}

.school-phone {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14pt;
  font-weight: 600;
  color: #333;
}

.staff-subgroup {
  margin-bottom: 1.25rem;
}

.subgroup-title {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14pt;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  color: #555;
}

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
  color: #666;
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

/* SDG Header Section */
.sdg-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 1.5rem 0 1.5rem 0;
}

.sdg-logo-space {
  flex: 0 0 40%;
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
  flex: 0 0 55%;
  text-align: right;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  justify-content: center;
}

.sdg-name {
  font-size: 18pt;
  font-weight: bold;
  color: #000;
  margin-bottom: 0.5rem;
}

.sdg-address {
  font-size: 11pt;
  color: #333;
  line-height: 1.4;
}

.sdg-phone {
  font-size: 12pt;
  font-weight: 600;
  color: #333;
}

.sdg-url {
  font-size: 10pt;
  color: #666;
  font-style: italic;
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
  padding: 0.4rem 0.5rem;
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
  color: #666;
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
  color: #666;
  font-style: italic;
}

/* Committees Section - Full Page Layout */
.committee-full-page {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.committee-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 2rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid black;
}

.committee-title {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 24pt;
  font-weight: bold;
  margin: 0;
}

.committee-email {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 12pt;
  font-weight: 500;
  color: #333;
}

.committee-url {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 12pt;
  font-weight: 500;
  color: #333;
}

.committee-section {
  margin-bottom: 2rem;
}

.section-subtitle {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 16pt;
  font-weight: 600;
  margin: 0 0 1rem 0;
  color: #555;
}

.committee-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10pt;
}

.committee-table tbody tr {
  border-bottom: none;
}

.committee-table td {
  padding: 0.5rem 0.75rem;
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
  color: #333;
  padding: 0.4rem 0.75rem !important;
}

/* Member rows */
.member-row {
  border-bottom: none;
}

.member-name-cell {
  width: 40%;
  font-size: 10pt;
  line-height: 1.4;
}

.phone-cell {
  width: 25%;
}

.email-cell {
  width: 35%;
  word-break: break-word;
}

/* Committees Section - Compact Layout (for other committees) */
.committee-category-title {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 16pt;
  font-weight: 600;
  margin: 1.5rem 0 1rem 0;
  color: #444;
}

.committee {
  margin-bottom: 2rem;
  page-break-inside: avoid;
}

.committee-header-inline {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.75rem;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid #999;
}

.committee-name {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14pt;
  font-weight: bold;
  margin: 0;
}

.committee-description {
  font-weight: normal;
  font-style: italic;
  color: #666;
  margin-left: 0.25rem;
}

.committee-email-inline {
  font-size: 10pt;
  font-weight: 500;
  color: #666;
}

.committee-url-inline {
  font-size: 10pt;
  font-weight: 500;
  color: #666;
}

.committee-section-compact {
  margin-bottom: 1rem;
}

.section-subtitle-compact {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 11pt;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  color: #555;
}

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

/* Classes Section */
.class-page-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
  border-top: 3px solid black;
  border-bottom: none;
}

.class-page-header .section-title {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.class-level-badge {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 18pt;
  font-weight: 600;
  color: #333;
}

.classes-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.class-block {
  height: 50%;
  min-height: 50%;
  max-height: 50%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.class-block:not(:last-child) {
  margin-bottom: 1rem;
}

.class-title {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 16pt;
  font-weight: bold;
  margin: 0 0 0.75rem 0;
  padding-top: 0.5rem;
  border-top: 1px solid black;
  color: #000;
}

.class-info-line {
  font-size: 10pt;
  margin-bottom: 0.75rem;
}

.class-parent-reps-section {
  font-size: 10pt;
  margin-bottom: 1rem;
}

.parent-reps-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-top: 0.5rem;
}

.parent-rep-card {
  font-size: 9pt;
}

.parent-rep-name {
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.parent-rep-details {
  line-height: 1.4;
}

.class-students-section {
  margin-top: 0.75rem;
}

.students-two-columns {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.25rem 1rem;
  font-size: 9pt;
  line-height: 1.4;
}

.student-item {
  page-break-inside: avoid;
}

.student-rep {
  font-weight: 700;
}

/* Families Section */
.families-letter-header {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 24pt;
  font-weight: bold;
  margin: 0;
  text-align: center;
  color: #000;
}

.section-title + .families-letter-header {
  margin-top: 1rem;
}

.family {
  height: 25%;
  min-height: 25%;
  max-height: 25%;
  display: flex;
  flex-direction: column;
  padding: 0.75rem 0;
  border-bottom: 1px solid #ddd;
  overflow: hidden;
}

.family:last-child {
  border-bottom: none;
}

.family-students {
  font-size: 11pt;
  margin-bottom: 0.5rem;
  line-height: 1.4;
}

.student-class {
  font-weight: normal;
  font-size: 9pt;
  color: #666;
}

.family-parents {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  margin-left: 1rem;
}

.family-parent {
  font-size: 9pt;
}

.parent-name {
  font-weight: 600;
  margin-bottom: 0.1rem;
}

.parent-contact span {
  display: block;
  line-height: 1.3;
}

.parent-email {
  color: #333;
}

.parent-phone {
  color: #333;
}

.parent-address {
  color: #666;
  font-size: 8pt;
}

/* Placeholder sections */
.placeholder-section {
  padding: 2rem;
  border: 2px dashed #ccc;
  background: #f9f9f9;
  text-align: center;
  min-height: 4in;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.placeholder-text {
  color: #666;
  font-style: italic;
  font-size: 12pt;
}

/* Back Page */
.back-page {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.back-page h1 {
  font-size: 36pt;
  text-align: center;
  margin-bottom: 2rem;
}

/* Print-specific styles */
@media print {
  .print-directory {
    width: 100%;
    margin: 0;
  }

  .page-break {
    page-break-before: always;
  }

  .page-break:first-child {
    page-break-before: auto;
  }

  /* Title page print optimization */
  .title-page {
    width: 100%;
    height: 100%;
  }

  .title-box {
    border: 4px dotted #222;
    background: white;
    padding: 1.5rem;
  }

  .main-title {
    font-size: 72pt;
    line-height: 0.95;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }

  .subtitle {
    font-size: 36pt;
    margin: 1.5rem 0 0 0;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }

  .title-logo {
    padding: 1rem 0 0 0;
  }

  .title-logo img {
    width: 40%;
    max-height: 2.5in;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }

  /* Hide placeholder backgrounds in print */
  .placeholder-section {
    border: none;
    background: transparent;
  }
}

/* Page setup for print */
@page {
  size: letter;
  margin: 0.75in 0.75in 1in 0.75in; /* Extra bottom margin for footer */

  @bottom-center {
    content: "Étoile filante - Le Gros Bottin | Page " counter(page);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 9pt;
    color: #666;
  }
}

/* Hide footer on first page (title page) */
@page :first {
  @bottom-center {
    content: none;
  }
}
</style>

<style>
/* Global styles (unscoped) to hide Firebase emulator banner in print */
@media print {
  /* Hide Firebase emulator warning banner */
  .firebase-emulator-warning,
  [class*="firebase-emulator"],
  [class*="emulator-warning"],
  iframe[src*="/__/"] {
    display: none !important;
    visibility: hidden !important;
  }
}
</style>
