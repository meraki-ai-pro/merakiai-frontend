/**
 * Parses a tutor answer into presentation-board slides.
 *
 * The board reads the *same* markdown that already streams over the WebSocket —
 * no second model call, no separate stream. The tutor writes fenced blocks and
 * this parser turns them into slides as the text arrives, so the board fills in
 * while the answer is still being written instead of appearing at the end.
 *
 * Syntax the tutor emits:
 *
 *   ::: slide The Power Rule
 *   The derivative of $x^n$ is:
 *   $$\frac{d}{dx}x^n = nx^{n-1}$$
 *   :::
 *
 *   ::: plot
 *   {"kind":"function","title":"y = x²","expr":"x^2","domain":[-3,3]}
 *   :::
 *
 * Parsing is tolerant of a half-written trailing block: an unclosed slide is
 * returned with whatever body has arrived so far, which is what makes the
 * reveal feel live.
 */

export type PlotSpec =
  | {
      kind: 'function';
      title?: string;
      expr: string;
      domain?: [number, number];
      samples?: number;
      xLabel?: string;
      yLabel?: string;
    }
  | {
      kind: 'xy';
      title?: string;
      x: number[];
      series: { name: string; y: number[] }[];
      xLabel?: string;
      yLabel?: string;
      chart?: 'line' | 'bar' | 'scatter';
    };

export interface Slide {
  id: number;
  title: string;
  body: string;
  plot?: PlotSpec;
  /** False while the closing fence has not arrived yet. */
  complete: boolean;
}

const OPEN_RE = /^:::\s*(slide|plot)\s*(.*)$/;
const CLOSE_RE = /^:::\s*$/;

/** True when the text uses board syntax at all. */
export function hasBoard(text: string): boolean {
  return /^:::\s*(slide|plot)\b/m.test(text);
}

/**
 * Strip board fences, leaving plain markdown.
 *
 * Used for the chat transcript and for narration, so a student reading (or
 * hearing) the answer never encounters the markup.
 */
export function stripBoardSyntax(text: string): string {
  const out: string[] = [];
  let inPlot = false;

  for (const line of text.split('\n')) {
    const open = OPEN_RE.exec(line.trim());
    if (open) {
      inPlot = open[1] === 'plot';
      if (open[1] === 'slide' && open[2].trim()) out.push(`### ${open[2].trim()}`);
      continue;
    }
    if (CLOSE_RE.test(line.trim())) {
      inPlot = false;
      continue;
    }
    if (!inPlot) out.push(line);
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function parsePlot(raw: string, fallbackTitle: string): PlotSpec | undefined {
  const text = raw.trim();
  if (!text) return undefined;
  try {
    const spec = JSON.parse(text) as PlotSpec;
    if (spec.kind === 'function' && typeof spec.expr === 'string') {
      return { ...spec, title: spec.title || fallbackTitle || undefined };
    }
    if (spec.kind === 'xy' && Array.isArray(spec.x) && Array.isArray(spec.series)) {
      return { ...spec, title: spec.title || fallbackTitle || undefined };
    }
  } catch {
    // A plot block that is still streaming is not yet valid JSON — that is
    // expected, not an error. It renders once the closing brace arrives.
  }
  return undefined;
}

export function parseBoard(text: string): Slide[] {
  const lines = text.split('\n');
  const slides: Slide[] = [];

  let current: Slide | null = null;
  let plotBuffer: string[] | null = null;
  let nextId = 0;

  const closeSlide = (complete: boolean) => {
    if (!current) return;
    current.body = current.body.replace(/\n{3,}/g, '\n\n').trim();
    current.complete = complete;
    if (current.body || current.plot || current.title) slides.push(current);
    current = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const open = OPEN_RE.exec(trimmed);

    if (open) {
      const [, kind, rest] = open;
      if (kind === 'slide') {
        closeSlide(true);
        current = { id: nextId++, title: rest.trim(), body: '', complete: false };
      } else {
        // A plot attaches to the open slide, or stands alone as its own.
        if (!current) current = { id: nextId++, title: rest.trim(), body: '', complete: false };
        plotBuffer = [];
      }
      continue;
    }

    if (CLOSE_RE.test(trimmed)) {
      if (plotBuffer) {
        const spec = parsePlot(plotBuffer.join('\n'), current?.title ?? '');
        if (current && spec) current.plot = spec;
        plotBuffer = null;
      } else {
        closeSlide(true);
      }
      continue;
    }

    if (plotBuffer) plotBuffer.push(line);
    else if (current) current.body += line + '\n';
  }

  // Whatever is mid-flight still shows — that is the live-reveal behaviour.
  if (plotBuffer && current) {
    const spec = parsePlot(plotBuffer.join('\n'), current.title);
    if (spec) current.plot = spec;
  }
  closeSlide(false);

  return slides;
}

// ── Safe expression evaluation ───────────────────────────────────────────────
//
// Plotting "y = x^2" means evaluating a model-authored string. `eval` and
// `new Function` are both out: the expression comes from generated content, so
// it is untrusted input. This is a small shunting-yard parser over a closed
// grammar — numbers, `x`, the named constants, five operators, and a fixed
// function table. Anything outside that grammar fails to parse and the plot is
// simply not drawn.

type Token = { t: 'num'; v: number } | { t: 'id'; v: string } | { t: 'op'; v: string } | { t: 'paren'; v: '(' | ')' } | { t: 'comma' };

const FUNCTIONS: Record<string, (n: number) => number> = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan,
  asin: Math.asin, acos: Math.acos, atan: Math.atan,
  sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
  exp: Math.exp, ln: Math.log, log: Math.log10, log10: Math.log10,
  sqrt: Math.sqrt, abs: Math.abs, floor: Math.floor, ceil: Math.ceil, sign: Math.sign,
};

const CONSTANTS: Record<string, number> = { pi: Math.PI, e: Math.E };

const PRECEDENCE: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2, '^': 3 };

