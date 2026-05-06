package org.example.service;

import org.example.DTOs.dish.CreateDishRequest;
import org.example.DTOs.dish.DishResponse;
import org.example.DTOs.dish.UpdateDishRequest;
import org.example.entity.Dish;
import org.example.entity.DishProduct;
import org.example.entity.DishStoredPhoto;
import org.example.repository.DishRepository;
import org.example.repository.DishStoredPhotoRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.*;

@Service
public class DishService {

    private final DishRepository dishRepository;
    private final DishProductService dishProductService;
    private final DishStoredPhotoRepository dishStoredPhotoRepository;
    private final DishPhotoDiskService dishPhotoDiskService;

    public DishService(
            DishRepository dishRepository,
            DishProductService dishProductService,
            DishStoredPhotoRepository dishStoredPhotoRepository,
            DishPhotoDiskService dishPhotoDiskService) {
        this.dishRepository = dishRepository;
        this.dishProductService = dishProductService;
        this.dishStoredPhotoRepository = dishStoredPhotoRepository;
        this.dishPhotoDiskService = dishPhotoDiskService;
    }

    @Transactional
    public DishResponse create(CreateDishRequest request) {
        Dish dish = new Dish();
        dish.setName(request.getName());
        dish.setPortionSize(request.getPortionSize());
        dish.setCategory(request.getCategory());

        List<DishProduct> composition =
                dishProductService.buildComposition(dish, request.getComposition());
        dish.setComposition(composition);

        DishProductService.DishNutritionCalculation calc =
                dishProductService.calculateNutrition(composition);

        dish.setCalories(request.getCalories() != null ? request.getCalories() : calc.getCalories());
        dish.setProteins(request.getProteins() != null ? request.getProteins() : calc.getProteins());
        dish.setFats(request.getFats() != null ? request.getFats() : calc.getFats());
        dish.setCarbs(request.getCarbs() != null ? request.getCarbs() : calc.getCarbs());
        dish.setFlags(request.getFlags());

        Dish saved = dishRepository.save(dish);
        dishRepository.flush();
        syncDishStoredPhotos(saved, request.getPhotos());
        dishRepository.flush();
        Dish reloaded =
                dishRepository.findById(saved.getId()).orElseThrow();
        return mapToResponse(reloaded);
    }

    @Transactional(readOnly = true)
    public DishResponse getById(Long id) {
        Dish dish =
                dishRepository
                        .findById(id)
                        .orElseThrow(() -> new IllegalArgumentException("Блюдо с id=" + id + " не найдено"));
        return mapToResponse(dish);
    }

    @Transactional(readOnly = true)
    public List<DishResponse> getAll() {
        return dishRepository.findAll().stream().map(this::mapToResponse).toList();
    }

    @Transactional
    public DishResponse update(Long id, UpdateDishRequest request) {
        Dish dish =
                dishRepository
                        .findById(id)
                        .orElseThrow(() -> new IllegalArgumentException("Блюдо с id=" + id + " не найдено"));

        dish.setName(request.getName());
        dish.setPortionSize(request.getPortionSize());
        dish.setCategory(request.getCategory());

        dish.getComposition().clear();
        List<DishProduct> composition =
                dishProductService.buildComposition(dish, request.getComposition());
        dish.getComposition().addAll(composition);

        DishProductService.DishNutritionCalculation calc =
                dishProductService.calculateNutrition(dish.getComposition());

        dish.setCalories(request.getCalories() != null ? request.getCalories() : calc.getCalories());
        dish.setProteins(request.getProteins() != null ? request.getProteins() : calc.getProteins());
        dish.setFats(request.getFats() != null ? request.getFats() : calc.getFats());
        dish.setCarbs(request.getCarbs() != null ? request.getCarbs() : calc.getCarbs());
        dish.setFlags(request.getFlags());

        syncDishStoredPhotos(dish, request.getPhotos());
        dishRepository.flush();
        Dish reloaded = dishRepository.findById(id).orElseThrow();
        return mapToResponse(reloaded);
    }

