package org.example.api.product;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.example.DTOs.product.ProductResponse;
import org.example.entity.enums.DegreeReadiness;
import org.example.entity.enums.Flag;
import org.example.entity.enums.ProductCategory;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

@DisplayName("Продукт: update (PUT)")
class ProductUpdateCrudApi extends ProductApiSupport {

    @Test
    @DisplayName("Название — rejectsWhenNameMissing")
    void rejectsWhenNameMissing() {
        long putId = createBaseProduct();
        Map<String, Object> body =
                productBodyWithoutName(
                        List.of(),
                        10,
                        5,
                        5,
                        5,
                        null,
                        ProductCategory.VEGETABLES.name(),
                        DegreeReadiness.READY_TO_EAT.name(),
                        Set.of());
        ResponseEntity<String> r = putProduct(putId, body, String.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    @DisplayName("Название — rejectsWhenNameOneCharacter")
    void rejectsWhenNameOneCharacter() {
        long putId = createBaseProduct();
        Map<String, Object> body =
                productBody(
                        "к",
                        List.of(),
                        10,
                        5,
                        5,
                        5,
                        null,
                        ProductCategory.FROZEN.name(),
                        DegreeReadiness.READY_TO_EAT.name(),
                        Set.of());
        ResponseEntity<String> r = putProduct(putId, body, String.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    @DisplayName("Название — acceptsWhenNameTwoCharacters")
    void acceptsWhenNameTwoCharacters() {
        long putId = createBaseProduct();
        Map<String, Object> body =
                productBody(
                        "ми",
                        List.of(),
                        10,
                        5,
                        5,
                        5,
                        null,
                        ProductCategory.GREENS.name(),
                        DegreeReadiness.READY_TO_EAT.name(),
                        Set.of());
        ResponseEntity<ProductResponse> r = putProduct(putId, body, ProductResponse.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(r.getBody().getName()).isEqualTo("ми");
    }

    @Test
    @DisplayName("Фото — acceptsZeroPhotos")
    void acceptsZeroPhotos() {
        long putId = createBaseProduct();
        Map<String, Object> body =
                productBody(
                        unique("без фото"),
                        List.of(),
                        25,
                        10,
                        10,
                        10,
                        "—",
                        ProductCategory.CANNED.name(),
                        DegreeReadiness.SEMI_FINISHED.name(),
                        Set.of());
        ResponseEntity<ProductResponse> r = putProduct(putId, body, ProductResponse.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(r.getBody().getPhotoKeys()).isEmpty();
    }

    @Test
    @DisplayName("Фото — rejectsSixPhotoKeys")
    void rejectsSixPhotoKeys() {
        long putId = createBaseProduct();
        List<String> keys = new ArrayList<>();
        for (int i = 0; i < 6; i++) {
            keys.add("dummy-PUT-" + i);
        }
        Map<String, Object> body =
                productBody(
                        unique("шестьФото-PUT"),
                        keys,
                        10,
                        3,
                        3,
                        3,
                        null,
                        ProductCategory.SPICES.name(),
                        DegreeReadiness.READY_TO_EAT.name(),
                        Set.of());
        ResponseEntity<String> r = putProduct(putId, body, String.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @DisplayName("КБЖУ — вне диапазона")
    @ParameterizedTest(name = "{0}={1}")
    @MethodSource("org.example.api.product.ProductApiSupport#productMacroOutOfRange")
    void macroValueRejectsOutOfRange(MacroField field, double value) {
        long putId = createBaseProduct();
        Map<String, Object> body =
                productBodyWithMacro(
                        field,
                        value,
                        unique("кбжу-PUT"),
                        List.of(),
                        null,
                        ProductCategory.SWEETS.name(),
                        DegreeReadiness.READY_TO_EAT.name(),
                        Set.of());
        ResponseEntity<String> r = putProduct(putId, body, String.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @DisplayName("КБЖУ — в диапазоне")
    @ParameterizedTest(name = "{0}={1}")
    @MethodSource("org.example.api.product.ProductApiSupport#productMacroInRange")
    void macroValueAcceptsInRange(MacroField field, double value) {
        long putId = createBaseProduct();
        Map<String, Object> body =
                productBodyWithMacro(
                        field,
                        value,
                        unique("кбжу-PUT"),
                        List.of(),
                        null,
                        ProductCategory.SWEETS.name(),
                        DegreeReadiness.READY_TO_EAT.name(),
                        Set.of());
        ResponseEntity<ProductResponse> r = putProduct(putId, body, ProductResponse.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("КБЖУ — rejectsWhenBjuSumExceeds100")
    void rejectsWhenBjuSumExceeds100() {
        long putId = createBaseProduct();
        Map<String, Object> body =
                productBody(
                        unique("бжу101-PUT"),
                        List.of(),
                        10,
                        40,
                        30,
                        31,
                        null,
                        ProductCategory.GRAINS.name(),
                        DegreeReadiness.REQUIRES_COOKING.name(),
                        Set.of());
        ResponseEntity<String> r = putProduct(putId, body, String.class);
        assertDefaultSpringError(r, 500, "/api/products/" + putId);
    }

    @Test
    @DisplayName("Состав (composition) — acceptsNullComposition")
    void acceptsNullComposition() {
        long putId = createBaseProduct();
        Map<String, Object> body =
                productBody(
                        unique("compositionNull-PUT"),
                        List.of(),
                        10,
                        10,
                        10,
                        10,
                        null,
                        ProductCategory.MEAT.name(),
                        DegreeReadiness.READY_TO_EAT.name(),
                        Set.of());
        ResponseEntity<ProductResponse> r = putProduct(putId, body, ProductResponse.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(r.getBody().getComposition()).isNull();
    }

    @Test
    @DisplayName("Состав (composition) — acceptsNonEmptyComposition")
    void acceptsNonEmptyComposition() {
        long putId = createBaseProduct();
        Map<String, Object> body =
                productBody(
                        unique("compositionText-PUT"),
                        List.of(),
                        10,
                        10,
                        10,
                        10,
                        "Обновлённое описание состава.",
                        ProductCategory.CANNED.name(),
                        DegreeReadiness.REQUIRES_COOKING.name(),
                        Set.of());
        ResponseEntity<ProductResponse> r = putProduct(putId, body, ProductResponse.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(r.getBody().getComposition()).isEqualTo("Обновлённое описание состава.");
    }

    @DisplayName("Категория продукта")
    @ParameterizedTest(name = "{0}")
    @MethodSource("org.example.api.product.ProductApiSupport#productCategorySamples")
    void acceptsEachCategory(String category) {
        long putId = createBaseProduct();
        Map<String, Object> body =
                productBody(
                        unique("категории-PUT-" + category),
                        List.of(),
                        30,
                        10,
                        10,
                        10,
                        null,
                        category,
                        DegreeReadiness.READY_TO_EAT.name(),
                        Set.of());
        ResponseEntity<ProductResponse> r = putProduct(putId, body, ProductResponse.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(r.getBody().getCategory().name()).isEqualTo(category);
    }

    @DisplayName("Степень готовности")
    @ParameterizedTest(name = "{0}")
    @MethodSource("org.example.api.product.ProductApiSupport#productDegreeSamples")
    void acceptsEachReadiness(DegreeReadiness readiness) {
        long putId = createBaseProduct();
        Map<String, Object> body =
                productBody(
                        unique("гот-PUT-" + readiness.name()),
                        List.of(),
                        25,
                        10,
                        10,
                        10,
                        null,
                        ProductCategory.LIQUID.name(),
                        readiness.name(),
                        Set.of());
        ResponseEntity<ProductResponse> r = putProduct(putId, body, ProductResponse.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(r.getBody().getDegreeReadiness()).isEqualTo(readiness);
    }

    @DisplayName("Метки (flags)")
    @ParameterizedTest(name = "{0}")
    @MethodSource("org.example.api.product.ProductApiSupport#productFlagSamples")
    void acceptsEachFlagAlone(String flag) {
        long putId = createBaseProduct();
        Map<String, Object> body =
                productBody(
                        unique("флаг-PUT-" + flag),
                        List.of(),
                        10,
                        10,
                        10,
                        10,
                        null,
                        ProductCategory.SWEETS.name(),
                        DegreeReadiness.READY_TO_EAT.name(),
                        Set.of(flag));
        ResponseEntity<ProductResponse> r = putProduct(putId, body, ProductResponse.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(r.getBody().getFlags()).containsExactlyInAnyOrderElementsOf(Set.of(Flag.valueOf(flag)));
    }

    @Test
    @DisplayName("Метки (flags) — acceptsAllFlagsTogether")
    void acceptsAllFlagsTogether() {
        long putId = createBaseProduct();
        Map<String, Object> body =
                productBody(
                        unique("всеМетки-PUT"),
                        List.of(),
                        10,
                        10,
                        10,
                        10,
                        null,
                        ProductCategory.GREENS.name(),
                        DegreeReadiness.READY_TO_EAT.name(),
                        Set.of("VEGAN", "GLUTEN_FREE", "SUGAR_FREE"));
        ResponseEntity<ProductResponse> r = putProduct(putId, body, ProductResponse.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(r.getBody().getFlags())
                .containsExactlyInAnyOrder(Flag.VEGAN, Flag.GLUTEN_FREE, Flag.SUGAR_FREE);
    }
}
