// Parses a typed numeric answer, so hard tasks accept exact forms:
// "1,5", "4/3", "√3", "6/√14", "8π", "2^3", "3²", "(1+√5)/2".
// Only numbers, + − × · * / ÷ ^ ² ³, parentheses, √ / sqrt and π / pi.
// Returns NaN for anything else (never evaluates code).

export function parseNumber(input: string): number {
  const src = input
    .toLowerCase()
    .replace(/sqrt/g, '√')
    .replace(/pi/g, 'π')
    .replace(/[°\s]/g, '')
    .replace(/,/g, '.')
    .replace(/[×·]/g, '*')
    .replace(/÷/g, '/')
    .replace(/[−–]/g, '-');
  if (src === '') return Number.NaN;
  let i = 0;
  const peek = () => src[i];
  const fail = () => {
    throw new SyntaxError(`bad answer "${input}"`);
  };

  const atom = (): number => {
    const c = peek();
    if (c === '(') {
      i++;
      const v = expr();
      if (peek() !== ')') fail();
      i++;
      return v;
    }
    if (c === 'π') {
      i++;
      return Math.PI;
    }
    if (c === '√') {
      i++;
      return Math.sqrt(power());
    }
    const m = /^\d+(\.\d+)?|^\.\d+/.exec(src.slice(i));
    if (!m) return fail();
    i += m[0].length;
    return Number(m[0]);
  };
  const power = (): number => {
    let v = atom();
    for (;;) {
      if (peek() === '²') (i++, (v = v * v));
      else if (peek() === '³') (i++, (v = v * v * v));
      else if (peek() === '^') {
        i++;
        v = Math.pow(v, unary());
      } else return v;
    }
  };
  const unary = (): number => {
    if (peek() === '-') {
      i++;
      return -unary();
    }
    if (peek() === '+') {
      i++;
      return unary();
    }
    return power();
  };
  const term = (): number => {
    let v = unary();
    for (;;) {
      const c = peek();
      if (c === '*') (i++, (v *= unary()));
      else if (c === '/') (i++, (v /= unary()));
      else if (c !== undefined && /[\d.(π√]/.test(c)) v *= power(); // implicit: 2π, 3√2, 2(1+x)
      else return v;
    }
  };
  const expr = (): number => {
    let v = term();
    for (;;) {
      if (peek() === '+') (i++, (v += term()));
      else if (peek() === '-') (i++, (v -= term()));
      else return v;
    }
  };

  try {
    const v = expr();
    return i === src.length ? v : Number.NaN;
  } catch (e) {
    if (e instanceof SyntaxError) return Number.NaN;
    throw e;
  }
}
