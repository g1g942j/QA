const {
  calculateDishNutritionTotals,
  formatNutritionField,
} = require("../pages/dishes/dishes-nutrition.js");

describe("Подсчёт калорийности блюда", () => {
  let products;
  let resolveProductStub;

  beforeEach(() => {
    products = [
      { id: 1, calories: 250, proteins: 10, fats: 15, carbs: 20 },
      { id: 2, calories: 40, proteins: 1, fats: 0.2, carbs: 9 },
    ];

    resolveProductStub = jest.fn((id) =>
      products.find((product) => product.id === id),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Эквивалентные классы", () => {
    test.each([
      {
        title: "Валидные ингредиенты",
        composition: [
          { productId: 1, amount: 100 },
          { productId: 2, amount: 50 },
        ],
        expectedCalories: 270,
      },
    ])("Расчёт калорий для $title", ({ composition, expectedCalories }) => {
      const totals = calculateDishNutritionTotals(
        composition,
        resolveProductStub,
      );

      expect(totals.calories).toBeCloseTo(expectedCalories, 5);
    });

    test("Выбрасывает ошибку для смешанных типов ингредиентов", () => {
      expect(() =>
        calculateDishNutritionTotals(
          [
            { productId: 1, amount: 100 },
            { productId: 2, amount: 50 },
            { productId: 999, amount: 150 },
          ],
          resolveProductStub,
        ),
      ).toThrow("Ингредиент с id=999 не найден.");
    });

    test("Выбрасывает ошибку для неизвестного ингредиента", () => {
      expect(() =>
        calculateDishNutritionTotals(
          [{ productId: 999, amount: 150 }],
          resolveProductStub,
        ),
      ).toThrow("Ингредиент с id=999 не найден.");
    });

    test("Выбрасывает ошибку для пустого состава", () => {
      expect(() =>
        calculateDishNutritionTotals([], resolveProductStub),
      ).toThrow("Состав блюда не может быть пустым.");
    });
  });

  describe("Анализ граничных значений", () => {
    test.each([-0.01, 0])(
      "Выбрасывает ошибку для значения amount=%s грамм",
      (amount) => {
        expect(() =>
          calculateDishNutritionTotals(
            [{ productId: 1, amount }],
            resolveProductStub,
          ),
        ).toThrow("Количество ингредиента должно быть больше 0.");
      },
    );

    test("Расчёт калорий для значения=0.01 грамм", () => {
      const totals = calculateDishNutritionTotals(
        [{ productId: 1, amount: 0.01 }],
        resolveProductStub,
      );

      expect(totals.calories).toBeCloseTo(0.025, 6);
      expect(formatNutritionField(totals.calories)).toBe("0.03");
    });
  });
});
