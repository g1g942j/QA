package org.example.service;

import org.example.entity.DishStoredPhoto;
import org.example.repository.DishStoredPhotoRepository;
import org.example.DTOs.dish.DishPhotoUploadResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class DishPhotoDiskService {

    private static final Pattern STORAGE_KEY_PATTERN =
            Pattern.compile("^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\\.[a-z0-9]{1,12}$");
    private static final Set<String> ALLOWED =
            Set.of("image/jpeg", "image/png", "image/gif", "image/webp");
    private static final long MAX_BYTES = 8 * 1024 * 1024;

    private final Path rootDir;
    private final String publicBaseUrl;

    private final DishStoredPhotoRepository dishStoredPhotoRepository;

    public DishPhotoDiskService(
            @Value("${recipebook.storage.dish-photos-dir:uploads/dish-photos}") String root,
            @Value("${recipebook.public-base-url:http://localhost:8080}") String publicBaseUrl,
            DishStoredPhotoRepository dishStoredPhotoRepository)
            throws IOException {
        this.rootDir = Path.of(root).toAbsolutePath().normalize();
        Files.createDirectories(this.rootDir);
        this.publicBaseUrl = publicBaseUrl.replaceAll("/+$", "");
        this.dishStoredPhotoRepository = dishStoredPhotoRepository;
    }

    public void assertValidStorageKey(String storageKey) {
        if (storageKey == null || !STORAGE_KEY_PATTERN.matcher(storageKey.toLowerCase(Locale.ROOT)).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid storage key");
        }
        if (storageKey.contains("..") || storageKey.contains("/") || storageKey.contains("\\")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid storage key");
        }
    }

    public Path resolveFilePath(String storageKey) {
        assertValidStorageKey(storageKey);
        return rootDir.resolve(storageKey).normalize();
    }

    public DishPhotoUploadResponse storePending(MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "empty file");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "file too large");
        }
        String rawType = file.getContentType();
        if (rawType == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "need content type");
        }
        String contentType = rawType.split(";")[0].trim().toLowerCase(Locale.ROOT);
        if (!ALLOWED.contains(contentType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "only jpeg png gif webp");
        }

        String ext = extensionFor(contentType);
        String storageKey = UUID.randomUUID() + "." + ext;
        Path dest = rootDir.resolve(storageKey).normalize();
        Files.copy(file.getInputStream(), dest, java.nio.file.StandardCopyOption.REPLACE_EXISTING);

        DishStoredPhoto row = new DishStoredPhoto();
        row.setStorageKey(storageKey);
        row.setContentType(contentType);
        row.setSortOrder(0);
        row.setDish(null);
        dishStoredPhotoRepository.save(row);

        String url = publicBaseUrl + "/api/dish-photos/" + storageKey;
        return new DishPhotoUploadResponse(storageKey, url);
    }

    private static String extensionFor(String contentType) {
        return switch (contentType) {
            case "image/jpeg" -> "jpg";
            case "image/png" -> "png";
            case "image/gif" -> "gif";
            case "image/webp" -> "webp";
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "unsupported type");
        };
    }

    public void deleteFromDiskIfExists(String storageKey) throws IOException {
        assertValidStorageKey(storageKey);
        Path p = rootDir.resolve(storageKey).normalize();
        if (!p.startsWith(rootDir)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid path");
        }
        Files.deleteIfExists(p);
    }

    public String getPublicUrl(String storageKey) {
        assertValidStorageKey(storageKey);
        return publicBaseUrl + "/api/dish-photos/" + storageKey;
    }
}
