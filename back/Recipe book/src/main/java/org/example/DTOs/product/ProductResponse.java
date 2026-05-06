package org.example.DTOs.product;

import org.example.entity.enums.DegreeReadiness;
import org.example.entity.enums.Flag;
import org.example.entity.enums.ProductCategory;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class ProductResponse {

    private Long id;
    private String name;
    
    private List<String> photos = new ArrayList<>();

    
    private List<String> photoKeys = new ArrayList<>();
    private Double calories;
    private Double proteins;
    private Double fats;
    private Double carbs;
    private String composition;
    private ProductCategory category;
    private DegreeReadiness degreeReadiness;
    private Set<Flag> flags = new HashSet<>();
    private LocalDateTime createAt;
    private LocalDateTime updateAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public List<String> getPhotos() {
        return photos;
    }

    public void setPhotos(List<String> photos) {
        this.photos = photos;
    }

    public List<String> getPhotoKeys() {
        return photoKeys;
    }

    public void setPhotoKeys(List<String> photoKeys) {
        this.photoKeys = photoKeys;
    }

    public Double getCalories() {
        return calories;
    }

    public void setCalories(Double calories) {
        this.calories = calories;
    }

    public Double getProteins() {
        return proteins;
    }

    public void setProteins(Double proteins) {
        this.proteins = proteins;
    }

    public Double getFats() {
        return fats;
    }

    public void setFats(Double fats) {
        this.fats = fats;
    }

    public Double getCarbs() {
        return carbs;
    }

    public void setCarbs(Double carbs) {
        this.carbs = carbs;
    }

    public String getComposition() {
        return composition;
    }

    public void setComposition(String composition) {
        this.composition = composition;
    }

    public ProductCategory getCategory() {
        return category;
    }

    public void setCategory(ProductCategory category) {
        this.category = category;
    }

    public DegreeReadiness getDegreeReadiness() {
        return degreeReadiness;
    }

    public void setDegreeReadiness(DegreeReadiness degreeReadiness) {
        this.degreeReadiness = degreeReadiness;
    }

    public Set<Flag> getFlags() {
        return flags;
    }

    public void setFlags(Set<Flag> flags) {
        this.flags = flags;
    }

    public LocalDateTime getCreateAt() {
        return createAt;
    }

    public void setCreateAt(LocalDateTime createAt) {
        this.createAt = createAt;
    }

    public LocalDateTime getUpdateAt() {
        return updateAt;
    }

    public void setUpdateAt(LocalDateTime updateAt) {
        this.updateAt = updateAt;
    }
}