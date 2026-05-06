package org.example.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import org.example.entity.enums.DishCategory;
import org.example.entity.enums.Flag;

import java.time.LocalDateTime;
import java.util.*;

@Entity
@Table(name = "dishes")
public class Dish {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Size(min = 2)
    @Column(nullable = false)
    private String name;

    @OneToMany(mappedBy = "dish", cascade = CascadeType.ALL)
    @OrderBy("sortOrder ASC")
    private List<DishStoredPhoto> storedPhotos = new ArrayList<>();

    @NotNull
    @DecimalMin("0.0")
    @Column(nullable = false)
    private Double calories;

    @NotNull
    @DecimalMin("0.0")
    @Column(nullable = false)
    private Double proteins;

    @NotNull
    @DecimalMin("0.0")
    @Column(nullable = false)
    private Double fats;

    @NotNull
    @DecimalMin("0.0")
    @Column(nullable = false)
    private Double carbs;

    @OneToMany(mappedBy = "dish", cascade = CascadeType.ALL, orphanRemoval = true)
    @NotEmpty
    private List<DishProduct> composition = new ArrayList<>();

    @NotNull
    @DecimalMin(value = "0.0", inclusive = false)
    @Column(nullable = false)
    private Double portionSize;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DishCategory category;

    @ElementCollection(targetClass = Flag.class)
    @CollectionTable(name = "dish_flags", joinColumns = @JoinColumn(name = "dish_id"))
    @Enumerated(EnumType.STRING)
    private Set<Flag> flags = new HashSet<>();

    @Column(nullable = false, updatable = false)
    private LocalDateTime createAt;

    private LocalDateTime updateAt;

    @PrePersist
    public void prePersist() {
        this.createAt = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        this.updateAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public List<DishStoredPhoto> getStoredPhotos() {
        return storedPhotos;
    }

    public void setStoredPhotos(List<DishStoredPhoto> storedPhotos) {
        this.storedPhotos = storedPhotos;
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

    public List<DishProduct> getComposition() {
        return composition;
    }

    public void setComposition(List<DishProduct> composition) {
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

    public LocalDateTime getCreateAt() {
        return createAt;
    }

    public LocalDateTime getUpdateAt() {
        return updateAt;
    }
}