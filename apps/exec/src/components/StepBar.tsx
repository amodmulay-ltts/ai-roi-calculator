export const STEP_NAMES = [
  '1 Situation',
  '2 Opportunity',
  '3 Right-size',
  '4 Investment',
  '5 Result',
  '6 Risks',
  '7 Decision',
];

interface StepBarProps {
  step: number;
  onSelect: (n: number) => void;
}

export default function StepBar({ step, onSelect }: StepBarProps) {
  return (
    <nav aria-label="Steps" className="flex flex-wrap gap-2">
      {STEP_NAMES.map((name, i) => {
        const n = i + 1;
        const active = n === step;
        return (
          <button
            key={name}
            type="button"
            onClick={() => onSelect(n)}
            aria-current={active ? 'step' : undefined}
            className={`rounded-full px-3 py-1.5 text-sm transition ${
              active ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {name}
          </button>
        );
      })}
    </nav>
  );
}
