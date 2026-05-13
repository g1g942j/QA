package org.example.api.dish;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;

import org.example.DTOs.dish.DishResponse;
import org.example.api.ApiTestPayloads;
import org.example.api.CrudHttpVerb;
import org.example.entity.enums.DegreeReadiness;
import org.example.entity.enums.DishCategory;
import org.example.entity.enums.Flag;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

@DisplayName("Блюдо: POST и PUT (общие проверки)")
class DishCreateCrudApi extends DishApiSupport {

    private Long putDishId(CrudHttpVerb verb) {
        return verb == CrudHttpVerb.PUT ? createBaseDish() : null;
    }

    static Stream<CrudHttpVerb> postAndPut() {
        return Stream.of(CrudHttpVerb.POST, CrudHttpVerb.PUT);
    }

    static Stream<Arguments> macroVerbFieldAndValue() {
        return postAndPut()
                .flatMap(
                        verb ->
                                Stream.of(
                                        Arguments.of(verb, DishApiSupport.MacroField.CALORIES, -1.0),
                                        Arguments.of(verb, DishApiSupport.MacroField.CALORIES, 0.0),
                                        Arguments.of(verb, DishApiSupport.MacroField.PROTEINS, 1.0)));
    }

    static Stream<Arguments> categoryAndVerb() {
        List<String> sample =
                List.of(
                        DishCategory.SECOND.name(),
                        DishCategory.DESSERT.name(),
                        DishCategory.SOUP.name());
        return postAndPut().flatMap(verb -> sample.stream().map(cat -> Arguments.of(verb, cat)));
    }

    static Stream<Arguments> degreeAndVerb() {
        return postAndPut()
                .flatMap(
                        verb ->
                                Stream.of(
                                        Arguments.of(verb, DegreeReadiness.READY_TO_EAT),
                                        Arguments.of(verb, DegreeReadiness.SEMI_FINISHED)));
    }

    static Stream<Arguments> flagAndVerb() {
        return postAndPut()
                .flatMap(
                        verb ->
                                Stream.of("VEGAN", "GLUTEN_FREE")
                                        .map(flag -> Arguments.of(verb, flag)));
    }

    @Nested
    @DisplayName("Название")
    class Name {
        static Stream<Arguments> noName() {
            return Stream.of(
                    Arguments.of(CrudHttpVerb.POST),
                    Arguments.of(CrudHttpVerb.PUT));
        }

