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

@DisplayName("Продукт: create (POST)")
class ProductCreateCrudApi extends ProductApiSupport {

    @Test
    @DisplayName("Название — rejectsWhenNameMissing")
    void rejectsWhenNameMissing() {
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
        ResponseEntity<String> r = postProduct(body, String.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    @DisplayName("Название — rejectsWhenNameOneCharacter")
    void rejectsWhenNameOneCharacter() {
        Map<String, Object> body =
                productBody(
                        "ф",
                        List.of(),
                        10,
                        5,
                        5,
                        5,
                        null,
                        ProductCategory.FROZEN.name(),
                        DegreeReadiness.READY_TO_EAT.name(),
                        Set.of());
        ResponseEntity<String> r = postProduct(body, String.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    @DisplayName("Название — acceptsWhenNameTwoCharacters")
    void acceptsWhenNameTwoCharacters() {
        Map<String, Object> body =
                productBody(
                        "пр",
                        List.of(),
                        10,
                        5,
                        5,
                        5,
                        null,
                        ProductCategory.GREENS.name(),
                        DegreeReadiness.READY_TO_EAT.name(),
                        Set.of());
        ResponseEntity<ProductResponse> r = postProduct(body, ProductResponse.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(r.getBody().getName()).isEqualTo("пр");
        trackProduct(r.getBody().getId());
    }

    @Test
    @DisplayName("Фото — acceptsZeroPhotos")
    void acceptsZeroPhotos() {
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
        ResponseEntity<ProductResponse> r = postProduct(body, ProductResponse.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(r.getBody().getPhotoKeys()).isEmpty();
        trackProduct(r.getBody().getId());
    }

    @Test
    @DisplayName("Фото — rejectsSixPhotoKeys")
    void rejectsSixPhotoKeys() {
        List<String> keys = new ArrayList<>();
        for (int i = 0; i < 6; i++) {
            keys.add("dummy-POST-" + i);
        }
        Map<String, Object> body =
                productBody(
                        unique("шестьФото-POST"),
                        keys,
                        10,
                        3,
                        3,
                        3,
                        null,
                        ProductCategory.SPICES.name(),
                        DegreeReadiness.READY_TO_EAT.name(),
                        Set.of());
        ResponseEntity<String> r = postProduct(body, String.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @DisplayName("КБЖУ — вне диапазона")
    @ParameterizedTest(name = "{0}={1}")
    @MethodSource("org.example.api.product.ProductApiSupport#productMacroOutOfRange")
    void macroValueRejectsOutOfRange(MacroField field, double value) {
        Map<String, Object> body =
                productBodyWithMacro(
                        field,
                        value,
                        unique("кбжу-POST"),
                        List.of(),
                        null,
                        ProductCategory.SWEETS.name(),
                        DegreeReadiness.READY_TO_EAT.name(),
                        Set.of());
        ResponseEntity<String> r = postProduct(body, String.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @DisplayName("КБЖУ — в диапазоне")
    @ParameterizedTest(name = "{0}={1}")
    @MethodSource("org.example.api.product.ProductApiSupport#productMacroInRange")
    void macroValueAcceptsInRange(MacroField field, double value) {
        Map<String, Object> body =
                productBodyWithMacro(
                        field,
                        value,
                        unique("кбжу-POST"),
                        List.of(),
                        null,
                        ProductCategory.SWEETS.name(),
                        DegreeReadiness.READY_TO_EAT.name(),
                        Set.of());
        ResponseEntity<ProductResponse> r = postProduct(body, ProductResponse.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        trackProduct(r.getBody().getId());
    }

    @Test
    @DisplayName("КБЖУ — rejectsWhenBjuSumExceeds100")
    void rejectsWhenBjuSumExceeds100() {
        Map<String, Object> body =
                productBody(
                        unique("бжу101-POST"),
                        List.of(),
                        10,
                        40,
                        30,
                        31,
                        null,
                        ProductCategory.GRAINS.name(),
                        DegreeReadiness.REQUIRES_COOKING.name(),
                        Set.of());
        ResponseEntity<String> r = postProduct(body, String.class);
        assertDefaultSpringError(r, 500, "/api/products");
    }

    @Test
    @DisplayName("Состав (composition) — acceptsNullComposition")
    void acceptsNullComposition() {
        Map<String, Object> body =
                productBody(
                        unique("compositionNull-POST"),
                        List.of(),
                        15,
                        10,
                        10,
                        10,
                        null,
                        ProductCategory.MEAT.name(),
                        DegreeReadiness.READY_TO_EAT.name(),
                        Set.of());
        ResponseEntity<ProductResponse> r = postProduct(body, ProductResponse.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(r.getBody().getComposition()).isNull();
        trackProduct(r.getBody().getId());
    }

    @Test
    @DisplayName("Состав (composition) — acceptsNonEmptyComposition")
    void acceptsNonEmptyComposition() {
        Map<String, Object> body =
                productBody(
                        unique("compositionText-POST"),
                        List.of(),
                        18,
                        10,
                        10,
                        10,
                        "Вода, соль, перец — по вкусу.",
                        ProductCategory.CANNED.name(),
                        DegreeReadiness.REQUIRES_COOKING.name(),
                        Set.of());
        ResponseEntity<ProductResponse> r = postProduct(body, ProductResponse.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(r.getBody().getComposition()).isEqualTo("Вода, соль, перец — по вкусу.");
        trackProduct(r.getBody().getId());
    }

    @DisplayName("Категория продукта")
    @ParameterizedTest(name = "{0}")
    @MethodSource("org.example.api.product.ProductApiSupport#productCategorySamples")
    void acceptsEachCategory(String category) {
        Map<String, Object> body =
                productBody(
                        unique("категории-POST-" + category),
                        List.of(),
                        30,
                        10,
                        10,
                        10,
                        null,
                        category,
                        DegreeReadiness.READY_TO_EAT.name(),
                        Set.of());
        ResponseEntity<ProductResponse> r = postProduct(body, ProductResponse.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(r.getBody().getCategory().name()).isEqualTo(category);
        trackProduct(r.getBody().getId());
    }

    @DisplayName("Степень готовности")
    @ParameterizedTest(name = "{0}")
    @MethodSource("org.example.api.product.ProductApiSupport#productDegreeSamples")
    void acceptsEachReadiness(DegreeReadiness readiness) {
        Map<String, Object> body =
                productBody(
                        unique("гот-POST-" + readiness.name()),
                        List.of(),
                        22,
                        10,
                        10,
                        10,
                        null,
                        ProductCategory.LIQUID.name(),
                        readiness.name(),
                        Set.of());
        ResponseEntity<ProductResponse> r = postProduct(body, ProductResponse.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(r.getBody().getDegreeReadiness()).isEqualTo(readiness);
        trackProduct(r.getBody().getId());
    }

    @DisplayName("Метки (flags)")
    @ParameterizedTest(name = "{0}")
    @MethodSource("org.example.api.product.ProductApiSupport#productFlagSamples")
    void acceptsEachFlagAlone(String flag) {
        Map<String, Object> body =
                productBody(
                        unique("флаг-POST-" + flag),
                        List.of(),
                        10,
                        10,
                        10,
                        10,
                        null,
                        ProductCategory.SWEETS.name(),
                        DegreeReadiness.READY_TO_EAT.name(),
                        Set.of(flag));
        ResponseEntity<ProductResponse> r = postProduct(body, ProductResponse.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(r.getBody().getFlags()).containsExactlyInAnyOrderElementsOf(Set.of(Flag.valueOf(flag)));
        trackProduct(r.getBody().getId());
    }

    @Test
    @DisplayName("Метки (flags) — acceptsAllFlagsTogether")
    void acceptsAllFlagsTogether() {
        Map<String, Object> body =
                productBody(
                        unique("всеМетки-POST"),
                        List.of(),
                        10,
                        10,
                        10,
                        10,
                        null,
                        ProductCategory.GREENS.name(),
                        DegreeReadiness.READY_TO_EAT.name(),
                        Set.of("VEGAN", "GLUTEN_FREE", "SUGAR_FREE"));
        ResponseEntity<ProductResponse> r = postProduct(body, ProductResponse.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(r.getBody().getFlags())
                .containsExactlyInAnyOrder(Flag.VEGAN, Flag.GLUTEN_FREE, Flag.SUGAR_FREE);
        trackProduct(r.getBody().getId());
    }
}
