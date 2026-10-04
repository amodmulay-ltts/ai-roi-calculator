import { parse, stringify } from 'yaml';
import type { Scenario } from './types.js';
import { parseScenario, type ParseScenarioResult } from './schema.js';

const FORMAT = 'valueai-scenario';
const VERSION = 1;

export function scenarioToYaml(scenario: Scenario): string {
  const header = `# VALUEAI scenario: ${scenario.name.replace(/[\r\n]/g, ' ')}\n# Saved ${new Date().toISOString()}\n`;
  return header + stringify({ format: FORMAT, version: VERSION, scenario });
}

/** Parses a saved scenario file. JSON is valid YAML, so this reads both formats. */
export function parseScenarioText(text: string): ParseScenarioResult {
  let data: unknown;
  try {
    data = parse(text, { maxAliasCount: 50 });
  } catch (e) {
    return { ok: false, errors: [`Not a valid YAML or JSON file: ${(e as Error).message.split('\n')[0]}`] };
  }
  return parseScenario(data);
}
