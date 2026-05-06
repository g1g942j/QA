package org.example.service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

import org.example.DTOs.product.CreateProductRequest;
import org.example.DTOs.product.ProductResponse;
import org.example.DTOs.product.UpdateProductRequest;
import org.example.entity.Product;
import org.example.entity.ProductStoredPhoto;
import org.example.repository.ProductRepository;
import org.example.repository.ProductStoredPhotoRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ProductService {

    private final ProductRepository productRepository;
    private final DishProductService dishProductService;
    private final ProductStoredPhotoRepository productStoredPhotoRepository;
    private final ProductPhotoDiskService productPhotoDiskService;

    public ProductService(
            ProductRepository productRepository,
            DishProductService dishProductService,
            ProductStoredPhotoRepository productStoredPhotoRepository,
            ProductPhotoDiskService productPhotoDiskService) {
        this.productRepository = productRepository;
        this.dishProductService = dishProductService;
        this.productStoredPhotoRepository = productStoredPhotoRepository;
        this.productPhotoDiskService = productPhotoDiskService;
    }

    @Transactional
    public ProductResponse create(CreateProductRequest request) {
        validateBju(request.getProteins(), request.getFats(), request.getCarbs());

        Product product = new Product();
        product.setName(request.getName());
        product.setCalories(request.getCalories());
        product.setProteins(request.getProteins());
        product.setFats(request.getFats());
        product.setCarbs(request.getCarbs());
        product.setComposition(request.getComposition());
        product.setCategory(request.getCategory());
        product.setDegreeReadiness(request.getDegreeReadiness());
        product.setFlags(request.getFlags());

        Product saved = productRepository.save(product);
        productRepository.flush();
        syncProductStoredPhotos(saved, request.getPhotos());
        productRepository.flush();
        Product reloaded =
                productRepository.findById(saved.getId()).orElseThrow();
        return mapToResponse(reloaded);
    }

    @Transactional(readOnly = true)
    public ProductResponse getById(Long id) {
        Product product =
                productRepository
                        .findById(id)
                        .orElseThrow(() -> new IllegalArgumentException("Продукт с id=" + id + " не найден"));
        return mapToResponse(product);
    }

    @Transactional(readOnly = true)
    public List<ProductResponse> getAll() {
        return productRepository.findAll().stream().map(this::mapToResponse).toList();
    }

    @Transactional
    public ProductResponse update(Long id, UpdateProductRequest request) {
        validateBju(request.getProteins(), request.getFats(), request.getCarbs());

        Product product =
                productRepository
                        .findById(id)
                        .orElseThrow(() -> new IllegalArgumentException("Продукт с id=" + id + " не найден"));

        product.setName(request.getName());
        product.setCalories(request.getCalories());
        product.setProteins(request.getProteins());
        product.setFats(request.getFats());
        product.setCarbs(request.getCarbs());
        product.setComposition(request.getComposition());
        product.setCategory(request.getCategory());
        product.setDegreeReadiness(request.getDegreeReadiness());
        product.setFlags(request.getFlags());

        syncProductStoredPhotos(product, request.getPhotos());
        productRepository.flush();
        Product reloaded = productRepository.findById(id).orElseThrow();
        return mapToResponse(reloaded);
    }

    @Transactional
    public void delete(Long id) {
        Product product =
                productRepository
                        .findById(id)
                        .orElseThrow(() -> new IllegalArgumentException("Продукт с id=" + id + " не найден"));

        if (dishProductService.isProductUsed(id)) {
            List<String> dishNames = dishProductService.getDishNamesUsingProduct(id);
            throw new IllegalStateException(
                    "Нельзя удалить продукт. Он используется в блюдах: "
                            + String.join(", ", dishNames));
        }

        List<String> diskKeys =
                product.getStoredPhotos().stream()
                        .map(ProductStoredPhoto::getStorageKey)
                        .toList();
        productRepository.delete(product);
        for (String key : diskKeys) {
            deleteDiskQuiet(key);
        }
    }

    private void syncProductStoredPhotos(Product product, List<String> incomingKeysRaw) {
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

        for (ProductStoredPhoto row : new ArrayList<>(product.getStoredPhotos())) {
            if (!wanted.contains(row.getStorageKey())) {
                product.getStoredPhotos().remove(row);
                productStoredPhotoRepository.delete(row);
                deleteDiskQuiet(row.getStorageKey());
            }
        }

        int idx = 0;
        for (String storageKey : incoming) {
            productPhotoDiskService.assertValidStorageKey(storageKey);
            ProductStoredPhoto blob =
                    productStoredPhotoRepository
                            .findByStorageKey(storageKey)
                            .orElseThrow(
                                    () ->
                                            new ResponseStatusException(
                                                    HttpStatus.BAD_REQUEST,
                                                    "неизвестный файл: " + storageKey));

            Product owner = blob.getProduct();
            if (owner != null) {
                Long oid = owner.getId();
                Long pid = product.getId();
                if (pid != null && oid != null && !Objects.equals(oid, pid)) {
                    throw new ResponseStatusException(
                            HttpStatus.BAD_REQUEST, "файл уже привязан к другому продукту");
                }
                if (pid == null && owner != product) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "файл уже занят");
                }
            }

            blob.setProduct(product);
            blob.setSortOrder(idx++);
            if (!product.getStoredPhotos().contains(blob)) {
                product.getStoredPhotos().add(blob);
            }
            productStoredPhotoRepository.save(blob);
        }
    }

    private void deleteDiskQuiet(String key) {
        try {
            productPhotoDiskService.deleteFromDiskIfExists(key);
        } catch (IOException ignored) {
        }
    }

    private void validateBju(Double proteins, Double fats, Double carbs) {
        if (proteins + fats + carbs > 100) {
            throw new IllegalArgumentException("Сумма белков, жиров и углеводов не может превышать 100");
        }
    }

    private ProductResponse mapToResponse(Product product) {
        ProductResponse response = new ProductResponse();
        response.setId(product.getId());
        response.setName(product.getName());
        response.setCalories(product.getCalories());
        response.setProteins(product.getProteins());
        response.setFats(product.getFats());
        response.setCarbs(product.getCarbs());
        response.setComposition(product.getComposition());
        response.setCategory(product.getCategory());
        response.setDegreeReadiness(product.getDegreeReadiness());
        response.setFlags(product.getFlags());
        response.setCreateAt(product.getCreateAt());
        response.setUpdateAt(product.getUpdateAt());

        List<String> urls = new ArrayList<>();
        List<String> keys = new ArrayList<>();
        for (ProductStoredPhoto p : product.getStoredPhotos()) {
            keys.add(p.getStorageKey());
            urls.add(productPhotoDiskService.getPublicUrl(p.getStorageKey()));
        }
        response.setPhotos(urls);
        response.setPhotoKeys(keys);
        return response;
    }
}
