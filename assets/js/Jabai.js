/* Small progressive enhancements for navigation, theme, progress, and contact. */
(() => {
  const root = document.documentElement;
  const themeButton = document.querySelector(".theme-toggle");
  const menuButton = document.querySelector(".menu-toggle");
  const navigation = document.querySelector("#site-nav");
  const progress = document.querySelector(".reading-progress");
  const navLinks = Array.from(document.querySelectorAll(".nav-link"));
  const navTargets = navLinks.map((link) => ({
    link,
    section: document.getElementById(link.hash.slice(1))
  })).filter((target) => target.section);
  const cvButton = document.querySelector("#cv-button");
  const cvNote = document.querySelector("#cv-note");
  const form = document.querySelector("#contact-form");
  const formStatus = document.querySelector("#form-status");
  const chatButton = document.querySelector(".floating-chat");
  const chatPanel = document.querySelector("#contact-chat-panel");
  const chatCloseButton = document.querySelector(".chat-panel-close");

  // Accessible typewriter labels: supports the Home hero and the footer independently.
  const defaultRoleTitles = [
    "3D Creative Developer",
    "I'm a Web Developer",
    "Aspiring Full-Stack Developer"
  ];
  const reduceRoleMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  document.querySelectorAll("[data-role-rotator]").forEach((roleRotator) => {
    const roleText = roleRotator.querySelector("[data-role-text]");
    if (!roleText) return;

    let roleTitles = defaultRoleTitles;
    const configuredTitles = roleRotator.dataset.roleTitles;
    if (configuredTitles) {
      try {
        const parsedTitles = JSON.parse(configuredTitles);
        if (Array.isArray(parsedTitles) && parsedTitles.length && parsedTitles.every((title) => typeof title === "string" && title.trim())) {
          roleTitles = parsedTitles;
        }
      } catch (error) {
        // Fall back to the standard portfolio role titles if custom data is invalid.
      }
    }

    if (reduceRoleMotion.matches) {
      roleText.textContent = roleTitles[roleTitles.length - 1];
      return;
    }

    let roleIndex = 0;
    let characterIndex = 0;
    let deleting = false;
    let roleTimer = null;

    function stopRoleTimer() {
      if (roleTimer !== null) {
        window.clearTimeout(roleTimer);
        roleTimer = null;
      }
    }

    function typeNextCharacter() {
      if (document.hidden) return;
      const currentRole = roleTitles[roleIndex];

      if (deleting) {
        characterIndex = Math.max(0, characterIndex - 1);
        roleText.textContent = currentRole.slice(0, characterIndex);
        if (characterIndex === 0) {
          deleting = false;
          roleIndex = (roleIndex + 1) % roleTitles.length;
          roleTimer = window.setTimeout(typeNextCharacter, 320);
        } else {
          roleTimer = window.setTimeout(typeNextCharacter, 38);
        }
        return;
      }

      characterIndex = Math.min(currentRole.length, characterIndex + 1);
      roleText.textContent = currentRole.slice(0, characterIndex);
      if (characterIndex === currentRole.length) {
        deleting = true;
        roleTimer = window.setTimeout(typeNextCharacter, 1450);
      } else {
        roleTimer = window.setTimeout(typeNextCharacter, 78);
      }
    }

    roleTimer = window.setTimeout(typeNextCharacter, 180);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        stopRoleTimer();
      } else if (roleTimer === null) {
        roleTimer = window.setTimeout(typeNextCharacter, 180);
      }
    });
    window.addEventListener("pagehide", stopRoleTimer, { once: true });
  });

  document.querySelectorAll("[data-current-year]").forEach((yearLabel) => {
    yearLabel.textContent = String(new Date().getFullYear());
  });

