/**
 * PSX company names sometimes carry a "NON-COMPLIANT" suffix (e.g.
 * "Hira Textile Mills LimitedNON-COMPLIANT") to flag that the stock is not
 * Shariah-compliant. Names without that marker are treated as compliant.
 *
 * parseCompliance() strips the marker for display and returns the flag so the
 * UI can render a proper icon + tooltip instead of dumping the raw text.
 */
export interface ComplianceInfo {
  /** Name with the compliance marker removed, safe to display. */
  cleanName: string;
  /** true = Shariah compliant, false = explicitly non-compliant. */
  isCompliant: boolean;
}

// Non-global for a stateful-safe .test(); matches "NON-COMPLIANT", "NON COMPLIANT", "NONCOMPLIANT".
const NON_COMPLIANT_TEST = /NON[-\s]?COMPLIANT/i;
const NON_COMPLIANT_STRIP = /\s*NON[-\s]?COMPLIANT\s*/gi;

export function parseCompliance(rawName?: string | null): ComplianceInfo {
  const name = String(rawName ?? '');
  const isCompliant = !NON_COMPLIANT_TEST.test(name);
  const cleanName = name.replace(NON_COMPLIANT_STRIP, ' ').replace(/\s{2,}/g, ' ').trim();
  return { cleanName: cleanName || name, isCompliant };
}
