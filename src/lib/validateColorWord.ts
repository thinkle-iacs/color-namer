import { Filter } from 'bad-words';

const filter = new Filter();

const directColorWords = [
  'red', 'black', 'white', 'purple', 'orange', 'green', 'blue', 'yellow',
  'pink', 'brown', 'gray', 'grey', 'beige', 'tan', 'cyan', 'magenta', 'teal',
  'maroon', 'navy', 'azure', 'chartreuse', 'crimson', 'fuchsia', 'indigo',
  'ivory', 'lavender', 'mauve', 'ochre', 'peach', 'periwinkle', 'salmon',
  'sapphire', 'scarlet', 'turquoise', 'vermilion', 'violet', 'viridian',
  'amber', 'coral', 'khaki', 'lime', 'mint', 'olive', 'plum', 'rose',
  'rust', 'sienna', 'silver', 'gold', 'bronze', 'copper', 'cream',
];

const shadeWords = [
  'light', 'lighter', 'lightest', 'dark', 'darker', 'darkest',
  'bright', 'brighter', 'brightest', 'pale', 'paler', 'palest',
  'deep', 'deeper', 'deepest', 'vivid', 'dull', 'muted', 'saturated',
  'hue', 'shade', 'tint', 'tone', 'color', 'colour',
];

function validateWord(word: string): string | undefined {
  const lower = word.toLowerCase();

  if (directColorWords.includes(lower)) {
    return `"${word}" is a color name — be more creative!`;
  }
  for (const colorWord of directColorWords) {
    if (lower.includes(colorWord)) {
      return `"${word}" contains a color name`;
    }
  }
  if (shadeWords.includes(lower)) {
    return `"${word}" is a shade/tone word — not allowed`;
  }
  if (word.length > 30) {
    return 'Each word must be 30 characters or less';
  }
  try {
    if (filter.isProfane(word)) {
      return 'Please keep it family-friendly!';
    }
  } catch {
    // bad-words can throw on some inputs
  }
}

// Validate a full 2-word clue. Returns an error string, or undefined if valid.
export function validateClue(clue: string): string | undefined {
  const words = clue.trim().split(/\s+/).filter((w) => w.length > 0);

  if (words.length < 2) {
    return 'Your clue must be exactly two words';
  }
  if (words.length > 2) {
    return 'Your clue must be exactly two words — no more!';
  }

  for (const word of words) {
    const err = validateWord(word);
    if (err) return err;
  }
}
