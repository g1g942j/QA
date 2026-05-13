package org.example.api.dish;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

import org.example.DTOs.dish.DishPhotoUploadResponse;
import org.example.DTOs.dish.DishResponse;
import org.example.DTOs.product.ProductResponse;
import org.example.api.AbstractRecipeBookApi;
import org.example.api.CrudHttpVerb;
import org.example.api.ApiTestPayloads;
import org.example.entity.enums.DegreeReadiness;
import org.example.entity.enums.ProductCategory;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

import static org.assertj.core.api.Assertions.assertThat;

public abstract class DishApiSupport extends AbstractRecipeBookApi {

    protected static final long UNKNOWN_PRODUCT_ID = 999_999_999L;

    protected String unique(String prefix) {
        return prefix + "-" + UUID.randomUUID().toString().substring(0, 8);
    }

    protected Long createTrackedProduct(double cal, double p, double f, double c, DegreeReadiness readiness) {
        var body =
                ApiTestPayloads.product(
                        unique("инг"),
                        List.of(),
                        cal,
                        p,
                        f,
                        c,
                        null,
                        ProductCategory.MEAT.name(),
                        readiness.name(),
                        Set.of());
        Long id =
                rest.postForEntity("/api/products", json(body), ProductResponse.class).getBody().getId();
        trackProduct(id);
        return id;
    }

    protected <T> ResponseEntity<T> executeDish(
            CrudHttpVerb verb, Long putResourceId, Map<String, Object> body, Class<T> responseType) {
        if (verb == CrudHttpVerb.POST) {
            return rest.postForEntity("/api/dishes", json(body), responseType);
        }
        return rest.exchange(
                "/api/dishes/" + Objects.requireNonNull(putResourceId, "putResourceId"),
                HttpMethod.PUT,
                json(body),
                responseType);
    }

    protected Long createBaseDish() {
        Long pid = createTrackedProduct(25, 2, 2, 2, DegreeReadiness.READY_TO_EAT);
        Map<String, Object> body =
                dishBody(
                        unique("база"),
                        List.of(),
                        null,
                        null,
                        null,
                        null,
                        List.of(ApiTestPayloads.compositionLine(pid, 20)),
                        90,
                        "SECOND",
                        Set.of());
        Long id =
                rest.postForEntity("/api/dishes", json(body), DishResponse.class).getBody().getId();
        trackDish(id);
        return id;
    }

    protected List<String> uploadPendingDishPhotoKeys(int count) {
        List<String> keys = new ArrayList<>();
        HttpHeaders outer = new HttpHeaders();
        outer.setContentType(MediaType.MULTIPART_FORM_DATA);
        byte[] png = new byte[] {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
        for (int i = 0; i < count; i++) {
            final int idx = i;
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            ByteArrayResource pngResource =
                    new ByteArrayResource(png) {
                        @Override
                        public String getFilename() {
                            return "one-" + idx + ".png";
                        }
                    };
            HttpHeaders partHeaders = new HttpHeaders();
            partHeaders.setContentType(MediaType.IMAGE_PNG);
            body.add("file", new HttpEntity<>(pngResource, partHeaders));
            HttpEntity<MultiValueMap<String, Object>> req = new HttpEntity<>(body, outer);
            ResponseEntity<DishPhotoUploadResponse> r =
                    rest.postForEntity("/api/dish-photos", req, DishPhotoUploadResponse.class);
            assertThat(r.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(r.getBody()).isNotNull();
            assertThat(r.getBody().getStorageKey()).isNotBlank();
            keys.add(r.getBody().getStorageKey());
        }
        return keys;
    }

    protected Map<String, Object> dishBody(
            String name,
            List<String> photos,
            Double calories,
            Double proteins,
            Double fats,
            Double carbs,
            List<Map<String, Object>> composition,
            double portionSize,
            String category,
            Set<String> flags) {
        return ApiTestPayloads.dish(
                name, photos, calories, proteins, fats, carbs, composition, portionSize, category, flags);
    }

    protected Map<String, Object> dishBodyWithoutName(
            List<String> photos,
            List<Map<String, Object>> composition,
            double portionSize,
            String category,
            Set<String> flags) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("photos", photos == null ? List.of() : photos);
        m.put("composition", composition);
        m.put("portionSize", portionSize);
        m.put("category", category);
        m.put("flags", flags == null ? Set.of() : flags);
        return m;
    }

    protected Map<String, Object> dishBodyWithMacro(
            MacroField field,
            double value,
            String name,
            List<String> photos,
            List<Map<String, Object>> composition,
            double portionSize,
            String category,
            Set<String> flags) {
        Double cal = field == MacroField.CALORIES ? value : null;
        Double prot = field == MacroField.PROTEINS ? value : null;
        Double fat = field == MacroField.FATS ? value : null;
        Double carb = field == MacroField.CARBS ? value : null;
        return dishBody(name, photos, cal, prot, fat, carb, composition, portionSize, category, flags);
    }

    public enum MacroField {
        CALORIES,
        PROTEINS,
        FATS,
        CARBS
    }
}
