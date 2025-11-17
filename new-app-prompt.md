# Prompt for Claude: Convert B2 to Clean App Template

Use this prompt when starting a fresh Claude Code session in your copied directory.

---

## 🎯 PRIMARY PROMPT

```
This codebase was copied from the B2 School Directory application. I want to
transform it into a clean, reusable template by stripping out all school-specific
business logic while preserving the excellent architectural patterns.

## GOAL
Create a production-ready Vue 3 + Firebase template that demonstrates best
practices and can be quickly adapted to any new domain.

## WHAT TO KEEP (Infrastructure & Patterns)

### Core Architecture (KEEP)
- ✅ All Vite configuration (vite.config.mjs) - auto-imports, auto-routing, PWA
- ✅ Firebase initialization and emulator detection (src/firebase.js)
- ✅ Security configuration (src/config/security.js, src/config/functions.js)
- ✅ App bootstrap (src/main.js)
- ✅ Router setup with auth middleware (src/router/index.js, src/middleware/auth.js)
- ✅ Auth store pattern (src/stores/auth.js) - keep email validation structure
- ✅ i18n system (src/composables/useI18n.js) - full implementation
- ✅ All Vuetify configuration (src/plugins/vuetify.js) - themes, setup
- ✅ All plugin registration (src/plugins/index.js)
- ✅ PWA configuration (vite-plugin-pwa in vite.config.mjs)
- ✅ Build scripts and package.json structure
- ✅ Firebase emulator configuration (firebase.json)
- ✅ Environment variable structure (.env.example)

### Layout System (KEEP & SIMPLIFY)
- ✅ src/App.vue - Keep centralized data loading pattern, modify for template
- ✅ src/layouts/default.vue - Keep responsive layout, remove school branding
- ✅ src/layouts/components/AppBar.vue - Simplify, remove school-specific features
- ✅ src/layouts/components/NavigationDrawer.vue - Simplify menu structure
- ✅ src/layouts/components/Footer.vue - Make generic
- ✅ Pull-to-refresh implementation
- ✅ PWA update prompt components

### Reusable Components (KEEP IF GENERIC)
- ✅ Messaging system (MessagingShell.vue, ConversationList.vue, etc.) - KEEP, it's generic
- ✅ Form components if they're generic
- ✅ Loading overlays, error displays
- ✅ Print page detection logic
- ⚠️  Review other components - keep if reusable, remove if school-specific

### Development Tools (KEEP)
- ✅ ESLint/Prettier configuration
- ✅ .gitignore structure
- ✅ All npm scripts patterns

## WHAT TO REMOVE (School-Specific Business Logic)

### DTOs (REMOVE, but create examples)
- ❌ DELETE: StudentDTO.js, ParentDTO.js, StaffDTO.js, CommitteeDTO.js
- ✅ KEEP: ConversationDTO.js, MessageDTO.js (generic messaging)
- ✅ CREATE: ExampleEntityDTO.js - A well-documented reference implementation showing:
  - Constructor with validation
  - Sanitization methods
  - toFirestore() / fromFirestore()
  - getValidationErrors()
  - withUpdates() immutable updates
  - toJSON() serialization
  - getSearchableText()
  - Computed getters
  - Add extensive JSDoc comments explaining each pattern

### Repositories (REMOVE, but create examples)
- ❌ DELETE: StudentRepository.js, ParentRepository.js, StaffRepository.js, CommitteeRepository.js
- ✅ KEEP: ConversationRepository.js, MessageRepository.js
- ✅ CREATE: ExampleEntityRepository.js - Reference showing:
  - getAll(), getById(), save(), delete() patterns
  - Search implementation
  - Relationship loading
  - Error handling
  - Logging patterns
  - DTO type checking
  - Add extensive JSDoc comments

### Stores (SIMPLIFY)
- ✅ MODIFY src/stores/firebaseData.js:
  - Remove school entity state (students, parents, staff, committees)
  - Keep structure showing how to add entity state
  - Add one example entity to demonstrate pattern
  - Keep loading/error/cache patterns
  - Add clear comments: "Add your entities here"

### Pages (REMOVE, create minimal examples)
- ❌ DELETE: students.vue, families.vue, staff.vue, classes.vue, committees.vue, profile.vue
- ❌ DELETE: All admin/* pages except maybe one example
- ✅ KEEP: auth.vue (authentication flows)
- ✅ CREATE: index.vue (home page) - Make it a template welcome/dashboard
- ✅ CREATE: examples.vue - Shows CRUD operations for ExampleEntity
- ✅ CREATE: admin/settings.vue - Generic admin page example

### Configuration Files (REMOVE)
- ❌ DELETE: src/config/classLevels.js
- ❌ DELETE: src/config/committees.js
- ❌ DELETE: src/config/staffGroups.js
- ❌ DELETE: src/config/interests.js
- ❌ DELETE: src/config/sdgs.js
- ✅ KEEP: Any generic utilities

### Cloud Functions (SIMPLIFY)
- ❌ DELETE: School-specific functions (parentUpdate.js, annualUpdateWorkflow.js, etc.)
- ✅ KEEP: functions/index.js structure
- ✅ CREATE: functions/example.js - Shows:
  - HTTP endpoint pattern
  - DTO validation
  - Error handling
  - Authentication checking
  - CORS handling
- ✅ KEEP: functions/auth.js - If it has generic email validation patterns
- ✅ KEEP: functions/email.js - Generic email sending (MailerSend setup)

### Scripts (REMOVE OR DOCUMENT)
- ❌ DELETE: scripts/sheets-sync.js (school-specific)
- ❌ DELETE: Other school-specific scripts
- ✅ CREATE: scripts/README.md - Explain what scripts were here and what you'll need

### Translations (CLEAN BUT KEEP STRUCTURE)
- ✅ MODIFY src/locales/fr.json:
  - Remove all school-specific content
  - Keep generic terms: common, auth, nav structure
  - Add comments showing where to add domain content
  - Keep examples of proper structure
- ✅ MODIFY src/locales/en.json: Same as above

## WHAT TO CREATE (Documentation & Examples)

### 1. README.md (COMPLETE REWRITE)
Create comprehensive documentation:
- Overview of the template architecture
- Key patterns explained (DTO/Repository/Store)
- How to add a new entity (step-by-step)
- How auto-imports work
- How auto-routing works
- Centralized data loading explanation
- Firebase setup instructions
- Emulator workflow
- Deployment guide
- List of technologies and why they were chosen

### 2. ARCHITECTURE.md (NEW FILE)
Detailed architecture documentation:
- Diagram of data flow
- DTO pattern explanation with examples
- Repository pattern explanation
- Store pattern explanation
- Component hierarchy
- Auth flow
- i18n system details
- Build process

### 3. QUICK_START.md (NEW FILE)
Step-by-step guide:
- Clone and setup
- Create first entity
- Add to UI
- Test with emulators
- Deploy

### 4. Example Implementation
- ExampleEntityDTO.js with rich comments
- ExampleEntityRepository.js with rich comments
- examples.vue showing CRUD UI
- Update App.vue to load example entities
- Show in navigation

### 5. CLAUDE.md (UPDATE)
- Remove B2-specific instructions
- Add template-specific guidance
- Explain the architectural patterns
- Note about maintaining patterns when adding features

## SPECIFIC TASKS

1. **Update package.json**
   - name: "vue-firebase-app-template"
   - description: "Production-ready Vue 3 + Firebase template with DTO/Repository patterns"
   - Remove school-specific keywords
   - Keep all dependencies (they're all useful)

2. **Clean Git History**
   - Add note in README: "This is a fresh start - remove old .git and git init"

3. **Update Vuetify Theme**
   - Rename themes to generic names (e.g., "default", "professional", "modern")
   - Keep color schemes but make them neutral/professional

4. **Simplify Navigation**
   - Home, Examples, (Admin with nested example)
   - Profile (generic user profile)
   - Keep messaging if we keep that system

5. **Update App.vue**
   - Keep centralized loading pattern
   - Load only example entities
   - Keep auth initialization
   - Add comments explaining the pattern

6. **Create .env.example**
   - Show all required environment variables
   - Add comments explaining each
   - Remove any B2-specific values

7. **Functions Setup**
   - Keep package.json for functions
   - Remove school-specific dependencies
   - Keep generic ones (Firebase, email sender, etc.)
   - Add example function

8. **Firestore Security Rules**
   - Create generic rules template in firestore.rules
   - Show auth-based access patterns
   - Add comments for customization

## QUALITY STANDARDS

- ✅ Every deletion should be intentional
- ✅ Every kept file should be documented
- ✅ Example code should be exemplary (not minimal)
- ✅ Comments should explain WHY, not just WHAT
- ✅ Template should run without errors after cleanup
- ✅ Emulators should start successfully
- ✅ Dev server should start and show working UI
- ✅ JSDoc comments on all public methods
- ✅ README should be production-quality

## FINAL CHECKLIST

After completing the cleanup, verify:

- [ ] npm install runs without errors
- [ ] npm run dev starts successfully
- [ ] Firebase emulators start successfully
- [ ] Can navigate to example pages
- [ ] Auth flow works (even if just with test accounts)
- [ ] Example CRUD operations demonstrate the pattern
- [ ] No school-specific terminology in UI
- [ ] README fully explains the template
- [ ] At least one complete example entity exists
- [ ] Code is well-commented
- [ ] No broken imports or missing files
- [ ] Vuetify theme looks professional
- [ ] i18n system works (can toggle languages)
- [ ] Build succeeds (npm run build)

## TONE & APPROACH

- Be thorough but aggressive in removing domain code
- Prefer "show by example" over "explain in comments"
- Keep it production-ready, not a toy example
- Make it easy for the next developer to understand
- Prioritize patterns that prevent common mistakes
- Documentation should be professional and complete

## OUTPUT FORMAT

When done, provide:
1. Summary of what was removed
2. Summary of what was kept
3. Summary of what was created
4. List of any decisions that need user input
5. Quick start instructions
6. Known limitations or TODOs

---

BEGIN TRANSFORMATION
```

