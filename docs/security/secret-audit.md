# Secret audit (in progress)

This file will contain the results of a repository secret scan and a short note on any `.env*` files that were untracked.

Status: In-progress (TODO ID 2: Stop tracking `.env` files)

Planned steps taken in this commit:

- Ensure `.gitignore` ignores `.env` and `.env.*` patterns (already present).
- Remove tracked `.env*` files from git index (safe, using `git rm --cached`).

Next steps:

- Run `git ls-files | grep -E '\.env($|[./-])'` to detect any tracked env files.
- If any tracked env files were found and removed, list them here and coordinate secret rotation as needed.
- Run a secret-scan script (`scripts/scan_repo_secrets.sh`) and append findings to this document.

Acceptance criteria for this file:

- This file contains a list of any env files untracked and any other high-confidence secret hits with guidance for rotation.

---

Update note: after the untrack commit, this file will be updated with exact file names removed from tracking.
