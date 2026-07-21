/** Token overlap helpers for lightweight RAG ranking (no DB deps). */

export function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .split(/[^a-z0-9ąćęłńóśźżàáâäãåèéêëìíîïòóôöùúûüç]+/i)
      .filter((t) => t.length > 2)
  );
}

/** Jaccard-like overlap on tokens (0–1). */
export function tokenizeSimilarity(a: string, b: string): number {
  const ta = tokenize(a);
  const tb = tokenize(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) {
    if (tb.has(t)) inter += 1;
  }
  return inter / (ta.size + tb.size - inter);
}
