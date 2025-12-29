# 7. CI/CD Pipeline with GitHub Actions

Date: 2025-12-29

## Status

Accepted

## Context

As the project grows, manual verification of code quality (linting, building) and manual deployment via SSH become error-prone and inefficient. ensuring that every Pull Request is automatically checked and that every push to the main branch is automatically deployed is crucial for maintaining development velocity and code stability. We need a standardized way to enforce these checks and automate the deployment process.

## Decision

We have decided to implement a CI/CD pipeline using **GitHub Actions**.

The workflow consists of three main stages:

1.  **Lint**: Runs `prettier --check .` to enforce code formatting standards.
2.  **Build**: Runs `npm run build` (which includes both client and server compilations and type checking) to ensure the codebase is valid and buildable.
3.  **Deploy**: Uses `appleboy/ssh-action` to execute a deployment script on the remote server via SSH.

### Workflow Triggers

- **Pull Requests (to `main`)**: Triggers `lint` and `build` jobs. Failure of these jobs blocks the PR merge.
- **Push (to `main`)**: Triggers `lint`, `build`, and, upon success, `deploy`.

## Consequences

### Positive

- **Automated Quality Control**: Every PR is fenced by linting and build checks, preventing broken code or bad formatting from reaching `main`.
- **Consistent Deployments**: Deployments are automated and deterministic, reducing the risk of human error during manual deployment.
- **Visibility**: Build status is visible directly in GitHub PRs and commit history.

### Negative

- **Setup Complexity**: Requires managing GitHub Secrets (`SSH_HOST`, `SSH_USER`, `SSH_KEY`, etc.) for the deployment to work.
- **Compute Time**: Uses GitHub Actions runner minutes each time a PR or push occurs.

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [appleboy/ssh-action](https://github.com/appleboy/ssh-action)
