const MAX_RETRIES = 3;
const TIMEOUT_MS = 30_000;

interface FetchWithRetryOptions {
  signal?: AbortSignal;
  /** 재시도 대상 HTTP 상태코드 (기본: [429]) */
  retryStatuses?: number[];
}

/**
 * fetch + AbortController 타임아웃 + exponential backoff 재시도.
 * 429 상태코드에 대해 자동 재시도 (최대 3회).
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  options: FetchWithRetryOptions = {}
): Promise<Response> {
  const { signal, retryStatuses = [429] } = options;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();

    // 외부 signal이 취소되면 내부 controller도 취소
    if (signal) {
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
      signal.addEventListener("abort", () => controller.abort(), { once: true });
    }

    // 타임아웃
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (retryStatuses.includes(response.status) && attempt < MAX_RETRIES) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      return response;
    } catch (err) {
      clearTimeout(timeoutId);

      if (err instanceof DOMException && err.name === "AbortError") {
        if (signal?.aborted) {
          throw new Error("요청이 취소되었습니다.");
        }
        throw new Error("응답 시간이 초과되었습니다. (30초)");
      }

      // 네트워크 에러에 대해서는 재시도하지 않음
      throw err;
    }
  }

  throw new Error("최대 재시도 횟수를 초과했습니다.");
}
