import type { AiSourcing, Scenario } from '@ai-roi-calc/engine';
import { appliesUnder, sourcingPreset } from '@ai-roi-calc/engine';

/** Why an item costs nothing right now, or null when it is costed. */
export function inactiveNote(item: { sourcing?: AiSourcing[] }, scenario: Scenario): string | null {
  if (!scenario.aiSourcing || appliesUnder(item, scenario.aiSourcing)) return null;
  return `not costed with ${sourcingPreset(scenario.aiSourcing).label}`;
}
