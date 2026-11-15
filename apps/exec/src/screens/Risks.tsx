import type { ReactElement } from 'react';
import { readinessGap, whatMustBeTrue, type ReadinessAnswer } from '@ai-roi-calc/bizcase';
import { effectivePosture, useExecStore } from '../store';

const ANSWERS: Array<[ReadinessAnswer, string]> = [
  ['ready', 'Ready'],
  ['partial', 'Partly ready'],
  ['not-ready', 'Not ready'],
];

const QUESTIONS: Array<['data' | 'skills' | 'sponsorship' | 'compliance', string, string]> = [
  ['data', 'Data', 'Is the data AI needs available, clean and accessible?'],
  ['skills', 'Skills', 'Does the team have the skills to run and review AI-assisted work?'],
  ['sponsorship', 'Sponsorship', 'Is there named executive ownership and budget?'],
  ['compliance', 'Compliance', 'Are the security, privacy and regulatory questions answered?'],
];

export default function Risks(): ReactElement {
  const inputs = useExecStore(s => s.inputs);
  const selectedPosture = useExecStore(s => s.selectedPosture);
  const setReadiness = useExecStore(s => s.setReadiness);

  const posture = effectivePosture(inputs, selectedPosture);
  const sentences = posture ? whatMustBeTrue(inputs, posture) : [];

  return (
    <section className="space-y-6 rounded-xl border border-gray-200 bg-white p-6">
      {QUESTIONS.map(([key, title, question]) => (
        <fieldset key={key} className="space-y-2">
          <legend className="mb-1 text-sm font-medium text-gray-900">
            {title}: {question}
          </legend>
          <div className="flex flex-wrap gap-4">
            {ANSWERS.map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 text-sm text-gray-800">
                <input
                  type="radio"
                  name={`readiness-${key}`}
                  value={value}
                  checked={inputs.readiness[key] === value}
                  onChange={() => setReadiness(key, value)}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      <div className="border-t border-gray-200 pt-4">
        <h2 className="mb-2 text-sm font-medium text-gray-900">What must be true</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-gray-800">
          {sentences.map(sentence => (
            <li key={sentence}>{sentence}</li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-gray-500">Readiness gap: {readinessGap(inputs.readiness)} of 8.</p>
      </div>
    </section>
  );
}
