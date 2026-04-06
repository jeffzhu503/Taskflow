import { BACKEND_BASE_URL } from '../github/config';
import type { AnalyzeResponse } from '../types';

export async function analyzeDocuments(files: File[]): Promise<AnalyzeResponse> {
  const form = new FormData();
  for (const file of files) {
    form.append('files', file);
  }
  const resp = await fetch(`${BACKEND_BASE_URL}/api/rag/analyze`, {
    method: 'POST',
    body: form,
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: resp.statusText }));
    throw new Error(String(err.detail ?? resp.statusText));
  }
  return resp.json() as Promise<AnalyzeResponse>;
}
