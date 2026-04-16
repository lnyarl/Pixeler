const MAX_RETRIES = 3;

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
 * fetch + exponential backoff 재시도.
 * 타임아웃 없음 — 사용자가 취소 버튼으로 직접 중단.
 * 429 상태코드에 대해 자동 재시도 (최대 3회).
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  options: FetchWithRetryOptions = {}
): Promise<Response> {
  const { signal, retryStatuses = [429] } = options;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (signal?.aborted) throw new Error("요청이 취소되었습니다.");

    try {
      const response = await fetch(url, {
        ...init,
        signal,
      });

      if (retryStatuses.includes(response.status) && attempt < MAX_RETRIES) {
        const delay = Math.pow(2, attempt) * 1000;
        await abortableDelay(delay, signal);
        continue;
      }

      return response;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new Error("요청이 취소되었습니다.");
      }
      throw err;
    }
  }

  throw new Error("최대 재시도 횟수를 초과했습니다.");
}
