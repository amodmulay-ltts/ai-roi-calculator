import { useEffect, useRef, useState } from 'react';
import type { Results, Scenario } from '@ai-roi-calc/engine';
import { SECTIONS } from '../utils/sections';

interface HelpPresentationProps {
  /** Section id to open at; null = closed. */
  openAt: string | null;
  /** Receives the section the reader finished on, so the page can return there. */
  onClose: (landOn: string) => void;
  scenario: Scenario;
  results: Results;
  formatCurrency: (value: number) => string;
}

export default function HelpPresentation({ openAt, onClose, scenario, results, formatCurrency }: HelpPresentationProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  activeRef.current = active;
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  const open = openAt !== null;

  useEffect(() => {
    if (!open) return;
    const index = Math.max(0, SECTIONS.findIndex(s => s.id === openAt));
    setActive(index);
    activeRef.current = index;

    const slides = () => Array.from(scroller.current?.querySelectorAll<HTMLElement>('[data-slide]') ?? []);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current(SECTIONS[activeRef.current]!.id);
    };
    document.addEventListener('keydown', onKey);

    let observer: IntersectionObserver | undefined;
    // Wait for layout before jumping: scroll snapping overrides a scroll issued in the same frame,
    // and the observer would otherwise latch onto the first slide before the jump lands.
    const frame = window.requestAnimationFrame(() => {
      const target = slides()[index];
      if (target && scroller.current) scroller.current.scrollTo({ top: target.offsetTop, behavior: 'instant' });
      closeButton.current?.focus();

      observer = new IntersectionObserver(
        entries =>
          entries.forEach(e => {
            if (e.isIntersecting) setActive(slides().indexOf(e.target as HTMLElement));
          }),
        { root: scroller.current, threshold: 0.6 }
      );
      slides().forEach(s => observer!.observe(s));
    });

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKey);
      observer?.disconnect();
    };
  }, [open, openAt]);

  if (!open) return null;

  const goTo = (index: number) =>
    scroller.current?.querySelectorAll<HTMLElement>('[data-slide]')[index]?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div role="dialog" aria-modal="true" aria-label="How VALUEAI works" className="fixed inset-0 z-[60] bg-white">
      <div className="fixed top-0 inset-x-0 z-10 bg-white/95 backdrop-blur border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-8 py-3 flex items-center gap-4">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-widest shrink-0">How it works</p>
          <nav aria-label="Explanations" className="flex gap-1 overflow-x-auto">
            {SECTIONS.map((s, i) => (
              <button
                key={s.id}
                onClick={() => goTo(i)}
                aria-current={i === active ? 'true' : undefined}
                className={`px-2.5 py-1 rounded-md text-xs whitespace-nowrap transition ${
                  i === active ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {s.label}
              </button>
            ))}
          </nav>
          <button
            ref={closeButton}
            onClick={() => onClose(SECTIONS[active]!.id)}
            className="ml-auto shrink-0 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:text-gray-900"
          >
            Close
          </button>
        </div>
      </div>

      <div ref={scroller} className="h-full overflow-y-scroll snap-y snap-mandatory scroll-smooth">
        {SECTIONS.map((s, i) => (
          <section
            key={s.id}
            data-slide
            data-section={s.id}
            aria-label={s.label}
            className="min-h-screen snap-start flex items-center px-8 md:px-16 pt-24 pb-16"
          >
            <div className="max-w-4xl w-full mx-auto">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-widest mb-4">
                {i + 1} of {SECTIONS.length} · {s.label}
              </p>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight leading-tight mb-8">{s.headline}</h2>

              <dl className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
                {[
                  ['What it is', s.what],
                  ['How to read it', s.read],
                  ['What to watch', s.watch],
                ].map(([title, body]) => (
                  <div key={title}>
                    <dt className="text-sm font-semibold text-gray-900 mb-2">{title}</dt>
                    <dd className="text-sm text-gray-600 leading-relaxed">{body}</dd>
                  </div>
                ))}
              </dl>

              <p className="text-sm text-gray-500 border-l-2 border-blue-200 pl-4 mb-8">{s.live(scenario, results, formatCurrency)}</p>

              <button
                onClick={() => onClose(s.id)}
                className="px-5 py-2.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Go to {s.label}
              </button>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
