import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent, ReactElement } from 'react';
import type { Explanation } from '../explain';

const WIDTH = 340;
const MARGIN = 12;

/**
 * A small "i" that explains how a calculated answer is worked out. It opens on hover or keyboard focus and
 * stays open when clicked (click again, press Escape or click elsewhere to close). It never prints.
 * It is a span, not a button, so it can sit inside a clickable card without nesting buttons.
 */
export default function InfoTip({ explanation }: { explanation: Explanation }): ReactElement {
  const [hover, setHover] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const trigger = useRef<HTMLSpanElement>(null);
  const id = useId();
  const open = hover || pinned;

  const place = useCallback((): void => {
    const el = trigger.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = Math.min(WIDTH, window.innerWidth - MARGIN * 2);
    const left = Math.min(Math.max(MARGIN, r.left + r.width / 2 - width / 2), window.innerWidth - width - MARGIN);
    setPos({ top: r.bottom + 8, left });
  }, []);

  useEffect(() => {
    if (!open) return;
    place();
    const close = (e: Event): void => {
      if (e.type === 'keydown' && (e as globalThis.KeyboardEvent).key !== 'Escape') return;
      setPinned(false);
      setHover(false);
    };
    const outside = (e: Event): void => {
      if (!trigger.current?.contains(e.target as Node)) {
        setPinned(false);
        setHover(false);
      }
    };
    window.addEventListener('keydown', close);
    window.addEventListener('mousedown', outside);
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('keydown', close);
      window.removeEventListener('mousedown', outside);
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open, place]);

  const toggle = (e: MouseEvent | KeyboardEvent): void => {
    e.preventDefault();
    e.stopPropagation(); // inside a card that selects on click, this must not select it
    setPinned(p => !p);
  };

  return (
    <span className="no-print relative inline-flex align-middle">
      <span
        ref={trigger}
        role="button"
        tabIndex={0}
        aria-label={`How this is calculated: ${explanation.title}`}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={toggle}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') toggle(e);
        }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onFocus={() => setHover(true)}
        onBlur={() => setHover(false)}
        data-infotip
        className={`ml-1.5 inline-flex h-4 w-4 cursor-help select-none items-center justify-center rounded-full border text-[10px] font-semibold italic leading-none transition ${
          open ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-400 bg-white text-gray-500 hover:border-blue-600 hover:text-blue-600'
        }`}
      >
        i
      </span>
      {open && pos && (
        <span
          id={id}
          role="tooltip"
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: Math.min(WIDTH, window.innerWidth - MARGIN * 2) }}
          className="z-[60] block cursor-auto rounded-xl border border-gray-200 bg-white p-4 text-left shadow-lg"
        >
          <span className="block text-xs font-semibold uppercase tracking-wide text-blue-700">How it is calculated</span>
          <span className="mt-1 block text-sm font-semibold text-gray-900">{explanation.title}</span>
          <span className="mt-2 block space-y-1.5">
            {explanation.lines.map(line => (
              <span key={line} className="block text-xs font-normal normal-case leading-relaxed tracking-normal text-gray-700 not-italic">
                {line}
              </span>
            ))}
          </span>
        </span>
      )}
    </span>
  );
}
