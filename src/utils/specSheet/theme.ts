/**
 * Spec-sheet design tokens, mirroring tailwind.config.js so the PDF and the
 * product page stay visually related.
 *
 * Colour discipline — three roles only:
 *   RED   accent bar, section headings, price emphasis, highlight callout.
 *         NOT table heads; red heads on eight tables turn a technical
 *         document into a flyer.
 *   GRAY  the structural workhorse: heads, rules, zebra rows, label cells.
 *   GREEN eco/positive signals only.
 */

export type RGB = [number, number, number];

// berlin-red
export const RED_50: RGB = [254, 242, 242];
export const RED_200: RGB = [254, 202, 202];
export const RED_500: RGB = [239, 68, 68];
export const RED_600: RGB = [220, 38, 38];

// berlin-gray
export const GRAY_50: RGB = [249, 250, 251];
export const GRAY_200: RGB = [229, 231, 235];
export const GRAY_400: RGB = [156, 163, 175];
export const GRAY_600: RGB = [75, 85, 99];
export const GRAY_700: RGB = [55, 65, 81];
export const GRAY_900: RGB = [17, 24, 39];

export const WHITE: RGB = [255, 255, 255];
export const GREEN_600: RGB = [22, 163, 74];
export const AMBER_500: RGB = [245, 158, 11];
export const ORANGE_500: RGB = [249, 115, 22];

/**
 * Single constant so swapping in an embedded Inter later is a one-line change.
 * Helvetica is a standard-14 font: no embedding, tiny output, opens everywhere —
 * but WinAnsi/cp1252 only, which is why every string goes through toWinAnsi().
 */
export const FONT = 'helvetica';

export const SIZE = {
  eyebrow: 7.5,
  h1: 17,
  h1Small: 14,
  supplier: 10,
  section: 10.5,
  groupLabel: 8.5,
  body: 9,
  table: 8.5,
  price: 14,
  micro: 7,
} as const;

export const SPACE = {
  section: 6,
  paragraph: 3,
  afterHeading: 4,
  line: 1.35, // line-height factor
} as const;

/** Eco-score thresholds copied from components/ui/SustainabilityScore.tsx:18-23
 *  so the PDF badge and the on-page badge never disagree. */
export function ecoColor(score: number): RGB {
  if (score >= 80) return [34, 197, 94];
  if (score >= 60) return [74, 222, 128];
  if (score >= 40) return AMBER_500;
  if (score >= 20) return ORANGE_500;
  return RED_500;
}
