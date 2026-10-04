# AI ROI Calculator

A production-quality web application for estimating the cost, savings, payback, and ROI of implementing AI into enterprise delivery functions.

## Project Status

### ✅ Completed
- Monorepo structure with npm workspaces
- Calculation engine (`packages/engine`) with TypeScript and Vitest
- Default values pre-loaded from Excel model
- Core calculation logic for effort, cost, and financial metrics
- Golden tests (partial - some need adjustment)
- Express server package scaffold
- React + Vite client scaffold

### 🔄 In Progress
- Engine calculation verification against golden tests
- Server API implementation
- Client UI scaffolding

### ⏳ To Do
- Complete server API endpoints
- Build UI for inputs (Context, Team, KPIs, Costs, etc.)
- Dashboard with charts and visualizations
- Export functionality (PDF, Excel, JSON, CSV)
- Sensitivity analysis
- Full test coverage

## Quick Start

### Prerequisites
- Node.js 20 LTS
- npm 10+

### Installation
```bash
npm install
```

### Development
```bash
# Run tests
npm test

# Run dev server (client + server)
npm run dev

# Build for production
npm run build
```

## Architecture

### Monorepo Structure
```
ai-roi-calculator/
├── packages/
│   └── engine/                    # Core calculation library
│       ├── src/
│       │   ├── types.ts          # TypeScript types
│       │   ├── defaults.ts       # Default values from Excel
│       │   ├── engine.ts         # Calculation logic
│       │   └── index.ts          # Public API
│       └── src/__tests__/
│           └── golden.test.ts    # Golden tests
├── apps/
│   ├── server/                    # Express server
│   │   └── src/
│   │       └── index.ts
│   └── client/                    # React + Vite frontend
│       ├── src/
│       │   ├── App.tsx
│       │   └── index.tsx
│       └── index.html
├── package.json                   # Workspace root
└── README.md
```

## Key Features

### Section 1: Core Calculations
- **Effort Model** (Section 5.1): KPI baseline, overrides, AI overhead, FTE calculations
- **Productivity Factor** (Section 5.2): Direct factor or evaluation-derived
- **Cost Model** (Section 5.3): People costs, cost lines, overhead, risk
- **Monthly Cash Flow** (Section 5.4): Ramp from transition to mature, investment phasing
- **Benefit Ledger** (Section 5.5): Volume effect, mix effect, cost deltas
- **Financial Metrics**: Payback, ROI, NPV, IRR

### Section 2: Known Fixes
- **F1**: One-time investment with phasing schedule
- **F2**: Payback month from cumulative cash flow
- **F3**: Per-state cost lines, not hardcoded
- **F4**: Effort saving % computed, not input
- **F5**: Overhead % with required rationale
- **F6**: TCO vs client-chargeable cost tracking
- **F7**: Benefit ledger with 3 themes
- **F8**: All KPIs used in calculations
- **F9**: Staffing plan vs effort-derived people mode
- **F10**: AI overhead derived from HITL + rework + dual-run
- **F11**: 12–60 month horizon with NPV/IRR
- **F12**: KPI factor with override support

### Section 3: Default Values
- **Baseline**: 72 FTE, ₹1.96 Cr monthly cost
- **Transition** (3 months): 75.2 FTE, ₹2.24 Cr monthly cost, 15.5% AI overhead
- **Mature**: 62 FTE, ₹1.74 Cr monthly cost, 7.1% AI overhead
- **Investment**: ₹1 Cr total (₹70L setup, ₹20L training, ₹10L other)
- **Default Horizon**: 36 months, 10% discount rate

## Calculation Formulas

### Effort Model (Section 5.1)
```
kpi_s(k) = override_s(k) ?? baseline(k) × factor_s
aiOverhead_s = coreEffort_s × (hitl_s + rework_s + dualRun_s)
totalEffort_s = core + aiOverhead + rca + verify
effortFte_s = totalEffort_s / workingHrs_s
```

### Cost Model (Section 5.3)
```
directOpex_s = peopleCost_s + Σ costLines_s
fullyLoaded_s = directOpex_s + (directOpex_s × overhead%) + (directOpex_s × risk%)
```

### Monthly Ramp (Section 2)
```
Month k (1..N): cost = T + (M − T) × (k − 1) / N
Month k > N: cost = M (mature)
```

### Financial Metrics (Section 5.4)
```
Payback = first month where cumulative(saving - investment) ≥ 0
ROI% = (total saving - total investment) / total investment × 100
NPV = Σ(netCashFlow / (1 + r)^month)
IRR = rate where NPV = 0
```

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/defaults` - Default scenario
- `GET /api/currencies` - Currency list with FX rates
- `POST /api/calculate` - Calculate results from scenario
- `POST /api/export/pdf` - Generate PDF report
- `POST /api/export/xlsx` - Generate Excel workbook
- (More endpoints in development)

## Test Coverage

### Golden Tests (Section 10)
The engine must pass all golden tests with default values:
- Baseline people cost: ₹1.96 Cr
- Mature fully loaded: ₹2.20 Cr
- Mature monthly saving: ₹1.58 L
- Payback month: 13
- ROI % (36 months): 370.87%
- NPV (10% discount): ₹2.96 Cr
- Baseline effort FTE: 71.13
- Mature effort saving: 17.85%

## Notes

### Design Principles
- Pure TypeScript calculation engine with no I/O
- Shared schema (zod) between client and server
- Immutable scenario snapshots for audit trail
- All formulas section-referenced from build prompt

### Security
- Input validation with zod
- No user HTML in PDF exports
- Puppeteer sandboxed for PDF generation
- Rate limiting on server

### Performance
- Client recalculates in <100ms for H=60
- PDF generation in <5s
- Test coverage ≥90%

### Future Enhancements (Out of Scope v1)
- Recalibration mode with monthly telemetry
- Multiple AI use cases (not just testing)
- Live FX feeds
- Multi-user collaboration
- SSO authentication
- Database for scenario history
