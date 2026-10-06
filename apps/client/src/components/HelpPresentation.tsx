import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Results } from '@ai-roi-calc/engine';
import { calculate, compareDeliveryModels, createExampleScenario } from '@ai-roi-calc/engine';
import { deliveryModelInfo } from '../utils/deliveryModels';
import { compareFlavours, localBreakEven } from '../utils/aiFlavours';

interface HelpPresentationProps {
  open: boolean;
  onClose: () => void;
  onStartNew: () => void;
}

const eur = (v: number, compact = true) =>
  new Intl.NumberFormat('en', {
    style: 'currency',
    currency: 'EUR',
    notation: compact && Math.abs(v) >= 10_000 ? 'compact' : 'standard',
    maximumFractionDigits: compact && Math.abs(v) >= 10_000 ? 1 : 0,
  }).format(v);
const num = (v: number, digits = 0) => v.toLocaleString('en', { maximumFractionDigits: digits, minimumFractionDigits: digits });
const pct = (v: number) => `${Math.round(v * 100)}%`;
const payback = (r: Results) =>
  r.financialMetrics.paybackNotInHorizon
    ? 'Never (within 36 months)'
    : r.financialMetrics.paybackMonth === null
      ? 'No change'
      : `Month ${r.financialMetrics.paybackMonth}`;

/** Every figure is calculated live from the example, so the walkthrough always matches the engine. */
function useExampleFigures() {
  return useMemo(() => {
    const scenario = createExampleScenario();
    const r = calculate(scenario);
    const g = scenario.globalAssumptions;
    const factor = scenario.productivityFactor.mode === 'direct-factor' ? scenario.productivityFactor : null;
    const matureOverhead = scenario.aiOverheadPercent.mature;

    const models = compareDeliveryModels(scenario).map(m => ({
      id: m.model,
      label: deliveryModelInfo(m.model).label,
      results: m.results,
    }));

    const sensitivity = [0.1, 0.15, 0.2, 0.25, 0.3].map(cut => {
      const s = createExampleScenario();
      if (s.productivityFactor.mode === 'direct-factor') {
        s.productivityFactor.mature = 1 - cut;
        s.productivityFactor.transition = 1 - cut / 2;
      }
      return { cut, results: calculate(s) };
    });

    const localGrid = localBreakEven(scenario);
    const linesMature = r.cost.directOpex.mature - r.cost.peopleCost.mature;
    const linesBaseline = r.cost.directOpex.baseline - r.cost.peopleCost.baseline;

    return {
      scenario,
      r,
      g,
      workload: scenario.kpis.filter(k => k.volumePerMonth !== undefined),
      matureFactor: factor?.mature ?? 1,
      transitionFactor: factor?.transition ?? 1,
      matureOverhead: matureOverhead.hitl + matureOverhead.rework + matureOverhead.dualRun,
      overheadAndRisk: g.corporateOverheadPercent.baseline + g.riskReservePercent.baseline,
      aiCostsAdded: linesMature - linesBaseline,
      lowestCash: Math.min(...r.monthlyForecast.map(m => m.cumulativeCashFlow)),
      breakEvenCut: sensitivity.find(x => x.results.financialMetrics.npv >= 0)?.cut ?? null,
      models,
      sensitivity,
      flavours: compareFlavours(scenario),
      localGrid,
      // Smallest cut that pays back at the middle capacity cost
      localCutNeeded: localGrid[1]!.cells.find(c => c.payback !== null)?.cut ?? null,
    };
  }, []);
}

function Slide({ id, kicker, children }: { id: string; kicker: string; children: ReactNode }) {
  return (
    <section id={id} data-slide aria-label={kicker} className="min-h-screen snap-start flex items-center px-8 md:px-16 py-20">
      <div className="max-w-5xl w-full mx-auto">
        <p className="text-xs font-semibold text-blue-700 uppercase tracking-widest mb-6">{kicker}</p>
        {children}
      </div>
    </section>
  );
}

