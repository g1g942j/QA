package org.example.controller;

import java.io.IOException;
import java.nio.file.Files;
import java.time.Duration;

import jakarta.validation.Valid;

import org.example.DTOs.dish.CreateDishRequest;
import org.example.DTOs.dish.DishPhotoUploadResponse;
import org.example.DTOs.dish.DishResponse;
import org.example.DTOs.dish.UpdateDishRequest;
import org.example.entity.DishStoredPhoto;
import org.example.repository.DishStoredPhotoRepository;
import org.example.service.DishPhotoDiskService;
import org.example.service.DishService;
import org.springframework.core.io.PathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api")
public class DishController {

    private final DishService dishService;
    private final DishPhotoDiskService dishPhotoDiskService;
    private final DishStoredPhotoRepository dishStoredPhotoRepository;

    public DishController(
            DishService dishService,
            DishPhotoDiskService dishPhotoDiskService,
            DishStoredPhotoRepository dishStoredPhotoRepository) {
        this.dishService = dishService;
        this.dishPhotoDiskService = dishPhotoDiskService;
        this.dishStoredPhotoRepository = dishStoredPhotoRepository;
    }

    @PostMapping("/dish-photos")
    public DishPhotoUploadResponse uploadDishPhoto(@RequestParam("file") MultipartFile file)
            throws IOException {
        return dishPhotoDiskService.storePending(file);
    }

    @DeleteMapping("/dish-photos/{storageKey:.+}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePendingDishPhoto(@PathVariable String storageKey) throws IOException {
        dishPhotoDiskService.assertValidStorageKey(storageKey);
        DishStoredPhoto row =
                dishStoredPhotoRepository
                        .findByStorageKey(storageKey)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        if (row.getDish() != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "photo attached to dish");
        }
        dishStoredPhotoRepository.delete(row);
        dishPhotoDiskService.deleteFromDiskIfExists(storageKey);
    }

    @GetMapping("/dish-photos/{storageKey:.+}")
    public ResponseEntity<Resource> downloadDishPhoto(@PathVariable String storageKey)
            throws IOException {
        dishPhotoDiskService.assertValidStorageKey(storageKey);
        DishStoredPhoto meta =
                dishStoredPhotoRepository
                        .findByStorageKey(storageKey)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        var path = dishPhotoDiskService.resolveFilePath(storageKey);
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

    @PostMapping("/dishes")
    @ResponseStatus(HttpStatus.CREATED)
    public DishResponse create(@Valid @RequestBody CreateDishRequest request) {
        return dishService.create(request);
    }

    @GetMapping("/dishes/{id}")
    public DishResponse getById(@PathVariable Long id) {
        return dishService.getById(id);
    }

    @GetMapping("/dishes")
    public List<DishResponse> getAll() {
        return dishService.getAll();
    }

    @PutMapping("/dishes/{id}")
    public DishResponse update(
            @PathVariable Long id, @Valid @RequestBody UpdateDishRequest request) {
        return dishService.update(id, request);
    }

    @DeleteMapping("/dishes/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        dishService.delete(id);
    }
}
