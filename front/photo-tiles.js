(function () {
  function normalizePhotoUrl(raw) {
    let u = String(raw ?? "").trim();
    if (!u) return "";
    if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return u;
    if (u.startsWith("//")) return u;
    return `https://${u}`;
  }

  function flipHttpScheme(u) {
    if (/^https:\/\//i.test(u)) return u.replace(/^https:/i, "http:");
    if (/^http:\/\//i.test(u)) return u.replace(/^http:/i, "https:");
    return "";
  }

  function apiOrigin() {
    const o = window.RECIPE_BOOK_API_ORIGIN || "";
    const s = String(o).trim();
    if (!s) return "http://localhost:8080";
    return s.replace(/\/+$/, "");
  }

  function isHostedRecipeBookPhotoUrl(raw) {
    const trimmed = String(raw ?? "").trim();
    if (!trimmed) return false;
    if (
      trimmed.includes("/api/dish-photos/") ||
      trimmed.includes("/api/product-photos/")
    ) {
      return true;
    }
    try {
      const u = new URL(trimmed, `${apiOrigin()}/`);
      const p = u.pathname;
      return (
        p.includes("/api/dish-photos/") || p.includes("/api/product-photos/")
      );
    } catch {
      return false;
    }
  }

  function proxySrc(remoteUrl) {
    return `${apiOrigin()}/api/images/proxy?url=${encodeURIComponent(remoteUrl)}`;
  }

  function collectCandidates(raw) {
    const trimmed = String(raw ?? "").trim();
    if (!trimmed) return [];

    const out = [];
    const add = (s) => {
      const x = normalizePhotoUrl(s);
      if (x && !out.includes(x)) out.push(x);
    };

    add(trimmed);
    if (!/^[a-z][a-z0-9+.-]*:/i.test(trimmed) && !trimmed.startsWith("//")) {
      add(`http://${trimmed}`);
    }

    if (/%[0-9a-f]/i.test(trimmed)) {
      try {
        const dec = decodeURIComponent(trimmed.replace(/\+/g, " "));
        if (dec !== trimmed) add(dec);
      } catch {}
    }

    const base = [...out];
    base.forEach((u) => {
      const flipped = flipHttpScheme(u);
      if (flipped && !out.includes(flipped)) out.push(flipped);
    });

    return out;
  }

  function loadImageWithRetries(attempts, broken, openLink) {
    openLink.hidden = true;
    broken.hidden = true;
    openLink.replaceChildren();

    let i = 0;

    function fail() {
      openLink.hidden = true;
      openLink.replaceChildren();
      broken.hidden = false;
    }

    function next() {
      if (i >= attempts.length) {
        fail();
        return;
      }

      const { src, linkHref, referrerPolicy } = attempts[i];
      i += 1;

      const img = document.createElement("img");
      img.className = "entity-photo";
      img.alt = "";
      img.loading = "eager";
      img.decoding = "async";

      if (referrerPolicy === null) img.removeAttribute("referrerPolicy");
      else img.setAttribute("referrerPolicy", referrerPolicy);

      img.onload = () => {
        openLink.href = linkHref || img.currentSrc || src;
        openLink.replaceChildren(img);
        openLink.hidden = false;
        broken.hidden = true;
      };

      img.onerror = () => {
        img.removeAttribute("src");
        next();
      };

      img.src = src;
    }

    next();
  }

  function mount(container, urls) {
    container.replaceChildren();
    container.classList.add("projects-grid", "entity-photo-tiles");

    const refPolicies = [null, "no-referrer"];

    const listRaw = Array.isArray(urls) ? urls : [];
    listRaw.filter(Boolean).forEach((raw, idx) => {
      const trimmed = String(raw ?? "").trim();
      const candidates = isHostedRecipeBookPhotoUrl(trimmed)
        ? [normalizePhotoUrl(trimmed) || trimmed]
        : collectCandidates(raw);
      const displayUrl =
        normalizePhotoUrl(raw) || candidates[0] || String(raw).trim();

      const article = document.createElement("article");
      article.className = "entity-photo-card";

      if (isHostedRecipeBookPhotoUrl(trimmed)) {
        article.classList.add("entity-photo-card--hosted");
        const wrap = document.createElement("div");
        wrap.className = "entity-photo-hosted-wrap";
        const img = document.createElement("img");
        img.className = "entity-photo entity-photo--hosted";
        img.alt = "";
        img.loading = "lazy";
        img.decoding = "async";
        img.src = normalizePhotoUrl(trimmed) || trimmed;
        wrap.appendChild(img);
        article.appendChild(wrap);
        container.appendChild(article);
        return;
      }

      const media = document.createElement("div");
      media.className = "entity-photo-media";

      const openLink = document.createElement("a");
      openLink.className = "entity-photo-open";
      openLink.href = displayUrl;
      openLink.target = "_blank";
      openLink.rel = "noopener noreferrer";
      openLink.setAttribute(
        "aria-label",
        `Изображение ${idx + 1}, открыть ссылку`,
      );

      const caption = document.createElement("div");
      caption.className = "entity-photo-caption";
      const capLink = document.createElement("a");
      capLink.href = displayUrl;
      capLink.target = "_blank";
      capLink.rel = "noopener noreferrer";
      capLink.textContent =
        displayUrl.length > 72 ? `${displayUrl.slice(0, 69)}…` : displayUrl;

      const broken = document.createElement("div");
      broken.className = "entity-photo-broken";
      broken.hidden = true;
      const brTitle = document.createElement("span");
      brTitle.className = "entity-photo-broken-label";
      brTitle.textContent =
        "Превью не загрузилось — откройте ссылку в новой вкладке";
      const brLink = document.createElement("a");
      brLink.className = "entity-photo-broken-url";
      brLink.href = displayUrl;
      brLink.target = "_blank";
      brLink.rel = "noopener noreferrer";
      brLink.textContent =
        displayUrl.length > 64 ? `${displayUrl.slice(0, 61)}…` : displayUrl;
      broken.append(brTitle, brLink);

      const attempts = [];
      candidates.forEach((u) => {
        attempts.push({ src: proxySrc(u), linkHref: u, referrerPolicy: null });
      });
      candidates.forEach((u) => {
        refPolicies.forEach((referrerPolicy) => {
          attempts.push({ src: u, linkHref: u, referrerPolicy });
        });
      });

      media.append(openLink, broken);

      caption.appendChild(capLink);
      article.append(media, caption);
      container.appendChild(article);

      if (!attempts.length) {
        openLink.hidden = true;
        broken.hidden = false;
        return;
      }

      loadImageWithRetries(attempts, broken, openLink);
    });
  }

  window.RecipeBookPhotoTiles = { mount };
})();
