/**
 * Reference figures for self-hosting a small open-weight model. App-level, not stored in the
 * scenario: only the monthly number a consultant picks lands there, so stale hardware prices can
 * never silently move a saved customer case.
 *
 * Every figure is a published list price with a date and a source. Hardware prices in particular
 * moved sharply during 2026 (Apple raised Mac prices 15–20% in June 2026, citing memory costs),
 * so these are a starting point to check, not a quotation.
 */
export interface InfraReference {
  id: string;
  label: string;
  kind: 'hardware' | 'cloud';
  /** Monthly cost per unit, USD. */
  monthlyUsd: number;
  /** How the monthly figure was derived, shown to the user. */
  basis: string;
  source: string;
  note?: string;
}

export const INFRA_REFERENCE_AS_OF = '2026-10-06';
const HOURS_PER_MONTH = 730;
/** Hardware is a purchase; spreading it over three years gives a monthly figure to compare with rent. */
export const HARDWARE_AMORTISATION_MONTHS = 36;

const hardware = (id: string, label: string, price: number, source: string, note?: string): InfraReference => ({
  id,
  label,
  kind: 'hardware',
  monthlyUsd: price / HARDWARE_AMORTISATION_MONTHS,
  basis: `$${price.toLocaleString('en')} purchase ÷ ${HARDWARE_AMORTISATION_MONTHS} months`,
  source,
  note,
});

const cloud = (id: string, label: string, perHour: number, source: string, note?: string): InfraReference => ({
  id,
  label,
  kind: 'cloud',
  monthlyUsd: perHour * HOURS_PER_MONTH,
  basis: `$${perHour}/hour × ${HOURS_PER_MONTH} hours`,
  source,
  note,
});

export const INFRA_REFERENCES: InfraReference[] = [
  hardware('mac-mini-m6-16', 'Mac mini M6, 16GB', 899, 'apple.com, 22 Sep 2026', 'Entry tier; RAM caps the model size you can run.'),
  hardware('mac-mini-m6-24', 'Mac mini M6, 24GB', 1_299, 'apple.com, Sep 2026'),
  hardware('mac-mini-m5-pro-24', 'Mac mini M5 Pro, 24GB', 1_699, 'apple.com, 22 Sep 2026', '64GB ceiling on this line; BTO upgrade prices not published.'),
  cloud('aws-g6-xlarge-od', 'AWS g6.xlarge (1× L4 24GB), on demand', 0.8048, 'Vantage instance pricing, 2026'),
  cloud('aws-g6-xlarge-ri', 'AWS g6.xlarge, 1-year reserved', 0.5239, 'Vantage instance pricing, 2026', 'No upfront; the usual choice for steady inference.'),
  cloud('gcp-g2-standard-4', 'GCP g2-standard-4 (1× L4 24GB)', 0.7, 'third-party aggregator, 2026'),
  cloud('azure-nc8as-t4', 'Azure NC8as_T4_v3 (1× T4 16GB)', 0.752, 'third-party aggregator, 2026'),
  cloud('aws-c7i-4xlarge', 'AWS c7i.4xlarge (CPU only, 16 vCPU)', 0.714, 'Vantage instance pricing, 2026', 'CPU inference is far slower; viable only for small models or low volume.'),
];

export const INFRA_REFERENCE_NOTE =
  'List prices as of ' +
  INFRA_REFERENCE_AS_OF +
  ', USD. Cloud figures came from third-party aggregators rather than provider pricing pages, and hardware prices moved 15–20% during 2026 — verify against the vendor before quoting. Electricity, networking and the people who run the machines are not included.';

/** Monthly cost of `units` of a reference, converted into the scenario currency. */
export function referenceMonthlyCost(reference: InfraReference, units: number, usdToScenario: number): number {
  return reference.monthlyUsd * units * usdToScenario;
}
