package org.example.DTOs.product;

import com.fasterxml.jackson.annotation.JsonAlias;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.example.entity.enums.DegreeReadiness;
import org.example.entity.enums.Flag;
import org.example.entity.enums.ProductCategory;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class UpdateProductRequest {

    @NotNull
    @Size(min = 2)
    private String name;

    @JsonAlias({"photoKeys", "photo_keys"})
    @Size(max = 5)
    private List<String> photos = new ArrayList<>();

    @NotNull
    @DecimalMin(value = "0.0")
    private Double calories;

    @NotNull
    @DecimalMin(value = "0.0")
    @DecimalMax(value = "100.0")
    private Double proteins;

    @NotNull
    @DecimalMin(value = "0.0")
    @DecimalMax(value = "100.0")
    private Double fats;

    @NotNull
    @DecimalMin(value = "0.0")
    @DecimalMax(value = "100.0")
    private Double carbs;

    private String composition;

    @NotNull
    private ProductCategory category;

    @NotNull
    private DegreeReadiness degreeReadiness;

    private Set<Flag> flags = new HashSet<>();

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
}