function Hero({ children }: { children: ReactNode }) {
  return <h2 className="text-5xl md:text-6xl font-bold text-gray-900 tracking-tight leading-tight mb-8">{children}</h2>;
}

function Support({ items }: { items: Array<{ value: string; label: string }> }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-10 max-w-3xl">
      {items.map(i => (
        <div key={i.label}>
          <p className="text-3xl font-semibold text-blue-700">{i.value}</p>
          <p className="text-sm text-gray-600 mt-1">{i.label}</p>
        </div>
      ))}
    </div>
  );
}

function Quiet({ children }: { children: ReactNode }) {
  return <div className="text-sm text-gray-500 max-w-3xl leading-relaxed space-y-2">{children}</div>;
}

export default function HelpPresentation({ open, onClose, onStartNew }: HelpPresentationProps) {
  const f = useExampleFigures();
  const scroller = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [active, setActive] = useState(0);
  const [slideCount, setSlideCount] = useState(0);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    closeButton.current?.focus();
    scroller.current?.scrollTo({ top: 0 });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCloseRef.current();
    document.addEventListener('keydown', onKey);

    const slides = Array.from(scroller.current?.querySelectorAll<HTMLElement>('[data-slide]') ?? []);
    setSlideCount(slides.length);
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => e.isIntersecting && setActive(slides.indexOf(e.target as HTMLElement))),
      { root: scroller.current, threshold: 0.6 }
    );
    slides.forEach(s => observer.observe(s));
    return () => {
      document.removeEventListener('keydown', onKey);
      observer.disconnect();
    };
  }, [open]);

  if (!open) return null;

  const { r, g } = f;
  const best = [...f.models].sort((a, b) => b.results.financialMetrics.npv - a.results.financialMetrics.npv)[0]!;
  const goToSlide = (i: number) =>
    scroller.current?.querySelectorAll<HTMLElement>('[data-slide]')[i]?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div role="dialog" aria-modal="true" aria-label="How VALUEAI works" className="fixed inset-0 z-[60] bg-white">
      <button
        ref={closeButton}
        onClick={onClose}
        className="fixed top-5 right-6 z-10 px-3 py-1.5 text-sm text-gray-600 bg-white/90 border border-gray-200 rounded-lg hover:text-gray-900"
      >
        Close
      </button>

      <nav aria-label="Slides" className="fixed right-6 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-2">
        {Array.from({ length: slideCount }, (_, i) => (
          <button
            key={i}
            aria-label={`Go to slide ${i + 1}`}
            aria-current={i === active ? 'step' : undefined}
            onClick={() => goToSlide(i)}
            className={`w-2 rounded-full transition-all ${i === active ? 'h-6 bg-blue-600' : 'h-2 bg-gray-300 hover:bg-gray-400'}`}
          />
        ))}
      </nav>

      <div ref={scroller} className="h-full overflow-y-scroll snap-y snap-mandatory scroll-smooth">
        <Slide id="intro" kicker="VALUEAI · How it works">
          <img src="/ltts-logo.png" alt="L&T Technology Services" className="h-14 w-auto mb-10" />
          <Hero>What will AI really save this customer, and when does it pay back?</Hero>
          <Support
            items={[
              { value: 'Minutes', label: 'From team, workload and AI plan to payback, NPV and ROI, live with the customer' },
              { value: '5 models', label: 'Onshore, offshore (BCC), and AI combinations, each compared against the same baseline' },
            ]}
          />
          <Quiet>
            <p>Scroll to step through the idea and a worked example. Every number on the following screens is calculated live by the same engine as the dashboard.</p>
          </Quiet>
        </Slide>

        <Slide id="flavours" kicker="The choice behind every AI case">
          <Hero>AI is not one thing. It comes in three flavours.</Hero>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {f.flavours.map((fl, i) => (
              <div key={fl.id} className={`rounded-xl p-6 border ${i === 0 ? 'border-blue-300 bg-blue-50/50' : 'border-gray-200'}`}>
                <p className={`text-lg font-semibold mb-2 ${i === 0 ? 'text-blue-700' : 'text-gray-900'}`}>{fl.label}</p>
                <p className="text-sm text-gray-700 mb-3">{fl.what}</p>
                <p className="text-xs text-gray-500 mb-1"><span className="text-gray-700">Good for:</span> {fl.fit}</p>
                <p className="text-xs text-gray-500"><span className="text-gray-700">Watch out:</span> {fl.watchOut}</p>
              </div>
            ))}
          </div>
          <Quiet>
            <p>
              Most customers end up with a mix: a frontier model for the hard cases, an enterprise deployment for regulated
              work, a local model where data cannot leave. The question is never which is best in the abstract, but which one
              pays for the work in front of you.
            </p>
          </Quiet>
        </Slide>

        <Slide id="flavour-shape" kicker="What the flavour changes">
          <Hero>The flavour changes the shape of the cost, not just its size.</Hero>
          <div className="space-y-4 mb-10 max-w-3xl">
            {f.flavours.map(fl => (
              <div key={fl.id} className="flex flex-col sm:flex-row sm:items-baseline gap-x-6 border-t border-gray-200 pt-3">
                <p className="w-56 shrink-0 text-gray-900 font-medium">{fl.label}</p>
                <p className="text-sm text-gray-600">{fl.shape}</p>
              </div>
            ))}
          </div>
          <Support
            items={[
              { value: 'Effort cut', label: 'A weaker model does less of the work, so the hours fall by less. This is the lever that decides the case.' },
              { value: 'Review overhead', label: 'Output you trust less needs more checking, which adds the hours back' },
            ]}
          />
          <Quiet>
            <p>
              The calculator models all three the same way: the model's effect on the work, the money it costs to run, and the
              one-off investment to get there. Only the numbers differ.
            </p>
          </Quiet>
        </Slide>

        <Slide id="flavour-compare" kicker="The three flavours, same team">
          <Hero>
            Paying {pct(1.3 - 1)} more per token costs{' '}
            {pct(Math.abs(1 - f.flavours[1]!.results.financialMetrics.npv / f.flavours[0]!.results.financialMetrics.npv))} of the
            value. A weaker model costs all of it.
          </Hero>
          <table className="w-full max-w-4xl mb-8 text-left">
            <thead>
              <tr className="text-xs text-gray-500 uppercase tracking-wide">
                <th className="py-2 font-medium">Flavour</th>
                <th className="py-2 font-medium text-right">Effort cut</th>
                <th className="py-2 font-medium text-right">Tokens / month</th>
                <th className="py-2 font-medium text-right">Platform / month</th>
                <th className="py-2 font-medium text-right">NPV</th>
                <th className="py-2 font-medium text-right">Payback</th>
              </tr>
            </thead>
            <tbody>
              {f.flavours.map(fl => {
                const fm = fl.results.financialMetrics;
                return (
                  <tr key={fl.id} className="border-t border-gray-200">
                    <td className="py-3 text-gray-900">{fl.label}</td>
                    <td className="py-3 text-right text-gray-700">{pct(fl.effortCut)}</td>
                    <td className="py-3 text-right text-gray-700">{fl.tokenCost > 0 ? eur(fl.tokenCost) : 'none'}</td>
                    <td className="py-3 text-right text-gray-700">{eur(fl.fixedAiCost)}</td>
                    <td className={`py-3 text-right font-semibold ${fm.npv >= 0 ? 'text-blue-700' : 'text-gray-900'}`}>{eur(fm.npv)}</td>
                    <td className="py-3 text-right text-gray-700">{payback(fl.results)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <Quiet>
            <p>
              Same team, same work, same investment: only the model changes. Tokens are{' '}
              {pct(f.flavours[0]!.tokenCost / (r.cost.fullyLoaded.baseline - r.cost.fullyLoaded.mature))} of the monthly saving in
              the frontier case, so the token price is almost never the decision. The effort cut is.
            </p>
            <p>
              These are starting assumptions for the walkthrough, not vendor claims. In a real scenario you set the price table,
              the platform cost and the effort cut with the customer.
            </p>
          </Quiet>
        </Slide>

        <Slide id="flavour-local" kicker="When self-hosting pays">
          <Hero>A local model has to earn its hardware before it earns anything else.</Hero>
          <table className="w-full max-w-3xl mb-8 text-left">
            <thead>
              <tr className="text-xs text-gray-500 uppercase tracking-wide">
                <th className="py-2 font-medium">Capacity + MLOps</th>
                {f.localGrid[0]!.cells.map(c => (
                  <th key={c.cut} className="py-2 font-medium text-right">
                    {pct(c.cut)} cut
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {f.localGrid.map(row => (
                <tr key={row.infra} className="border-t border-gray-200">
                  <td className="py-3 text-gray-900">{eur(row.infra, false)} / month</td>
                  {row.cells.map(c => (
                    <td key={c.cut} className={`py-3 text-right ${c.npv >= 0 ? 'text-blue-700 font-semibold' : 'text-gray-400'}`}>
                      {c.payback === null ? 'never' : `M${c.payback}`}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <Quiet>
            <p>
              Payback month for the same team on open-weight models: fixed capacity cost down the side, effort cut across the
              top. With no token bill the whole case rests on the model being good enough:{' '}
              {f.localCutNeeded === null
                ? 'at this capacity cost none of these cuts pays back'
                : `it has to reach about a ${pct(f.localCutNeeded)} cut before it pays back at all`}
              , whatever you spend on GPUs.
            </p>
            <p>Self-hosting is still the right answer when the data may not leave — the calculator shows what that choice costs.</p>
          </Quiet>
        </Slide>

        <Slide id="states" kicker="The idea">
          <Hero>Three moments in time: today, the transition, and the new normal.</Hero>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {[
              { name: 'Baseline', text: 'The team and costs today. Never changed by the model you choose.', value: eur(r.cost.fullyLoaded.baseline) },
              { name: `Transition · ${g.transitionLengthMonths} months`, text: 'AI is introduced: training, review overhead, dual running. Usually more expensive than today.', value: eur(r.cost.fullyLoaded.transition) },
              { name: 'Mature', text: 'Steady state with AI. The saving versus baseline is the prize.', value: eur(r.cost.fullyLoaded.mature) },
            ].map((s, i) => (
              <div key={s.name} className={`rounded-xl p-6 border ${i === 2 ? 'border-blue-300 bg-blue-50/50' : 'border-gray-200'}`}>
                <p className="text-sm font-medium text-gray-900 mb-2">{s.name}</p>
                <p className={`text-2xl font-semibold mb-3 ${i === 2 ? 'text-blue-700' : 'text-gray-900'}`}>{s.value}<span className="text-sm font-normal text-gray-500"> /month</span></p>
                <p className="text-sm text-gray-500">{s.text}</p>
              </div>
            ))}
          </div>
          <Quiet>
            <p>
              Whichever flavour you pick, the calculator answers the same question in the same way. The rest of this walkthrough
              follows one worked example: {f.scenario.clientName}.
            </p>
          </Quiet>
        </Slide>

        <Slide id="today" kicker="Example · Step 1 · Today">
          <Hero>{num(r.effort.staffingFte.baseline)} people, {num(r.effort.totalEffort.baseline)} hours of work a month.</Hero>
          <Support
            items={[
              { value: eur(r.cost.fullyLoaded.baseline), label: 'Fully loaded monthly cost today' },
              { value: `${num(g.workingHrsPerFtePerMonth)} h`, label: 'Working hours per person per month' },
            ]}
          />
          <Quiet>
            <p>
              Workload:{' '}
              {f.workload
                .map(k => `${num(k.volumePerMonth ?? 0)} ${k.volumeUnit ?? ''} × ${num(k.baseline, k.baseline % 1 ? 1 : 0)} h (${k.name.toLowerCase()})`)
                .join(' + ')}{' '}
              = {num(r.effort.totalEffort.baseline)} h, which is exactly {num(r.effort.staffingFte.baseline)} people ×{' '}
              {g.workingHrsPerFtePerMonth} h.
            </p>
            <p>Cost: people {eur(r.cost.peopleCost.baseline, false)} + tools {eur(r.cost.directOpex.baseline - r.cost.peopleCost.baseline, false)}, plus {pct(f.overheadAndRisk)} for overhead and risk reserve.</p>
          </Quiet>
        </Slide>

        <Slide id="effort" kicker="Example · Step 2 · AI changes the work">
          <Hero>AI cuts the work to {num(r.effort.totalEffort.mature)} hours a month.</Hero>
          <Support
            items={[
              { value: `−${pct(1 - f.matureFactor)}`, label: 'Effort per release and per defect once mature (assumption you set)' },
              { value: `+${pct(f.matureOverhead)}`, label: 'Added back for people reviewing and correcting AI output' },
            ]}
          />
          <Quiet>
            <p>During the {g.transitionLengthMonths}-month transition the cut is smaller (−{pct(1 - f.transitionFactor)}) and the review overhead is higher, so the work barely falls at first.</p>
            <p>This assumption is the heart of every AI business case. Validate it with a pilot before presenting it as a commitment.</p>
          </Quiet>
        </Slide>

        <Slide id="team" kicker="Example · Step 3 · The team follows the work">
          <Hero>{num(r.effort.staffingFte.baseline)} → {num(r.effort.staffingFte.mature, 1)} people.</Hero>
          <Support
            items={[
              { value: `${num(r.effort.staffingFte.baseline)} × ${num(r.effort.totalEffort.mature)} / ${num(r.effort.totalEffort.baseline)}`, label: 'Team size scales with workload' },
              { value: `${num(r.effort.planFte.mature, 1)} planned`, label: 'The staffing plan sets the role mix, including new AI engineers' },
            ]}
          />
          <Quiet>
            <p>If the typed staffing plan and the workload-based team differ by more than 5%, the dashboard warns you, so headcount claims stay backed by the effort assumptions.</p>
          </Quiet>
        </Slide>

        <Slide id="cost" kicker="Example · Step 4 · Run cost">
          <Hero>{eur(r.cost.fullyLoaded.baseline - r.cost.fullyLoaded.mature)} saved every month once mature.</Hero>
          <Support
            items={[
              { value: `${eur(r.cost.fullyLoaded.baseline)} → ${eur(r.cost.fullyLoaded.mature)}`, label: 'Monthly run cost, today versus mature' },
              { value: `+${eur(f.aiCostsAdded)}`, label: 'New monthly costs for AI usage, tools, infrastructure and governance' },
            ]}
          />
          <Quiet>
            <p>Saving = fewer people × their cost − the new AI running costs, with overhead and risk reserve applied to both sides.</p>
          </Quiet>
        </Slide>

        <Slide id="payback" kicker="Example · Step 5 · Investment and payback">
          <Hero>{eur(r.financialMetrics.totalInvestment)} invested, paid back in {payback(r).toLowerCase()}.</Hero>
          <Support
            items={[
              { value: eur(f.lowestCash), label: 'Lowest point of the cumulative cash position, during the transition' },
              { value: `${g.transitionLengthMonths} months`, label: 'Transition that costs more than today before savings start' },
            ]}
          />
          <Quiet>
            <p>Payback is read month by month from the cumulative cash flow, not from a single month's saving, so the transition dip is always included.</p>
          </Quiet>
        </Slide>

        <Slide id="verdict" kicker="Example · Step 6 · The verdict">
          <Hero>{eur(r.financialMetrics.npv)} of value created over {f.scenario.timeValue.horizonMonths} months.</Hero>
          <Support
            items={[
              { value: `${num(r.financialMetrics.roiPercent)}%`, label: `ROI: total savings minus investment, divided by investment` },
              { value: r.financialMetrics.irr === null ? 'n/a' : `${num(r.financialMetrics.irr * 100)}%`, label: 'IRR: the yearly return that makes the value exactly zero' },
            ]}
          />
          <Quiet>
            <p>The large figure is NPV: every monthly saving and the investment, discounted at {pct(f.scenario.timeValue.discountRateAnnual)} a year to today's money.</p>
          </Quiet>
        </Slide>

        <Slide id="what-fails" kicker="What does not work">
          <Hero>
            {f.breakEvenCut === null
              ? 'In this example no tested effort cut pays back.'
              : `Below a ${pct(f.breakEvenCut)} effort cut, this AI case does not pay off.`}
          </Hero>
          <table className="w-full max-w-3xl mb-10 text-left">
            <thead>
              <tr className="text-xs text-gray-500 uppercase tracking-wide">
                <th className="py-2 font-medium">AI effort cut</th>
                <th className="py-2 font-medium text-right">Monthly saving</th>
                <th className="py-2 font-medium text-right">NPV</th>
                <th className="py-2 font-medium text-right">Payback</th>
              </tr>
            </thead>
            <tbody>
              {f.sensitivity.map(({ cut, results }) => {
                const npv = results.financialMetrics.npv;
                return (
                  <tr key={cut} className="border-t border-gray-200">
                    <td className="py-3 text-lg font-semibold text-gray-900">{pct(cut)}</td>
                    <td className="py-3 text-right text-gray-700">{eur(results.cost.fullyLoaded.baseline - results.cost.fullyLoaded.mature)}</td>
                    <td className={`py-3 text-right font-semibold ${npv >= 0 ? 'text-blue-700' : 'text-gray-900'}`}>{eur(npv)}</td>
                    <td className="py-3 text-right text-gray-700">{payback(results)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <Quiet>
            <p>Same example, only the effort cut changes. The AI running costs and the investment stay; the gain has to cover them first. This is the question to settle with the customer early.</p>
          </Quiet>
        </Slide>

        <Slide id="models" kicker="What works best">
          <Hero>For this team, {best.label} creates the most value.</Hero>
          <table className="w-full max-w-3xl mb-10 text-left">
            <thead>
              <tr className="text-xs text-gray-500 uppercase tracking-wide">
                <th className="py-2 font-medium">Delivery model</th>
                <th className="py-2 font-medium text-right">NPV</th>
                <th className="py-2 font-medium text-right">Payback</th>
              </tr>
            </thead>
            <tbody>
              {f.models.map(m => (
                <tr key={m.id} className="border-t border-gray-200">
                  <td className={`py-3 ${m.id === best.id ? 'font-semibold text-blue-700' : 'text-gray-900'}`}>{m.label}</td>
                  <td className="py-3 text-right text-gray-700">{eur(m.results.financialMetrics.npv)}</td>
                  <td className="py-3 text-right text-gray-700">{payback(m.results)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Quiet>
            <p>Each model is the same team and AI plan with a different offshore (BCC) share and AI adoption. Offshore cost is set to {pct(f.scenario.bccRateFactor)} of onshore here; check it with the delivery organisation.</p>
          </Quiet>
        </Slide>

        <Slide id="start" kicker="Your turn">
          <Hero>Build the customer's case in four steps.</Hero>
          <ol className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6 max-w-3xl mb-12">
            {[
              ['Scenario › New scenario', 'Name, client, currency, horizon.'],
              ['Team and workload', "Today's roles, costs and hours; the AI plan."],
              ['Delivery model', 'Pick the target model and adjust its offshore share and AI adoption.'],
              ['Export', 'Save the scenario, and share the PDF or Excel report.'],
            ].map(([title, text], i) => (
              <li key={title} className="flex gap-4">
                <span className="text-2xl font-semibold text-blue-700">{i + 1}</span>
                <span>
                  <span className="block font-medium text-gray-900">{title}</span>
                  <span className="block text-sm text-gray-500">{text}</span>
                </span>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => {
                onClose();
                onStartNew();
              }}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
            >
              Start a customer scenario
            </button>
            <button onClick={onClose} className="px-6 py-3 border border-gray-300 text-gray-800 rounded-lg hover:bg-gray-50">
              Back to the dashboard
            </button>
          </div>
        </Slide>
      </div>
    </div>
  );
}
