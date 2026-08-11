/**
 * Wyciąga JSON z odpowiedzi AI (markdown, tekst otaczający, tablice).
 */
export function extractJson<T>(text: string): T {
  if (!text) throw new Error('Otrzymano pusty tekst do sparsowania.');

  const cleanText = text
    .replace(/```json\s?([\s\S]*?)```/g, '$1')
    .replace(/```\s?([\s\S]*?)```/g, '$1')
    .trim();

  try {
    const firstBrace = cleanText.indexOf('{');
    const firstBracket = cleanText.indexOf('[');
    const lastBrace = cleanText.lastIndexOf('}');
    const lastBracket = cleanText.lastIndexOf(']');

    let start = -1;
    let end = -1;

    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
      start = firstBrace;
      end = lastBrace;
    } else if (firstBracket !== -1) {
      start = firstBracket;
      end = lastBracket;
    }

    if (start !== -1 && end !== -1 && end > start) {
      const possibleJson = cleanText.substring(start, end + 1);
      return JSON.parse(possibleJson) as T;
    }

    return JSON.parse(cleanText) as T;
  } catch {
    throw new Error('Model AI nie zwrócił poprawnego formatu JSON. Otrzymano tekst zamiast danych.');
  }
}