    @Transactional
    public void delete(Long id) {
        Dish dish =
                dishRepository
                        .findById(id)
                        .orElseThrow(() -> new IllegalArgumentException("Блюдо с id=" + id + " не найдено"));
        List<String> diskKeys =
                dish.getStoredPhotos().stream().map(DishStoredPhoto::getStorageKey).toList();
        dishRepository.delete(dish);
        for (String key : diskKeys) {
            try {
                dishPhotoDiskService.deleteFromDiskIfExists(key);
            } catch (IOException ignored) {
            }
        }
    }

    private void syncDishStoredPhotos(Dish dish, List<String> incomingKeysRaw) {
        List<String> incoming =
                incomingKeysRaw == null ? List.of() : new ArrayList<>(incomingKeysRaw);
        if (incoming.size() > 5) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "максимум 5 фото");
        }
        Set<String> unique = new LinkedHashSet<>(incoming);
        if (unique.size() != incoming.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "дубликаты в списке фото");
        }
        LinkedHashSet<String> wanted = new LinkedHashSet<>(incoming);

        for (DishStoredPhoto row : new ArrayList<>(dish.getStoredPhotos())) {
            if (!wanted.contains(row.getStorageKey())) {
                dish.getStoredPhotos().remove(row);
                dishStoredPhotoRepository.delete(row);
                deleteDiskQuiet(row.getStorageKey());
            }
        }

        int idx = 0;
        for (String storageKey : incoming) {
            dishPhotoDiskService.assertValidStorageKey(storageKey);
            DishStoredPhoto blob =
                    dishStoredPhotoRepository
                            .findByStorageKey(storageKey)
                            .orElseThrow(
                                    () ->
                                            new ResponseStatusException(
                                                    HttpStatus.BAD_REQUEST,
                                                    "неизвестный файл: " + storageKey));

            Dish owner = blob.getDish();
            if (owner != null) {
                Long oid = owner.getId();
                Long did = dish.getId();
                if (did != null && oid != null && !Objects.equals(oid, did)) {
                    throw new ResponseStatusException(
                            HttpStatus.BAD_REQUEST,
                            "файл уже привязан к другому блюду");
                }
                if (did == null && owner != dish) {
                    throw new ResponseStatusException(
                            HttpStatus.BAD_REQUEST, "файл уже занят");
                }
            }

            blob.setDish(dish);
            blob.setSortOrder(idx++);
            if (!dish.getStoredPhotos().contains(blob)) {
                dish.getStoredPhotos().add(blob);
            }
            dishStoredPhotoRepository.save(blob);
        }
    }

    private void deleteDiskQuiet(String key) {
        try {
            dishPhotoDiskService.deleteFromDiskIfExists(key);
        } catch (IOException ignored) {
        }
    }

    private DishResponse mapToResponse(Dish dish) {
        DishResponse response = new DishResponse();
        response.setId(dish.getId());
        response.setName(dish.getName());
        response.setCalories(dish.getCalories());
        response.setProteins(dish.getProteins());
        response.setFats(dish.getFats());
        response.setCarbs(dish.getCarbs());
        response.setPortionSize(dish.getPortionSize());
        response.setCategory(dish.getCategory());
        response.setFlags(dish.getFlags());
        response.setCreateAt(dish.getCreateAt());
        response.setUpdateAt(dish.getUpdateAt());
        response.setComposition(dishProductService.mapCompositionToResponse(dish.getComposition()));

        List<String> urls = new ArrayList<>();
        List<String> keys = new ArrayList<>();
        for (DishStoredPhoto p : dish.getStoredPhotos()) {
            keys.add(p.getStorageKey());
            urls.add(dishPhotoDiskService.getPublicUrl(p.getStorageKey()));
        }
        response.setPhotos(urls);
        response.setPhotoKeys(keys);
        return response;
    }
}
