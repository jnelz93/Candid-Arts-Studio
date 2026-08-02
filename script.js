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
      const response = await fetch(formAction, {
        method: "POST",
        body: new FormData(contactForm),
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
