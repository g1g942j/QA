package org.example.api;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.web.client.DefaultResponseErrorHandler;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.DefaultUriBuilderFactory;

public abstract class AbstractRecipeBookApi {

    private static final String BASE_URL_PROPERTY = "recipebook.api.base-url";
    private static final String API_TEST_CONFIG_RESOURCE = "/application-test.properties";

    private static final Set<Long> GLOBAL_DISH_IDS = ConcurrentHashMap.newKeySet();
    private static final Set<Long> GLOBAL_PRODUCT_IDS = ConcurrentHashMap.newKeySet();

    protected static RestTemplate rest;

    @BeforeAll
    static void connectToRunningBackend() {
        String baseUrl = resolveBaseUrl();
        while (baseUrl.endsWith("/")) {
            baseUrl = baseUrl.substring(0, baseUrl.length() - 1);
        }

        RestTemplate client = new RestTemplate();
        client.setUriTemplateHandler(new DefaultUriBuilderFactory(baseUrl));
        client.setErrorHandler(
                new DefaultResponseErrorHandler() {
                    @Override
                    public boolean hasError(ClientHttpResponse response) throws IOException {
                        return false;
                    }
                });
        rest = client;

        try {
            rest.getForEntity("/api/products", String.class);
        } catch (ResourceAccessException e) {
            throw new IllegalStateException(
                    "Нет соединения с бэкендом по адресу " + baseUrl + " — запустите сервер и повторите.", e);
        }
    }

    private static String resolveBaseUrl() {
        Properties p = new Properties();
        try (InputStream in = AbstractRecipeBookApi.class.getResourceAsStream(API_TEST_CONFIG_RESOURCE)) {
            if (in == null) {
                throw new IllegalStateException("Не найден classpath-ресурс " + API_TEST_CONFIG_RESOURCE);
            }
            p.load(in);
        } catch (IOException e) {
            throw new IllegalStateException("Не удалось прочитать " + API_TEST_CONFIG_RESOURCE, e);
        }
        String url = p.getProperty(BASE_URL_PROPERTY);
        if (url == null || url.isBlank()) {
            throw new IllegalStateException(
                    "В " + API_TEST_CONFIG_RESOURCE + " задайте " + BASE_URL_PROPERTY + "=http://host:port");
        }
        return url.trim();
    }

    private final List<Long> dishIdsToDelete = new ArrayList<>();
    private final List<Long> productIdsToDelete = new ArrayList<>();

    @AfterEach
    void cleanupTrackedEntitiesAfterEachTest() {
        deleteByIds(dishIdsToDelete, "/api/dishes/", GLOBAL_DISH_IDS);
        dishIdsToDelete.clear();
        deleteByIds(productIdsToDelete, "/api/products/", GLOBAL_PRODUCT_IDS);
        productIdsToDelete.clear();
    }

    @AfterAll
    static void cleanupAnyRemainingTrackedEntitiesAfterClass() {
        deleteByIds(new ArrayList<>(GLOBAL_DISH_IDS), "/api/dishes/", GLOBAL_DISH_IDS);
        GLOBAL_DISH_IDS.clear();
        deleteByIds(new ArrayList<>(GLOBAL_PRODUCT_IDS), "/api/products/", GLOBAL_PRODUCT_IDS);
        GLOBAL_PRODUCT_IDS.clear();
    }

    private static void deleteByIds(List<Long> ids, String pathPrefix, Set<Long> globalTracked) {
        for (int i = ids.size() - 1; i >= 0; i--) {
            Long id = ids.get(i);
            if (id == null) {
                continue;
            }
            if (resolvedAfterDeleteAttempt(deleteStatus(pathPrefix + id))) {
                globalTracked.remove(id);
            }
        }
    }

    private static int deleteStatus(String path) {
        try {
            return rest.exchange(path, HttpMethod.DELETE, null, Void.class).getStatusCode().value();
        } catch (RuntimeException e) {
            return -1;
        }
    }

    private static boolean resolvedAfterDeleteAttempt(int status) {
        return status == 404 || (status >= 200 && status < 300);
    }

    protected void trackProduct(Long id) {
        if (id != null) {
            productIdsToDelete.add(id);
            GLOBAL_PRODUCT_IDS.add(id);
        }
    }

    protected void trackDish(Long id) {
        if (id != null) {
            dishIdsToDelete.add(id);
            GLOBAL_DISH_IDS.add(id);
        }
    }

    protected HttpEntity<Map<String, Object>> json(Map<String, Object> body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        return new HttpEntity<>(body, headers);
    }

    protected static void assertDefaultSpringError(ResponseEntity<String> r, int expectedStatus, String pathSubstring) {
        assertThat(r.getStatusCode().value()).isEqualTo(expectedStatus);
        assertThat(r.getBody()).isNotNull();
        assertThat(r.getBody()).contains("\"status\":" + expectedStatus);
        assertThat(r.getBody()).contains(pathSubstring);
    }
}
