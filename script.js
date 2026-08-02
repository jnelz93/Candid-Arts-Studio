(function () {
  "use strict";

  const nav = document.getElementById("site-nav");
  const navToggle = document.getElementById("nav-toggle");
  const navMenu = document.getElementById("nav-menu");
  const navLinks = document.querySelectorAll(".nav-menu a");
  const sections = document.querySelectorAll("section[id], header[id]");
  const fadeElements = document.querySelectorAll(".fade-in");
  const gallery = document.getElementById("gallery");
  const lightbox = document.getElementById("lightbox");
  const lightboxImage = document.getElementById("lightbox-image");
  const lightboxClose = document.getElementById("lightbox-close");
  const lightboxPrev = document.getElementById("lightbox-prev");
  const lightboxNext = document.getElementById("lightbox-next");
  const contactForm = document.getElementById("contact-form");
  const formStatus = document.getElementById("form-status");
  const submitBtn = document.getElementById("submit-btn");

  let galleryImages = [];
  let currentLightboxIndex = 0;

  // ---- Mobile nav toggle ----

  function closeNav() {
    navMenu.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("nav-open");
  }

  function openNav() {
    navMenu.classList.add("open");
    navToggle.setAttribute("aria-expanded", "true");
    document.body.classList.add("nav-open");
  }

  navToggle.addEventListener("click", function () {
    const isOpen = navMenu.classList.contains("open");
    if (isOpen) {
      closeNav();
    } else {
      openNav();
    }
  });

  navLinks.forEach(function (link) {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute("href"));
      if (target) {
        target.scrollIntoView({ behavior: "smooth" });
      }
      closeNav();
    });
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeNav();
      closeLightbox();
    }
  });

  // ---- Sticky nav shadow ----

  window.addEventListener("scroll", function () {
    if (window.scrollY > 50) {
      nav.classList.add("scrolled");
    } else {
      nav.classList.remove("scrolled");
    }
    updateActiveNavLink();
  });

  // ---- Active nav link ----

  function updateActiveNavLink() {
    const scrollPos = window.scrollY + nav.offsetHeight + 20;
    let current = "";

    sections.forEach(function (section) {
      if (section.offsetTop <= scrollPos) {
        current = section.getAttribute("id");
      }
    });

    navLinks.forEach(function (link) {
      link.classList.remove("active");
      if (link.getAttribute("href") === "#" + current) {
        link.classList.add("active");
      }
    });
  }

  // ---- Fade-in on scroll ----

  if ("IntersectionObserver" in window) {
    const fadeObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            fadeObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );

    fadeElements.forEach(function (el) {
      fadeObserver.observe(el);
    });
  } else {
    fadeElements.forEach(function (el) {
      el.classList.add("visible");
    });
  }

  // ---- Portfolio lightbox ----

  function buildGalleryImages() {
    galleryImages = Array.from(gallery.querySelectorAll(".gallery-item img")).map(function (img) {
      return { src: img.src, alt: img.alt };
    });
  }

  function openLightbox(index) {
    buildGalleryImages();
    currentLightboxIndex = index;
    lightboxImage.src = galleryImages[index].src;
    lightboxImage.alt = galleryImages[index].alt;
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
    lightboxClose.focus();
  }

  function closeLightbox() {
    lightbox.hidden = true;
    document.body.style.overflow = "";
    lightboxImage.src = "";
  }

  function showPrevImage() {
    currentLightboxIndex = (currentLightboxIndex - 1 + galleryImages.length) % galleryImages.length;
    lightboxImage.src = galleryImages[currentLightboxIndex].src;
    lightboxImage.alt = galleryImages[currentLightboxIndex].alt;
  }

  function showNextImage() {
    currentLightboxIndex = (currentLightboxIndex + 1) % galleryImages.length;
    lightboxImage.src = galleryImages[currentLightboxIndex].src;
    lightboxImage.alt = galleryImages[currentLightboxIndex].alt;
  }

  // ---- Portfolio event modal (load from /data/<slug>.json) ----
  const portfolioModal = document.getElementById('portfolio-modal');
  const portfolioModalClose = document.getElementById('portfolio-modal-close');
  const portfolioModalTitle = document.getElementById('portfolio-modal-title');
  const portfolioSections = document.getElementById('portfolio-sections');
  const portfolioContent = document.getElementById('portfolio-content');

  async function openPortfolio(slug) {
    try {
      const res = await fetch('/data/' + slug + '.json');
      if (!res.ok) throw new Error('Failed to load gallery data');
      const data = await res.json();
      portfolioModalTitle.textContent = data.title || slug;
      portfolioSections.innerHTML = '';
      portfolioContent.innerHTML = '';

      const sections = Object.keys(data.galleries || {});
      if (sections.length === 0) {
        portfolioContent.innerHTML = '<p>No content available.</p>';
      }

      sections.forEach(function (name, idx) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = name;
        btn.addEventListener('click', function () { renderSection(data.galleries[name], name); setActiveSection(btn); });
        portfolioSections.appendChild(btn);
        if (idx === 0) { btn.classList.add('active'); renderSection(data.galleries[name], name); }
      });

      portfolioModal.hidden = false;
      portfolioModal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    } catch (err) {
      alert('Unable to load gallery: ' + err.message);
    }
  }

  function setActiveSection(btn) {
    Array.from(portfolioSections.children).forEach(function (b) { b.classList.remove('active'); });
    btn.classList.add('active');
  }

  function renderSection(items, name) {
    portfolioContent.innerHTML = '';
    if (!items || items.length === 0) { portfolioContent.innerHTML = '<p>No items in this section.</p>'; return; }

    items.forEach(function (path) {
      const ext = path.split('.').pop().toLowerCase();
      if (['mp4','webm','ogg'].includes(ext)) {
        const video = document.createElement('video');
        video.src = encodeURI(path);
        video.controls = true;
        video.loading = 'lazy';
        portfolioContent.appendChild(video);
      } else {
        const img = document.createElement('img');
        img.src = encodeURI(path);
        img.alt = name + ' image';
        img.loading = 'lazy';
        img.addEventListener('click', function () { openLightboxFromSrc(img.src, img.alt); });
        portfolioContent.appendChild(img);
      }
    });
  }

  function openLightboxFromSrc(src, alt) {
    // populate galleryImages temporarily and open lightbox at index 0
    galleryImages = [{ src: src, alt: alt }];
    currentLightboxIndex = 0;
    lightboxImage.src = src;
    lightboxImage.alt = alt;
    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  portfolioModalClose.addEventListener('click', function () {
    portfolioModal.hidden = true;
    portfolioModal.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
    portfolioContent.innerHTML = '';
    portfolioSections.innerHTML = '';
  });

  // Listen for gallery items that open event galleries
  gallery.addEventListener('click', function (e) {
    const item = e.target.closest('.gallery-item');
    if (!item) return;
    const slug = item.dataset.gallery;
    if (slug) {
      openPortfolio(slug);
      return;
    }
    // existing behavior for lightbox
    openLightbox(parseInt(item.dataset.index, 10));
  });

  gallery.addEventListener("click", function (e) {
    const item = e.target.closest(".gallery-item");
    if (!item) return;
    openLightbox(parseInt(item.dataset.index, 10));
  });

  lightboxClose.addEventListener("click", closeLightbox);
  lightboxPrev.addEventListener("click", showPrevImage);
  lightboxNext.addEventListener("click", showNextImage);

  lightbox.addEventListener("click", function (e) {
    if (e.target === lightbox) {
      closeLightbox();
    }
  });

  document.addEventListener("keydown", function (e) {
    if (lightbox.hidden) return;
    if (e.key === "ArrowLeft") showPrevImage();
    if (e.key === "ArrowRight") showNextImage();
  });

  // ---- Contact form ----

  const FORMSPREE_PLACEHOLDER = "YOUR_FORM_ID";

  function validateField(field) {
    const errorEl = document.getElementById(field.id + "-error");
    let message = "";

    if (field.required && !field.value.trim()) {
      message = "This field is required.";
    } else if (field.type === "email" && field.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value)) {
      message = "Please enter a valid email address.";
      } else if (field.type === "tel" && field.value && !/^[0-9+()\-\s]{7,20}$/.test(field.value)) {
        message = "Please enter a valid contact number.";
      }

      field.classList.toggle("error", !!message);
      if (errorEl) errorEl.textContent = message;
      return !message;
    }

  function validateForm() {
    const fields = contactForm.querySelectorAll("input, textarea");
    let valid = true;
    fields.forEach(function (field) {
      if (!validateField(field)) valid = false;
    });
    return valid;
  }

  contactForm.querySelectorAll("input, textarea").forEach(function (field) {
    field.addEventListener("blur", function () {
      validateField(field);
    });
  });

  contactForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    formStatus.textContent = "";
    formStatus.className = "form-status";

    if (!validateForm()) return;

    const formAction = contactForm.getAttribute("action");
    if (formAction.includes(FORMSPREE_PLACEHOLDER)) {
      formStatus.textContent =
        "Form is not yet connected. Replace YOUR_FORM_ID in index.html with your Formspree form ID.";
      formStatus.classList.add("error");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Sending…";

    try {
      const formData = new FormData(contactForm);
      // include phone explicitly if present
      if (!formData.get('phone') && document.getElementById('phone')) {
        formData.append('phone', document.getElementById('phone').value);
      }

      const response = await fetch(formAction, {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" },
      });

      if (response.ok) {
        formStatus.textContent = "Thank you! We'll reply to you soon.";
        formStatus.classList.add("success");
        contactForm.reset();
      } else {
        const data = await response.json();
        formStatus.textContent = data.error || "Something went wrong. Please try again.";
        formStatus.classList.add("error");
      }
    } catch {
      formStatus.textContent = "Network error. Please check your connection and try again.";
      formStatus.classList.add("error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Send Message";
    }
  });

  // Initial active nav state
  updateActiveNavLink();
})();