        @ParameterizedTest(name = "{0}")
        @MethodSource("noName")
        void rejectsWhenNameMissing(CrudHttpVerb verb) {
            Long putId = putDishId(verb);
            Long pid = createTrackedProduct(10, 1, 1, 1, DegreeReadiness.READY_TO_EAT);
            Map<String, Object> body =
                    dishBodyWithoutName(
                            List.of(),
                            List.of(ApiTestPayloads.compositionLine(pid, 10)),
                            100,
                            "SECOND",
                            Set.of());
            ResponseEntity<String> r = executeDish(verb, putId, body, String.class);
            assertThat(r.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        }

        static Stream<Arguments> dishNameOneCharCases() {
            return Stream.of(
                    Arguments.of(CrudHttpVerb.POST, "a"),
                    Arguments.of(CrudHttpVerb.PUT, "x"));
        }

        @ParameterizedTest(name = "{0} name={1}")
        @MethodSource("dishNameOneCharCases")
        void rejectsWhenNameOneCharacter(CrudHttpVerb verb, String badName) {
            Long putId = putDishId(verb);
            Long pid = createTrackedProduct(10, 1, 1, 1, DegreeReadiness.READY_TO_EAT);
            Map<String, Object> body =
                    dishBody(
                            badName,
                            List.of(),
                            null,
                            null,
                            null,
                            null,
                            List.of(ApiTestPayloads.compositionLine(pid, 10)),
                            100,
                            "SECOND",
                            Set.of());
            ResponseEntity<String> r = executeDish(verb, putId, body, String.class);
            assertThat(r.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        }

        static Stream<Arguments> dishNameTwoCharsCases() {
            return Stream.of(
                    Arguments.of(CrudHttpVerb.POST, "аб", HttpStatus.CREATED),
                    Arguments.of(CrudHttpVerb.PUT, "ув", HttpStatus.OK));
        }

        @ParameterizedTest(name = "{0} -> {2}")
        @MethodSource("dishNameTwoCharsCases")
        void acceptsWhenNameTwoCharacters(
                CrudHttpVerb verb, String name, HttpStatus expected) {
            Long putId = putDishId(verb);
            Long pid = createTrackedProduct(10, 1, 1, 1, DegreeReadiness.READY_TO_EAT);
            Map<String, Object> body =
                    dishBody(
                            name,
                            List.of(),
                            null,
                            null,
                            null,
                            null,
                            List.of(ApiTestPayloads.compositionLine(pid, 10)),
                            100,
                            "SECOND",
                            Set.of());
            ResponseEntity<DishResponse> r =
                    executeDish(verb, putId, body, DishResponse.class);
            assertThat(r.getStatusCode()).isEqualTo(expected);
            assertThat(r.getBody().getName()).isEqualTo(name);
            if (verb == CrudHttpVerb.POST) {
                trackDish(r.getBody().getId());
            }
        }
    }

    @Nested
    @DisplayName("Фото")
    class Photos {

        @ParameterizedTest(name = "{0}")
        @MethodSource("org.example.api.dish.DishCreateCrudApi#postAndPut")
        void acceptsZeroPhotos(CrudHttpVerb verb) {
            Long putId = putDishId(verb);
            Long pid =
                    verb == CrudHttpVerb.POST
                            ? createTrackedProduct(50, 5, 5, 5, DegreeReadiness.READY_TO_EAT)
                            : createTrackedProduct(10, 1, 1, 1, DegreeReadiness.READY_TO_EAT);
            Map<String, Object> body;
                body =
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
            ResponseEntity<DishResponse> r =
                    executeDish(verb, putId, body, DishResponse.class);
            assertThat(r.getStatusCode())
                    .isEqualTo(verb == CrudHttpVerb.POST ? HttpStatus.CREATED : HttpStatus.OK);
            assertThat(r.getBody().getPhotoKeys()).isEmpty();
        }

        @ParameterizedTest(name = "{0}")
        @MethodSource("org.example.api.dish.DishCreateCrudApi#postAndPut")
        void rejectsSixPhotoKeys(CrudHttpVerb verb) {
            Long putId = putDishId(verb);
            Long pid = createTrackedProduct(10, 1, 1, 1, DegreeReadiness.READY_TO_EAT);
            List<String> keys = new ArrayList<>();
            for (int i = 0; i < 6; i++) {
                keys.add("dummy-key-" + verb + "-" + i);
            }
            Map<String, Object> body =
                    dishBody(
                            unique("шестьФото-" + verb),
                            keys,
                            null,
                            null,
                            null,
                            null,
                            List.of(ApiTestPayloads.compositionLine(pid, 10)),
                            50,
                            "SNACK",
                            Set.of());
            ResponseEntity<String> r = executeDish(verb, putId, body, String.class);
            assertThat(r.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        }
    }

    @Nested
    @DisplayName("КБЖУ (явно по одному полю: -1 / 0 / 1)")
    class Macros {

        @ParameterizedTest(name = "{0} {1}={2}")
        @MethodSource("org.example.api.dish.DishCreateCrudApi#macroVerbFieldAndValue")
        void explicitMacroValue(CrudHttpVerb verb, DishApiSupport.MacroField field, double value) {
            Long putId = putDishId(verb);
            Long pid = createTrackedProduct(100, 10, 10, 10, DegreeReadiness.READY_TO_EAT);
            Map<String, Object> body =
                    dishBodyWithMacro(
                            field,
                            value,
                            unique("кбжу-" + verb),
                            List.of(),
                            List.of(ApiTestPayloads.compositionLine(pid, 100)),
                            100,
                            "SECOND",
                            Set.of());
            if (value < 0) {
                ResponseEntity<String> r = executeDish(verb, putId, body, String.class);
                assertThat(r.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
            } else {
                ResponseEntity<DishResponse> r =
                        executeDish(verb, putId, body, DishResponse.class);
                assertThat(r.getStatusCode())
                        .isEqualTo(verb == CrudHttpVerb.POST ? HttpStatus.CREATED : HttpStatus.OK);
                if (verb == CrudHttpVerb.POST) {
                    trackDish(r.getBody().getId());
                }
            }
        }
    }

    @Nested
    @DisplayName("Состав (продукты)")
    class Composition {

        @ParameterizedTest(name = "{0}")
        @MethodSource("org.example.api.dish.DishCreateCrudApi#postAndPut")
        void rejectsEmptyComposition(CrudHttpVerb verb) {
            Long putId = putDishId(verb);
            Map<String, Object> body =
                    dishBody(
                            unique("пустой-" + verb),
                            List.of(),
                            1.0,
                            1.0,
                            1.0,
                            1.0,
                            List.of(),
                            100,
                            "FIRST",
                            Set.of());
            ResponseEntity<String> r = executeDish(verb, putId, body, String.class);
            assertThat(r.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        }

        @ParameterizedTest(name = "{0}")
        @MethodSource("org.example.api.dish.DishCreateCrudApi#postAndPut")
        void acceptsSeveralProducts(CrudHttpVerb verb) {
            Long putId = putDishId(verb);
            Map<String, Object> body;
            Long p1 = createTrackedProduct(100, 10, 5, 15, DegreeReadiness.READY_TO_EAT);
            Long p2 = createTrackedProduct(50, 2, 3, 4, DegreeReadiness.SEMI_FINISHED);
            Long p3 = createTrackedProduct(20, 1, 1, 2, DegreeReadiness.REQUIRES_COOKING);
            body =
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
            ResponseEntity<DishResponse> r =
                    executeDish(verb, putId, body, DishResponse.class);
            assertThat(r.getStatusCode())
                    .isEqualTo(verb == CrudHttpVerb.POST ? HttpStatus.CREATED : HttpStatus.OK);
            assertThat(r.getBody().getComposition()).hasSize(3);
        }

        @ParameterizedTest(name = "{0}")
        @MethodSource("org.example.api.dish.DishCreateCrudApi#postAndPut")
        void rejectsUnknownProduct(CrudHttpVerb verb) {
            Long putId = putDishId(verb);
            Map<String, Object> body =
                    dishBody(
                            unique("неизвестный продукт-" + verb),
                            List.of(),
                            null,
                            null,
                            null,
                            null,
                            List.of(ApiTestPayloads.compositionLine(UNKNOWN_PRODUCT_ID, 10)),
                            100,
                            "FIRST",
                            Set.of());
            ResponseEntity<String> r = executeDish(verb, putId, body, String.class);
            if (verb == CrudHttpVerb.POST) {
                assertDefaultSpringError(r, 500, "/api/dishes");
            } else {
                assertDefaultSpringError(r, 500, "/api/dishes/" + putId);
            }
        }
    }

    @Nested
    @DisplayName("Категория блюда")
    class Category {

        @ParameterizedTest(name = "{0} {1}")
        @MethodSource("org.example.api.dish.DishCreateCrudApi#categoryAndVerb")
        void acceptsEach(CrudHttpVerb verb, String category) {
            Long putId = putDishId(verb);
            Long pid = createTrackedProduct(15, 1, 1, 1, DegreeReadiness.READY_TO_EAT);
            Map<String, Object> body =
                    dishBody(
                            unique("категория-" + verb + "-" + category),
                            List.of(),
                            null,
                            null,
                            null,
                            null,
                            List.of(ApiTestPayloads.compositionLine(pid, 10)),
                            verb == CrudHttpVerb.POST ? 40 : 50,
                            category,
                            Set.of());
            ResponseEntity<DishResponse> r =
                    executeDish(verb, putId, body, DishResponse.class);
            assertThat(r.getStatusCode())
                    .isEqualTo(verb == CrudHttpVerb.POST ? HttpStatus.CREATED : HttpStatus.OK);
            assertThat(r.getBody().getCategory().name()).isEqualTo(category);
        }
    }

    @Nested
    @DisplayName("Метки (flags)")
    class Flags {

        @ParameterizedTest(name = "{0} {1}")
        @MethodSource("org.example.api.dish.DishCreateCrudApi#flagAndVerb")
        void acceptsEachFlagAlone(CrudHttpVerb verb, String flag) {
            Long putId = putDishId(verb);
            Long pid = createTrackedProduct(10, 1, 1, 1, DegreeReadiness.READY_TO_EAT);
            Map<String, Object> body =
                    dishBody(
                            unique("флаг-" + verb + "-" + flag),
                            List.of(),
                            null,
                            null,
                            null,
                            null,
                            List.of(ApiTestPayloads.compositionLine(pid, 10)),
                            50,
                            "DESSERT",
                            Set.of(flag));
            ResponseEntity<DishResponse> r =
                    executeDish(verb, putId, body, DishResponse.class);
            assertThat(r.getStatusCode())
                    .isEqualTo(verb == CrudHttpVerb.POST ? HttpStatus.CREATED : HttpStatus.OK);
            assertThat(r.getBody().getFlags()).containsExactlyInAnyOrderElementsOf(
                    Set.of(Flag.valueOf(flag)));
        }

        @ParameterizedTest(name = "{0}")
        @MethodSource("org.example.api.dish.DishCreateCrudApi#postAndPut")
        void acceptsAllFlagsTogether(CrudHttpVerb verb) {
            Long putId = putDishId(verb);
            Long pid = createTrackedProduct(10, 1, 1, 1, DegreeReadiness.READY_TO_EAT);
            Map<String, Object> body =
                    dishBody(
                            unique("всеМетки-" + verb),
                            List.of(),
                            null,
                            null,
                            null,
                            null,
                            List.of(ApiTestPayloads.compositionLine(pid, 10)),
                            50,
                            "DESSERT",
                            Set.of("VEGAN", "GLUTEN_FREE", "SUGAR_FREE"));
            ResponseEntity<DishResponse> r =
                    executeDish(verb, putId, body, DishResponse.class);
            assertThat(r.getStatusCode())
                    .isEqualTo(verb == CrudHttpVerb.POST ? HttpStatus.CREATED : HttpStatus.OK);
            assertThat(r.getBody().getFlags()).containsExactlyInAnyOrder(
                    Flag.VEGAN, Flag.GLUTEN_FREE, Flag.SUGAR_FREE);
        }
    }
}
