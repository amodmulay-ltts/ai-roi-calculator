import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { calculateCase, compareAll, createDefaultInputs, formatMoney, type PostureId } from '@ai-roi-calc/bizcase';

/**
 * "How it works": a presenter deck. Full-screen slides that scroll and snap, with keyboard control
 * (arrows, space, page keys, Home/End) so it can be driven from a clicker in a meeting room.
 * Figures here come from the placeholder defaults and are labelled illustrative on every slide that shows one.
 */

const PRIMARY = 'px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm text-sm transition';

interface SlideProps {
  id: string;
  eyebrow: string;
  title: string;
  lead?: string;
  children?: ReactNode;
  illustrative?: boolean;
}

function Slide({ id, eyebrow, title, lead, children, illustrative }: SlideProps): ReactElement {
  return (
    <section id={id} data-slide className="snap-start min-h-screen flex items-center pt-24 pb-16">
      <div className="max-w-6xl w-full mx-auto px-10">
        <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-4">{eyebrow}</p>
        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight leading-tight max-w-4xl">{title}</h2>
        {lead && <p className="mt-5 text-xl text-gray-600 max-w-3xl leading-relaxed">{lead}</p>}
        {children && <div className="mt-10">{children}</div>}
        {illustrative && (
          <p className="mt-8 text-xs text-gray-400 uppercase tracking-wide">Illustrative placeholder figures · not a benchmark</p>
        )}
      </div>
    </section>
  );
}

function Card({ title, children, tone = 'plain' }: { title: string; children: ReactNode; tone?: 'plain' | 'blue' }): ReactElement {
  return (
    <div className={`rounded-xl border p-6 ${tone === 'blue' ? 'border-blue-200 bg-blue-50/60' : 'border-gray-200 bg-white'}`}>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <div className="mt-2 text-base text-gray-600 leading-relaxed">{children}</div>
    </div>
  );
}

const SLIDES = [
  'Start',
  'Why',
  'The answer',
  'How it works',
  'Work in scope',
  'Net efficiency',
  'Right-sizing',
  'Real costs',
  'Confidence',
  'Result',
  'In the room',
];

