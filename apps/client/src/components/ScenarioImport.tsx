import { useRef, useState } from 'react';
import type { Scenario } from '@ai-roi-calc/engine';
import { parseScenarioText } from '@ai-roi-calc/engine';

interface ScenarioImportProps {
  onImport: (scenario: Scenario) => void;
}

const MAX_FILE_BYTES = 2_000_000;

export default function ScenarioImport({ onImport }: ScenarioImportProps) {
  const inputRef = useRef<HTMLInputElement>(null);
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
    <div className="relative">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition"
      >
        Load Scenario
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".yaml,.yml,.json"
        onChange={handleFile}
        className="hidden"
        aria-label="Scenario file"
      />
      {errors.length > 0 && (
        <div role="alert" className="absolute left-0 top-full mt-2 w-96 z-30 bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-sm">
          <p className="font-medium text-gray-900 mb-1">This file could not be loaded</p>
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
    </div>
  );
}
