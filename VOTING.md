# DDD Perth Voting System

## Overview
The DDD Perth voting system uses a pairwise comparison approach, where attendees vote between pairs of talks. Sessions are sourced from Sessionize and votes are stored in Azure Storage (Blob and Table). Each vote is an "A" or "B" corresponding to the left or right talk in a pair.

## Architecture
- **Blob Storage**: Stores generated talk pairs and votes as append blobs.
- **Table Storage**: Tracks voting session metadata.
- **Benefits**: Low cost, atomic append operations, simple vote format, and easy analysis (vote index matches pair index).

## Local Development
- Install Azurite: `npm install -g azurite`
- Add to `.env`: `AZURE_STORAGE_ACCOUNT_NAME=` (leave empty for local)
- Start Azurite: `azurite --location ./azurite --debug ./azurite/debug.log`

## Production Setup

### Azure Resources

1. Create an Azure Storage Account
2. Set environment variable:
   ```
   AZURE_STORAGE_ACCOUNT_NAME=yourstorageaccount
   ```
3. Configure managed identity access to the storage account

### Security

- The voting page is public during voting period
- Results page should be protected (add authentication as needed)
- Votes are anonymous - no user tracking

## Implementation Details

### Files

- `/website/app/lib/azure-storage.server.ts` - Azure Storage client and voting data operations
- `/website/app/lib/voting.server.ts` - Voting business logic
- `/website/app/routes/_layout.voting.tsx` - Voting UI page
- `/website/app/routes/_layout.voting.results.tsx` - Results page

### Vote Flow

1. User visits `/voting`
2. System checks if voting is open based on conference dates
3. If no active session exists, pulls sessions from Sessionize and generates pairs
4. User sees two talk cards side-by-side
5. User clicks preferred talk and submits
6. Vote is recorded as "A" (left) or "B" (right) in append blob
7. User sees next pair
8. Process continues until all pairs are voted on

### Vote Counting

- Each vote character position corresponds to a pair index
- Results calculated by reading votes string and matching to pairs
- Sessions ranked by total votes received

## Future Enhancements

- Add ticket validation for voting eligibility
- Implement Elo rating system for more sophisticated ranking
- Add real-time voting statistics
- Support for different voting modes (ranked choice, etc.)
- Export results to CSV/JSON