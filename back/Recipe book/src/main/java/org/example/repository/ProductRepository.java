package org.example.repository;

import java.util.List;
import java.util.Optional;

import org.example.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProductRepository extends JpaRepository<Product, Long> {

    @Query("select distinct p from Product p left join fetch p.storedPhotos order by p.id asc")
    @Override
    List<Product> findAll();

    @Query("select distinct p from Product p left join fetch p.storedPhotos where p.id = :id")
    @Override
    Optional<Product> findById(@Param("id") Long id);
}
