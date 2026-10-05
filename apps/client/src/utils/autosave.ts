import type { Scenario } from '@ai-roi-calc/engine';
import { parseScenario } from '@ai-roi-calc/engine';

const KEY = 'valueai.currentScenario.v1';

export interface SavedScenario {
  scenario: Scenario;
  savedAt: string;
}

/** Last scenario saved in this browser, validated like a file import; null if absent or unreadable. */
export function loadSavedScenario(): SavedScenario | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { savedAt?: unknown };
    const result = parseScenario(data);
    if (!result.ok) return null;
    return { scenario: result.scenario, savedAt: typeof data.savedAt === 'string' ? data.savedAt : '' };
  } catch {
    // Storage can be disabled (private mode, policy) or hold corrupt JSON; start fresh instead of failing
    return null;
  }
}

export function saveScenario(scenario: Scenario): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ savedAt: new Date().toISOString(), scenario }));
  } catch {
    // Quota exceeded or storage disabled: autosave is a convenience, the app keeps working without it
  }
}
