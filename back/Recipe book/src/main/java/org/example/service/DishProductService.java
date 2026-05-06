package org.example.service;

import org.example.DTOs.dish.DishProductRequest;
import org.example.DTOs.dish.DishProductResponse;
import org.example.entity.Dish;
import org.example.entity.DishProduct;
import org.example.entity.Product;
import org.example.repository.DishProductRepository;
import org.example.repository.ProductRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class DishProductService {

    private final DishProductRepository dishesProductsRepository;
    private final ProductRepository productRepository;

    public DishProductService(DishProductRepository dishesProductsRepository,
                              ProductRepository productRepository) {
        this.dishesProductsRepository = dishesProductsRepository;
        this.productRepository = productRepository;
    }

    public List<DishProduct> buildComposition(Dish dish, List<DishProductRequest> requests) {
        List<DishProduct> result = new ArrayList<>();

        for (DishProductRequest request : requests) {
            Product product = productRepository.findById(request.getProductId())
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Продукт с id=" + request.getProductId() + " не найден"
                    ));

            DishProduct item = new DishProduct();
            item.setDish(dish);
            item.setProduct(product);
            item.setAmount(request.getAmount());

            result.add(item);
        }

        return result;
    }

    public List<DishProductResponse> mapCompositionToResponse(List<DishProduct> composition) {
        List<DishProductResponse> result = new ArrayList<>();

        for (DishProduct item : composition) {
            DishProductResponse response = new DishProductResponse();
            response.setId(item.getId());
            response.setProductId(item.getProduct().getId());
            response.setProductName(item.getProduct().getName());
            response.setAmount(item.getAmount());
            result.add(response);
        }

        return result;
    }

    public DishNutritionCalculation calculateNutrition(List<DishProduct> composition) {
        double calories = 0.0;
        double proteins = 0.0;
        double fats = 0.0;
        double carbs = 0.0;

        for (DishProduct item : composition) {
            Product product = item.getProduct();
            double amount = item.getAmount();

            calories += product.getCalories() * amount / 100.0;
            proteins += product.getProteins() * amount / 100.0;
            fats += product.getFats() * amount / 100.0;
            carbs += product.getCarbs() * amount / 100.0;
        }

        return new DishNutritionCalculation(
                round(calories),
                round(proteins),
                round(fats),
                round(carbs)
        );
    }

    public boolean isProductUsed(Long productId) {
        return dishesProductsRepository.existsByProductId(productId);
    }

    public List<String> getDishNamesUsingProduct(Long productId) {
        return dishesProductsRepository.findAllByProductId(productId)
                .stream()
                .map(item -> item.getDish().getName())
                .distinct()
                .toList();
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    public static class DishNutritionCalculation {
        private final double calories;
        private final double proteins;
        private final double fats;
        private final double carbs;

        public DishNutritionCalculation(double calories, double proteins, double fats, double carbs) {
            this.calories = calories;
            this.proteins = proteins;
            this.fats = fats;
            this.carbs = carbs;
        }

        public double getCalories() {
            return calories;
        }

        public double getProteins() {
            return proteins;
        }

        public double getFats() {
            return fats;
        }

        public double getCarbs() {
            return carbs;
        }
    }
}