# YardFlow Project Principles
## Core Values & Methodologies

**Last Updated**: January 23, 2026  
**Status**: ✅ ACTIVE

---

## 🎯 Mission

Build the fastest, most intelligent prospecting platform for Manifest 2026 and beyond.

**Key Result**: 2-3x faster prospecting with AI-powered insights at $0/month cost.

---

## 🚀 Core Principles

### 1. **Ship Fast, Ship Often**
> "Production is not scary. Staging that differs from production is scary."

- Deploy after every task (60-120 min cycles)
- Production IS your testing environment
- No circuitous build cycles
- Build time < 5 minutes per task

**See**: [DEPLOYMENT_PHILOSOPHY.md](DEPLOYMENT_PHILOSOPHY.md)

### 2. **Atomic & Committable Tasks**
> "Every commit is production-ready."

- Each task: 2-6 hours, independently testable
- No "WIP" commits
- Tests must pass before push
- Every commit is demoable

### 3. **Free > Paid Services**
> "Intelligence over infrastructure spend."

- Google Gemini Pro ($0/month) over OpenAI ($149/month) ✅
- Pattern detection over Hunter.io API quotas ✅
- Web scraping over paid enrichment services ✅
- **Result**: $1,788/year saved

### 4. **Build for Manifest 2026**
> "Every feature should help close deals at the booth."

- Facility intelligence for waste management
- Strategic questions for booth conversations
- Brand voice content for sequences
- Real-time dossiers on prospects

### 5. **Data Quality > Data Quantity**
> "88% email coverage with validation beats 100% guesses."

- Email pattern detection with DNS MX validation
- Confidence scoring on AI estimates
- Multi-source enrichment with quality checks
- Facility intelligence with reasoning

---

## 💻 Development Workflow

### Task Lifecycle (60-120 min):
```
1. Read sprint plan (5 min)
2. Code feature (30-90 min)
3. Write tests (15-30 min)
4. Commit + Push (1 min) → Auto-deploy to production
5. Verify in production (5 min)
6. Move to next task
```

### Sprint Structure:
- **Sprint Duration**: 3-10 days
- **Task Size**: 2-6 hours each
- **Deploys**: After every task
- **Documentation**: Updated with each sprint

**Recent Example**: Sprint 21B
- 3 tasks completed in 3 hours
- 5 production deploys
- 20 files, 2,544 lines of code
- Zero downtime

---

## 📊 Success Metrics

### Development Speed:
- ✅ Feature live in 60-120 min (not days)
- ✅ Build time < 5 min
- ✅ Zero downtime deploys

### Cost Efficiency:
- ✅ $1,788/year saved (Gemini vs OpenAI)
- ✅ $0/month enrichment (pattern detection vs Hunter.io)
- ✅ Free tier services prioritized

### Data Quality:
- ✅ 88% email coverage (up from 22%)
- ✅ 70% LinkedIn coverage (up from 0%)
- ✅ Facility intelligence with confidence scoring

### User Impact:
- ✅ 2-3x faster prospecting
- ✅ Complete contact profiles
- ✅ Smart prioritization with heat scores
- ✅ AI-powered booth prep

---

## 🛠️ Tech Stack Philosophy

### Frontend:
- **Next.js 14** - Server components, App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Rapid styling
- **Shadcn/ui** - Accessible components

### Backend:
- **PostgreSQL** - Reliable, proven
- **Prisma ORM** - Type-safe database access
- **Next.js API Routes** - Serverless functions

### AI/ML:
- **Google Gemini Pro** - FREE tier, structured output
- **Pattern Detection** - Custom algorithms
- **Web Scraping** - BeautifulSoup approach in TypeScript

### Deployment:
- **Vercel** - Auto-deploy on push
- **GitHub** - Version control + CI/CD
- **Zero Config** - Just push to deploy

---

## 📝 Documentation Standards

### Every Sprint Produces:
1. **Sprint Plan** - Detailed tasks with acceptance criteria
2. **Completion Doc** - What shipped, metrics, screenshots
3. **Updated Status** - CURRENT_STATUS.md
4. **Code Comments** - Why, not what

### File Naming:
- `SPRINT_XX_NAME.md` - Sprint plans
- `SPRINT_XX_COMPLETE.md` - Completion summaries
- `FEATURE_ANALYSIS.md` - Feature documentation

---

## 🔄 Continuous Improvement

### What We Optimize:
- **Deploy frequency** - Ship more, ship faster
- **Task granularity** - Smaller tasks, clearer goals
- **Cost efficiency** - Free services first
- **User value** - Features that close deals

### What We Don't Optimize Prematurely:
- Database query speed (unless measurably slow)
- Code abstraction (until 3rd use case)
- Scalability (until we hit limits)

---

## 🎓 Learning from Experience

### Sprint 21B Lessons:
1. **Ship to production immediately** - Found regex bug in production build ✅
2. **Atomic tasks work** - 3 tasks = 3 deploys = 3 features live
3. **Tests prevent regressions** - 25 tests caught issues early
4. **Free services rock** - Gemini Pro matches OpenAI at $0/month

---

## 🚫 Anti-Patterns (What We Avoid)

### ❌ Don't:
- Wait for "perfect" before shipping
- Build features users didn't request
- Optimize without measuring
- Create staging environments that differ from production
- Use paid services when free alternatives exist
- Create monolithic tasks >6 hours
- Skip tests "just this once"

### ✅ Do:
- Ship small, ship often
- Build for Manifest 2026 use cases
- Optimize based on production metrics
- Keep staging identical to production
- Evaluate free services first
- Break tasks into 2-6 hour chunks
- Write tests for every feature

---

## 🎯 2026 Goals

### Q1 (Jan-Mar):
- ✅ Sprint 18-21 complete
- 🔄 Sprint 22-24 (Sequences, Mobile, Analytics)
- 📅 Manifest 2026 prep

### Manifest 2026:
- 2,653 companies with facility intelligence
- 5,409 contacts with complete profiles
- Multi-channel sequences ready
- AI-powered booth conversations

### Post-Manifest:
- 10,000+ contacts enriched
- Advanced analytics on conversion
- Team collaboration features
- Mobile app for field reps

---

## 📚 Key Documents

- [DEPLOYMENT_PHILOSOPHY.md](DEPLOYMENT_PHILOSOPHY.md) - Ship fast, ship often
- [CURRENT_STATUS_JAN22.md](CURRENT_STATUS_JAN22.md) - Up-to-date platform status
- [SPRINT_21_PATTERN_ENRICHMENT.md](SPRINT_21_PATTERN_ENRICHMENT.md) - Sprint 21A+B plan
- [SPRINT_21B_COMPLETE.md](SPRINT_21B_COMPLETE.md) - Gemini integration results

---

## 🎉 Wins to Date

- **26 deploys** across 21 sprints
- **$1,788/year** saved in AI costs
- **88% email coverage** (up from 22%)
- **Zero downtime** across all deploys
- **2-3x faster** prospecting workflow

---

**Remember**: 
> "Perfect is the enemy of shipped. Ship fast, iterate faster."

**Status**: ✅ These are our principles. This is how we build.
