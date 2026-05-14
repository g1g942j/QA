package org.example.api.dish;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.example.DTOs.dish.DishResponse;
import org.example.api.ApiTestPayloads;
import org.example.entity.enums.DegreeReadiness;
import org.example.entity.enums.Flag;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

@DisplayName("Блюдо: create (POST)")
class DishCreateCrudApi extends DishApiSupport {

    @Test
    @DisplayName("Название — rejectsWhenNameMissing")
    void rejectsWhenNameMissing() {
        Long pid = createTrackedProduct(10, 1, 1, 1, DegreeReadiness.READY_TO_EAT);
        Map<String, Object> body =
                dishBodyWithoutName(
                        List.of(),
                        List.of(ApiTestPayloads.compositionLine(pid, 10)),
                        100,
                        "SECOND",
                        Set.of());
        ResponseEntity<String> r = postDish(body, String.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    @DisplayName("Название — rejectsWhenNameOneCharacter")
    void rejectsWhenNameOneCharacter() {
        Long pid = createTrackedProduct(10, 1, 1, 1, DegreeReadiness.READY_TO_EAT);
        Map<String, Object> body =
                dishBody(
                        "a",
                        List.of(),
                        null,
                        null,
                        null,
                        null,
                        List.of(ApiTestPayloads.compositionLine(pid, 10)),
                        100,
                        "SECOND",
                        Set.of());
        ResponseEntity<String> r = postDish(body, String.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    @DisplayName("Название — acceptsWhenNameTwoCharacters")
    void acceptsWhenNameTwoCharacters() {
        Long pid = createTrackedProduct(10, 1, 1, 1, DegreeReadiness.READY_TO_EAT);
        Map<String, Object> body =
                dishBody(
                        "аб",
                        List.of(),
                        null,
                        null,
                        null,
                        null,
                        List.of(ApiTestPayloads.compositionLine(pid, 10)),
                        100,
                        "SECOND",
                        Set.of());
        ResponseEntity<DishResponse> r = postDish(body, DishResponse.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(r.getBody().getName()).isEqualTo("аб");
        trackDish(r.getBody().getId());
    }

    @Test
    @DisplayName("Фото — acceptsZeroPhotos")
    void acceptsZeroPhotos() {
        Long pid = createTrackedProduct(50, 5, 5, 5, DegreeReadiness.READY_TO_EAT);
        Map<String, Object> body =
                dishBody(
                        unique("без фото"),
                        List.of(),
                        null,
                        null,
                        null,
                        null,
                        List.of(ApiTestPayloads.compositionLine(pid, 20)),
                        80,
                        "SOUP",
                        Set.of());
        ResponseEntity<DishResponse> r = postDish(body, DishResponse.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(r.getBody().getPhotoKeys()).isEmpty();
        trackDish(r.getBody().getId());
    }

    @Test
    @DisplayName("Фото — rejectsSixPhotoKeys")
    void rejectsSixPhotoKeys() {
        Long pid = createTrackedProduct(10, 1, 1, 1, DegreeReadiness.READY_TO_EAT);
        List<String> keys = new ArrayList<>();
        for (int i = 0; i < 6; i++) {
            keys.add("dummy-key-POST-" + i);
        }
        Map<String, Object> body =
                dishBody(
                        unique("шестьФото-POST"),
                        keys,
                        null,
                        null,
                        null,
                        null,
                        List.of(ApiTestPayloads.compositionLine(pid, 10)),
                        50,
                        "SNACK",
                        Set.of());
        ResponseEntity<String> r = postDish(body, String.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    @DisplayName("Состав (продукты) — rejectsEmptyComposition")
    void rejectsEmptyComposition() {
        Map<String, Object> body =
                dishBody(
                        unique("пустой-POST"),
                        List.of(),
                        1.0,
                        1.0,
                        1.0,
                        1.0,
                        List.of(),
                        100,
                        "FIRST",
                        Set.of());
        ResponseEntity<String> r = postDish(body, String.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    @DisplayName("Состав (продукты) — acceptsSeveralProducts")
    void acceptsSeveralProducts() {
        Long p1 = createTrackedProduct(100, 10, 5, 15, DegreeReadiness.READY_TO_EAT);
        Long p2 = createTrackedProduct(50, 2, 3, 4, DegreeReadiness.SEMI_FINISHED);
        Long p3 = createTrackedProduct(20, 1, 1, 2, DegreeReadiness.REQUIRES_COOKING);
        Map<String, Object> body =
                dishBody(
                        unique("несколько продуктов"),
                        List.of(),
                        null,
                        null,
                        null,
                        null,
                        List.of(
                                ApiTestPayloads.compositionLine(p1, 50),
                                ApiTestPayloads.compositionLine(p2, 30),
                                ApiTestPayloads.compositionLine(p3, 20)),
                        100,
                        "SECOND",
                        Set.of());
        ResponseEntity<DishResponse> r = postDish(body, DishResponse.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(r.getBody().getComposition()).hasSize(3);
        trackDish(r.getBody().getId());
    }

    @Test
    @DisplayName("Состав (продукты) — rejectsUnknownProduct")
    void rejectsUnknownProduct() {
        Map<String, Object> body =
                dishBody(
                        unique("неизвестный продукт-POST"),
                        List.of(),
                        null,
                        null,
                        null,
                        null,
                        List.of(ApiTestPayloads.compositionLine(UNKNOWN_PRODUCT_ID, 10)),
                        100,
                        "FIRST",
                        Set.of());
        ResponseEntity<String> r = postDish(body, String.class);
        assertDefaultSpringError(r, 500, "/api/dishes");
    }

    @DisplayName("Категория блюда")
    @ParameterizedTest(name = "{0}")
    @MethodSource("org.example.api.dish.DishApiSupport#dishCategorySamples")
    void acceptsEachCategory(String category) {
        Long pid = createTrackedProduct(15, 1, 1, 1, DegreeReadiness.READY_TO_EAT);
        Map<String, Object> body =
                dishBody(
                        unique("категория-POST-" + category),
                        List.of(),
                        null,
                        null,
                        null,
                        null,
                        List.of(ApiTestPayloads.compositionLine(pid, 10)),
                        40,
                        category,
                        Set.of());
        ResponseEntity<DishResponse> r = postDish(body, DishResponse.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(r.getBody().getCategory().name()).isEqualTo(category);
        trackDish(r.getBody().getId());
    }

    @DisplayName("Метки (flags)")
    @ParameterizedTest(name = "{0}")
    @MethodSource("org.example.api.dish.DishApiSupport#dishFlagSamples")
    void acceptsEachFlagAlone(String flag) {
        Long pid = createTrackedProduct(10, 1, 1, 1, DegreeReadiness.READY_TO_EAT);
        Map<String, Object> body =
                dishBody(
                        unique("флаг-POST-" + flag),
                        List.of(),
                        null,
                        null,
                        null,
                        null,
                        List.of(ApiTestPayloads.compositionLine(pid, 10)),
                        50,
                        "DESSERT",
                        Set.of(flag));
        ResponseEntity<DishResponse> r = postDish(body, DishResponse.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(r.getBody().getFlags()).containsExactlyInAnyOrderElementsOf(Set.of(Flag.valueOf(flag)));
        trackDish(r.getBody().getId());
    }

    @Test
    @DisplayName("Метки (flags) — acceptsAllFlagsTogether")
    void acceptsAllFlagsTogether() {
        Long pid = createTrackedProduct(10, 1, 1, 1, DegreeReadiness.READY_TO_EAT);
        Map<String, Object> body =
                dishBody(
                        unique("всеМетки-POST"),
                        List.of(),
                        null,
                        null,
                        null,
                        null,
                        List.of(ApiTestPayloads.compositionLine(pid, 10)),
                        50,
                        "DESSERT",
                        Set.of("VEGAN", "GLUTEN_FREE", "SUGAR_FREE"));
        ResponseEntity<DishResponse> r = postDish(body, DishResponse.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(r.getBody().getFlags())
                .containsExactlyInAnyOrder(Flag.VEGAN, Flag.GLUTEN_FREE, Flag.SUGAR_FREE);
        trackDish(r.getBody().getId());
    }
}
