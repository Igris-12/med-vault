// Cosine similarity utilities — zero dependencies, sub-millisecond for 768-dim

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

export function findTopK<T extends { embedding: number[] }>(
  queryVec: number[],
  docs: T[],
  k: number
): (T & { similarity: number })[] {
  return docs
    .map((doc) => ({ ...doc, similarity: cosineSimilarity(queryVec, doc.embedding) }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k);
}
