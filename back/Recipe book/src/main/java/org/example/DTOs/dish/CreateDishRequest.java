package org.example.DTOs.dish;

import com.fasterxml.jackson.annotation.JsonAlias;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.example.entity.enums.DishCategory;
import org.example.entity.enums.Flag;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class CreateDishRequest {

    @NotNull
    @Size(min = 2)
    private String name;

    
    @JsonAlias({"photoKeys", "photo_keys"})
    @Size(max = 5)
    private List<String> photos = new ArrayList<>();

    @DecimalMin(value = "0.0")
    private Double calories;

    @DecimalMin(value = "0.0")
    private Double proteins;

    @DecimalMin(value = "0.0")
    private Double fats;

    @DecimalMin(value = "0.0")
    private Double carbs;

    @Valid
    @NotEmpty
    private List<DishProductRequest> composition = new ArrayList<>();

    @NotNull
    @DecimalMin(value = "0.0", inclusive = false)
    private Double portionSize;

    @NotNull
    private DishCategory category;

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

    public List<DishProductRequest> getComposition() {
        return composition;
    }

    public void setComposition(List<DishProductRequest> composition) {
        this.composition = composition;
    }

    public Double getPortionSize() {
        return portionSize;
    }

    public void setPortionSize(Double portionSize) {
        this.portionSize = portionSize;
    }

    public DishCategory getCategory() {
        return category;
    }

    public void setCategory(DishCategory category) {
        this.category = category;
    }

    public Set<Flag> getFlags() {
        return flags;
    }

    public void setFlags(Set<Flag> flags) {
        this.flags = flags;
    }
}
