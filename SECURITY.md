# Security Guidelines

## Sensitive Files

The following files contain sensitive credentials and should **NEVER** be committed to git:

### Google OAuth Credentials
- `client_secret_*.json` - Contains Google OAuth client ID and secret
- Use `client_secret.json.example` as a template
- Obtain your credentials from [Google Cloud Console](https://console.cloud.google.com/)

### Environment Files
- `.env` - Contains API keys, database credentials, etc.
- `.env.local` - Local environment overrides
- Use `.env.example` files as templates

## Setup Instructions

1. **Google OAuth Setup:**
   - Copy `client_secret.json.example` to `client_secret_YOUR_PROJECT_ID.json`
   - Fill in your actual credentials from Google Cloud Console
   - The file will be automatically ignored by git

2. **Environment Variables:**
   - Copy `.env.example` to `.env` in each service directory
   - Fill in your actual values
   - Never commit `.env` files

## If Credentials Are Leaked

If you accidentally commit credentials:

1. **Immediately revoke/regenerate** the credentials in Google Cloud Console
2. Remove from git history: `git rm --cached <file>`
3. Amend commit: `git commit --amend --no-edit`
4. Force push: `git push origin main --force-with-lease`

## Best Practices

- ✅ Use `.env` files for secrets
- ✅ Add sensitive patterns to `.gitignore`
- ✅ Use example/template files for documentation
- ❌ Never commit API keys, passwords, or OAuth secrets
- ❌ Never share credentials in issues or pull requests