---

## 🎨 ALTERNATIVE PROMPTS (Use Instead If Needed)

### Minimal Clean Slate Version
```
Strip this B2 school app down to bare infrastructure. Remove ALL domain code
(DTOs, repositories, pages). Keep only: Vite config, Firebase setup, auth system,
router, layouts, i18n. Create ONE minimal example entity showing the pattern.
Add a comprehensive README. I want to build from scratch.
```

### Keep Messaging System Version
```
Same as main prompt above, but explicitly keep and document the entire messaging
system (ConversationDTO, MessageDTO, all messaging components) as it's a
reusable feature that many apps need.
```

### Quick Domain Swap Version
```
[Use main prompt above, then add:]

After cleaning up the template, immediately add these domain entities for my
new application: [LIST YOUR ENTITIES]

For each entity, create:
- DTO with validation
- Repository with CRUD
- Basic page with list/create/edit
- Navigation item
- Translations

My new app is: [DESCRIBE YOUR APP DOMAIN]
```

---

## 📋 CHECKLIST FOR YOU (Before Running Prompt)

- [ ] Copied B2 directory to new location
- [ ] Opened Claude Code in NEW directory (not original B2)
- [ ] Ready to commit to git after Claude finishes
- [ ] Have Firebase project ready (or will create one)
- [ ] Know what domain you'll build (or staying generic)

