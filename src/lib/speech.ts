/**
 * Turning a maths slide into something worth listening to.
 *
 * Reading LaTeX aloud verbatim is useless — "backslash frac open brace one
 * close brace" teaches nobody anything. This converts the notation into the
 * words a lecturer would actually say, so the narration matches the board.
 */

const REPLACEMENTS: [RegExp, string][] = [
  // Structures first, so their arguments are still intact.
  [/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, ' $1 over $2 '],
  [/\\dfrac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, ' $1 over $2 '],
  [/\\binom\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, ' $1 choose $2 '],
  [/\\sqrt\s*\[\s*3\s*\]\s*\{([^{}]+)\}/g, ' the cube root of $1 '],
  [/\\sqrt\s*\{([^{}]+)\}/g, ' the square root of $1 '],
  [/\\int_\s*\{?([^{}\s]+)\}?\s*\^\s*\{?([^{}\s]+)\}?/g, ' the integral from $1 to $2 of '],
  [/\\sum_\s*\{?([^{}]+)\}?\s*\^\s*\{?([^{}\s]+)\}?/g, ' the sum from $1 to $2 of '],
  [/\\lim_\s*\{([^{}]+)\}/g, ' the limit as $1 of '],
  [/\\int/g, ' the integral of '],
  [/\\sum/g, ' the sum of '],
  [/\\prod/g, ' the product of '],

  // Superscripts and subscripts.
  [/\^\s*\{?2\}?/g, ' squared '],
  [/\^\s*\{?3\}?/g, ' cubed '],
  [/\^\s*\{([^{}]+)\}/g, ' to the power of $1 '],
  [/\^\s*([A-Za-z0-9])/g, ' to the power of $1 '],
  [/_\s*\{([^{}]+)\}/g, ' sub $1 '],
  [/_\s*([A-Za-z0-9])/g, ' sub $1 '],

  // Relations and operators.
  [/\\leq|\\le\b/g, ' is less than or equal to '],
  [/\\geq|\\ge\b/g, ' is greater than or equal to '],
  [/\\neq|\\ne\b/g, ' is not equal to '],
  [/\\approx/g, ' is approximately '],
  [/\\times/g, ' times '],
  [/\\cdot/g, ' times '],
  [/\\div/g, ' divided by '],
  [/\\pm/g, ' plus or minus '],
  [/\\to|\\rightarrow/g, ' approaches '],
  [/\\infty/g, ' infinity '],
  [/\\partial/g, ' partial '],
  [/\\pi\b/g, ' pi '],
  [/\\theta\b/g, ' theta '],
  [/\\alpha\b/g, ' alpha '],
  [/\\beta\b/g, ' beta '],
  [/\\mu\b/g, ' mu '],
  [/\\sigma\b/g, ' sigma '],
  [/\\lambda\b/g, ' lambda '],
  [/\\delta\b/g, ' delta '],
  [/\\Delta\b/g, ' delta '],
  [/\\in\b/g, ' is in '],
  [/\\ldots|\\cdots|\\dots/g, ' and so on '],

  // Named functions read as themselves.
  [/\\(sin|cos|tan|log|ln|exp|max|min|det|lim)\b/g, ' $1 '],
  [/\\left|\\right/g, ' '],
  [/\\operatorname\s*\{([^{}]+)\}/g, ' $1 '],
  [/\\mathrm\s*\{([^{}]+)\}/g, ' $1 '],
  [/\\mathbb\s*\{R\}/g, ' the real numbers '],
  [/\\mathbb\s*\{N\}/g, ' the natural numbers '],
  [/\\mathbb\s*\{Z\}/g, ' the integers '],

  // Anything left over: drop the command, keep its argument.
  [/\\[a-zA-Z]+\s*\{([^{}]*)\}/g, ' $1 '],
  [/\\[a-zA-Z]+/g, ' '],
  [/[{}]/g, ' '],
  [/\\\\/g, '. '],
  [/\\,|\\;|\\!|\\:/g, ' '],
];

function latexToWords(latex: string): string {
  let text = latex;
  for (const [pattern, replacement] of REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }
  return text
    .replace(/=/g, ' equals ')
    .replace(/\+/g, ' plus ')
    .replace(/(?<=[\w\s)])-(?=[\w\s(])/g, ' minus ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Convert a slide's markdown body into a sentence a narrator can read.
 *
 * Maths becomes words, tables and figures are announced rather than spelled
 * out, and markdown decoration is dropped.
 */
export function toSpokenText(markdown: string): string {
  let text = markdown;

  // Fenced code is not narration material.
  text = text.replace(/```[\s\S]*?```/g, ' ');

  // Display then inline maths.
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, m) => ` ${latexToWords(m)} `);
  text = text.replace(/\$([^$\n]+)\$/g, (_, m) => ` ${latexToWords(m)} `);

  // A table read cell-by-cell is unlistenable; name it instead.
  text = text.replace(/(^\|.*\|\s*$\n?)+/gm, ' See the table on the board. ');
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, (_, alt) =>
    alt ? ` See the figure: ${alt}. ` : ' See the figure on the board. ');

  text = text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/(\*\*|__|\*|_|`)/g, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\\\$/g, 'dollars ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .replace(/\s+([.,;:])/g, '$1')
    .replace(/\.{2,}/g, '.')
    .trim();

  return text;
}

/** True when this browser can speak. */
export function speechAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/**
 * Pick a natural-sounding English voice.
 *
 * Voices load asynchronously, so this can legitimately return undefined on the
 * first call — the browser then falls back to its default, which is fine.
 */
export function pickVoice(): SpeechSynthesisVoice | undefined {
  if (!speechAvailable()) return undefined;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return undefined;

  const english = voices.filter((v) => v.lang?.toLowerCase().startsWith('en'));
  const preferred = ['natural', 'google', 'samantha', 'aria', 'libby', 'sonia'];
  for (const name of preferred) {
    const match = english.find((v) => v.name.toLowerCase().includes(name));
    if (match) return match;
  }
  return english[0] ?? voices[0];
}