// Eight-photo hero slideshow: automatic 3-second loop with optional dot navigation.
  const heroSlideshow = document.querySelector("[data-hero-slideshow]");
  if (heroSlideshow) {
    const photoPaths = [
      "assets/images/hero-gallery/photo-01.jpg",
      "assets/images/hero-gallery/photo-02.jpg",
      "assets/images/hero-gallery/photo-03.jpg",
      "assets/images/hero-gallery/photo-04.jpg",
      "assets/images/hero-gallery/photo-05.jpg",
      "assets/images/hero-gallery/photo-06.jpg",
      "assets/images/hero-gallery/photo-07.jpg",
      "assets/images/hero-gallery/photo-08.jpg"
    ];
    const slideLayers = Array.from(heroSlideshow.querySelectorAll("[data-slide-layer]"));
    const indicators = Array.from(document.querySelectorAll("[data-slide-to]"));
    const emptyMessage = heroSlideshow.querySelector("[data-slide-empty]");
    const photoAvailability = Array(photoPaths.length).fill(null);
    let currentIndex = 0;
    let activeLayer = 0;
    let autoplayTimer = null;
    let transitionToken = 0;
    let allPhotosUnavailable = false;

    // Preload the original eight photos so the slideshow can crossfade without a blank frame.
    const photoPreloads = photoPaths.map((path, index) => new Promise((resolve) => {
      const image = new Image();
      image.decoding = "async";
      image.addEventListener("load", () => {
        photoAvailability[index] = true;
        resolve(true);
      }, { once: true });
      image.addEventListener("error", () => {
        photoAvailability[index] = false;
        if (indicators[index]) indicators[index].disabled = true;
        resolve(false);
      }, { once: true });
      image.src = path;
    }));

    async function findAvailablePhoto(startIndex) {
      for (let offset = 0; offset < photoPaths.length; offset += 1) {
        const index = (startIndex + offset) % photoPaths.length;
        if (photoAvailability[index] === false) continue;
        const loaded = await photoPreloads[index];
        if (loaded && photoAvailability[index] !== false) return index;
      }
      return -1;
    }

    function updateIndicators() {
      indicators.forEach((button, index) => {
        const isActive = index === currentIndex;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
      });
    }

    async function displayPhoto(requestedIndex, immediate = false) {
      const token = ++transitionToken;
      const nextIndex = await findAvailablePhoto((requestedIndex + photoPaths.length) % photoPaths.length);
      if (token !== transitionToken) return;

      if (nextIndex < 0) {
        allPhotosUnavailable = true;
        slideLayers.forEach((layer) => {
          layer.classList.remove("is-active");
          layer.setAttribute("aria-hidden", "true");
          layer.alt = "";
        });
        if (emptyMessage) emptyMessage.hidden = false;
        indicators.forEach((button) => { button.disabled = true; });
        stopAutoplay();
        return;
      }

      if (!immediate && nextIndex === currentIndex && photoAvailability[currentIndex] === true) {
        updateIndicators();
        return;
      }

      const targetLayerIndex = immediate ? activeLayer : 1 - activeLayer;
      const targetLayer = slideLayers[targetLayerIndex];
      targetLayer.src = photoPaths[nextIndex];
      targetLayer.alt = `Mark Joseph Javier, profile photograph ${nextIndex + 1}`;

      let decoded = true;
      if (typeof targetLayer.decode === "function") {
        try { await targetLayer.decode(); }
        catch (error) { decoded = targetLayer.complete && targetLayer.naturalWidth > 0; }
      } else if (!targetLayer.complete) {
        decoded = await new Promise((resolve) => {
          targetLayer.addEventListener("load", () => resolve(true), { once: true });
          targetLayer.addEventListener("error", () => resolve(false), { once: true });
        });
      }
      if (token !== transitionToken) return;

      if (!decoded || targetLayer.naturalWidth === 0) {
        photoAvailability[nextIndex] = false;
        if (indicators[nextIndex]) indicators[nextIndex].disabled = true;
        await displayPhoto(nextIndex + 1, immediate);
        return;
      }

      if (emptyMessage) emptyMessage.hidden = true;
      slideLayers.forEach((layer, index) => {
        const isActive = index === targetLayerIndex;
        layer.classList.toggle("is-active", isActive);
        layer.setAttribute("aria-hidden", String(!isActive));
        if (!isActive) layer.alt = "";
      });
      activeLayer = targetLayerIndex;
      currentIndex = nextIndex;
      updateIndicators();
    }

    function stopAutoplay() {
      if (autoplayTimer !== null) {
        window.clearTimeout(autoplayTimer);
        autoplayTimer = null;
      }
    }

    function startAutoplay() {
      stopAutoplay();
      if (document.hidden || allPhotosUnavailable) return;
      autoplayTimer = window.setTimeout(async () => {
        autoplayTimer = null;
        await displayPhoto((currentIndex + 1) % photoPaths.length);
        startAutoplay();
      }, 3000);
    }

    indicators.forEach((button) => {
      button.addEventListener("click", () => {
        if (button.disabled) return;
        stopAutoplay();
        const selectedIndex = Number(button.dataset.slideTo);
        void displayPhoto(selectedIndex).then(startAutoplay);
      });
    });

    // Avoid running a timer in a background tab; resume the loop when the visitor returns.
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stopAutoplay();
      else startAutoplay();
    });
    window.addEventListener("pagehide", stopAutoplay, { once: true });

    void displayPhoto(0, true).then(startAutoplay);
  }

  // Keep the fixed chat dialog outside section stacking and overflow contexts.
  if (chatPanel && chatPanel.parentElement !== document.body) document.body.append(chatPanel);

  function setTheme(theme) {
    const isDark = theme === "dark";
    root.dataset.theme = isDark ? "dark" : "light";
    themeButton.setAttribute("aria-pressed", String(isDark));
    themeButton.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to night mode");
    document.querySelector('meta[name="theme-color"]').setAttribute("content", isDark ? "#120e20" : "#fbfaff");
  }

  try {
    const savedTheme = localStorage.getItem("mark-portfolio-theme");
    if (savedTheme === "dark" || savedTheme === "light") setTheme(savedTheme);
  } catch (error) {
    // The default light theme still works when storage is unavailable.
  }
  const soundButton = document.querySelector(".nav-sound-toggle");
  const navigationClickSound = new Audio("assets/sounds/nav-click.wav");
  navigationClickSound.preload = "auto";
  navigationClickSound.volume = 0.24;
  let navigationSoundEnabled = true;
  try {
    const savedSoundPreference = localStorage.getItem("mark-portfolio-navigation-sound");
    if (savedSoundPreference === "on") navigationSoundEnabled = true;
    else if (savedSoundPreference === "off") navigationSoundEnabled = false;
  } catch (error) {}

  function updateSoundButton() {
    soundButton.setAttribute("aria-pressed", String(navigationSoundEnabled));
    soundButton.setAttribute("aria-label", navigationSoundEnabled ? "Mute click sounds" : "Enable click sounds");
    soundButton.setAttribute("title", navigationSoundEnabled ? "Mute click sounds" : "Enable click sounds");
  }

  function playNavigationSound(force = false) {
    if (!navigationSoundEnabled && !force) return;
    try {
      // Clone the short click sample so quick successive interactions never cut one another off.
      const clickSample = navigationClickSound.cloneNode();
      clickSample.volume = 0.24;
      const playback = clickSample.play();
      if (playback && typeof playback.catch === "function") playback.catch(() => {});
    } catch (error) {
      // Interactive controls remain fully functional if the browser blocks audio playback.
    }
  }

  updateSoundButton();
  soundButton.addEventListener("click", () => {
    navigationSoundEnabled = !navigationSoundEnabled;
    try { localStorage.setItem("mark-portfolio-navigation-sound", navigationSoundEnabled ? "on" : "off"); } catch (error) {}
    updateSoundButton();
  });

  themeButton.addEventListener("click", () => {
    const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    try { localStorage.setItem("mark-portfolio-theme", nextTheme); } catch (error) {}
  });

  // One delegated handler gives every actual control the same click sound without duplicates.
  const soundableControlSelector = [
    "a[href]", "button:not([disabled])", "input:not([disabled])", "textarea:not([disabled])",
    "select:not([disabled])", "summary", "[role='button']", "[role='tab']", "[role='switch']",
    "[role='menuitem']", "[data-click-sound]"
  ].join(",");
  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target.closest(soundableControlSelector) : null;
    if (!target) return;
    // The sound control itself always gives audible feedback when it is toggled on or off.
    playNavigationSound(target === soundButton || target.closest(".nav-sound-toggle") === soundButton);
  }, true);

  function closeMenu() {
    navigation.classList.remove("is-open");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Open navigation menu");
  }
  menuButton.addEventListener("click", () => {
    const isOpen = menuButton.getAttribute("aria-expanded") !== "true";
    navigation.classList.toggle("is-open", isOpen);
    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuButton.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
  });
  navLinks.forEach((link) => link.addEventListener("click", () => {
    // Let a mobile anchor navigate before hiding the menu that contains it.
    if (window.matchMedia("(max-width: 650px)").matches) {
      window.setTimeout(closeMenu, 0);
      return;
    }
    closeMenu();
  }));
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeMenu(); });
  document.addEventListener("click", (event) => {
    if (!navigation.contains(event.target) && !menuButton.contains(event.target)) closeMenu();
  });

  function updateProgress() {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const percentage = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
    progress.style.width = Math.min(100, Math.max(0, percentage)) + "%";
  }
  window.addEventListener("scroll", updateProgress, { passive: true });
  window.addEventListener("resize", updateProgress);
  updateProgress();

  function updateActiveNavigation() {
    if (!navTargets.length) return;
    const headerHeight = document.querySelector(".site-header")?.getBoundingClientRect().height || 0;
    // Switch navigation once a section is clearly in view, rather than waiting
    // until its heading is almost hidden behind the sticky header.
    const activationLine = headerHeight + Math.max(80, Math.min(220, window.innerHeight * .25));
    let activeTarget = navTargets[0];

    navTargets.forEach((target) => {
      if (target.section.getBoundingClientRect().top <= activationLine) activeTarget = target;
    });
    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
      activeTarget = navTargets[navTargets.length - 1];
    }

    navTargets.forEach(({ link }) => {
      const isActive = link === activeTarget.link;
      link.classList.toggle("is-active", isActive);
      if (isActive) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  }

  let navUpdateQueued = false;
  function scheduleActiveNavigationUpdate() {
    if (navUpdateQueued) return;
    navUpdateQueued = true;
    window.requestAnimationFrame(() => {
      navUpdateQueued = false;
      updateActiveNavigation();
    });
  }
  window.addEventListener("scroll", scheduleActiveNavigationUpdate, { passive: true });
  window.addEventListener("resize", scheduleActiveNavigationUpdate);
  updateActiveNavigation();

  const portfolioTabs = Array.from(document.querySelectorAll("[data-portfolio-tab]"));
  const portfolioPanels = portfolioTabs.map((tab) => document.getElementById(tab.getAttribute("aria-controls")));
  function activatePortfolioTab(tab, moveFocus = false) {
    portfolioTabs.forEach((item) => {
      const isSelected = item === tab;
      item.classList.toggle("is-active", isSelected);
      item.setAttribute("aria-selected", String(isSelected));
      item.tabIndex = isSelected ? 0 : -1;
    });
    portfolioPanels.forEach((panel) => {
      if (!panel) return;
      const isSelected = panel.id === tab.getAttribute("aria-controls");
      panel.hidden = !isSelected;
      panel.classList.remove("is-entering");
      if (isSelected) {
        window.requestAnimationFrame(() => {
          panel.classList.add("is-entering");
          panel.addEventListener("animationend", () => panel.classList.remove("is-entering"), { once: true });
        });
      }
    });
    if (moveFocus) {
      tab.focus();
      tab.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }

  portfolioTabs.forEach((tab, index) => {
    tab.addEventListener("click", () => activatePortfolioTab(tab));
    tab.addEventListener("keydown", (event) => {
      let nextIndex = index;
      if (event.key === "ArrowRight") nextIndex = (index + 1) % portfolioTabs.length;
      else if (event.key === "ArrowLeft") nextIndex = (index - 1 + portfolioTabs.length) % portfolioTabs.length;
      else if (event.key === "Home") nextIndex = 0;
      else if (event.key === "End") nextIndex = portfolioTabs.length - 1;
      else return;
      event.preventDefault();
      activatePortfolioTab(portfolioTabs[nextIndex], true);
    });
  });

  const portfolioHub = document.querySelector("#portfolio");
  const projectListView = document.querySelector("#project-list-view");
  const projectDetailView = document.querySelector("#project-library-detail");
  const projectDetailsOpenButtons = Array.from(document.querySelectorAll("[data-open-project-details]"));
  const projectDetailsCloseButton = document.querySelector("[data-close-project-details]");
  const projectScreenButtons = Array.from(document.querySelectorAll("[data-project-screen]"));
  const projectScreenCaption = document.querySelector("#project-screen-caption");
  const projectCardImageTrigger = document.querySelector("[data-project-card-image-preview]");
  const projectDetailImageTrigger = document.querySelector("[data-project-detail-image-preview]");
  const projectDetailScreenImage = document.querySelector("#project-library-screen-image");
  const projectScreenshotRecords = [
    { title: "Library homepage", preview: "assets/images/projects/library-homepage-screen.png", full: "assets/images/projects/library-homepage-screen.png", width: 1906, height: 827, alt: "Library Management System public homepage" },
    { title: "Librarian dashboard", preview: "assets/images/projects/library-dashboard-screen.png", full: "assets/images/projects/library-dashboard-screen.png", width: 1901, height: 941, alt: "Library Management System librarian dashboard" },
    { title: "Book catalog", preview: "assets/images/projects/library-book-catalog-screen.png", full: "assets/images/projects/library-book-catalog-screen.png", width: 1905, height: 939, alt: "Library Management System book catalog" }
  ];
  let activeProjectScreenIndex = 0;

  function setProjectScreen(index) {
    if (!projectScreenshotRecords.length) return;
    activeProjectScreenIndex = (index + projectScreenshotRecords.length) % projectScreenshotRecords.length;
    const record = projectScreenshotRecords[activeProjectScreenIndex];

    if (projectDetailScreenImage) {
      projectDetailScreenImage.src = record.preview;
      projectDetailScreenImage.alt = record.alt;
      projectDetailScreenImage.width = record.width;
      projectDetailScreenImage.height = record.height;
    }
    if (projectScreenCaption) projectScreenCaption.textContent = record.title;
    projectDetailImageTrigger?.setAttribute("aria-label", `Open the full-size ${record.title} preview`);

    projectScreenButtons.forEach((button) => {
      const isActive = Number(button.dataset.screenIndex) === activeProjectScreenIndex;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  }

  projectScreenButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextIndex = Number(button.dataset.screenIndex);
      if (Number.isInteger(nextIndex)) setProjectScreen(nextIndex);
    });
  });
  projectCardImageTrigger?.addEventListener("click", () => {
    openCertificatePreview(0, projectCardImageTrigger, projectScreenshotRecords, "project");
  });
  projectDetailImageTrigger?.addEventListener("click", () => {
    openCertificatePreview(activeProjectScreenIndex, projectDetailImageTrigger, projectScreenshotRecords, "project");
  });
  setProjectScreen(0);

  function setProjectDetailOpen(isOpen) {
    if (!portfolioHub || !projectListView || !projectDetailView) return;
    projectListView.hidden = isOpen;
    projectDetailView.hidden = !isOpen;
    portfolioHub.classList.toggle("project-detail-open", isOpen);
    projectDetailsOpenButtons.forEach((button) => button.setAttribute("aria-expanded", String(isOpen)));

    const scrollBehavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    window.requestAnimationFrame(() => {
      if (isOpen) {
        projectDetailView.focus({ preventScroll: true });
        projectDetailView.scrollIntoView({ behavior: scrollBehavior, block: "start" });
      } else {
        projectDetailsOpenButtons[0]?.focus({ preventScroll: true });
        portfolioHub.scrollIntoView({ behavior: scrollBehavior, block: "start" });
      }
      scheduleActiveNavigationUpdate();
    });
  }

  projectDetailsOpenButtons.forEach((button) => button.addEventListener("click", () => setProjectDetailOpen(true)));
  projectDetailsCloseButton?.addEventListener("click", () => setProjectDetailOpen(false));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && projectDetailView && !projectDetailView.hidden) setProjectDetailOpen(false);
  });

  const certificatesTab = document.querySelector("#tab-certificates");
  function activateCertificatesFromHash(behavior = "smooth") {
    if (!certificatesTab || window.location.hash !== "#certifications") return;
    if (certificatesTab.getAttribute("aria-selected") !== "true") activatePortfolioTab(certificatesTab);
    window.requestAnimationFrame(() => document.querySelector("#certifications").scrollIntoView({ behavior, block: "start" }));
  }
  window.addEventListener("hashchange", () => activateCertificatesFromHash());
  activateCertificatesFromHash("auto");

  // Add new certificates here with paths to their rendered preview and full-size images.
  const certificateRecords = [
    { title: "Operating Systems Support", preview: "assets/images/certifications/operating-systems-support-preview.png", full: "assets/images/certifications/operating-systems-support-full.png", width: 1100, height: 745 },
    { title: "Operating Systems Basics", preview: "assets/images/certifications/operating-systems-basics-preview.png", full: "assets/images/certifications/operating-systems-basics-full.png", width: 1100, height: 745 },
    { title: "ITS GA 2026", preview: "assets/images/certifications/its-ga-2026-preview.png", full: "assets/images/certifications/its-ga-2026-full.png", width: 779, height: 1100 },
    { title: "Figmagination Certificate", preview: "assets/images/certifications/figmagination-certificate-preview.png", full: "assets/images/certifications/figmagination-certificate-full.png", width: 1100, height: 779 },
    { title: "Certificate of Participation", preview: "assets/images/certifications/certificate-of-participation-preview.png", full: "assets/images/certifications/certificate-of-participation-full.png", width: 779, height: 1100 }
  ];
  const achievementRecords = [
    { title: "Grade 7 – First Quarter", schoolYear: "2019–2020", average: 90, preview: "assets/images/achievements/grade-7-first-quarter-preview.png", full: "assets/images/achievements/grade-7-first-quarter-full.png", width: 2400, height: 1697 },
    { title: "Grade 8 – First Quarter", schoolYear: "2020–2021", average: 92, preview: "assets/images/achievements/grade-8-first-quarter-preview.png", full: "assets/images/achievements/grade-8-first-quarter-full.png", width: 2400, height: 1697 },
    { title: "Grade 9 – First Quarter", schoolYear: "2021–2022", average: 90, preview: "assets/images/achievements/grade-9-first-quarter-preview.png", full: "assets/images/achievements/grade-9-first-quarter-full.png", width: 2400, height: 1697 },
    { title: "Grade 9 – Second Quarter", schoolYear: "2021–2022", average: 91, preview: "assets/images/achievements/grade-9-second-quarter-preview.png", full: "assets/images/achievements/grade-9-second-quarter-full.png", width: 2400, height: 1697 },
    { title: "Grade 10 – First Quarter", schoolYear: "2022–2023", average: 91, preview: "assets/images/achievements/grade-10-first-quarter-preview.png", full: "assets/images/achievements/grade-10-first-quarter-full.png", width: 2400, height: 1697 },
    { title: "Grade 10 – Second Quarter", schoolYear: "2022–2023", average: 93, preview: "assets/images/achievements/grade-10-second-quarter-preview.png", full: "assets/images/achievements/grade-10-second-quarter-full.png", width: 2400, height: 1697 }
  ];
  const certificateGrid = document.querySelector("#certificate-grid");
  const achievementGrid = document.querySelector("#achievement-grid");
  const certificateGalleryActions = document.querySelector("#certificate-gallery-actions");
  const certificateViewMore = document.querySelector("#certificate-view-more");
  const certificateLightbox = document.querySelector("#certificate-lightbox");
  const certificateLightboxTitle = document.querySelector("#certificate-lightbox-title");
  const certificateLightboxImage = document.querySelector("#certificate-lightbox-image");
  const certificateLightboxCount = document.querySelector("#certificate-lightbox-count");
  const certificateLightboxKicker = document.querySelector(".certificate-lightbox-kicker");
  const certificateCloseButton = document.querySelector("#certificate-lightbox-close");
  const certificatePreviousButton = document.querySelector("#certificate-previous");
  const certificateNextButton = document.querySelector("#certificate-next");
  let certificatePreviewIndex = 0;
  let activePreviewRecords = certificateRecords;
  let activePreviewKind = "certificate";
  let certificateReturnFocus = null;
  let certificatesExpanded = false;

  function updateCertificateGallery() {
    certificateGalleryActions.hidden = certificateRecords.length <= 6;
    certificateRecords.forEach((record, index) => {
      const card = document.createElement("article");
      card.className = "certificate-card";
      card.hidden = !certificatesExpanded && index >= 6;

      const preview = document.createElement("div");
      preview.className = "certificate-document-preview";
      const previewImage = document.createElement("img");
      previewImage.src = record.preview;
      previewImage.alt = record.title + " certificate";
      previewImage.width = record.width;
      previewImage.height = record.height;
      previewImage.loading = "lazy";
      previewImage.decoding = "async";
      preview.appendChild(previewImage);

      const copy = document.createElement("div");
      copy.className = "certificate-card-copy";
      const title = document.createElement("h3");
      title.className = "certificate-card-title";
      title.textContent = record.title;
      copy.appendChild(title);

      const openButton = document.createElement("button");
      openButton.className = "certificate-card-trigger";
      openButton.type = "button";
      openButton.setAttribute("aria-label", "Open certificate preview: " + record.title);
      openButton.addEventListener("click", () => openCertificatePreview(index, openButton));

      card.append(preview, copy, openButton);
      certificateGrid.appendChild(card);
    });
    if (certificateRecords.length > 6) updateCertificateViewMore();
  }

  function updateAchievementGallery() {
    achievementRecords.forEach((record, index) => {
      const card = document.createElement("article");
      card.className = "certificate-card achievement-card";

      const preview = document.createElement("div");
      preview.className = "certificate-document-preview";
      const previewImage = document.createElement("img");
      previewImage.src = record.preview;
      previewImage.alt = record.title + " Academic Excellence Award certificate";
      previewImage.width = 1100;
      previewImage.height = 778;
      previewImage.loading = "lazy";
      previewImage.decoding = "async";
      preview.appendChild(previewImage);

      const copy = document.createElement("div");
      copy.className = "certificate-card-copy achievement-card-copy";
      const title = document.createElement("h3");
      title.className = "certificate-card-title";
      title.textContent = record.title;
      const details = document.createElement("p");
      details.className = "achievement-card-meta";
      details.textContent = record.schoolYear + " · Quarterly average: " + record.average;
      copy.append(title, details);

      const openButton = document.createElement("button");
      openButton.className = "certificate-card-trigger";
      openButton.type = "button";
      openButton.setAttribute("aria-label", "Open achievement preview: " + record.title);
      openButton.addEventListener("click", () => openCertificatePreview(index, openButton, achievementRecords, "achievement"));

      card.append(preview, copy, openButton);
      achievementGrid.appendChild(card);
    });
  }

  function updateCertificateViewMore() {
    certificateGrid.querySelectorAll(".certificate-card").forEach((card, index) => {
      card.hidden = !certificatesExpanded && index >= 6;
    });
    certificateViewMore.querySelector("span").textContent = certificatesExpanded ? "Show Less" : "View More";
    certificateViewMore.setAttribute("aria-expanded", String(certificatesExpanded));
  }

  function updateCertificatePreview(index) {
    certificatePreviewIndex = Math.min(activePreviewRecords.length - 1, Math.max(0, index));
    const record = activePreviewRecords[certificatePreviewIndex];
    certificateLightboxTitle.textContent = record.title;
    const imageKind = activePreviewKind === "project" ? "project screenshot" : activePreviewKind === "achievement" ? "achievement" : "certificate";
    certificateLightboxImage.alt = `Full-size ${imageKind} preview: ${record.title}`;
    certificateLightboxImage.width = record.width;
    certificateLightboxImage.height = record.height;
    certificateLightboxImage.src = record.full;
    certificateLightboxCount.textContent = (certificatePreviewIndex + 1) + " / " + activePreviewRecords.length;
    certificatePreviousButton.disabled = certificatePreviewIndex === 0;
    certificateNextButton.disabled = certificatePreviewIndex === activePreviewRecords.length - 1;
    const previewLabel = activePreviewKind === "project" ? "project image" : activePreviewKind === "achievement" ? "achievement" : "certificate";
    certificateLightboxKicker.textContent = activePreviewKind === "project" ? "PROJECT IMAGE PREVIEW" : activePreviewKind === "achievement" ? "ACHIEVEMENT PREVIEW" : "CERTIFICATE PREVIEW";
    certificateCloseButton.setAttribute("aria-label", "Close " + previewLabel + " preview");
    certificatePreviousButton.setAttribute("aria-label", "Previous " + previewLabel);
    certificateNextButton.setAttribute("aria-label", "Next " + previewLabel);
  }

  function openCertificatePreview(index, trigger, records = certificateRecords, kind = "certificate") {
    certificateReturnFocus = trigger;
    activePreviewRecords = records;
    activePreviewKind = kind;
    updateCertificatePreview(index);
    certificateLightbox.hidden = false;
    root.classList.add("certificate-modal-open");
    window.requestAnimationFrame(() => certificateCloseButton.focus());
  }

  function closeCertificatePreview() {
    if (certificateLightbox.hidden) return;
    certificateLightbox.hidden = true;
    root.classList.remove("certificate-modal-open");
    certificateLightboxImage.removeAttribute("src");
    if (certificateReturnFocus && certificateReturnFocus.isConnected) certificateReturnFocus.focus();
  }

  if (certificateRecords.length) updateCertificateGallery();
  if (achievementRecords.length) updateAchievementGallery();
  certificateViewMore.addEventListener("click", () => {
    certificatesExpanded = !certificatesExpanded;
    updateCertificateViewMore();
    if (!certificatesExpanded) document.querySelector("#certifications").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  certificateCloseButton.addEventListener("click", closeCertificatePreview);
  certificatePreviousButton.addEventListener("click", () => updateCertificatePreview(certificatePreviewIndex - 1));
  certificateNextButton.addEventListener("click", () => updateCertificatePreview(certificatePreviewIndex + 1));
  certificateLightbox.addEventListener("click", (event) => {
    if (event.target === certificateLightbox || event.target.classList.contains("certificate-lightbox-backdrop")) closeCertificatePreview();
  });
  document.addEventListener("keydown", (event) => {
    if (certificateLightbox.hidden) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeCertificatePreview();
    } else if (event.key === "ArrowLeft" && certificatePreviewIndex > 0) {
      event.preventDefault();
      updateCertificatePreview(certificatePreviewIndex - 1);
    } else if (event.key === "ArrowRight" && certificatePreviewIndex < activePreviewRecords.length - 1) {
      event.preventDefault();
      updateCertificatePreview(certificatePreviewIndex + 1);
    } else if (event.key === "Tab") {
      const focusable = Array.from(certificateLightbox.querySelectorAll('button:not([disabled])'));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  cvButton.addEventListener("click", () => { cvNote.hidden = false; });
  const whatsappButton = document.querySelector(".whatsapp-button[data-whatsapp-url]");
  if (whatsappButton) {
    const whatsappUrl = whatsappButton.dataset.whatsappUrl.trim();
    if (whatsappUrl) {
      try {
        const url = new URL(whatsappUrl);
        if (url.protocol === "https:") {
          whatsappButton.href = url.href;
          whatsappButton.target = "_blank";
          whatsappButton.rel = "noopener noreferrer";
          whatsappButton.removeAttribute("aria-disabled");
          whatsappButton.removeAttribute("tabindex");
          whatsappButton.setAttribute("aria-label", "Message me on WhatsApp");
        }
      } catch (error) {
        // Keep an invalid WhatsApp destination inactive.
      }
    }
  }
  document.querySelectorAll(".social-icon-link[data-profile-url]").forEach((card) => {
    const profileUrl = card.dataset.profileUrl.trim();
    if (!profileUrl) return;
    if (card.dataset.socialType === "email") {
      if (!/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(profileUrl)) return;
      card.href = profileUrl;
      card.removeAttribute("aria-disabled");
      card.removeAttribute("tabindex");
      return;
    }
    try {
      const url = new URL(profileUrl);
      if (url.protocol !== "https:") return;
      card.href = url.href;
      card.target = "_blank";
      card.rel = "noopener noreferrer";
      card.removeAttribute("aria-disabled");
      card.removeAttribute("tabindex");
    } catch (error) {
      // Leave invalid or missing profile placeholders inactive.
    }
  });

  const fields = [
    { input: document.querySelector("#contact-name"), error: document.querySelector("#name-error"), label: "Name" },
    { input: document.querySelector("#contact-phone"), error: document.querySelector("#phone-error"), label: "Phone" },
    { input: document.querySelector("#contact-email"), error: document.querySelector("#email-error"), label: "Email" },
    { input: document.querySelector("#contact-subject"), error: document.querySelector("#subject-error"), label: "Subject" },
    { input: document.querySelector("#contact-message"), error: document.querySelector("#message-error"), label: "Your Message" }
  ];

  let isChatPanelClosing = false;
  const modalFocusableSelector = 'button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])';

  function setChatPanelOpen(isOpen) {
    if (isOpen) {
      if (!chatPanel.hidden && !isChatPanelClosing) return;
      isChatPanelClosing = false;
      chatPanel.hidden = false;
      chatPanel.classList.remove("is-closing");
      document.documentElement.classList.add("contact-modal-open");
      chatButton.setAttribute("aria-expanded", "true");
      chatButton.setAttribute("aria-label", "Close contact form");
      window.requestAnimationFrame(() => chatPanel.focus());
      return;
    }

    if (chatPanel.hidden || isChatPanelClosing) return;
    isChatPanelClosing = true;
    chatButton.setAttribute("aria-expanded", "false");
    chatButton.setAttribute("aria-label", "Open contact form");
    chatPanel.classList.add("is-closing");
  }

  function finishChatPanelClose() {
    if (!isChatPanelClosing) return;
    chatPanel.hidden = true;
    chatPanel.classList.remove("is-closing");
    document.documentElement.classList.remove("contact-modal-open");
    isChatPanelClosing = false;
    chatButton.focus();
  }

  chatButton.addEventListener("click", () => setChatPanelOpen(chatPanel.hidden));
  chatCloseButton.addEventListener("click", () => setChatPanelOpen(false));
  chatPanel.addEventListener("click", (event) => {
    if (event.target === chatPanel) setChatPanelOpen(false);
  });
  chatPanel.addEventListener("animationend", (event) => {
    if (event.target === chatPanel && chatPanel.classList.contains("is-closing")) finishChatPanelClose();
  });
  document.addEventListener("keydown", (event) => {
    if (chatPanel.hidden) return;
    if (event.key === "Escape") {
      event.preventDefault();
      setChatPanelOpen(false);
      return;
    }
    if (event.key !== "Tab") return;
    const focusableElements = Array.from(chatPanel.querySelectorAll(modalFocusableSelector));
    if (!focusableElements.length) {
      event.preventDefault();
      chatPanel.focus();
      return;
    }
    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];
    const currentIndex = focusableElements.indexOf(document.activeElement);
    if (event.shiftKey && currentIndex <= 0) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && currentIndex === -1) {
      event.preventDefault();
      first.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  function setFormStatus(message, kind = "") {
    formStatus.textContent = message;
    formStatus.classList.toggle("is-error", kind === "error");
    formStatus.classList.toggle("is-success", kind === "success");
  }

  function validateField(field) {
    const value = field.input.value.trim();
    let message = "";
    if (!value) message = field.label + " is required.";
    else if (field.input.id === "contact-name" && (!/^[A-Za-zÀ-ÖØ-öø-ÿĀ-ž'’ .-]+$/u.test(value) || !/[A-Za-zÀ-ÖØ-öø-ÿĀ-ž]/u.test(value))) message = "Use letters only for your name.";
    else if (field.input.id === "contact-subject" && !/^[\p{L}][\p{L}\s]*$/u.test(value)) message = "Use letters only for the subject. Numbers are not allowed.";
    else if (field.input.id === "contact-phone" && !/^\d{7,15}$/.test(value)) message = "Enter a phone number using 7 to 15 digits.";
    else if (field.input.type === "email" && field.input.validity.typeMismatch) message = "Enter a valid email address.";
    field.error.textContent = message;
    field.input.setAttribute("aria-invalid", String(Boolean(message)));
    return !message;
  }

  function sanitizeContactField(field) {
    const { input } = field;
    if (input.id !== "contact-name" && input.id !== "contact-phone" && input.id !== "contact-subject") return;
    const original = input.value;
    const caret = input.selectionStart ?? original.length;
    const sanitize = input.id === "contact-name"
      ? (value) => value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿĀ-ž'’ .-]/gu, "").slice(0, 80)
      : input.id === "contact-phone"
        ? (value) => value.replace(/\D/g, "").slice(0, 15)
        : (value) => value.replace(/[^\p{L}\s]/gu, "").replace(/\s{2,}/g, " ").slice(0, 80);
    const cleaned = sanitize(original);
    if (cleaned === original) return;
    input.value = cleaned;
    const nextCaret = Math.min(sanitize(original.slice(0, caret)).length, cleaned.length);
    input.setSelectionRange(nextCaret, nextCaret);
  }

  fields.forEach((field) => {
    field.input.addEventListener("input", () => {
      sanitizeContactField(field);
      if (field.input.getAttribute("aria-invalid") === "true") validateField(field);
      setFormStatus("");
    });
  });

  let isSubmitting = false;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    setFormStatus("");
    const invalidField = fields.find((field) => !validateField(field));
    if (invalidField) {
      setFormStatus("Please check the highlighted fields.", "error");
      invalidField.input.focus();
      return;
    }

    const endpoint = form.dataset.endpoint.trim();
    const recipient = form.dataset.recipient.trim();
    if (!endpoint && !recipient) {
      setFormStatus("Message delivery is not configured yet. Add a form service endpoint or recipient email to enable sending.", "error");
      return;
    }

    const submitButton = form.querySelector("[type=submit]");
    const submitLabel = submitButton.querySelector(".submit-label");
    isSubmitting = true;
    submitButton.disabled = true;
    submitLabel.textContent = "Sending…";
    try {
      if (endpoint) {
        const response = await fetch(endpoint, {
          method: "POST",
          body: new FormData(form),
          headers: { Accept: "application/json" }
        });
        if (!response.ok) throw new Error("Message delivery failed.");
        setFormStatus("Your message was sent successfully.", "success");
        form.reset();
        fields.forEach((field) => {
          field.error.textContent = "";
          field.input.removeAttribute("aria-invalid");
        });
      } else {
        const values = Object.fromEntries(fields.map(({ input }) => [input.name, input.value.trim()]));
        const subject = encodeURIComponent(values.subject);
        const body = encodeURIComponent("Name: " + values.name + "\nPhone: " + values.phone + "\nEmail: " + values.email + "\n\n" + values.message);
        window.location.href = "mailto:" + encodeURI(recipient) + "?subject=" + subject + "&body=" + body;
        setFormStatus("Your email app is opening with a draft. Review it and send the message there.", "success");
      }
    } catch (error) {
      setFormStatus("Your message could not be sent. Check your connection or try again later.", "error");
    } finally {
      isSubmitting = false;
      submitButton.disabled = false;
      submitLabel.textContent = "Send Message";
    }
  });


  // Progressive motion enhancements. All effects are disabled for reduced-motion users.
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  // Reveal major content blocks as they enter the viewport.
  if (!prefersReducedMotion && "IntersectionObserver" in window) {
    const revealTargets = document.querySelectorAll(
      ".hero-copy, .hero-visual, .about-intro, .education, .about-list-panel, .value-card, .portfolio-project-card, .tech-card, .contact-connect, .site-footer"
    );
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-revealed");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -38px 0px" });

    revealTargets.forEach((element, index) => {
      element.classList.add("scroll-reveal");
      element.style.setProperty("--reveal-delay", `${(index % 4) * 65}ms`);
      revealObserver.observe(element);
    });
  }

  // Pointer-driven 3D tilt for project cards. Native touch scrolling remains unaffected.
  if (!prefersReducedMotion && finePointer) {
    document.querySelectorAll("[data-tilt-card]").forEach((card) => {
      let frame = 0;
      let pointerX = 0;
      let pointerY = 0;
      const updateTilt = () => {
        const bounds = card.getBoundingClientRect();
        const x = Math.min(1, Math.max(0, (pointerX - bounds.left) / bounds.width));
        const y = Math.min(1, Math.max(0, (pointerY - bounds.top) / bounds.height));
        const rotateY = (x - 0.5) * 7;
        const rotateX = (0.5 - y) * 5;
        card.style.setProperty("--tilt-rx", `${rotateX.toFixed(2)}deg`);
        card.style.setProperty("--tilt-ry", `${rotateY.toFixed(2)}deg`);
        card.style.setProperty("--shine-x", `${(x * 100).toFixed(1)}%`);
        card.style.setProperty("--shine-y", `${(y * 100).toFixed(1)}%`);
        frame = 0;
      };
      card.addEventListener("pointermove", (event) => {
        if (event.pointerType !== "mouse") return;
        pointerX = event.clientX;
        pointerY = event.clientY;
        card.classList.add("is-tilting");
        if (!frame) frame = window.requestAnimationFrame(updateTilt);
      }, { passive: true });
      card.addEventListener("pointerleave", () => {
        if (frame) window.cancelAnimationFrame(frame);
        frame = 0;
        card.classList.remove("is-tilting");
        card.style.removeProperty("--tilt-rx");
        card.style.removeProperty("--tilt-ry");
        card.style.removeProperty("--shine-x");
        card.style.removeProperty("--shine-y");
      });
    });
  }

  // A subtle decorative cursor halo for mouse users; the browser cursor is kept visible.
  const cursorAura = document.querySelector(".cursor-aura");
  if (cursorAura && !prefersReducedMotion && finePointer) {
    let cursorFrame = 0;
    let cursorX = -100;
    let cursorY = -100;
    document.addEventListener("pointermove", (event) => {
      if (event.pointerType !== "mouse") return;
      cursorX = event.clientX;
      cursorY = event.clientY;
      cursorAura.classList.add("is-visible");
      if (cursorFrame) return;
      cursorFrame = window.requestAnimationFrame(() => {
        cursorAura.style.transform = `translate3d(${cursorX}px,${cursorY}px,0) translate(-50%,-50%)`;
        cursorFrame = 0;
      });
    }, { passive: true });
    document.addEventListener("pointerleave", () => cursorAura.classList.remove("is-visible"));
    document.querySelectorAll("a, button, summary, [role='tab']").forEach((element) => {
      element.addEventListener("pointerenter", () => cursorAura.classList.add("is-hovering"));
      element.addEventListener("pointerleave", () => cursorAura.classList.remove("is-hovering"));
    });
  }

})();
