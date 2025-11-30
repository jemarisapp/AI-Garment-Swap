# Git & GitHub Setup Guide

This guide will help you set up version control for your AI Garment Swap project using Git and GitHub.

## Initial Setup

### 1. Initialize Git Repository

```bash
# Initialize git in your project
git init

# Add all files (respecting .gitignore)
git add .

# Create your first commit
git commit -m "feat: initial project setup"
```

### 2. Create GitHub Repository

1. Go to [GitHub](https://github.com) and sign in
2. Click the "+" icon in the top right → "New repository"
3. Name it (e.g., `ai-garment-swap`)
4. **DO NOT** initialize with README, .gitignore, or license (we already have these)
5. Choose visibility (Public or Private)
6. Click "Create repository"

### 3. Connect Local Repository to GitHub

```bash
# Add the remote repository (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/ai-garment-swap.git

# Rename default branch to 'main' (if needed)
git branch -M main

# Push your code to GitHub
git push -u origin main
```

## Best Practices

### 1. Branch Strategy

**Main Branch:**
- `main` or `master` - Production-ready code
- Always keep this branch stable and deployable

**Development Branches:**
- Create feature branches for new work
- Use descriptive names: `feature/image-upload`, `fix/loading-spinner`
- Delete branches after merging

**Example Workflow:**
```bash
# Create and switch to a new feature branch
git checkout -b feature/new-feature

# Make your changes, then commit
git add .
git commit -m "feat: add new feature"

# Push to GitHub
git push -u origin feature/new-feature

# Create a Pull Request on GitHub, then merge
# After merging, delete the branch locally
git checkout main
git pull origin main
git branch -d feature/new-feature
```

### 2. Commit Message Guidelines

Follow [Conventional Commits](https://www.conventionalcommits.org/):

**Format:**
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring
- `test`: Adding/updating tests
- `chore`: Maintenance tasks (dependencies, build config, etc.)

**Examples:**
```bash
git commit -m "feat(api): add image validation to swap endpoint"
git commit -m "fix(ui): resolve loading spinner display issue"
git commit -m "docs(readme): update installation instructions"
git commit -m "refactor(server): improve error handling in API routes"
```

### 3. What NOT to Commit

**Never commit:**
- API keys or secrets (use `.env.local` which is in `.gitignore`)
- `node_modules/` directory
- Build artifacts (`dist/`, `build/`)
- Personal IDE settings (unless shared with team)
- Large binary files
- Temporary files

**Always commit:**
- Source code
- Configuration files (without secrets)
- Documentation
- Tests
- `.gitignore`
- `package.json` and `package-lock.json`

### 4. Regular Workflow

**Daily workflow:**
```bash
# Start your day - get latest changes
git checkout main
git pull origin main

# Create a branch for your work
git checkout -b feature/your-feature

# Make changes, then stage and commit
git add .
git commit -m "feat: your descriptive message"

# Push your branch
git push -u origin feature/your-feature

# Create Pull Request on GitHub, get review, merge
```

### 5. Handling Secrets

**Important Security Practices:**

1. **Never commit `.env.local`** - It's already in `.gitignore`
2. **Use `.env.example`** - Document required variables (without values)
3. **Use GitHub Secrets** - For CI/CD pipelines (Actions → Secrets)
4. **Rotate keys** - If you accidentally commit a key, rotate it immediately

**If you accidentally commit a secret:**
```bash
# Remove from history (use with caution!)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env.local" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (coordinate with team first!)
git push origin --force --all
```

### 6. Pull Requests

**Before creating a PR:**
- [ ] Code follows project style guidelines
- [ ] All tests pass
- [ ] Documentation updated if needed
- [ ] Commit messages follow conventions
- [ ] Branch is up to date with `main`

**PR Description should include:**
- What changes were made
- Why the changes were made
- How to test the changes
- Screenshots (if UI changes)
- Related issue numbers

### 7. Keeping Your Fork Updated

If you forked the repository:

```bash
# Add upstream remote
git remote add upstream https://github.com/ORIGINAL_OWNER/ai-garment-swap.git

# Fetch upstream changes
git fetch upstream

# Merge upstream changes into your main branch
git checkout main
git merge upstream/main

# Push to your fork
git push origin main
```

### 8. Useful Git Commands

```bash
# Check status
git status

# View commit history
git log --oneline --graph --all

# See what changed
git diff

# Undo changes (before staging)
git checkout -- <file>

# Unstage a file
git reset HEAD <file>

# Amend last commit (before pushing)
git commit --amend

# Stash changes temporarily
git stash
git stash pop

# View remote repositories
git remote -v
```

## GitHub Repository Settings

### Recommended Settings:

1. **Branches:**
   - Protect `main` branch
   - Require pull request reviews
   - Require status checks to pass

2. **Security:**
   - Enable Dependabot alerts
   - Enable secret scanning

3. **Features:**
   - Enable Issues
   - Enable Discussions (optional)
   - Enable Wiki (optional)

4. **Actions:**
   - Set permissions appropriately
   - Enable workflows

## Next Steps

1. ✅ Initialize git repository
2. ✅ Create GitHub repository
3. ✅ Push initial code
4. ✅ Set up branch protection (optional but recommended)
5. ✅ Configure GitHub Actions (optional)
6. ✅ Add collaborators (if working with a team)

## Resources

- [Git Documentation](https://git-scm.com/doc)
- [GitHub Guides](https://guides.github.com/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Flow](https://guides.github.com/introduction/flow/)

## Need Help?

- Check the [CONTRIBUTING.md](./CONTRIBUTING.md) file
- Open an issue on GitHub
- Review GitHub's documentation

