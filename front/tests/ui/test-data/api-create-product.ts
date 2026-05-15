import { getRecipeBookApiOrigin } from "./seed-product.js";

export async function apiCreateProduct(
  body: Record<string, unknown>,
): Promise<{ id: number; name: string }> {
  const res = await fetch(`${getRecipeBookApiOrigin()}/api/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(
      `POST /api/products → ${res.status} ${await res.text().catch(() => "")}`,
    );
  }
  const json = (await res.json()) as { id: number; name: string };
  if (typeof json.id !== "number") {
    throw new Error("POST /api/products: в ответе нет числового id");
  }
  return json;
}
