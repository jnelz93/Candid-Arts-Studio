(function () {
  "use strict";

  const nav = document.getElementById("site-nav");
  const navToggle = document.getElementById("nav-toggle");
  const navMenu = document.getElementById("nav-menu");
  const navLinks = document.querySelectorAll(".nav-menu a");
  const sections = document.querySelectorAll("section[id], header[id]");
  const fadeElements = document.querySelectorAll(".fade-in");
  const gallery = document.getElementById("gallery-grid");
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

  // ---- Gallery modal & data-driven galleries ----
  // gallery-choices removed; client-first UI renders clients immediately
  const galleryGrid = document.getElementById('gallery-grid');
  const galleryModal = document.getElementById('gallery-modal');
  const galleryModalClose = document.getElementById('gallery-modal-close');
  const galleryModalTitle = document.getElementById('gallery-modal-title');
  const gallerySections = document.getElementById('gallery-sections');
  const galleryContent = document.getElementById('gallery-content');

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeNav();
      // Prefer closing lightbox first if open, otherwise close gallery modal
      if (typeof lightbox !== 'undefined' && !lightbox.hidden) {
        closeLightbox();
        return;
      }
      if (galleryModal && !galleryModal.hidden) {
        galleryModal.hidden = true;
        galleryModal.setAttribute('aria-hidden','true');
        document.body.style.overflow = '';
        clearEl(galleryContent);
        clearEl(gallerySections);
        return;
      }
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

  // ---- Gallery lightbox ----

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
    lightboxImage.src = "";
    // If gallery modal is still open, keep body overflow locked; otherwise restore scrolling
    if (typeof galleryModal !== 'undefined' && galleryModal && !galleryModal.hidden) {
      document.body.style.overflow = 'hidden';
      // return focus to modal close button for accessibility
      if (galleryModalClose) galleryModalClose.focus();
    } else {
      document.body.style.overflow = '';
    }
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


  // state holders
  let currentClients = null; // object mapping clientName -> folders
  let currentType = null; // 'images' or 'videos'
  let currentModalImages = null; // images currently displayed inside client modal (for lightbox navigation)

  function encodePath(p) { return p.replace(/\\/g, '/').split('/').map(encodeURIComponent).join('/'); }

  async function fetchJSON(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error('Failed to load: ' + path);
    return res.json();
  }

  function clearEl(el) { el.innerHTML = ''; }

  function imageExists(url) {
    return new Promise(function (resolve) {
      const img = new Image();
      img.onload = function () { resolve(true); };
      img.onerror = function () { resolve(false); };
      img.src = url;
    });
  }

  function openLightboxFromSrc(src, alt) {
    // If a client modal is open and has a photo grid, use that set for navigation
    if (currentModalImages && currentModalImages.length > 0) {
      galleryImages = currentModalImages.slice();
      // find index by matching full URL or trailing path
      currentLightboxIndex = galleryImages.findIndex(function (g) { return g.src === src || g.src.endsWith(src) || src.endsWith(g.src); });
      if (currentLightboxIndex === -1) currentLightboxIndex = 0;
    } else {
      // fallback: single-image array
      galleryImages = [{ src: src, alt: alt }];
      currentLightboxIndex = 0;
    }

    lightboxImage.src = galleryImages[currentLightboxIndex].src;
    lightboxImage.alt = galleryImages[currentLightboxIndex].alt || '';
    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
    if (lightboxClose) lightboxClose.focus();
  }


  async function loadImageClients() {
    try {
      const data = await fetchJSON('/data/gallery-images.json');
      currentClients = data.clients || {};
      currentType = 'images';
      renderClients(currentClients, 'images');
    } catch (err) {
      galleryGrid.innerHTML = '<p class="section-intro">No image gallery index found. Run generate-gallery-index.ps1 to build one.</p>';
      console.warn(err);
    }
  }

  async function loadVideoClients() {
    try {
      const data = await fetchJSON('/data/gallery-videos.json');
      currentClients = data.clients || {};
      currentType = 'videos';
      renderClients(currentClients, 'videos');
    } catch (err) {
      galleryGrid.innerHTML = '<p class="section-intro">No video gallery index found. Run generate-gallery-index.ps1 to build one.</p>';
      console.warn(err);
    }
  }

  function renderClients(clients, type) {
    clearEl(galleryGrid);
    const names = Object.keys(clients || {});
    if (names.length === 0) {
      galleryGrid.innerHTML = '<p class="section-intro">No clients found.</p>';
      return;
    }

    names.forEach(function (client) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'gallery-item client-card';
      card.dataset.client = client;
      card.dataset.type = type;

      // compute thumbnail path (use provided _thumb or fallback)
      let thumbPath = (clients[client] && clients[client]._thumb) ? clients[client]._thumb : 'images/banner.jpg';
      // normalize backslashes and encode each path segment so spaces & ampersands are safe
      thumbPath = thumbPath.replace(/\\/g, '/').split('/').map(encodeURIComponent).join('/');

      card.innerHTML = `
        <div style="position:relative">
          <img src="${thumbPath}" alt="${client}">
          <div style=\"position:absolute;left:12px;bottom:12px;color:#fff;font-weight:700;text-shadow:0 2px 6px rgba(0,0,0,0.7)\">${client}</div>
        </div>
      `;

      galleryGrid.appendChild(card);
    });
  }

  function openClientModal(clientName, clientData) {
    // clientData is an object with folder keys; ignore keys starting with '_'
    galleryModalTitle.textContent = clientName;
    clearEl(gallerySections);
    clearEl(galleryContent);

    // Prepare photo list and video list (flatten across folders, ignoring metadata keys)
    let photoList = [];
    let videoList = [];
    Object.keys(clientData || {}).forEach(function (k) {
      if (k.startsWith('_')) return; // skip metadata
      const items = clientData[k] || [];
      items.forEach(function (p) {
        const ext = p.split('.').pop().toLowerCase();
        if (['mp4','webm','ogg','mov'].includes(ext)) videoList.push(p);
        else photoList.push(p);
      });
    });

    // Defensive dedupe in case generator JSON contains duplicates
    photoList = Array.from(new Set(photoList));
    videoList = Array.from(new Set(videoList));

    // PHOTO SECTION
    const photoCount = photoList.length;
    const safeId = 'g-' + clientName.replace(/[^a-z0-9\-]/gi, '-');
    const photosHeader = document.createElement('h4');
    photosHeader.textContent = `Photos (${photoCount})`;
    // mark header with safe id for internal navigation
    photosHeader.id = safeId + '-photos';
    galleryContent.appendChild(photosHeader);

    // create quick navigation (Photos / Videos) under the title
    gallerySections.innerHTML = '';
    const photosBtn = document.createElement('button');
    photosBtn.type = 'button';
    photosBtn.className = '';
    photosBtn.textContent = 'Photos';
    photosBtn.addEventListener('click', function(){
      document.getElementById(safeId + '-photos').scrollIntoView({behavior:'smooth', block:'start'});
      photosBtn.classList.add('active'); videosBtn.classList.remove('active');
    });
    const videosBtn = document.createElement('button');
    videosBtn.type = 'button';
    videosBtn.className = '';
    videosBtn.textContent = 'Videos';
    videosBtn.addEventListener('click', function(){
      document.getElementById(safeId + '-videos').scrollIntoView({behavior:'smooth', block:'start'});
      videosBtn.classList.add('active'); photosBtn.classList.remove('active');
    });
    gallerySections.appendChild(photosBtn);
    gallerySections.appendChild(videosBtn);
    // default to Photos active
    photosBtn.classList.add('active');

    const photoGrid = document.createElement('div');
    photoGrid.className = 'gallery-client-photos';
    galleryContent.appendChild(photoGrid);

    const loadMoreBtn = document.createElement('button');
    loadMoreBtn.className = 'load-more btn btn-outline';
    loadMoreBtn.textContent = 'Load More';
    loadMoreBtn.setAttribute('aria-label', 'Load more photos');
    // ensure Load More sits below the photo grid and is centered
    loadMoreBtn.style.display = 'block';
    loadMoreBtn.style.margin = '12px auto 0';
    let photosPerPage = 30;
    let photoIndex = 0;

    function renderNextPhotos() {
      const slice = photoList.slice(photoIndex, photoIndex + photosPerPage);
      slice.forEach(function (relPath) {
        const img = document.createElement('img');
        img.loading = 'lazy';
        img.alt = clientName + ' image';
        img.src = encodePath(relPath);
        img.addEventListener('click', function () { openLightboxFromSrc(img.src, img.alt); });
        img.addEventListener('error', function () { item.remove(); });
        // wrap in masonry item for grid spanning
        const item = document.createElement('div');
        item.className = 'masonry-item';
        item.appendChild(img);
        photoGrid.appendChild(item);
      });
      photoIndex += slice.length;
      // update currentModalImages for lightbox navigation
      currentModalImages = Array.from(photoGrid.querySelectorAll('img')).map(function(i){ return { src: i.src, alt: i.alt }; });
      if (photoIndex >= photoList.length) loadMoreBtn.style.display = 'none';
    }

    if (photoList.length === 0) {
      const p = document.createElement('p'); p.textContent = 'No photos available.'; galleryContent.appendChild(p);
    } else {
      renderNextPhotos();
      galleryContent.appendChild(loadMoreBtn);
      loadMoreBtn.addEventListener('click', renderNextPhotos);
    }

    // VIDEO SECTION
    const videoHeader = document.createElement('h4');
    videoHeader.style.marginTop = '18px';
    videoHeader.textContent = `Videos (${videoList.length})`;
    videoHeader.id = safeId + '-videos';
    galleryContent.appendChild(videoHeader);

    const playerArea = document.createElement('div');
    playerArea.className = 'video-player';
    galleryContent.appendChild(playerArea);

    if (videoList.length === 0) {
      const p = document.createElement('p'); p.textContent = 'No videos available.'; galleryContent.appendChild(p);
    } else {
      const list = document.createElement('div');
      list.className = 'video-list';
      // Render videos (generator contains only existing files) — no availability checks


      videoList.forEach(function (relPath) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'video-item btn btn-outline';
          // display filename without extension
          const parts = relPath.replace(/\\/g,'/').split('/');
          const file = parts[parts.length - 1];
          const name = decodeURIComponent(file.replace(/\.[^/.]+$/, ''));
          btn.textContent = name;
          btn.setAttribute('aria-label', 'Play video ' + name);

          btn.addEventListener('click', function () {
            const videoUrl = encodePath(relPath);

            // create player
            playerArea.innerHTML = '';
            const video = document.createElement('video');
            video.controls = true;
            video.autoplay = true;
            video.playsInline = true;
            video.style.width = '100%';
            video.style.maxHeight = '60vh';
            const poster1 = relPath.replace(/\.[^/.]+$/, '.jpg');

            // set poster if it exists to avoid 404 spam
            (async function(){
              const purl = encodePath(poster1);
              if (await imageExists(purl)) { video.poster = purl; }
              video.src = videoUrl;
              playerArea.appendChild(video);
              // focus player for keyboard control
              video.setAttribute('tabindex', '-1');
              video.focus();
              video.play().catch(function(){ /* ignore */ });
            })();
          });
          list.appendChild(btn);
        });

        galleryContent.appendChild(list);

        // open modal now that content is rendered
        galleryModal.hidden = false;
        galleryModal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        // ensure close button is focused for accessibility
        if (galleryModalClose) galleryModalClose.focus();
    }

  }

  function setActiveGallerySection(btn) {
    Array.from(gallerySections.children).forEach(function (b) { b.classList.remove('active'); });
    btn.classList.add('active');
  }

  function renderGallerySection(items, name, type) {
    clearEl(galleryContent);
    if (!items || items.length === 0) { galleryContent.innerHTML = '<p>No items in this section.</p>'; return; }

    items.forEach(function (relPath) {
      const ext = relPath.split('.').pop().toLowerCase();
      if (type === 'videos' && ['mp4','webm','ogg'].includes(ext)) {
        const poster1 = relPath.replace(/\.[^/.]+$/, '.jpg');
        const poster2 = relPath.replace(/\.[^/.]+$/, '-poster.jpg');
        const thumb = document.createElement('button');
        thumb.type = 'button';
        thumb.className = 'video-thumb';
        thumb.setAttribute('aria-label', name + ' video');
        thumb.style.backgroundImage = `url(${encodePath(poster1)}), url(${encodePath(poster2)}), url(${encodePath('images/banner.jpg')})`;
        thumb.dataset.videoSrc = relPath;
        thumb.dataset.poster = poster1;
        thumb.addEventListener('click', function () {
          const video = document.createElement('video');
          video.src = encodePath(relPath);
          video.controls = true;
          video.autoplay = true;
          video.playsInline = true;
          video.style.width = '100%';
          video.style.height = '200px';
          video.style.objectFit = 'cover';
          video.poster = encodePath(poster1);
          galleryContent.replaceChild(video, thumb);
          video.play().catch(function(){});
        });
        galleryContent.appendChild(thumb);
      } else {
        const img = document.createElement('img');
        img.src = encodePath(relPath);
        img.alt = name + ' image';
        img.loading = 'lazy';
        img.addEventListener('click', function () { openLightboxFromSrc(img.src, img.alt); });
        galleryContent.appendChild(img);
      }
    });
  }

  galleryModalClose.addEventListener('click', function () {
    // hide gallery modal first
    galleryModal.hidden = true;
    galleryModal.setAttribute('aria-hidden','true');
    // if lightbox open, close it as well
    if (typeof lightbox !== 'undefined' && !lightbox.hidden) {
      // directly hide lightbox DOM to avoid overflow toggles that confuse state
      lightbox.hidden = true;
      lightboxImage.src = '';
    }
    document.body.style.overflow = '';
    clearEl(galleryContent);
    clearEl(gallerySections);
  });

  // delegate clicks on galleryGrid (client selection)
  galleryGrid.addEventListener('click', function (e) {
    const item = e.target.closest('.client-card');
    if (!item) return;
    const client = item.dataset.client;
    if (currentClients && currentClients[client]) {
      openClientModal(client, currentClients[client]);
    }
  });

  // Client-first: load combined client index (images + videos) on page load
  async function loadAllClients() {
    const combined = {};
    try {
      const [imagesData, videosData, markData] = await Promise.all([
        fetchJSON('/data/gallery-images.json').catch(() => ({})),
        fetchJSON('/data/gallery-videos.json').catch(() => ({})),
        fetchJSON('/data/mark-trixie.json').catch(() => ({}))
      ]);
      const imgClients = (imagesData && imagesData.clients) || {};
      const vidClients = (videosData && videosData.clients) || {};
      const markClients = (markData && markData.galleries) ? { [(markData.title || 'Mark & Trixie')]: markData.galleries } : {};

      // union client names
      const clientNames = new Set([...Object.keys(imgClients), ...Object.keys(vidClients), ...Object.keys(markClients)]);
      clientNames.forEach(function (name) {
        const imgData = imgClients[name] || {};
        const vidData = vidClients[name] || {};
        const markDataForName = markClients[name] || {};
        // merge without copying _thumb into visible keys; keep _thumb as metadata
        const merged = Object.assign({}, imgData, vidData, markDataForName);
        // prefer img _thumb if present, otherwise use video thumb
        if (imgData._thumb) merged._thumb = imgData._thumb;
        else if (vidData._thumb) merged._thumb = vidData._thumb;
        else if (markData && markData.thumbnail) merged._thumb = markData.thumbnail;
        combined[name] = merged;
      });

      currentClients = combined;
      renderClients(currentClients, 'mixed');
    } catch (err) {
      console.error('Failed to load client indexes', err);
      galleryGrid.innerHTML = '<p class="section-intro">Unable to load gallery index.</p>';
    }
  }

  // start client-first load
  loadAllClients();


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
