package org.example.repository;

import java.util.List;
import java.util.Optional;

import org.example.entity.Dish;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DishRepository extends JpaRepository<Dish, Long> {

    
    @Query("select distinct d from Dish d left join fetch d.storedPhotos order by d.id asc")
    @Override
    List<Dish> findAll();

    @Query("select distinct d from Dish d left join fetch d.storedPhotos where d.id = :id")
    @Override
    Optional<Dish> findById(@Param("id") Long id);
}
