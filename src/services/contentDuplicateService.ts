export interface SimilarPost {
  id: string;
  topic: string;
  timestamp: number;
  platform?: string;
  similarity: number; // 0-1
}

export interface DuplicateCheckResult {
  hasSimilar: boolean;
  mostSimilar?: SimilarPost;
  allSimilar: SimilarPost[];
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\w\sąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3)
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  const intersection = new Set([...a].filter(x => b.has(x)));
  const union = new Set([...a, ...b]);
  return intersection.size / union.size;
}

export function checkForSimilarContent(
  newTopic: string,
  history: Array<{ id: string; formData?: { topic?: string; platform?: string } | null; timestamp: number }>,
  threshold = 0.35
): DuplicateCheckResult {
  if (!newTopic.trim() || history.length === 0) {
    return { hasSimilar: false, allSimilar: [] };
  }

  const newTokens = tokenize(newTopic);
  const similar: SimilarPost[] = [];

  for (const item of history) {
    const topic = item.formData?.topic;
    if (!topic || typeof topic !== 'string') continue;

    const similarity = jaccardSimilarity(newTokens, tokenize(topic));
    if (similarity >= threshold) {
      similar.push({
        id: item.id,
        topic,
        timestamp: item.timestamp,
        platform: item.formData?.platform,
        similarity,
      });
    }
  }

  similar.sort((a, b) => b.similarity - a.similarity);

  return {
    hasSimilar: similar.length > 0,
    mostSimilar: similar[0],
    allSimilar: similar.slice(0, 3),
  };
}

export function formatTimeAgo(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return 'dzisiaj';
  if (days === 1) return 'wczoraj';
  if (days < 7) return `${days} dni temu`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    const weeksLabel = weeks === 1 ? 'tydzień' : weeks < 5 ? 'tygodnie' : 'tygodni';
    return `${weeks} ${weeksLabel} temu`;
  }
  const months = Math.floor(days / 30);
  const monthsLabel = months === 1 ? 'miesiąc' : months < 5 ? 'miesiące' : 'miesięcy';
  return `${months} ${monthsLabel} temu`;
}
