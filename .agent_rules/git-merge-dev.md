---
description: Update README, commit changes, merge current branch to dev, optionally merge/push main, push dev, optionally delete feature branch, and give summary
argument-hint: [new-branch-name]
allowed-tools: Bash(git *)
---

# Git Merge to Dev Workflow (Automated & Clean)

Automates the workflow: ensuring the current branch is staged/committed, cleaning the target branch, merging without manual input (using --no-edit), propagating .gitignore, and optionally merging to main.

## Workflow Steps

1. **Check Current Branch & Readiness (CRITICAL)**
   - Run `git branch --show-current` to identify the current working branch (`<original-branch>`).
   - Run `git status` to ensure everything is staged and committed. **The branch must be clean before proceeding.**
   - If there are uncommitted changes, follow steps 3-6 first.

2. **Review Current Changes**
   - Run `git status` and `git log dev..HEAD --oneline` to understand changes since last merge.

3. **Update README File**
   - Analyze all changes made in this branch.
   - Update `README.md` to document any user-facing feature or installation requirements.

4. **Commit README Changes**
   - Stage the README with `git add README.md`.
   - Commit with `git commit -m "docs: update README with recent changes"`.
   - Skip if no changes were made to README.

5. **Review Remaining Changes**
   - Run `git status` again to see any other uncommitted changes.

6. **Commit Remaining Changes**
   - Analyze changes and determine appropriate commit type (feat, fix, chore, etc.).
   - Stage all changes with `git add -A`.
   - Create a descriptive commit message following Conventional Commits.
   - Commit with `git commit -m "type: descriptive message"`.
   - **Verification:** `git status` must show "nothing to commit, working tree clean".

7. **Switch and Sync Dev Branch**
   - Run `git checkout dev`.
   - **Ensure Clean State:** Run `git reset --hard origin/dev` to ensure local uncommitted changes in dev don't block the merge.

8. **Merge Feature Branch into Dev (Automated)**
   - Run `git merge <original-branch> --no-edit`.
   - *Nota:* El flag `--no-edit` evita que se abra el editor de texto.
   - Si el usuario requiere que `dev` sea EXACTAMENTE igual a la rama actual: `git reset --hard <original-branch>`.

9. **Ensure .gitignore Changes Are Applied in dev (CRITICAL)**
   - **Detect if .gitignore changed:** `git diff --name-only HEAD~1..HEAD | grep -x ".gitignore" || true`.
   - If changed (or if rules were updated), apply rules to stop tracking files that are now ignored:
     1. `git ls-files -ci --exclude-standard` (revisar archivos trackeados que ahora están en .gitignore).
     2. Si hay resultados: `git rm -r --cached -- $(git ls-files -ci --exclude-standard)`.
     3. Commit: `git commit -m "chore: apply .gitignore rules in dev" --no-edit`.
     4. Re-check: `git ls-files -ci --exclude-standard` (debe quedar vacío).

10. **Ask: ¿Quieres hacer merge con main?**
    - **Ask the user:** "¿Quieres hacer merge de dev en main?"
    - **If the user says yes:**
      - `git checkout main`
      - `git merge dev --no-edit`
      - **Propagar .gitignore a main (siempre después del merge):**
        1. `git ls-files -ci --exclude-standard` (archivos trackeados que ahora están en .gitignore).
        2. Si hay resultados: `git rm -r --cached -- $(git ls-files -ci --exclude-standard)`.
        3. Commit: `git commit -m "chore: apply .gitignore rules in main" --no-edit`.
        4. Re-check: `git ls-files -ci --exclude-standard` (debe quedar vacío). Confirm `git status`.
      - **Ask: ¿Quieres hacer push de main?** -> Si sí: `git push origin main`.
      - `git checkout dev` to return to dev.

11. **Push Dev Branch (Automated)**
    - `git push origin dev` (o `git push --force origin dev` si se requiere que sea la verdad absoluta).

12. **Ask: ¿Quieres eliminar la branch feature?**
    - `git branch -d <original-branch>` (o `-D` si es necesario).

13. **Create New Feature Branch (Optional)**
    - `git checkout -b $ARGUMENTS` if provided.

14. **Summary Report**
    - Provide a summary of commits, merge status, propagation of .gitignore, and cleanup.

## Important Notes

- **Non-Interactive:** Use `--no-edit` in all merges to prevent blocking for manual input.
- **Source of Truth:** Si el usuario indica que la rama actual es la fuente de información final, usar `git reset --hard <branch>` en lugar de un merge tradicional.
- **Pre-merge check:** Nunca cambiar a `dev` si la rama actual tiene cambios sin commitear.
