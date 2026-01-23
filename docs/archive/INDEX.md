# Archive Index

## Overview
This archive contains 51+ historical documents organized by category.

## Categories

### 📅 Sprints (archive/sprints/)
Completed sprint documentation from Sprint 0 through Sprint 29:
- Sprint summaries and completion reports
- Sprint planning documents
- Roadmaps and execution plans
- Sprint breakdowns

**Key Documents**:
- `SPRINT_0_SUMMARY.md` - Initial project setup
- `SPRINT_7-10-11-12_COMPLETE.md` - Mid-project milestone
- `SPRINT_15-19_COMPLETE.md` - Major feature releases
- `SPRINT_24-29_COMPLETE.md` - Pre-production hardening

### 🚀 Deployments (archive/deployments/)
Historical deployment documentation:
- Railway deployment guides and logs
- Vercel migration attempts
- Deployment checklists and procedures
- Rollback documentation

**Key Documents**:
- `RAILWAY_DEPLOY.md` - Railway setup guide
- `VERCEL_DEPLOYMENT_GUIDE.md` - Vercel migration notes
- `ROLLBACK.md` - Rollback procedures
- `DEPLOY_NOW.md` - Emergency deployment guide

### 📊 Status Reports (archive/status-reports/)
Daily and weekly status updates:
- Morning status briefings
- Session summaries
- Current status snapshots
- Wake-up status reports

**Key Documents**:
- `CURRENT_STATUS_JAN22.md` - Pre-hardening status
- `MORNING_STATUS_JAN23.md` - Latest status before reorganization
- `SESSION_SUMMARY.md` - Session wrap-ups
- `WAKE_UP_STATUS.md` - Daily briefings

### 📋 Plans (archive/plans/)
Feature plans and technical analyses:
- Comprehensive feature plans
- Sprint planning documents
- Bug audit reports
- QA test results
- Integration guides
- Technical analyses

**Key Documents**:
- `COMPREHENSIVE_SPRINT_PLAN.md` - Master sprint plan
- `PRODUCTION_READINESS_PLAN.md` - Production prep
- `QA_AND_STABILIZATION_PLAN.md` - Quality assurance
- `BUG_AUDIT_REPORT.md` - Bug tracking
- `GOOGLE_CLOUD_SETUP.md` - Google integration
- `ENRICHMENT_ENHANCEMENTS.md` - Feature enhancements

## 📈 Statistics

```bash
# Total archived documents
find . -name "*.md" | wc -l  # 51 documents

# By category
find sprints -name "*.md" | wc -l          # Sprint docs
find deployments -name "*.md" | wc -l      # Deployment docs
find status-reports -name "*.md" | wc -l   # Status reports
find plans -name "*.md" | wc -l            # Planning docs
```

## 🔍 How to Search

**Find specific topic**:
```bash
grep -r "topic" .
```

**List all files in category**:
```bash
ls -lh sprints/
ls -lh deployments/
ls -lh status-reports/
ls -lh plans/
```

**Find by date**:
```bash
find . -name "*JAN*"
find . -name "*2026*"
```

## ⚠️ Important Notes

1. **These documents are historical** - For current information, see `/docs/current/`
2. **Do not edit archived docs** - They represent point-in-time snapshots
3. **Information may be outdated** - Always verify against current documentation
4. **Use for reference only** - Active development should reference current docs

## 📅 Archive Timeline

- **Sprint 0-7**: Initial development and core features
- **Sprint 8-14**: Enrichment and outreach features
- **Sprint 15-19**: Google integration and training content
- **Sprint 20-23**: Pattern enrichment and HubSpot
- **Sprint 24-29**: Pre-production features and stabilization
- **Sprint 30**: Production hardening (current - see /docs/current/)

## 🔗 Related Documentation

- [Current Documentation](/docs/current/)
- [Main README](/README.md)
- [Sprint 30 (Active)](/docs/current/SPRINT_30_PRODUCTION_HARDENING.md)

---

**Archived**: January 23, 2026  
**Total Documents**: 51  
**Organization**: By category (sprints, deployments, status-reports, plans)
