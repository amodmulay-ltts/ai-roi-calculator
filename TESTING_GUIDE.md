# AI ROI Calculator - Testing Guide

## Phase 1: Engine Tests ✅

**Status**: Golden tests running (24/27 last check, fixes applied)

### How to Run
```bash
npm test
```

### Expected Results
All 27 golden tests should pass with the default scenario:
- ✅ Baseline people cost: ₹1.96 Cr
- ✅ Transition people cost: ₹2.13 Cr  
- ✅ Mature people cost: ₹1.74 Cr
- ✅ Payback month: 13
- ✅ ROI %: 370.87%
- ✅ NPV: ₹29.61 Cr (±1)
- ✅ FTE analysis: Baseline 71.13
- ✅ Effort saving: 17.85%

## Phase 2: Server API Tests 🔄

### How to Run the Server
```bash
npm run dev
```

This starts both server (port 3001) and client (port 5173).

### API Endpoints to Test

#### 1. Health Check
```bash
curl http://localhost:3001/api/health
```
Expected: `{"status":"ok","timestamp":"..."}`

#### 2. Get Defaults
```bash
curl http://localhost:3001/api/defaults
```
Expected: Full default scenario JSON

#### 3. Calculate ROI
```bash
curl -X POST http://localhost:3001/api/calculate \
  -H "Content-Type: application/json" \
  -d '{...scenario JSON...}'
```
Expected: Full results object with financial metrics

#### 4. Export as JSON
```bash
curl -X POST http://localhost:3001/api/export/json \
  -H "Content-Type: application/json" \
  -d '{...scenario JSON...}'
```
Expected: Downloadable JSON file with scenario + results

#### 5. Export PDF HTML Template
```bash
curl -X POST http://localhost:3001/api/export/pdf-html \
  -H "Content-Type: application/json" \
  -d '{...scenario JSON...}'
```
Expected: HTML that can be rendered as PDF

#### 6. Export Excel Data
```bash
curl -X POST http://localhost:3001/api/export/xlsx-data \
  -H "Content-Type: application/json" \
  -d '{...scenario JSON...}'
```
Expected: JSON with sheet data for Excel generation

#### 7. Get Currencies
```bash
curl http://localhost:3001/api/currencies
```
Expected: List of supported currencies with FX rates

### Test Cases

**Test 1: Server startup**
- [ ] Server starts without errors
- [ ] Health endpoint responds with 200
- [ ] Defaults endpoint returns valid scenario

**Test 2: Calculation accuracy**
- [ ] API calculation matches engine tests
- [ ] All financial metrics present and correct
- [ ] Cost breakdown correct
- [ ] FTE analysis correct

**Test 3: Export functionality**
- [ ] JSON export creates valid JSON file
- [ ] PDF HTML template renders properly
- [ ] Excel data structure is correct format
- [ ] File naming follows pattern: `AI-ROI_<ScenarioName>_<YYYY-MM-DD>.ext`

## Phase 3: Client UI Tests 🚀

### How to View the Client
```bash
npm run dev
```
Open http://localhost:5173

### UI Test Cases

**Test 1: Dashboard Loads**
- [ ] Page loads without errors
- [ ] Default scenario is loaded
- [ ] "Loading..." message doesn't persist

**Test 2: Key Metrics Display**
- [ ] Payback Month shows: 13
- [ ] ROI % shows: 370.87%
- [ ] NPV shows: ₹29.61 Cr (formatted)
- [ ] Mature Monthly Saving shows correct value

**Test 3: Cost Table**
- [ ] All three states visible (Baseline, Transition, Mature)
- [ ] People Cost values correct
- [ ] Direct OPEX values correct
- [ ] Fully Loaded values correct
- [ ] "vs Baseline" column shows correct deltas

**Test 4: FTE Analysis**
- [ ] Staffing FTE: Baseline 72, Transition 75.2, Mature 62
- [ ] Effort FTE: Baseline 71.13, with gaps shown
- [ ] Effort Saving: 17.85% shown for mature state

**Test 5: Financial Summary**
- [ ] Total Investment: ₹1 Cr
- [ ] Total Savings: ₹4.71 Cr (36 months)
- [ ] Net Benefit: ₹3.71 Cr
- [ ] Break-even Month: 7
- [ ] Payback Month: 13
- [ ] IRR: ~37% (if calculated)

**Test 6: Responsive Design**
- [ ] Desktop (1920px): All columns visible
- [ ] Tablet (768px): Layout adapts gracefully
- [ ] Mobile (375px): Content readable, no overflow

**Test 7: Dark Mode** (if implemented)
- [ ] Toggle switches theme
- [ ] Text readable in both modes
- [ ] Charts visible in both modes

