# LinkedIn Daily Post Automation

Posts a daily AI/tech LinkedIn post every morning at 8 AM via GitHub Actions.

## How it works

1. **Content generation**: Fetches trending AI/tech stories from Hacker News (free API) and composes a unique post using themed templates (rotates daily)
2. **Posting**: Calls the LinkedIn REST API directly using a pre-obtained OAuth token
3. **Scheduling**: GitHub Actions cron job runs daily at 8:00 AM UTC

## Setup

### 1. Get your LinkedIn Access Token

Since GitHub Actions can't do browser OAuth, you need to generate the token locally first:

```bash
# The token is already saved from your OpenCode LinkedIn MCP setup
cat ~/.linkedin-mcp-token.json
# Copy the "access_token" value
```

> **Token expires in ~60 days.** Set a reminder for day 55 to re-authenticate.

### 2. Fork & configure GitHub Secrets

1. Create a GitHub repository and push this code
2. Go to **Settings → Secrets and variables → Actions**
3. Add these secrets:

| Secret | Value |
|---|---|
| `LINKEDIN_ACCESS_TOKEN` | Your access token from step 1 |
| `LINKEDIN_PERSON_URN` | `urn:li:person:RLnMVkx9Rc` |

### 3. Test it manually

Go to **Actions → Daily LinkedIn Post → Run workflow** with mode `preview` to see what it'll post, then `post` to test the real thing.

## What gets posted

The content generator creates posts on 7 rotating themes:
- **Monday** — Dev tools & OpenCode
- **Tuesday** — Problem/solution deep dive
- **Wednesday** — AI news roundup
- **Thursday** — Workflow & productivity
- **Friday** — Weekly reflection
- **Saturday** — Deep technical dive
- **Sunday** — Open source spotlight

Each post includes 1-2 trending stories from Hacker News filtered for AI/tech relevance.

## Refreshing the token

LinkedIn OAuth tokens last ~60 days. When the workflow starts failing:

1. Run the LinkedIn MCP locally: `opencode` → use the `authenticate` tool
2. Copy the new token from `~/.linkedin-mcp-token.json`
3. Update the `LINKEDIN_ACCESS_TOKEN` secret in GitHub

## Running locally

```bash
# Preview what will be posted
LINKEDIN_ACCESS_TOKEN=xxx LINKEDIN_PERSON_URN=urn:li:person:xxx node src/index.mjs preview

# Post to LinkedIn
LINKEDIN_ACCESS_TOKEN=xxx LINKEDIN_PERSON_URN=urn:li:person:xxx node src/index.mjs post
```
