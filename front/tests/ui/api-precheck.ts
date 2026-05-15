export async function ensureApiReachable(): Promise<void> {
  if (process.env.RECIPE_BOOK_UI_SKIP_API === "1") {
    console.warn(
      "[ui-tests] RECIPE_BOOK_UI_SKIP_API=1 — проверка API пропущена.",
    );
    return;
  }

  const origin = process.env.RECIPE_BOOK_API_ORIGIN ?? "http://localhost:8080";
  const base = origin.replace(/\/$/, "");
  const urls = [`${base}/api/products`, `${base}/api/dishes`];
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 10_000);
  try {
    for (const url of urls) {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) {
        throw new Error(`GET ${url} → HTTP ${res.status}`);
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      [
        "UI-тесты: API недоступен.",
        `Ожидался Spring Boot на ${origin}.`,
        `Проверки: ${urls.join(", ")}`,
        `Ошибка: ${msg}`,
      ].join("\n"),
    );
  } finally {
    clearTimeout(t);
  }
}