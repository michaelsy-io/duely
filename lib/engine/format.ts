// Python-compatible number formatting (round-half-even on the exact binary value),
// so engine strings match the reference report character for character.

function roundDecimalString(x: number, digits: number): string {
  if (!Number.isFinite(x)) return String(x);
  const neg = x < 0 || Object.is(x, -0);
  const ax = Math.abs(x);
  // Exact decimal expansion of the double (up to 100 fractional digits).
  const exact = ax.toFixed(100);
  const [intPart, fracPart] = exact.split(".");
  const keep = fracPart.slice(0, digits);
  const rest = fracPart.slice(digits);
  let digitsStr = intPart + keep;
  const first = rest[0] ?? "0";
  const tail = rest.slice(1);
  let roundUp = false;
  if (first > "5") roundUp = true;
  else if (first === "5") {
    if (/[1-9]/.test(tail)) roundUp = true;
    else {
      const last = Number(digitsStr[digitsStr.length - 1]);
      roundUp = last % 2 === 1;
    }
  }
  if (roundUp) {
    const arr = digitsStr.split("").map(Number);
    let i = arr.length - 1;
    while (i >= 0) {
      if (arr[i] === 9) { arr[i] = 0; i--; } else { arr[i]++; break; }
    }
    if (i < 0) arr.unshift(1);
    digitsStr = arr.join("");
  }
  const ip = digitsStr.slice(0, digitsStr.length - digits) || "0";
  const fp = digits > 0 ? digitsStr.slice(digitsStr.length - digits) : "";
  const isZero = /^0*$/.test(ip + fp);
  const sign = neg && !isZero ? "-" : neg ? "-" : "";
  return sign + ip.replace(/^0+(?=\d)/, "") + (digits > 0 ? "." + fp : "");
}

/** Python f"{x:.{d}f}" */
export function fixed(x: number, digits: number): string {
  return roundDecimalString(x, digits);
}

/** Python f"{x:,.{d}f}" */
export function grouped(x: number, digits = 0): string {
  const s = roundDecimalString(x, digits);
  const neg = s.startsWith("-");
  const body = neg ? s.slice(1) : s;
  const [ip, fp] = body.split(".");
  const g = ip.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return (neg ? "-" : "") + g + (fp !== undefined ? "." + fp : "");
}

/** Python f"{x:.{d}%}" */
export function pct(x: number, digits = 1): string {
  return roundDecimalString(x * 100, digits) + "%";
}

/** Python peso = f"₱{x:,.0f}" */
export function peso(x: number): string {
  return "₱" + grouped(x, 0);
}
