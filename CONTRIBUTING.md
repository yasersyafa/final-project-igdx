# Contributing Guide

This project is built by developers working in parallel. Follow these rules so
work stays isolated, history stays clean, and merges to master are safe.

## Core Rules

- Never commit or push directly to master.
- Every feature lives on its own branch created from master.
- One feature per branch. Do not mix unrelated changes.
- Open a Pull Request to master when the feature is complete.

## Branching

Each developer creates a separate branch off the latest master for the feature they
own. Naming format:

```
feat/<feature-name>
```

Rules for the branch name:

- Use English.
- Use lowercase kebab-case for the feature name.
- Keep it short and descriptive.

Examples:

```
feat/photo-filter
feat/level-timer
feat/sound-effects
```

## Workflow

1. Sync master before starting.

   ```
   git checkout master
   git pull origin master
   ```

2. Create your feature branch.

   ```
   git checkout -b feat/<feature-name>
   ```

3. Do the work on that branch only.

4. Run tests and build before every push.

   ```
   bun test
   bun build src/main.js --outdir dist
   ```

5. Commit with the standard message format (see below).

6. Push your branch.

   ```
   git push origin feat/<feature-name>
   ```

7. When the feature is done, open a Pull Request into master.

## Commit Message Format

All commits use the same Conventional Commits format:

```
<type>: <subject>

<optional body>
```

Rules:

- type is one of: feat, fix, refactor, docs, style, test, chore.
- subject is imperative and lowercase, for example "add photo filter", not "added" or "Adds".
- subject is 50 characters or less and has no trailing period.
- Add a body only when the reason is not obvious. Wrap it at 72 characters and explain why, not what.
- Do not add AI or tool signature trailers.

Examples:

```
feat: add sepia photo filter
fix: correct roll counter when a photo is deleted
refactor: extract shared button component
```

## Pull Requests

- Open the PR against master.
- Use the same commit format for the PR title, for example "feat: add sound effects".
- In the description, state what changed, why, and how to test it.
- Confirm tests and build pass before requesting review.
- Request review from at least one of the other two developers.
- Resolve conflicts by updating your branch from master before merge:

  ```
  git checkout feat/<feature-name>
  git fetch origin
  git rebase origin/master
  ```

- Merge only after approval.

## Keeping Branches Clean

- Keep feature branches small and short lived.
- Pull master often to reduce conflicts.
- Delete the branch after the PR is merged.
