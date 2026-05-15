import { getRecipeBookApiOrigin } from "./seed-product.js";

export async function deleteDishesByNameSubstring(
  substring: string,
): Promise<void> {
  const base = getRecipeBookApiOrigin();
  const res = await fetch(`${base}/api/dishes`);
  if (!res.ok) return;
  const dishes = (await res.json()) as { id: number; name: string }[];
  for (const d of dishes) {
    if (!d.name.includes(substring)) continue;
    await fetch(`${base}/api/dishes/${d.id}`, { method: "DELETE" });
  }
}

export async function deleteProductsByNameSubstring(
  substring: string,
): Promise<void> {
  const base = getRecipeBookApiOrigin();
  const res = await fetch(`${base}/api/products`);
  if (!res.ok) return;
  const products = (await res.json()) as { id: number; name: string }[];
  for (const p of products) {
    if (!p.name.includes(substring)) continue;
    await fetch(`${base}/api/products/${p.id}`, { method: "DELETE" });
  }
}
