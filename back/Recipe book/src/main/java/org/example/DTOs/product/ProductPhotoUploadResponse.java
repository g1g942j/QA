package org.example.DTOs.product;

public class ProductPhotoUploadResponse {

    private String storageKey;
    private String url;

    public ProductPhotoUploadResponse() {
    }

    public ProductPhotoUploadResponse(String storageKey, String url) {
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
