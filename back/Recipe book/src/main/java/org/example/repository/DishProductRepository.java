package org.example.repository;

import org.example.entity.DishProduct;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DishProductRepository extends JpaRepository<DishProduct, Long> {

    List<DishProduct> findAllByDishId(Long dishId);

    List<DishProduct> findAllByProductId(Long productId);

    boolean existsByProductId(Long productId);

    void deleteAllByDishId(Long dishId);
}