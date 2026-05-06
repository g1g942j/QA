package org.example.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import org.example.entity.enums.*;

import java.time.LocalDateTime;
import java.util.*;

@Entity
@Table(name = "products")
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Size(min = 2)
    @Column(nullable = false)
    private String name;

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL)
    @OrderBy("sortOrder ASC")
    private List<ProductStoredPhoto> storedPhotos = new ArrayList<>();

    @NotNull
    @DecimalMin("0.0")
    @Column(nullable = false)
    private Double calories;

    @NotNull
    @DecimalMin("0.0")
    @DecimalMax("100.0")
    @Column(nullable = false)
    private Double proteins;

    @NotNull
    @DecimalMin("0.0")
    @DecimalMax("100.0")
    @Column(nullable = false)
    private Double fats;

    @NotNull
    @DecimalMin("0.0")
    @DecimalMax("100.0")
    @Column(nullable = false)
    private Double carbs;

    @Column(columnDefinition = "text")
    private String composition;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProductCategory category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DegreeReadiness degreeReadiness;

    @ElementCollection(targetClass = Flag.class)
    @CollectionTable(name = "product_flags", joinColumns = @JoinColumn(name = "product_id"))
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

    public List<ProductStoredPhoto> getStoredPhotos() {
        return storedPhotos;
    }

    public void setStoredPhotos(List<ProductStoredPhoto> storedPhotos) {
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

    public LocalDateTime getUpdateAt() {
        return updateAt;
    }
}