## Phase 4: End-to-End Tests 🎯

### Complete User Journey

**Scenario 1: View default analysis**
1. [ ] User opens http://localhost:5173
2. [ ] Dashboard loads in <2 seconds
3. [ ] All default values display correctly
4. [ ] Can scroll through all sections
5. [ ] Visual layout is professional and clear

**Scenario 2: Export report**
1. [ ] User clicks "Export as PDF" button (phase 3)
2. [ ] PDF downloads with correct filename
3. [ ] PDF contains all sections: Cover, Summary, Tables, Charts
4. [ ] Currency formatting correct in PDF
5. [ ] PDF is readable and professional

**Scenario 3: Modify scenario** (future)
1. [ ] User changes horizon from 36 to 48 months
2. [ ] Results recalculate in <100ms
3. [ ] All metrics update correctly
4. [ ] Can save modified scenario as JSON
5. [ ] Can reload saved scenario

## Test Data

### Default Scenario Values
- **Company**: LTTS (default)
- **Use Case**: AI-Augmented Software Testing
- **Baseline FTE**: 72 (mix of roles)
- **Baseline Monthly Cost**: ₹23.57 Cr
- **Transition Length**: 3 months
- **Investment**: ₹1 Cr (setup, training, other)
- **Horizon**: 36 months
- **Discount Rate**: 10% per year

### Key Calculations
| Metric | Baseline | Transition | Mature |
|--------|----------|-----------|--------|
| Monthly Cost | ₹23.57 Cr | ₹26.88 Cr | ₹21.99 Cr |
| Savings/Month | - | -₹3.31 Cr | +₹1.58 Cr |
| FTE | 72 | 75.2 | 62 |
| Effort Saving % | - | - | 17.85% |

## Browser Testing

### Supported Browsers
- [ ] Chrome 90+
- [ ] Firefox 88+
- [ ] Safari 14+
- [ ] Edge 90+

### JavaScript Console
- [ ] No errors or warnings
- [ ] All network requests successful (200/201)
- [ ] No unhandled promise rejections

## Performance Testing

### Load Time Targets
- [ ] Initial page load: <2 seconds
- [ ] Calculation (client-side): <100ms
- [ ] Server API response: <500ms
- [ ] Export generation: <2 seconds

### Memory Usage
- [ ] Dashboard: <50MB (initial)
- [ ] After calculation: <100MB
- [ ] After export: <150MB

## Security Testing

- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities
- [ ] Rate limiting works (>100 requests in 15min → 429)
- [ ] CORS properly configured
- [ ] No sensitive data in logs or exports

## Accessibility Testing

- [ ] Keyboard navigation works (Tab key)
- [ ] Screen reader compatible (ARIA labels)
- [ ] Contrast ratio ≥ 4.5:1 (WCAG AA)
- [ ] Focus indicators visible
- [ ] Form inputs labeled properly

## Known Issues to Test

### None yet - first release phase

---

## Test Report Template

### Test Run Date
- **Date**: [YYYY-MM-DD]
- **Tester**: [Name]
- **Browser**: [Chrome/Firefox/etc] [Version]
- **Environment**: [localhost/staging/prod]

### Results Summary
- [ ] Engine Tests: [PASS/FAIL] - [X/27] passing
- [ ] Server Tests: [PASS/FAIL] - [X/7] endpoints working
- [ ] Client Tests: [PASS/FAIL] - [X/5] features working
- [ ] E2E Tests: [PASS/FAIL]

### Issues Found
1. [Issue description, steps to reproduce, severity]
2. [...]

### Recommendations
- [Suggestion for improvement]
- [...]

---

## Quick Test Checklist

```
PHASE 1: ENGINE
- [ ] npm test passes all 27 golden tests
- [ ] All calculations within ±0.5% of expected values

PHASE 2: SERVER API
- [ ] Server starts without errors
- [ ] All 6+ API endpoints respond correctly
- [ ] Calculations match engine tests
- [ ] Exports generate without errors

PHASE 3: CLIENT UI  
- [ ] Dashboard loads and displays defaults
- [ ] All metrics and tables show correct values
- [ ] Responsive design works on mobile/tablet
- [ ] No console errors

PHASE 4: END-TO-END
- [ ] Complete user journey works smoothly
- [ ] Export files are usable and professional
- [ ] Performance targets met
- [ ] No security issues
```

## Feedback

Report issues in the format:
```
**Issue**: [Clear title]
**Steps to Reproduce**: [Step by step]
**Expected**: [What should happen]
**Actual**: [What happened instead]
**Severity**: [Critical/High/Medium/Low]
**Environment**: [Browser, OS, URL]
```
