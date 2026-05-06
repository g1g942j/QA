package org.example.controller;

import jakarta.validation.Valid;
import org.example.DTOs.product.CreateProductRequest;
import org.example.DTOs.product.ProductPhotoUploadResponse;
import org.example.DTOs.product.ProductResponse;
import org.example.DTOs.product.UpdateProductRequest;
import org.example.entity.ProductStoredPhoto;
import org.example.repository.ProductStoredPhotoRepository;
import org.example.service.ProductPhotoDiskService;
import org.example.service.ProductService;
import org.springframework.core.io.PathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.time.Duration;
import java.util.List;

@RestController
@RequestMapping("/api")
public class ProductController {

    private final ProductService productService;
    private final ProductPhotoDiskService productPhotoDiskService;
    private final ProductStoredPhotoRepository productStoredPhotoRepository;

    public ProductController(
            ProductService productService,
            ProductPhotoDiskService productPhotoDiskService,
            ProductStoredPhotoRepository productStoredPhotoRepository) {
        this.productService = productService;
        this.productPhotoDiskService = productPhotoDiskService;
        this.productStoredPhotoRepository = productStoredPhotoRepository;
    }

    @PostMapping("/product-photos")
    public ProductPhotoUploadResponse uploadProductPhoto(@RequestParam("file") MultipartFile file)
            throws IOException {
        return productPhotoDiskService.storePending(file);
    }

    @DeleteMapping("/product-photos/{storageKey:.+}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePendingProductPhoto(@PathVariable String storageKey) throws IOException {
        productPhotoDiskService.assertValidStorageKey(storageKey);
        ProductStoredPhoto row =
                productStoredPhotoRepository
                        .findByStorageKey(storageKey)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        if (row.getProduct() != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "photo attached to product");
        }
        productStoredPhotoRepository.delete(row);
        productPhotoDiskService.deleteFromDiskIfExists(storageKey);
    }

    @GetMapping("/product-photos/{storageKey:.+}")
    public ResponseEntity<Resource> downloadProductPhoto(@PathVariable String storageKey)
            throws IOException {
        productPhotoDiskService.assertValidStorageKey(storageKey);
        ProductStoredPhoto meta =
                productStoredPhotoRepository
                        .findByStorageKey(storageKey)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        var path = productPhotoDiskService.resolveFilePath(storageKey);
        if (!Files.isRegularFile(path)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "file missing");
        }

        Resource body = new PathResource(path);
        MediaType mt;
        try {
            mt = MediaType.parseMediaType(meta.getContentType());
        } catch (Exception ignored) {
            mt = MediaType.APPLICATION_OCTET_STREAM;
        }

        return ResponseEntity.ok()
                .header(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "*")
                .header("Cross-Origin-Resource-Policy", "cross-origin")
                .cacheControl(CacheControl.maxAge(Duration.ofHours(24)).cachePublic())
                .contentType(mt)
                .body(body);
    }

    @PostMapping("/products")
    @ResponseStatus(HttpStatus.CREATED)
    public ProductResponse create(@Valid @RequestBody CreateProductRequest request) {
        return productService.create(request);
    }

    @GetMapping("/products/{id}")
    public ProductResponse getById(@PathVariable Long id) {
        return productService.getById(id);
    }

    @GetMapping("/products")
    public List<ProductResponse> getAll() {
        return productService.getAll();
    }

    @PutMapping("/products/{id}")
    public ProductResponse update(@PathVariable Long id,
                                   @Valid @RequestBody UpdateProductRequest request) {
        return productService.update(id, request);
    }

    @DeleteMapping("/products/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        productService.delete(id);
    }
}