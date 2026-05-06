package org.example.repository;

import java.util.Optional;

import org.example.entity.ProductStoredPhoto;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductStoredPhotoRepository extends JpaRepository<ProductStoredPhoto, Long> {

    Optional<ProductStoredPhoto> findByStorageKey(String storageKey);
}
