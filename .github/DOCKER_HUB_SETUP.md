# Docker Hub Setup for CI/CD

## Issue

The GitHub Actions workflows `deploy-dashboard.yml` and `deploy-bot.yml` fail at the "Log in to Docker Hub" step with the error:

```
##[error]Username and password required
```

## Root Cause

The Docker Hub authentication secrets (`DOCKER_USERNAME` and `DOCKER_PASSWORD`) are either:
- Not configured in the repository settings
- Set but empty/invalid
- Not accessible to the workflow

## Solution

### Step 1: Create a Docker Hub Access Token

**Important**: Use an access token instead of your Docker Hub password for better security.

1. Log in to [Docker Hub](https://hub.docker.com)
2. Go to **Account Settings** → **Security** → **Access Tokens**
3. Click **"New Access Token"**
4. Configure the token:
   - **Description**: `GitHub Actions - TiltCheck`
   - **Access permissions**: `Read & Write` (or `Read, Write, Delete` if you need full control)
5. Click **Generate**
6. **Copy the token immediately** - you won't be able to see it again!

### Step 2: Add Secrets to GitHub Repository

1. Go to your GitHub repository: https://github.com/jmenichole/tiltcheck-monorepo
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**

Add two secrets:

**Secret 1: DOCKER_USERNAME**
- Name: `DOCKER_USERNAME`
- Value: Your Docker Hub username (e.g., `jmenichole`)

**Secret 2: DOCKER_PASSWORD**
- Name: `DOCKER_PASSWORD`  
- Value: The access token you created in Step 1 (NOT your Docker Hub password)

### Step 3: Verify the Setup

1. Push a commit to the `main` branch (or trigger a workflow manually)
2. Go to **Actions** tab in your repository
3. Watch the workflow run
4. The "Validate Docker Hub credentials" step should pass
5. The "Log in to Docker Hub" step should succeed
6. The "Push to Docker Hub" step should complete successfully

## Validation

The workflows now include a validation step that checks if the credentials are configured before attempting to log in. This provides a clearer error message if the secrets are missing:

```yaml
- name: Validate Docker Hub credentials
  if: github.event_name != 'pull_request'
  run: |
    if [ -z "${{ secrets.DOCKER_USERNAME }}" ] || [ -z "${{ secrets.DOCKER_PASSWORD }}" ]; then
      echo "::error::Docker Hub credentials are not configured."
      exit 1
    fi
```

## Security Best Practices

✅ **DO**:
- Use Docker Hub access tokens instead of passwords
- Set token permissions to the minimum required (Read & Write for CI/CD)
- Rotate tokens periodically (every 90 days recommended)
- Revoke tokens immediately if compromised
- Use different tokens for different purposes

❌ **DON'T**:
- Use your Docker Hub account password in CI/CD
- Share tokens across multiple repositories (create separate tokens)
- Commit tokens to code or configuration files
- Use tokens with excessive permissions

## Troubleshooting

### Error: "Username and password required"
- **Cause**: Secrets are not set or are empty
- **Fix**: Follow Step 2 above to add the secrets

### Error: "unauthorized: authentication required"
- **Cause**: Invalid credentials or expired token
- **Fix**: Regenerate the access token and update the `DOCKER_PASSWORD` secret

### Error: "denied: requested access to the resource is denied"
- **Cause**: Token permissions are insufficient or Docker Hub username is incorrect
- **Fix**: Verify `DOCKER_USERNAME` matches your Docker Hub username exactly (case-sensitive)
- **Fix**: Ensure the token has `Read & Write` permissions

### Images not appearing in Docker Hub
- **Cause**: The Docker image name might not match your Docker Hub username
- **Fix**: Verify the workflow uses `${{ secrets.DOCKER_USERNAME }}/image-name` format
- **Example**: `docker push ${{ secrets.DOCKER_USERNAME }}/tiltcheck-dashboard:latest`

## Additional Resources

- [Docker Hub Access Tokens Documentation](https://docs.docker.com/docker-hub/access-tokens/)
- [GitHub Actions Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [docker/login-action Documentation](https://github.com/docker/login-action)

## Related Files

- `.github/workflows/deploy-dashboard.yml` - Dashboard deployment workflow
- `.github/workflows/deploy-bot.yml` - Discord bot deployment workflow  
- `DOCKER.md` - Docker deployment guide
- `DEPLOYMENT.md` - General deployment documentation
