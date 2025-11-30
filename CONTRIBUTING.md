# Contributing to AI Garment Swap

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to this project.

## Getting Started

1. **Fork the repository** and clone your fork locally
2. **Install dependencies**: `npm install`
3. **Set up environment variables**: Copy `.env.example` to `.env.local` and add your API keys
4. **Create a branch** for your changes: `git checkout -b feature/your-feature-name`

## Development Workflow

### Branch Naming Convention
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions/updates

### Commit Message Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Test additions/changes
- `chore`: Maintenance tasks

**Examples:**
```
feat(api): add image validation to swap endpoint
fix(ui): resolve loading spinner display issue
docs(readme): update installation instructions
```

### Code Style

- Use TypeScript for type safety
- Follow existing code formatting
- Add comments for complex logic
- Keep functions focused and small
- Use meaningful variable and function names

### Testing

- Test your changes locally before submitting
- Ensure all existing tests pass
- Add tests for new features when applicable

## Pull Request Process

1. **Update documentation** if you've changed functionality
2. **Ensure your code follows the project's style guidelines**
3. **Update the CHANGELOG.md** (if applicable) with your changes
4. **Create a pull request** with a clear description
5. **Link any related issues** in your PR description

## Code Review

- All PRs require review before merging
- Address review comments promptly
- Be open to feedback and suggestions

## Questions?

If you have questions, please open an issue with the `question` label.

Thank you for contributing! 🎉

