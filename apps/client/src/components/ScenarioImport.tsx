import { forwardRef, useState } from 'react';
import type { Scenario } from '@ai-roi-calc/engine';
import { parseScenarioText } from '@ai-roi-calc/engine';

interface ScenarioImportProps {
  onImport: (scenario: Scenario) => void;
}

const MAX_FILE_BYTES = 2_000_000;

/** Hidden file input for .yaml/.json scenarios. Trigger it with `ref.current.click()`. */
const ScenarioImport = forwardRef<HTMLInputElement, ScenarioImportProps>(function ScenarioImport({ onImport }, ref) {
  const [errors, setErrors] = useState<string[]>([]);

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (file.size > MAX_FILE_BYTES) {
      setErrors(['File is larger than 2 MB; this does not look like a scenario file.']);
      return;
    }

    const result = parseScenarioText(await file.text());
    if (result.ok) {
      setErrors([]);
      onImport(result.scenario);
    } else {
      setErrors(result.errors);
    }
  };

  return (
    <>
      <input ref={ref} type="file" accept=".yaml,.yml,.json" onChange={handleFile} className="hidden" aria-label="Open scenario file" />
      {errors.length > 0 && (
        <div role="alert" className="fixed right-6 top-20 w-96 z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-sm">
          <p className="font-medium text-gray-900 mb-1">This file could not be opened</p>
          <ul className="text-xs text-gray-600 space-y-0.5 mb-3">
            {errors.map(e => (
              <li key={e}>{e}</li>
            ))}
          </ul>
          <button onClick={() => setErrors([])} className="text-xs text-blue-600 hover:text-blue-800">
            Dismiss
          </button>
        </div>
      )}
    </>
  );
});

export default ScenarioImport;
