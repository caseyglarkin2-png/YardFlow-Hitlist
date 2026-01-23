# Production Rollback Procedure

## Quick Reference

**Production URL**: https://yard-flow-hitlist.vercel.app

**When to Rollback**:
- Error rate > 5% (check Vercel logs)
- Critical feature broken (auth, dashboard, API)
- Database corruption detected

## Rollback Steps

### 1. List Deployments

```bash
vercel ls --prod
```

### 2. Rollback to Previous

```bash
vercel rollback
# Select the previous deployment from the list
```

### 3. Verify

```bash
# Check production
curl https://yard-flow-hitlist.vercel.app/api/health

# Expected: 200 OK
```

## Expected Rollback Time

- **Code rollback**: < 2 minutes
- **Total downtime**: < 2 minutes
