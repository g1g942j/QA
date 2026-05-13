package org.example.api.product;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import java.util.Set;

import org.example.DTOs.product.ProductResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import org.example.entity.enums.DegreeReadiness;
import org.example.entity.enums.Flag;
import org.example.entity.enums.ProductCategory;

@DisplayName("Продукт: получение списка и по id (GET)")
class ProductRetriveCrudApi extends ProductApiSupport {

    @Test
    void getAllProducts_returnsOk() {
        ResponseEntity<List<ProductResponse>> r =
                rest.exchange("/api/products", HttpMethod.GET, null, new ParameterizedTypeReference<>() {});
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(r.getBody()).isNotNull();
    }

    @Test
    void getUnknownProductById_returns500() {
        ResponseEntity<String> r = rest.getForEntity("/api/products/999999999", String.class);
        assertDefaultSpringError(r, 500, "/api/products/999999999");
    }

    @Test
    void getByIdMatchesCreatedProduct() {
        String name = unique("чтениеId");
        String composition = "Крупа, масло.";
        Map<String, Object> create =
                productBody(
                        name,
                        List.of(),
                        100.5,
                        12,
                        13,
                        14,
                        composition,
                        ProductCategory.GRAINS.name(),
                        DegreeReadiness.SEMI_FINISHED.name(),
                        Set.of("GLUTEN_FREE"));
        ProductResponse created =
                rest.postForEntity("/api/products", json(create), ProductResponse.class).getBody();
        trackProduct(created.getId());

        ResponseEntity<ProductResponse> r =
                rest.getForEntity("/api/products/" + created.getId(), ProductResponse.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(r.getBody().getId()).isEqualTo(created.getId());
        assertThat(r.getBody().getName()).isEqualTo(name);
        assertThat(r.getBody().getComposition()).isEqualTo(composition);
        assertThat(r.getBody().getCategory()).isEqualTo(ProductCategory.GRAINS);
        assertThat(r.getBody().getDegreeReadiness()).isEqualTo(DegreeReadiness.SEMI_FINISHED);
        assertThat(r.getBody().getFlags()).containsExactly(Flag.GLUTEN_FREE);
        assertThat(r.getBody().getCalories()).isEqualTo(100.5);
    }

    @Test
    void listContainsCreatedProduct() {
        String name = unique("чтениеСписок");
        Map<String, Object> create =
                productBody(
                        name,
                        List.of(),
                        20,
                        10,
                        10,
                        10,
                        null,
                        ProductCategory.CANNED.name(),
                        DegreeReadiness.READY_TO_EAT.name(),
                        Set.of());
        ProductResponse created =
                rest.postForEntity("/api/products", json(create), ProductResponse.class).getBody();
        trackProduct(created.getId());

        ResponseEntity<List<ProductResponse>> r =
                rest.exchange("/api/products", HttpMethod.GET, null, new ParameterizedTypeReference<>() {});
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(r.getBody()).isNotNull();
        assertThat(r.getBody().stream().map(ProductResponse::getId).anyMatch(id -> id.equals(created.getId())))
                .isTrue();
        assertThat(
                        r.getBody().stream()
                                .filter(p -> p.getId().equals(created.getId()))
                                .findFirst()
                                .orElseThrow()
                                .getName())
                .isEqualTo(name);
    }
}
