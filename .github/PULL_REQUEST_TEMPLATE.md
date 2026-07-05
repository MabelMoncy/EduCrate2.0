## Summary
<!-- Describe what changed and why. -->

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to change)
- [ ] Security fix (addresses a vulnerability)
- [ ] Dependencies update

## Production Readiness Checklist
- [ ] CI build passes for server and client
- [ ] Relevant tests pass locally
- [ ] Lint/build checks were run for impacted apps
- [ ] Environment variables were reviewed and `.env.example` updated if needed
- [ ] Domain/CORS settings were validated for production
- [ ] Google Analytics tag configuration was tested (if applicable)
- [ ] Google AdSense integration/`ads.txt` was validated (if applicable)

## Security Checklist
<!-- Check all that apply to this PR -->
- [ ] No secrets or API keys are hardcoded
- [ ] New endpoints have appropriate authentication middleware
- [ ] User input is validated and sanitized
- [ ] File uploads follow the multi-layer validation pipeline
- [ ] Error messages don't expose internal details
- [ ] Rate limiting is applied to new endpoints if needed
- [ ] CORS/CSP headers are not weakened
- [ ] Dependencies have no known HIGH/CRITICAL CVEs

## Validation Notes
<!-- Provide command outputs, screenshots, or links to workflow runs. -->