---

## 💡 USAGE TIPS

1. **Run in Copied Directory**: Make sure Claude is operating in the COPY, not the original B2
2. **Review Before Commit**: Check Claude's changes before committing
3. **Test Immediately**: Run `npm install` and `npm run dev` to verify it works
4. **Start Small**: Add your first real entity following the example pattern
5. **Keep Template Branch**: Consider keeping a `template` git branch before customizing

---

## 🚀 AFTER CLAUDE FINISHES

```bash
# 1. Review the changes
# Claude will show you what it did

# 2. Test the template
npm install
npm run dev

# 3. Start emulators in another terminal
npm run emulator:start

# 4. Verify it works
# - Open http://localhost:3000
# - Check that auth pages load
# - Check that example pages work
# - Toggle language (FR/EN)

# 5. Initialize git
git init
git add .
git commit -m "Initial commit: Clean template from B2"

# 6. Create your first real entity
# Follow the pattern in ExampleEntityDTO.js

# 7. Build your app!
```

---

## ❓ QUESTIONS YOU MIGHT ASK CLAUDE AFTER

- "Show me how to add a Product entity with name, price, and inventory fields"
- "How do I add a new admin page with proper auth protection?"
- "Explain the centralized data loading pattern in more detail"
- "How do I add a new language to the i18n system?"
- "Show me how to add a relationship between two entities"
- "How do I deploy this to Firebase hosting?"

---

**Good luck with your new app! This template approach should save you weeks of setup time.** 🎉
