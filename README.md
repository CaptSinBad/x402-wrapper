# x402-wrapper

henlo

## Environment files

This repository uses environment variables for both client and server runtimes. Do NOT commit files containing real secrets. Instead:

- Copy `.env.client.example` -> `.env.client` for client/public vars that are safe to include in builds.
- Copy `.env.server.example` -> `.env.server` for server-only secrets (keep this file local and out of git).

We add `/.env*` to `.gitignore` to avoid accidentally committing secrets. If you need to share environment values, use a secrets manager (GitHub Actions secrets, Vault, etc.) and rotate any values that were previously committed.

