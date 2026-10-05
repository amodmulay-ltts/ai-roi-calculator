import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CURRENCIES, EXAMPLE_CLIENT } from '@ai-roi-calc/engine';

interface MenuItem {
  label: string;
  hint?: string;
  onSelect: () => void;
}

function Menu({
  label,
  items,
  variant,
  children,
}: {
  label: string;
  items: MenuItem[];
  variant: 'primary' | 'secondary' | 'quiet';
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  const styles = {
    primary: 'px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm',
    secondary: 'px-4 py-2 border border-gray-300 text-gray-800 font-medium rounded-lg hover:bg-gray-50',
    quiet: 'px-2 py-1 text-gray-600 hover:text-gray-900 rounded hover:bg-gray-100',
  }[variant];

  return (
    <div ref={ref} className="relative">
      <button
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={`text-sm transition flex items-center gap-1.5 ${styles}`}
      >
        {children ?? label}
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div role="menu" aria-label={label} className="absolute right-0 mt-2 min-w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          {items.map(item => (
            <button
              key={item.label}
              role="menuitem"
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className="w-full text-left px-4 py-2 hover:bg-gray-50"
            >
              <span className="block text-sm text-gray-800">{item.label}</span>
              {item.hint && <span className="block text-xs text-gray-500">{item.hint}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface HeaderProps {
  currency: string;
  onCurrencyChange: (currency: string) => void;
  onNewScenario: () => void;
  onEditSetup: () => void;
  onOpenFile: () => void;
  onLoadExample: () => void;
  onSaveYaml: () => void;
  onExportPdf: () => void;
  onExportExcel: () => void;
  onExportJson: () => void;
  onHelp?: () => void;
}

export default function Header(props: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src="/ltts-logo.png" alt="L&T Technology Services" className="h-12 w-auto" />
          <span className="h-8 w-px bg-gray-200" aria-hidden="true" />
          <div className="flex flex-col">
            <h1 className="text-lg font-semibold text-gray-900 tracking-tight">VALUEAI</h1>
            <p className="text-xs text-gray-500">ROI Calculator</p>
          </div>
        </div>

        <nav className="flex items-center gap-3" aria-label="Main">
          {props.onHelp && (
            <button onClick={props.onHelp} className="px-2 py-1 text-sm text-gray-600 hover:text-gray-900 rounded hover:bg-gray-100">
              How it works
            </button>
          )}
          <Menu
            label="Currency"
            variant="quiet"
            items={CURRENCIES.map(c => ({ label: c, onSelect: () => props.onCurrencyChange(c) }))}
          >
            {props.currency}
          </Menu>
          <Menu
            label="Scenario"
            variant="secondary"
            items={[
              { label: 'New scenario…', hint: 'Guided setup for a customer', onSelect: props.onNewScenario },
              { label: 'Edit setup…', hint: 'Basics, delivery model, timeline, team, investment', onSelect: props.onEditSetup },
              { label: 'Open file…', hint: 'A saved .yaml or .json scenario', onSelect: props.onOpenFile },
              { label: 'Load example', hint: `${EXAMPLE_CLIENT}, automotive software`, onSelect: props.onLoadExample },
            ]}
          />
          <Menu
            label="Export"
            variant="primary"
            items={[
              { label: 'Save scenario (.yaml)', hint: 'Reopen later with Scenario › Open file', onSelect: props.onSaveYaml },
              { label: 'PDF report', hint: 'For presenting to the customer', onSelect: props.onExportPdf },
              { label: 'Excel workbook', hint: 'Figures and monthly forecast', onSelect: props.onExportExcel },
              { label: 'JSON (scenario + results)', hint: 'For integration', onSelect: props.onExportJson },
            ]}
          />
        </nav>
      </div>
    </header>
  );
}
