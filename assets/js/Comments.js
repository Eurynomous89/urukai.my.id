/* Public portfolio comments backed by Supabase Data API and Storage. */
(() => {
  const panel = document.querySelector(".comments-panel");
  if (!panel) return;

  const form = panel.querySelector("#comments-form");
  const nameInput = form.querySelector("#comment-name");
  const commentInput = form.querySelector("#comment-text");
  const avatarInput = form.querySelector("#comment-avatar");
  const avatarName = form.querySelector("[data-avatar-name]");
  const submitButton = form.querySelector("[type='submit']");
  const submitLabel = submitButton.querySelector("span");
  const status = panel.querySelector("#comments-status");
  const feed = panel.querySelector("[data-comment-list]");
  const count = panel.querySelector("[data-comment-count]");
  const emptyState = panel.querySelector("[data-comments-empty]");
  const config = window.PORTFOLIO_COMMENTS_CONFIG || {};
  const bucketName = "portfolio-comment-avatars";
  const maxAvatarBytes = 5 * 1024 * 1024;
  let isSubmitting = false;

  function normalizeProjectUrl(value) {
    try {
      const url = new URL(String(value || "").trim());
      const localDevelopment = ["localhost", "127.0.0.1"].includes(url.hostname);
      if (url.protocol !== "https:" && !(localDevelopment && url.protocol === "http:")) return "";
      return url.origin;
    } catch (error) {
      return "";
    }
  }

  function isLegacyAnonKey(value) {
    const parts = value.split(".");
    if (parts.length !== 3) return false;
    try {
      const segment = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const payload = JSON.parse(window.atob(segment.padEnd(Math.ceil(segment.length / 4) * 4, "=")));
      return payload.role === "anon";
    } catch (error) {
      return false;
    }
  }

  const projectUrl = normalizeProjectUrl(config.supabaseUrl);
  const publishableKey = String(config.publishableKey || "").trim();
  const legacyAnonKey = isLegacyAnonKey(publishableKey);
  const validPublicKey = publishableKey.startsWith("sb_publishable_") || legacyAnonKey;
  const isConfigured = Boolean(projectUrl && validPublicKey);
  const commentsUrl = isConfigured ? `${projectUrl}/rest/v1/portfolio_comments` : "";

  function apiHeaders(extra = {}) {
    const headers = { apikey: publishableKey, ...extra };
    if (legacyAnonKey) headers.Authorization = `Bearer ${publishableKey}`;
    return headers;
  }

  function setStatus(message, kind = "info") {
    status.textContent = message;
    status.className = `comments-status is-${kind}`;
  }

  function relativeTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const elapsed = Math.max(0, (Date.now() - date.getTime()) / 1000);
    const units = [
      [60, "second"],
      [60, "minute"],
      [24, "hour"],
      [7, "day"],
      [4.35, "week"],
      [12, "month"],
      [Number.POSITIVE_INFINITY, "year"]
    ];
    let amount = elapsed;
    let unit = "second";
    for (const [limit, nextUnit] of units) {
      unit = nextUnit;
      if (amount < limit) break;
      amount /= limit;
    }

    const rounded = Math.max(0, Math.floor(amount));
    return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(-rounded, unit);
  }

  function encodeObjectPath(path) {
    return path.split("/").map(encodeURIComponent).join("/");
  }

  function avatarUrlForPath(path) {
    if (typeof path !== "string" || !/^comments\/[0-9a-f-]+\.(png|jpg|jpeg|webp)$/i.test(path)) return "";
    return `${projectUrl}/storage/v1/object/public/${bucketName}/${encodeObjectPath(path)}`;
  }

  function renderComment(comment) {
    const item = document.createElement("article");
    item.className = "comment-item";
    item.setAttribute("role", "listitem");

    const name = String(comment.name || "Visitor").trim().slice(0, 80) || "Visitor";
    const message = String(comment.comment || "").trim().slice(0, 1000);
    const avatarUrl = avatarUrlForPath(comment.avatar_path);
    const avatar = document.createElement("span");
    avatar.className = "comment-avatar";
    avatar.setAttribute("aria-hidden", "true");
    if (avatarUrl) {
      const image = document.createElement("img");
      image.src = avatarUrl;
      image.alt = "";
      image.loading = "lazy";
      avatar.append(image);
    } else {
      avatar.textContent = name.slice(0, 1).toLocaleUpperCase();
    }

    const copy = document.createElement("div");
    copy.className = "comment-copy";
    const meta = document.createElement("div");
    meta.className = "comment-meta";
    const author = document.createElement("strong");
    author.textContent = name;
    meta.append(author);

    if (comment.created_at) {
      const time = document.createElement("time");
      time.dateTime = String(comment.created_at);
      time.textContent = relativeTime(comment.created_at);
      const parsedDate = new Date(comment.created_at);
      if (!Number.isNaN(parsedDate.getTime())) time.title = parsedDate.toLocaleString();
      meta.append(time);
    }

    const body = document.createElement("p");
    body.textContent = message;
    copy.append(meta, body);
    item.append(avatar, copy);
    return item;
  }

  function renderComments(comments, totalCount) {
    feed.replaceChildren();
    if (comments.length) {
      comments.forEach((comment) => feed.append(renderComment(comment)));
    } else if (emptyState) {
      emptyState.hidden = false;
      feed.append(emptyState);
    }
    count.textContent = String(Number.isFinite(totalCount) ? totalCount : comments.length);
  }

  async function loadComments(quiet = false) {
    if (!quiet) setStatus("Loading comments…");
    const url = new URL(commentsUrl);
    url.search = new URLSearchParams({
      select: "id,name,comment,avatar_path,created_at",
      order: "created_at.desc",
      limit: "100"
    });
    const response = await fetch(url, {
      method: "GET",
      headers: apiHeaders({ Accept: "application/json", Prefer: "count=exact" }),
      cache: "no-store"
    });
    if (!response.ok) throw new Error("Could not load comments.");

    const range = response.headers.get("content-range") || "";
    const totalText = range.split("/")[1];
    const totalCount = totalText && totalText !== "*" ? Number(totalText) : NaN;
    const comments = await response.json();
    renderComments(Array.isArray(comments) ? comments : [], totalCount);
    if (!quiet) setStatus("");
  }

  function extensionForImage(file) {
    return ({ "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" })[file.type] || "";
  }

  async function uploadAvatar(file) {
    if (!file) return null;
    const extension = extensionForImage(file);
    if (!extension || file.size > maxAvatarBytes) throw new Error("Invalid profile photo.");

    const uniqueId = window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const path = `comments/${uniqueId}.${extension}`;
    const response = await fetch(`${projectUrl}/storage/v1/object/${bucketName}/${encodeObjectPath(path)}`, {
      method: "POST",
      headers: apiHeaders({ "Content-Type": file.type, "x-upsert": "false" }),
      body: file
    });
    if (!response.ok) throw new Error("Profile photo upload failed.");
    return path;
  }

  avatarInput.addEventListener("change", () => {
    const file = avatarInput.files?.[0];
    avatarName.textContent = file ? file.name : "Choose a profile photo";
    if (!file) return;
    if (!extensionForImage(file)) {
      avatarInput.value = "";
      avatarName.textContent = "Choose a profile photo";
      setStatus("Choose a PNG, JPG, or WebP image.", "error");
      return;
    }
    if (file.size > maxAvatarBytes) {
      avatarInput.value = "";
      avatarName.textContent = "Choose a profile photo";
      setStatus("Profile photos must be 5 MB or smaller.", "error");
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!isConfigured) {
      setStatus("Comments are not connected yet. Add your Supabase project URL and publishable key to CommentsConfig.js.", "error");
      return;
    }
    if (isSubmitting) return;

    const name = nameInput.value.trim();
    const message = commentInput.value.trim();
    if (!name || !message) {
      setStatus("Enter your name and comment before posting.", "error");
      return;
    }
    if (name.length > 80 || message.length > 1000) {
      setStatus("Names can be up to 80 characters and comments up to 1,000 characters.", "error");
      return;
    }

    const avatar = avatarInput.files?.[0] || null;
    if (avatar && (!extensionForImage(avatar) || avatar.size > maxAvatarBytes)) {
      setStatus("Choose a PNG, JPG, or WebP photo up to 5 MB.", "error");
      return;
    }

    isSubmitting = true;
    submitButton.disabled = true;
    submitLabel.textContent = "Posting…";
    setStatus("Posting your comment…");

    try {
      const avatarPath = await uploadAvatar(avatar);
      const response = await fetch(commentsUrl, {
        method: "POST",
        headers: apiHeaders({ "Content-Type": "application/json", Prefer: "return=minimal" }),
        body: JSON.stringify({ name, comment: message, avatar_path: avatarPath })
      });
      if (!response.ok) throw new Error("Could not post comment.");

      form.reset();
      avatarName.textContent = "Choose a profile photo";
      try {
        await loadComments(true);
        setStatus("Your comment was posted.", "success");
      } catch (error) {
        setStatus("Your comment was saved, but the list could not refresh. Refresh the page to see it.", "success");
      }
    } catch (error) {
      setStatus("Your comment could not be posted. Please try again later.", "error");
    } finally {
      isSubmitting = false;
      submitButton.disabled = false;
      submitLabel.textContent = "Post comment";
    }
  });

  if (!isConfigured) {
    submitButton.disabled = true;
    setStatus("Shared comments are not configured yet. Add your Supabase project URL and publishable key to CommentsConfig.js.");
    return;
  }

  loadComments().catch(() => setStatus("Comments could not be loaded. Check the Supabase setup and refresh.", "error"));
})();
