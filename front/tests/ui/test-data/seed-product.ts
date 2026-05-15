export function getRecipeBookApiOrigin(): string {
  return (process.env.RECIPE_BOOK_API_ORIGIN ?? "http://localhost:8080").replace(
    /\/$/,
    "",
  );
}

export type SeededProduct = {
  id: number;
  name: string;
  per100g: { calories: number; proteins: number; fats: number; carbs: number };
};

export async function createSeededProductForDishTests(): Promise<SeededProduct> {
  const name = `UI_SEED_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const per100g = {
    calories: 100,
    proteins: 10,
    fats: 15,
    carbs: 20,
  };
  const body = {
    name,
    photos: [],
    calories: per100g.calories,
    proteins: per100g.proteins,
    fats: per100g.fats,
    carbs: per100g.carbs,
    composition: null,
    category: "MEAT",
    degreeReadiness: "READY_TO_EAT",
    flags: [],
  };
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
  const json = (await res.json()) as { id: number };
  if (typeof json.id !== "number") {
    throw new Error("POST /api/products: в ответе нет числового id");
  }
  return { id: json.id, name, per100g };
}

export async function createVeganVegetableProduct(): Promise<{
  id: number;
  name: string;
}> {
  const name = `UI_VEGAN_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const body = {
    name,
    photos: [],
    calories: 40,
    proteins: 10,
    fats: 5,
    carbs: 10,
    composition: null,
    category: "VEGETABLES",
    degreeReadiness: "READY_TO_EAT",
    flags: ["VEGAN"],
  };
  const res = await fetch(`${getRecipeBookApiOrigin()}/api/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(
      `POST /api/products (vegan) → ${res.status} ${await res.text().catch(() => "")}`,
    );
  }
  const json = (await res.json()) as { id: number };
  if (typeof json.id !== "number") {
    throw new Error("POST /api/products: в ответе нет числового id");
  }
  return { id: json.id, name };
}

export async function deleteProductById(id: number): Promise<void> {
  const res = await fetch(`${getRecipeBookApiOrigin()}/api/products/${id}`, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`DELETE /api/products/${id} → ${res.status}`);
  }
}

export function expectedPortionKbjy(
  per100g: SeededProduct["per100g"],
  grams: number,
): { calories: string; proteins: string; fats: string; carbs: string } {
  const f = (v: number) => v.toFixed(2);
  const k = grams / 100;
  return {
    calories: f(per100g.calories * k),
    proteins: f(per100g.proteins * k),
    fats: f(per100g.fats * k),
    carbs: f(per100g.carbs * k),
  };
}
