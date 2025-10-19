# Speaker Portal Implementation Plan

## Goal

Build a speaker portal for DDD Perth that enables speakers to:
- Authenticate using their existing GitHub accounts (initially)
- Complete onboarding requirements (presentation info, dietary needs, RSVPs)
- Access speaker resources and guidelines
- View their session information from Sessionize
- Link historical speaker data across conference years

The portal will integrate with Sessionize for speaker/session data while storing portal-specific information in Azure Table Storage.

## Context

DDD Perth currently manages speaker information through Sessionize and manual email/form collection. The new portal will centralize speaker interactions, reduce administrative overhead, and improve the speaker experience by providing a self-service interface for common tasks.

Key requirements from user:
- Start with GitHub auth (can add magic links once email infrastructure is ready)
- Microsoft OAuth not essential (doesn't guarantee valid email)
- Use Azure Table Storage for simplicity
- Match speakers by email across any conference year
- Track onboarding completion as initial milestone
- Support the existing speaker information form fields

## References

- `docs/SPEAKER_PORTAL_REFERENCE.md` - Comprehensive reference document covering authentication patterns, Azure Table Storage design, and Sessionize integration
- `website/app/lib/sessionize.server.ts` - Existing Sessionize API integration
- `website/app/lib/auth.server.ts` - Current GitHub OAuth implementation for admin
- `website/app/routes/auth.github.callback.tsx` - GitHub OAuth callback handler
- `CLAUDE.md` - Project configuration and commands

## Principles & Key Decisions

- **Unified authentication**: Single auth system serves both admin and speaker needs
- **Email as primary identifier**: Use lowercase email to match speakers across Sessionize data
- **Incremental approach**: Start with GitHub auth, add providers as needed
- **Azure Table Storage**: Simple, cost-effective storage for speaker-specific data
- **Year-agnostic speaker detection**: Check all conference years to identify speakers
- **Progressive enhancement**: Basic features first, complexity added incrementally
- **No Sessionize write-back**: Portal collects additional data, displays merged view

## Stages & Actions

### ✅ Stage: Initial Setup & Dependencies
- [x] Install required packages (`@azure/data-tables`, type definitions)
  - 📔 Package was already installed in the project
- [x] Set up Azure Table Storage connection string in `.env`
  - 📔 Updated to use managed identity pattern (same as voting system) - no connection string needed
- [x] Create Azure tables (SpeakerProfiles, SpeakerYears, SpeakerOnboarding)
  - 📔 Created speaker-storage.server.ts with proper type safety following voting-validation-types.ts patterns
  - 📔 Updated partition keys: `speaker_${email}` for profiles/years, `onboarding_${year}` for submissions
  - 📔 Functions accept TableClient directly (not getTableClient) following existing patterns
  - 📔 Proper TypeScript literal types for partition/row keys with compile-time safety
- [x] Add speaker-related environment variables to config
  - 📔 Uses existing AZURE_STORAGE_ACCOUNT_NAME and AZURE_CLIENT_ID (same as existing voting system)

### Stage: Extend Authentication System
- [ ] Create `speaker.server.ts` for speaker-specific auth logic
- [ ] Implement `isSpeaker()` function to check email against Sessionize data
- [ ] Extend `auth.server.ts` to support speaker role detection
- [ ] Create `requireSpeakerOrAdmin()` middleware function
- [ ] Write tests for speaker authentication logic
- [ ] Test authentication flow with sample speaker email

### Stage: Basic Speaker Portal Routes
- [ ] Create `/speakers` route as main dashboard
- [ ] Implement loader to check speaker authentication
- [ ] Create basic dashboard UI showing speaker name and sessions
- [ ] Add `/speakers/profile` route for speaker information
- [ ] Create navigation component for speaker portal
- [ ] Test routes with authenticated speaker account

### Stage: Azure Table Storage Integration
- [ ] Create `speaker-storage.server.ts` for Azure Table operations
- [ ] Implement `getSpeakerProfile()` function
- [ ] Implement `updateSpeakerProfile()` function
- [ ] Implement `getSpeakerYears()` to track conference participation
- [ ] Write tests for storage operations
- [ ] Test with actual Azure Table Storage

### Stage: Speaker Data Synchronization
- [ ] Create `syncSpeakerData()` function to pull from Sessionize
- [ ] Store speaker profiles in Azure on first login
- [ ] Update speaker year records when accessing portal
- [ ] Handle email changes gracefully
- [ ] Add manual sync endpoint for admins
- [ ] Test synchronization with multiple years of data

### Stage: Onboarding Form Implementation
- [ ] Create `/speakers/onboarding` route
- [ ] Build form component with all required fields:
  - [ ] Name and email (pre-filled)
  - [ ] Name phonetic spelling
  - [ ] Q&A handling preferences
  - [ ] Presentation elements (video, audio, demos)
  - [ ] Recording consent
  - [ ] Speaker introduction text
  - [ ] Dietary requirements
  - [ ] Speaker dinner RSVP
  - [ ] Training session selections
  - [ ] Meet the Experts opt-in
- [ ] Implement form validation with Zod
- [ ] Store submissions in SpeakerOnboarding table
- [ ] Update onboarding completion flag
- [ ] Test form submission and data persistence

### Stage: Onboarding Flow & Redirects
- [ ] Check onboarding status on speaker login
- [ ] Redirect to onboarding if incomplete
- [ ] Show completion status on dashboard
- [ ] Allow editing submitted onboarding data
- [ ] Add confirmation email (stub for now)
- [ ] Test complete onboarding flow

### Stage: Speaker Resources Section
- [ ] Create `/speakers/resources` route
- [ ] Add static content for speaker guidelines
- [ ] Include presentation templates
- [ ] Add AV requirements documentation
- [ ] Create downloadable resources section
- [ ] Test resource access and downloads

### Stage: Historical Speaker Data
- [ ] Create `/speakers/history` route
- [ ] Query all years for speaker participation
- [ ] Display previous talks and years
- [ ] Link to archived session pages
- [ ] Show speaker evolution over time
- [ ] Test with speakers who have multiple years

### Stage: Admin View of Speakers
- [ ] Add `/admin/speakers` route
- [ ] Display all speakers for current year
- [ ] Show onboarding completion status
- [ ] Add export functionality for speaker data
- [ ] Implement search and filter capabilities
- [ ] Test admin access and data visibility

### Stage: Polish & Error Handling
- [ ] Add loading states for async operations
- [ ] Implement error boundaries
- [ ] Add user-friendly error messages
- [ ] Create 404 page for invalid speaker routes
- [ ] Add success notifications for form submissions
- [ ] Test error scenarios and edge cases

### Stage: Performance Optimization
- [ ] Implement caching for speaker detection
- [ ] Add database query optimization
- [ ] Lazy load heavy components
- [ ] Add pagination for historical data
- [ ] Profile and optimize slow queries
- [ ] Run performance tests

### Stage: Documentation & Cleanup
- [ ] Update `CLAUDE.md` with speaker portal commands
- [ ] Document Azure Table Storage setup
- [ ] Add speaker portal section to README
- [ ] Create admin guide for speaker management
- [ ] Clean up console.log statements
- [ ] Review and refactor code

### Stage: Final Testing & Deployment Prep
- [ ] Run comprehensive test suite
- [ ] Test with multiple browser types
- [ ] Verify mobile responsiveness
- [ ] Test with real speaker emails
- [ ] Check Azure Storage performance
- [ ] Run security audit
- [ ] Final review with user
- [ ] Git commit with detailed message
- [ ] Move planning doc to `planning/finished/`

## Appendix

### Azure Table Schema Details

**SpeakerProfiles Table:**
```
PartitionKey: email (lowercased)
RowKey: "profile"
Properties: githubId, name, bio, profilePicture, etc.
```

**SpeakerYears Table:**
```
PartitionKey: email (lowercased)
RowKey: year (e.g., "2025")
Properties: sessionizeId, sessions, onboardingComplete, etc.
```

**SpeakerOnboarding Table:**
```
PartitionKey: year-email
RowKey: timestamp
Properties: All form fields as JSON
```

### Onboarding Form Fields

Based on provided screenshots:
1. Name (required)
2. Email (required)
3. Name Phonetic Spelling (required)
4. Q&A Handling (radio options)
5. Presentation Elements (checkboxes)
6. Recording Opt-out (checkbox)
7. Introduction Text (required)
8. Additional Presentation Notes
9. Dietary Requirements
10. Speaker Dinner RSVP (required)
11. Training Session Attendance (checkboxes)
12. Meet the Experts Registration (required)

### Authentication Flow

1. Speaker visits `/speakers`
2. Redirected to `/auth/login` if not authenticated
3. Logs in with GitHub OAuth
4. System checks email against all Sessionize years
5. If match found, creates/updates speaker profile
6. Checks onboarding status for current year
7. Redirects to onboarding or dashboard

### Alternative Approaches Considered

**Magic Links Only**: Simpler but requires email infrastructure immediately. Decided to start with GitHub OAuth since it's already implemented.

**Separate Auth Systems**: Could have separate login for speakers vs admins. Rejected for complexity - unified system is simpler to maintain.

**Cosmos DB**: More powerful querying but overkill for our needs. Azure Table Storage is sufficient and more cost-effective.

**Direct Sessionize Integration**: Investigated write API but not available. Decided to maintain separate portal data and merge at display time.

### Risk Mitigation

- **Email mismatch**: Speakers might use different emails for GitHub vs Sessionize. Mitigation: Allow admin override and multiple email linking in future phases.
- **No GitHub account**: Some speakers might not have GitHub. Mitigation: Add other OAuth providers in later phases.
- **Azure Storage limits**: 1MB entity size might be exceeded. Mitigation: Store large data as separate entities or in Blob Storage if needed.
- **Sessionize API changes**: API might change structure. Mitigation: Use Zod validation and graceful fallbacks.