export default function Guide(): ReactElement {
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const base = useMemo(() => {
    const inputs = createDefaultInputs();
    return { inputs, result: calculateCase(inputs, 'enterprise', 'expected'), compared: compareAll(inputs) };
  }, []);
  const { result, compared } = base;

  const slides = useCallback((): HTMLElement[] => Array.from(scroller.current?.querySelectorAll<HTMLElement>('[data-slide]') ?? []), []);

  const go = useCallback(
    (n: number): void => {
      const list = slides();
      const target = list[Math.max(0, Math.min(list.length - 1, n))];
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    [slides]
  );

  // Track the slide nearest the top of the viewport
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const onScroll = (): void => {
      const h = el.clientHeight || 1;
      setIndex(Math.round(el.scrollTop / h));
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // Clicker-friendly keyboard control
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (['ArrowDown', 'ArrowRight', 'PageDown', ' ', 'Enter'].includes(e.key)) {
        e.preventDefault();
        go(index + 1);
      } else if (['ArrowUp', 'ArrowLeft', 'PageUp', 'Backspace'].includes(e.key)) {
        e.preventDefault();
        go(index - 1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        go(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        go(SLIDES.length - 1);
      } else if (e.key === 'f' || e.key === 'F') {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void document.documentElement.requestFullscreen?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, index]);

  const phases = [
    { name: 'Requirements', use: 40 },
    { name: 'Design', use: 55 },
    { name: 'Build', use: 85 },
    { name: 'Test', use: 90 },
    { name: 'Release', use: 50 },
    { name: 'Operate', use: 30 },
  ];

  const waterfall = [
    { label: 'Hours AI removes', value: result.grossRemovedHoursPerMonth, className: 'bg-blue-300' },
    { label: 'Come back as review and rework', value: -result.reviewReworkHoursPerMonth, className: 'bg-gray-300' },
    { label: 'Net hours freed', value: result.netHoursSavedPerMonth, className: 'bg-blue-600' },
  ];
  const wfMax = Math.max(result.grossRemovedHoursPerMonth, 1);

  const postures: { id: PostureId; name: string; note: string; capability: number; cost: number }[] = [
    { id: 'local', name: 'Local', note: 'Your own hardware, open models', capability: 1, cost: 1 },
    { id: 'hybrid', name: 'Hybrid', note: 'Routine work local, hard work escalated', capability: 2, cost: 2 },
    { id: 'enterprise', name: 'Enterprise', note: 'Contracted models with data controls', capability: 3, cost: 3 },
    { id: 'frontier', name: 'Frontier', note: 'Most capable, pay per use', capability: 4, cost: 4 },
  ];

  const curve = result.cumulative.map((v, m) => ({ month: m, value: Math.round(v) }));

  return (
    <div className="relative h-screen bg-gray-50 text-gray-900">
      {/* Fixed bar: brand, slide counter, way back to the calculator */}
      <header className="fixed top-0 inset-x-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/ltts-logo.png" alt="L&T Technology Services" className="h-10 w-auto" />
            <span className="h-7 w-px bg-gray-200" aria-hidden="true" />
            <div className="flex flex-col">
              <span className="text-base font-semibold tracking-tight">VALUEAI</span>
              <span className="text-xs text-gray-500">How the AI business case works</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span aria-label="Slide position" className="text-sm text-gray-500 tabular-nums">
              {index + 1} / {SLIDES.length}
            </span>
            <a href="#/" className={PRIMARY}>
              Open the calculator
            </a>
          </div>
        </div>
        <div className="h-0.5 bg-gray-100" aria-hidden="true">
          <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${((index + 1) / SLIDES.length) * 100}%` }} />
        </div>
      </header>

      {/* Side dots */}
      <nav aria-label="Slides" className="fixed right-5 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col gap-3">
        {SLIDES.map((name, i) => (
          <button
            key={name}
            type="button"
            onClick={() => go(i)}
            aria-label={`Go to slide ${i + 1}: ${name}`}
            aria-current={i === index ? 'true' : undefined}
            title={name}
            className={`h-2.5 w-2.5 rounded-full transition ${i === index ? 'bg-blue-600 scale-125' : 'bg-gray-300 hover:bg-gray-400'}`}
          />
        ))}
      </nav>

      <div ref={scroller} className="h-screen overflow-y-auto snap-y snap-mandatory scroll-smooth" tabIndex={-1}>
        {/* 1 Title */}
        <section id="start" data-slide className="snap-start min-h-screen flex items-center pt-24 pb-16 bg-white">
          <div className="max-w-6xl w-full mx-auto px-10">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-6">AI business case</p>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05] max-w-4xl">
              Is this AI investment worth it,
              <span className="text-blue-600"> and which kind is right for us?</span>
            </h1>
            <p className="mt-8 text-2xl text-gray-600 max-w-3xl leading-relaxed">
              A short, honest way to put a number on it before we commit money, people and trust.
            </p>
            <p className="mt-12 text-sm text-gray-400">Press space or the arrow keys to move on · F for full screen</p>
          </div>
        </section>

        {/* 2 Why */}
        <Slide
          id="why"
          eyebrow="Why we need this"
          title="AI decisions are usually made on enthusiasm, not on a case."
          lead="Three things go wrong again and again when organisations approve AI work."
        >
          <div className="grid gap-5 md:grid-cols-3">
            <Card title="Borrowed numbers">
              Savings quoted from a vendor deck or another company. Nobody can say whether they apply to our work, our people or our data.
            </Card>
            <Card title="One size fits all">
              The most powerful model is chosen by default, or the cheapest one is. Neither is tested against what the work actually needs.
            </Card>
            <Card title="Hidden costs">
              Licences are counted. Review time, data preparation, governance, training and the slow ramp-up are not.
            </Card>
          </div>
        </Slide>

        {/* 3 The answer */}
        <Slide
          id="answer"
          eyebrow="What this gives you"
          title="One page that answers three questions."
          lead="Built for the people who sign off investment: it speaks in money, time and confidence, not in technology."
        >
          <div className="grid gap-5 md:grid-cols-3">
            {[
              ['Does it pay back?', 'Net value over three years, after every cost we could name.'],
              ['When?', 'The month the investment is recovered, and how long we wait for it.'],
              ['How sure are we?', 'A cautious, an expected and a stretch view, and what has to be true for it to work.'],
            ].map(([q, a]) => (
              <div key={q} className="rounded-xl border border-blue-200 bg-blue-50/60 p-7">
                <p className="text-2xl font-bold text-blue-700">{q}</p>
                <p className="mt-3 text-base text-gray-700 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </Slide>

        {/* 4 How it works */}
        <Slide
          id="how"
          eyebrow="How it works"
          title="Seven short steps, from our situation to a decision."
          lead="Each step asks for a few figures we already know. Placeholders are pre-filled so the conversation can start immediately."
        >
          <ol className="grid gap-4 md:grid-cols-4">
            {[
              ['Situation', 'Who does the work, what it costs, what data rules apply.'],
              ['Opportunity', 'Which phases of the work AI can take on, and how much.'],
              ['Right-size', 'Local, hybrid, enterprise or frontier: compared side by side.'],
              ['Investment', 'What it really costs to set up and to run.'],
              ['Result', 'Value, payback and return, on one page.'],
              ['Risks', 'What could change the answer, and what must be true.'],
              ['Decision', 'A one-page summary to take away.'],
            ].map(([name, text], i) => (
              <li key={name} className="rounded-xl border border-gray-200 bg-white p-5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">{i + 1}</span>
                <p className="mt-3 font-semibold text-gray-900">{name}</p>
                <p className="mt-1 text-sm text-gray-600 leading-relaxed">{text}</p>
              </li>
            ))}
          </ol>
        </Slide>

        {/* 5 Work in scope */}
        <Slide
          id="scope"
          eyebrow="Step 1 and 2 · Work in scope"
          title="Any lifecycle, any industry. Each phase gets its own AI use."
          lead="Software delivery, product development or the design of mechanical systems: pick the work, then say how much of each phase AI would actually support. The phases are independent, so they are not meant to add up to 100%."
          illustrative
        >
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <ul className="space-y-3">
              {phases.map(p => (
                <li key={p.name} className="flex items-center gap-4">
                  <span className="w-28 text-sm text-gray-700">{p.name}</span>
                  <div className="flex-1 h-4 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full bg-blue-600" style={{ width: `${p.use}%` }} />
                  </div>
                  <span className="w-12 text-right text-sm font-medium text-gray-900 tabular-nums">{p.use}%</span>
                </li>
              ))}
            </ul>
          </div>
        </Slide>

        {/* 6 Net efficiency */}
        <Slide
          id="efficiency"
          eyebrow="The headline metric"
          title="Net efficiency: the time we really get back."
          lead="AI use only says where AI is applied. What matters is the share of total effort freed once people have reviewed and corrected what AI produced."
          illustrative
        >
          <div className="grid gap-6 md:grid-cols-5">
            <div className="md:col-span-3 rounded-xl border border-gray-200 bg-white p-6 space-y-5">
              {waterfall.map(w => (
                <div key={w.label}>
                  <div className="flex justify-between text-sm text-gray-700">
                    <span>{w.label}</span>
                    <span className="font-medium tabular-nums">
                      {w.value < 0 ? '−' : ''}
                      {Math.round(Math.abs(w.value)).toLocaleString('en-US')} h / month
                    </span>
                  </div>
                  <div className="mt-1 h-5 rounded bg-gray-100">
                    <div className={`h-full rounded ${w.className}`} style={{ width: `${(Math.abs(w.value) / wfMax) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="md:col-span-2 rounded-xl border border-blue-200 bg-blue-50/60 p-6 flex flex-col justify-center">
              <p className="text-6xl font-bold text-blue-700 tabular-nums">{Math.round(result.netEfficiency * 100)}%</p>
              <p className="mt-2 text-base text-gray-700">of all in-scope effort freed, net of review and rework.</p>
              <p className="mt-4 text-sm text-gray-500">
                AI is applied to {Math.round(result.aiReach * 100)}% of the work, but only this much is truly saved.
              </p>
            </div>
          </div>
        </Slide>

        {/* 7 Right-sizing */}
        <Slide
          id="rightsizing"
          eyebrow="Step 3 · Right-sizing"
          title="The right model is the cheapest one that does the job."
          lead="More capable models cost more to run. Where the work is routine, a smaller model gives the same benefit for far less. Where data must stay inside, some options are simply not open to us."
          illustrative
        >
          <div className="grid gap-4 md:grid-cols-4">
            {postures.map(p => {
              const r = compared[p.id].expected;
              const positive = r.netValue36 > 0;
              return (
                <div key={p.id} className="rounded-xl border border-gray-200 bg-white p-5 flex flex-col">
                  <p className="text-lg font-semibold text-gray-900">{p.name}</p>
                  <p className="mt-1 text-sm text-gray-600 min-h-[2.5rem]">{p.note}</p>
                  <dl className="mt-4 space-y-2 text-xs text-gray-500">
                    {[
                      ['Capability', p.capability],
                      ['Running cost', p.cost],
                    ].map(([label, n]) => (
                      <div key={String(label)} className="flex items-center justify-between">
                        <dt>{label}</dt>
                        <dd className="flex gap-1" aria-label={`${label} ${n} of 4`}>
                          {[1, 2, 3, 4].map(k => (
                            <span key={k} className={`h-2 w-5 rounded-sm ${k <= Number(n) ? 'bg-blue-600' : 'bg-gray-200'}`} />
                          ))}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <p className={`mt-5 text-2xl font-bold tabular-nums ${positive ? 'text-blue-700' : 'text-red-700'}`}>{formatMoney(r.netValue36)}</p>
                  <p className="text-xs text-gray-500">3-year net value</p>
                </div>
              );
            })}
          </div>
          <p className="mt-6 text-base text-gray-700">
            The best option is not the strongest or the cheapest. It is the one with the best result for <em>our</em> work and <em>our</em> data rules.
          </p>
        </Slide>

        {/* 8 Costs */}
        <Slide
          id="costs"
          eyebrow="Step 4 · The real cost"
          title="We count what is usually left out."
          lead="Beyond licences and usage, the case carries the costs that decide whether AI delivers in practice."
          illustrative
        >
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">One-off investment</h3>
              <ul className="space-y-3">
                {result.investmentLines.map(l => (
                  <li key={l.label} className="flex justify-between text-base text-gray-700">
                    <span>{l.label}</span>
                    <span className="font-medium tabular-nums">{formatMoney(l.amount)}</span>
                  </li>
                ))}
                <li className="flex justify-between border-t border-gray-200 pt-3 text-base font-semibold text-gray-900">
                  <span>Total</span>
                  <span className="tabular-nums">{formatMoney(result.investment)}</span>
                </li>
              </ul>
            </div>
            <div className="grid gap-4 content-start">
              <Card title="Running costs">Usage, platform and governance, month after month.</Card>
              <Card title="Ramp-up">Benefits arrive gradually as people learn, not on day one.</Card>
              <Card title="Data readiness" tone="blue">
                Poor data quality weakens the result and raises the cost. The case shows what closing that gap is worth.
              </Card>
            </div>
          </div>
        </Slide>

        {/* 9 Confidence */}
        <Slide
          id="confidence"
          eyebrow="Step 6 · Risks and confidence"
          title="We do not give one number. We give a range and a test."
          lead="Every result is shown as cautious, expected and stretch, and with the point at which the case stops working."
        >
          <div className="grid gap-5 md:grid-cols-3">
            <Card title="Cautious">AI delivers less than we hope and ramps up slowly.</Card>
            <Card title="Expected" tone="blue">The planning view, built on the figures we entered.</Card>
            <Card title="Stretch">Everything goes well. Useful as a ceiling, not as a promise.</Card>
          </div>
          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900">What must be true</h3>
            <p className="mt-2 text-base text-gray-600 leading-relaxed">
              The break-even point turns the debate into one sentence: &ldquo;this pays back if AI delivers at least this share of what we assumed.&rdquo;
              Leaders can then ask whether that is believable, instead of arguing over a single forecast.
            </p>
          </div>
        </Slide>

        {/* 10 Result */}
        <Slide
          id="result"
          eyebrow="Step 5 · The result"
          title="Value, payback and return, on one page."
          illustrative
        >
          <div className="grid gap-6 md:grid-cols-5">
            <div className="md:col-span-3 rounded-xl border border-gray-200 bg-white p-6">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Cumulative position over 36 months (enterprise, expected)</h3>
              <div
                className="h-64"
                role="img"
                aria-label="Area chart of the cumulative position over 36 months, crossing zero at the payback month"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={curve}>
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={v => formatMoney(Number(v))} tick={{ fontSize: 12 }} width={80} />
                    <ReferenceLine y={0} stroke="#374151" />
                    <Area type="monotone" dataKey="value" stroke="#1d4ed8" fill="#0ea5e9" fillOpacity={0.25} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="md:col-span-2 grid gap-4 content-start">
              {[
                ['3-year net value', formatMoney(result.netValue36)],
                ['Pays back in', result.paybackMonth === null ? 'Not within 3 years' : `Month ${result.paybackMonth}`],
                ['Return on investment', result.roiPercent === null ? 'n/a' : `${Math.round(result.roiPercent)}%`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-blue-200 bg-blue-50/60 p-5">
                  <p className="text-sm text-gray-600">{label}</p>
                  <p className="text-3xl font-bold text-blue-700 tabular-nums">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </Slide>

        {/* 11 In the room */}
        <section id="room" data-slide className="snap-start min-h-screen flex items-center pt-24 pb-16 bg-white">
          <div className="max-w-6xl w-full mx-auto px-10">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-4">Using it in the room</p>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight max-w-4xl">
              Put in our figures. Change one thing. Watch the answer move.
            </h2>
            <ul className="mt-10 grid gap-4 md:grid-cols-2 max-w-4xl">
              {[
                'Replace the placeholder figures with the customer’s own before using a result in a decision.',
                'Change the model option live to see how right-sizing moves the result.',
                'Raise or lower AI use per phase and watch net efficiency respond.',
                'Print the one-page summary as the take-away.',
              ].map(t => (
                <li key={t} className="flex gap-3 text-lg text-gray-700 leading-relaxed">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-600" aria-hidden="true" />
                  {t}
                </li>
              ))}
            </ul>
            <div className="mt-12 flex items-center gap-5">
              <a href="#/" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm text-lg transition">
                Open the calculator
              </a>
              <button
                type="button"
                onClick={() => go(0)}
                className="px-6 py-3 border border-gray-300 text-gray-800 font-medium rounded-lg hover:bg-gray-50 text-lg transition"
              >
                Back to start
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
