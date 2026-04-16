const MAX_RETRIES = 3;
const TIMEOUT_MS = 60_000;

interface FetchWithRetryOptions {
  signal?: AbortSignal;
  retryStatuses?: number[];
}

/** abort-aware delay: signal이 abort되면 즉시 reject */
function abortableDelay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error("요청이 취소되었습니다."));
      return;
    }

    const timer = setTimeout(resolve, ms);

    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new Error("요청이 취소되었습니다."));
      },
      { once: true }
    );
  });
}

/**
 * fetch + AbortController 타임아웃 + exponential backoff 재시도.
 * 429 상태코드에 대해 자동 재시도 (최대 3회).
 * 재시도 대기 중에도 외부 signal abort에 즉시 반응.
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  options: FetchWithRetryOptions = {}
): Promise<Response> {
  const { signal, retryStatuses = [429] } = options;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // 외부 signal 체크
    if (signal?.aborted) throw new Error("요청이 취소되었습니다.");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    // 외부 signal → 내부 controller 연결 (cleanup 포함)
    const onAbort = () => controller.abort();
    signal?.addEventListener("abort", onAbort, { once: true });

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      signal?.removeEventListener("abort", onAbort);

      if (retryStatuses.includes(response.status) && attempt < MAX_RETRIES) {
        const delay = Math.pow(2, attempt) * 1000;
        await abortableDelay(delay, signal);
        continue;
      }

      return response;
    } catch (err) {
      clearTimeout(timeoutId);
      signal?.removeEventListener("abort", onAbort);

      if (err instanceof DOMException && err.name === "AbortError") {
        if (signal?.aborted) {
          throw new Error("요청이 취소되었습니다.");
        }
        throw new Error("응답 시간이 초과되었습니다. (30초)");
      }

      throw err;
    }
  }

  throw new Error("최대 재시도 횟수를 초과했습니다.");
}