function tokenize(input: string): Token[] | null {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const ch = input[i];

    if (/\s/.test(ch)) { i++; continue; }

    if (/[0-9.]/.test(ch)) {
      let j = i;
      while (j < input.length && /[0-9.]/.test(input[j])) j++;
      const value = Number(input.slice(i, j));
      if (!Number.isFinite(value)) return null;
      tokens.push({ t: 'num', v: value });
      i = j;
      continue;
    }

    if (/[a-zA-Z_]/.test(ch)) {
      let j = i;
      while (j < input.length && /[a-zA-Z_0-9]/.test(input[j])) j++;
      tokens.push({ t: 'id', v: input.slice(i, j).toLowerCase() });
      i = j;
      continue;
    }

    if ('+-*/^%'.includes(ch)) { tokens.push({ t: 'op', v: ch }); i++; continue; }
    if (ch === '(' || ch === ')') { tokens.push({ t: 'paren', v: ch }); i++; continue; }
    if (ch === ',') { tokens.push({ t: 'comma' }); i++; continue; }

    return null; // outside the grammar
  }

  return tokens;
}

/** Compile an expression to a function of x, or null if it is not valid. */
export function compileExpression(expr: string): ((x: number) => number) | null {
  const tokens = tokenize(expr);
  if (!tokens || tokens.length === 0) return null;

  const output: Token[] = [];
  const stack: Token[] = [];
  let prev: Token | undefined;

  for (const token of tokens) {
    if (token.t === 'num') {
      output.push(token);
    } else if (token.t === 'id') {
      if (token.v in FUNCTIONS) stack.push(token);
      else output.push(token); // variable or constant
    } else if (token.t === 'comma') {
      return null; // single-argument grammar only
    } else if (token.t === 'op') {
      // Unary minus/plus: at the start, or after another operator or "(".
      const unary =
        !prev || (prev.t === 'op') || (prev.t === 'paren' && prev.v === '(');
      if (unary && (token.v === '-' || token.v === '+')) {
        output.push({ t: 'num', v: 0 });
        stack.push(token);
      } else {
        while (stack.length) {
          const top = stack[stack.length - 1];
          if (top.t === 'id') { output.push(stack.pop()!); continue; }
          if (top.t === 'op') {
            const higher = PRECEDENCE[top.v] > PRECEDENCE[token.v];
            const equalLeft = PRECEDENCE[top.v] === PRECEDENCE[token.v] && token.v !== '^';
            if (higher || equalLeft) { output.push(stack.pop()!); continue; }
          }
          break;
        }
        stack.push(token);
      }
    } else if (token.v === '(') {
      stack.push(token);
    } else {
      let matched = false;
      while (stack.length) {
        const top = stack.pop()!;
        if (top.t === 'paren' && top.v === '(') { matched = true; break; }
        output.push(top);
      }
      if (!matched) return null;
      if (stack.length && stack[stack.length - 1].t === 'id') output.push(stack.pop()!);
    }
    prev = token;
  }

  while (stack.length) {
    const top = stack.pop()!;
    if (top.t === 'paren') return null; // unbalanced
    output.push(top);
  }

  // Validate arity once, up front, so evaluation per sample stays cheap.
  let depth = 0;
  for (const token of output) {
    if (token.t === 'num') depth += 1;
    else if (token.t === 'id') depth += token.v in FUNCTIONS ? 0 : 1;
    else if (token.t === 'op') depth -= 1;
    if (depth < 0) return null;
  }
  if (depth !== 1) return null;

  return (x: number) => {
    const values: number[] = [];
    for (const token of output) {
      if (token.t === 'num') {
        values.push(token.v);
      } else if (token.t === 'id') {
        const fn = FUNCTIONS[token.v];
        if (fn) {
          const arg = values.pop();
          values.push(arg === undefined ? NaN : fn(arg));
        } else if (token.v in CONSTANTS) {
          values.push(CONSTANTS[token.v]);
        } else {
          values.push(x); // any other identifier is the variable
        }
      } else if (token.t === 'op') {
        const b = values.pop() ?? NaN;
        const a = values.pop() ?? NaN;
        switch (token.v) {
          case '+': values.push(a + b); break;
          case '-': values.push(a - b); break;
          case '*': values.push(a * b); break;
          case '/': values.push(a / b); break;
          case '%': values.push(a % b); break;
          case '^': values.push(Math.pow(a, b)); break;
          default: return NaN;
        }
      }
    }
    return values.length === 1 ? values[0] : NaN;
  };
}

