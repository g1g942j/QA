package org.example.DTOs.dish;

public class DishPhotoUploadResponse {

    private String storageKey;
    private String url;

    public DishPhotoUploadResponse() {
    }

    public DishPhotoUploadResponse(String storageKey, String url) {
        this.storageKey = storageKey;
        this.url = url;
    }

    public String getStorageKey() {
        return storageKey;
    }

    public void setStorageKey(String storageKey) {
        this.storageKey = storageKey;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }
}
