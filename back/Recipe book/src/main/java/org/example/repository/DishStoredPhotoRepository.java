package org.example.repository;

import org.example.entity.DishStoredPhoto;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DishStoredPhotoRepository extends JpaRepository<DishStoredPhoto, Long> {

    Optional<DishStoredPhoto> findByStorageKey(String storageKey);
}
