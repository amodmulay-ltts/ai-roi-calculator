import { useExecStore } from '../store';

export default function Header() {
  const customerName = useExecStore(s => s.inputs.customerName);
  const setInputs = useExecStore(s => s.setInputs);
  const reset = useExecStore(s => s.reset);

  const handleReset = () => {
    if (window.confirm('Reset all inputs to the defaults?')) reset();
  };

  return (
    <header className="no-print mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-2xl font-semibold text-gray-900">AI Business Case</h1>
        <input
          type="text"
          placeholder="Customer name"
          value={customerName}
          onChange={e => setInputs({ customerName: e.target.value })}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleReset}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          Reset to defaults
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          Print summary
        </button>
      </div>
    </header>
  );
}