export interface PlotPoint {
  x: number;
  [series: string]: number | null;
}

/** Turn a plot spec into Recharts-ready rows, or null if it cannot be drawn. */
export function buildPlotData(spec: PlotSpec): { data: PlotPoint[]; series: string[] } | null {
  if (spec.kind === 'xy') {
    if (!spec.x.length || !spec.series.length) return null;
    const data: PlotPoint[] = spec.x.map((x, i) => {
      const row: PlotPoint = { x };
      for (const s of spec.series) row[s.name] = Number.isFinite(s.y[i]) ? s.y[i] : null;
      return row;
    });
    return { data, series: spec.series.map((s) => s.name) };
  }

  const fn = compileExpression(spec.expr);
  if (!fn) return null;

  const [min, max] = spec.domain ?? [-5, 5];
  if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) return null;

  const samples = Math.min(Math.max(spec.samples ?? 160, 20), 600);
  const step = (max - min) / (samples - 1);
  // The series name shows in the tooltip on every hover, so keep it short —
  // the spec's title is already the figure caption above the chart.
  const name = spec.yLabel || 'y';

  const data: PlotPoint[] = [];
  for (let i = 0; i < samples; i++) {
    const x = min + i * step;
    const y = fn(x);
    // Asymptotes and out-of-domain points become gaps rather than spikes.
    data.push({ x: Number(x.toFixed(6)), [name]: Number.isFinite(y) ? y : null });
  }

  return { data, series: [name] };
}
