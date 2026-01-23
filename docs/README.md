# Documentation Index

This directory contains all project documentation, organized for clarity and maintainability.

## 📁 Structure

### `/current` - Current Documentation
**Single source of truth for active development**

- **[SPRINT_30_PRODUCTION_HARDENING.md](current/SPRINT_30_PRODUCTION_HARDENING.md)** ⭐ **PRIMARY REFERENCE**
  - Complete production hardening plan (1161 lines)
  - All P0/P1/P2 tasks with estimates
  - Production deployment checklist
  - **USE THIS** for current sprint execution

- **[SPRINT_30_QUICK_REFERENCE.md](current/SPRINT_30_QUICK_REFERENCE.md)**
  - Quick task lookup
  - Command reference
  - API endpoints
  - Troubleshooting guide

- **[PROJECT_PRINCIPLES.md](current/PROJECT_PRINCIPLES.md)**
  - Development philosophy
  - Coding standards
  - Deployment guidelines
  - "Ship small, ship often, ship fearlessly"

### `/archive` - Historical Documentation
**Organized by category, for reference only**

#### `/archive/sprints`
Completed sprint documentation:
- Sprint 0-29 summaries
- Historical sprint plans
- Retrospective notes
- Execution reports

#### `/archive/deployments`
Deployment history and guides:
- Railway deployment logs
- Vercel migration attempts
- Rollback procedures
- Deployment checklists

#### `/archive/status-reports`
Historical status updates:
- Daily status reports
- Morning briefings
- Session summaries
- Weekly updates

#### `/archive/plans`
Feature plans and analyses:
- Comprehensive feature plans
- Technical analyses
- QA test reports
- Bug audit reports
- Integration guides

## 🎯 Quick Navigation

**Working on Sprint 30?**
→ Start with [SPRINT_30_PRODUCTION_HARDENING.md](current/SPRINT_30_PRODUCTION_HARDENING.md)

**Need quick command?**
→ Check [SPRINT_30_QUICK_REFERENCE.md](current/SPRINT_30_QUICK_REFERENCE.md)

**Deploying to production?**
→ See [SPRINT_30_PRODUCTION_HARDENING.md](current/SPRINT_30_PRODUCTION_HARDENING.md) § Production Deployment

**Looking for old sprint info?**
→ Browse [archive/sprints/](archive/sprints/)

**Need deployment history?**
→ Check [archive/deployments/](archive/deployments/)

## 📋 Documentation Lifecycle

### When to Archive
Move documentation to archive when:
- Sprint is complete and validated
- Deployment is historical (>1 week old)
- Status report is outdated
- Plan has been executed or superseded

### When to Update Current
Update current docs for:
- Active sprint changes
- Production issues
- Immediate action items
- Current deployment status

### Creating New Docs
New documentation should:
1. Have clear purpose and audience
2. Include creation date
3. Link to related docs
4. Follow consistent formatting
5. Be placed in `/current` if active, or appropriate `/archive` folder if historical

## 🔍 Search Tips

**Find specific topic**:
```bash
grep -r "topic" docs/current/  # Search current docs only
grep -r "topic" docs/archive/  # Search archives
```

**List all sprint docs**:
```bash
ls -lh docs/archive/sprints/
```

**Find recent updates**:
```bash
find docs/current -type f -mtime -7  # Modified in last 7 days
```

## 📊 Archive Statistics

Run this to see archive contents:
```bash
find docs/archive -type f -name "*.md" | wc -l  # Total archived docs
du -sh docs/archive/*  # Size by category
```

## 🚫 What NOT to Document

Don't create docs for:
- One-off debugging sessions (use git commits)
- Temporary experiments (use feature branches)
- Personal notes (keep local)
- Generated content (regenerate as needed)

## ✅ Documentation Checklist

Before creating a doc, ask:
- [ ] Is this information already documented?
- [ ] Will this be useful >1 week from now?
- [ ] Is this the right location (current vs archive)?
- [ ] Have I linked to related documentation?
- [ ] Is the title clear and searchable?

---

**Maintained by**: Development Team  
**Last Reorganization**: January 23, 2026  
**Philosophy**: Single source of truth, minimal duplication, clear hierarchy
