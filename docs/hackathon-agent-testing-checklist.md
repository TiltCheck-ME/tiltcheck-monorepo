# AI CI/CD Validator Hackathon Test Checklist

Use this checklist to verify your agent setup and run the MR validation test flow.

## 1) Prerequisites

- [ ] Merge `!253`
- [ ] Merge `!255`
- [ ] Create Git tag `v1.0.0` from `main`
- [ ] Set Duo namespace to **GitLab AI Hackathon** in user preferences

## 2) Test the agent on the test MR

Open MR `!254` and add this exact comment:

```text
@ai-ci-cd-validator-jmenichole1-tiltcheck-monorepo please review this CI configuration
```

Expected behavior: the agent replies with CI analysis and can flag issues such as:

- Node.js version mismatch (`package.json` expects >=18 while CI uses Node 16)
- Missing environment variables
- Outdated Docker image references

## 3) If no response appears

1. Confirm `v1.0.0` exists and points to the intended `main` commit.
2. Wait 10–30 seconds and retry the mention comment.
3. Re-check agent configuration and namespace.

## 4) Quick pass/fail log (fill in)

- [ ] `!253` merged
- [ ] `!255` merged
- [ ] `v1.0.0` tag created from `main`
- [ ] Duo namespace set correctly
- [ ] Agent mention posted on `!254`
- [ ] Agent responded with CI review

Result: `PASS / FAIL`
