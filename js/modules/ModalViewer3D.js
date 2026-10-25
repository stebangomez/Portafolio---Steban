class ModalViewer3D {
    constructor({ onSaveDescription, onSaveGallery, onUploadFiles }) {
        this.modal = document.getElementById('modal-3d');
        this.modalViewer = document.getElementById('modal-viewer');
        this.modalIframe = document.getElementById('modal-iframe');
        this.modalImageFallback = document.getElementById('modal-image-fallback');
        this.modalTitle = document.getElementById('modal-title');
        this.modalHint = document.getElementById('modal-hint');
        this.modalClose = document.getElementById('modal-close');
        this.modalDesc = document.getElementById('modal-description');
        this.modalAdminEditor = document.getElementById('modal-admin-desc-editor');
        this.modalDescTextarea = document.getElementById('modal-desc-textarea');
        this.modalSaveDescBtn = document.getElementById('modal-save-desc-btn');

        // Elementos del Visor 2D (Slider + Zoom)
        this.modal2DSlider = document.getElementById('modal-2d-slider');
        this.modal2DViewport = document.getElementById('modal-2d-viewport');
        this.modal2DSurface = document.getElementById('modal-2d-surface');
        this.modal2DImg = document.getElementById('modal-2d-img');
        this.modal2DPrev = document.getElementById('modal-2d-prev');
        this.modal2DNext = document.getElementById('modal-2d-next');
        this.modal2DCounter = document.getElementById('modal-2d-counter');
        this.modal2DThumbs = document.getElementById('modal-2d-thumbs');

        // Controles de Zoom 2D
        this.zoomOutBtn = document.getElementById('modal-zoom-out');
        this.zoomInBtn = document.getElementById('modal-zoom-in');
        this.zoomResetBtn = document.getElementById('modal-zoom-reset');
        this.zoomLevelText = document.getElementById('modal-zoom-level');

        // Editor de Galería 2D dentro del modal (Modo Admin)
        this.modalAdmin2DEditor = document.getElementById('modal-admin-2d-editor');
        this.modalAdmin2DUrlInput = document.getElementById('modal-admin-2d-url');
        this.modalAdminAddUrlBtn = document.getElementById('modal-admin-add-url-btn');
        this.modalAdminUploadBtn = document.getElementById('modal-admin-upload-btn');
        this.modalAdmin2DFilesInput = document.getElementById('modal-admin-2d-files');
        this.modalAdmin2DList = document.getElementById('modal-admin-2d-list');

        this.onSaveDescription = onSaveDescription;
        this.onSaveGallery = onSaveGallery;
        this.onUploadFiles = onUploadFiles;

        this.currentProjectName = null;
        this.currentProject = null;
        this.isAdminActive = false;

        // Estado del Slider y Zoom 2D
        this.is2DActive = false;
        this.slides = [];
        this.currentSlideIndex = 0;
        this.zoomLevel = 1;
        this.minZoom = 1;
        this.maxZoom = 4;

        // Dimensiones reales renderizadas para centrar el zoom en cualquier proporción (16:9, 4:3, vertical, etc.)
        this.layoutState = {
            surfaceW: 0,
            surfaceH: 0,
            imgW: 0,
            imgH: 0,
            imgOffsetX: 0,
            imgOffsetY: 0
        };
    }

    init() {
        if (!this.modal) return;

        if (this.modalClose) {
            this.modalClose.addEventListener('click', () => this.close());
        }

        this.modal.addEventListener('click', (event) => {
            if (event.target === this.modal) {
                this.close();
            }
        });

        document.addEventListener('keydown', (event) => {
            if (!this.modal.classList.contains('active')) return;

            if (event.key === 'Escape') {
                this.close();
                return;
            }

            // Navegación con teclado para el Slider 2D cuando no se está escribiendo en un input/textarea
            const activeTag = document.activeElement?.tagName?.toLowerCase();
            if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') return;

            if (this.is2DActive && this.slides.length > 1 && this.zoomLevel === 1) {
                if (event.key === 'ArrowLeft') {
                    event.preventDefault();
                    this.prevSlide();
                } else if (event.key === 'ArrowRight') {
                    event.preventDefault();
                    this.nextSlide();
                }
            }
        });

        window.addEventListener('resize', () => {
            if (this.is2DActive && this.modal?.classList.contains('active')) {
                this.setZoom(this.zoomLevel);
            }
        });

        // Fallback automático al visor 2D si el archivo .glb no existe o falla al cargar
        if (this.modalViewer) {
            this.modalViewer.addEventListener('error', () => {
                if (this.currentProject && this.currentProject.image) {
                    this.open2DSlider(this.currentProject);
                }
            });
        }

        if (this.modalSaveDescBtn) {
            this.modalSaveDescBtn.addEventListener('click', () => {
                if (!this.currentProjectName || typeof this.onSaveDescription !== 'function') return;
                const newDescription = this.modalDescTextarea ? this.modalDescTextarea.value.trim() : '';
                this.onSaveDescription(this.currentProjectName, newDescription);
            });
        }

        this.init2DSliderEvents();
        this.initAdmin2DEditorEvents();
    }

    init2DSliderEvents() {
        if (this.modal2DPrev) {
            this.modal2DPrev.addEventListener('click', (e) => {
                e.stopPropagation();
                this.prevSlide();
            });
        }

        if (this.modal2DNext) {
            this.modal2DNext.addEventListener('click', (e) => {
                e.stopPropagation();
                this.nextSlide();
            });
        }

        if (this.zoomInBtn) {
            this.zoomInBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.setZoom(this.zoomLevel + 0.5);
            });
        }

        if (this.zoomOutBtn) {
            this.zoomOutBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.setZoom(this.zoomLevel - 0.5);
            });
        }

        if (this.zoomResetBtn) {
            this.zoomResetBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.setZoom(1);
            });
        }

        if (this.modal2DImg) {
            this.modal2DImg.addEventListener('load', () => {
                if (!this.is2DActive) return;
                this.layoutState = {
                    surfaceW: 0,
                    surfaceH: 0,
                    imgW: 0,
                    imgH: 0,
                    imgOffsetX: 0,
                    imgOffsetY: 0
                };
                this.setZoom(this.zoomLevel);
            });
        }

        if (!this.modal2DViewport) return;

        // Doble clic para alternar zoom (100% <-> 225%) centrado en el punto exacto donde se hizo clic
        this.modal2DViewport.addEventListener('dblclick', (e) => {
            e.preventDefault();
            const targetZoom = this.zoomLevel > 1 ? 1 : 2.25;
            this.setZoom(targetZoom, e.clientX, e.clientY);
        });

        // Rueda del ratón: hacer zoom suave centrado en el puntero
        this.modal2DViewport.addEventListener(
            'wheel',
            (e) => {
                if (!this.is2DActive) return;
                e.preventDefault();
                const delta = e.deltaY < 0 ? 0.25 : -0.25;
                this.setZoom(this.zoomLevel + delta, e.clientX, e.clientY);
            },
            { passive: false }
        );

        // Desplazamiento 2D (panning con scrollLeft/scrollTop) cuando hay zoom, o swipe horizontal cuando zoom === 1
        let lastPointer = null;
        let startPointer = null;

        this.modal2DViewport.addEventListener('pointerdown', (e) => {
            if (!this.is2DActive || !e.isPrimary || e.button !== 0) return;

            const rect = this.modal2DViewport.getBoundingClientRect();
            if (
                e.clientX - rect.left - this.modal2DViewport.clientLeft >= this.modal2DViewport.clientWidth ||
                e.clientY - rect.top - this.modal2DViewport.clientTop >= this.modal2DViewport.clientHeight
            ) {
                return;
            }

            lastPointer = { x: e.clientX, y: e.clientY };
            startPointer = { x: e.clientX, y: e.clientY };
            this.modal2DViewport.setPointerCapture(e.pointerId);
            if (this.zoomLevel > 1) {
                this.modal2DViewport.classList.add('is-panning');
            }
        });

        this.modal2DViewport.addEventListener('pointermove', (e) => {
            if (!lastPointer) return;

            if (this.zoomLevel > 1) {
                this.modal2DViewport.scrollLeft -= e.clientX - lastPointer.x;
                this.modal2DViewport.scrollTop -= e.clientY - lastPointer.y;
            }
            lastPointer = { x: e.clientX, y: e.clientY };
        });

        const endPointerPan = (e) => {
            if (startPointer && this.zoomLevel === 1 && this.slides.length > 1 && e.type === 'pointerup') {
                const dx = e.clientX - startPointer.x;
                const dy = Math.abs(e.clientY - startPointer.y);
                if (Math.abs(dx) > 55 && dy < 70) {
                    if (dx < 0) {
                        this.nextSlide();
                    } else {
                        this.prevSlide();
                    }
                }
            }
            lastPointer = null;
            startPointer = null;
            this.modal2DViewport.classList.remove('is-panning');
        };

        this.modal2DViewport.addEventListener('pointerup', endPointerPan);
        this.modal2DViewport.addEventListener('pointercancel', endPointerPan);
    }

    initAdmin2DEditorEvents() {
        if (this.modalAdminAddUrlBtn && this.modalAdmin2DUrlInput) {
            this.modalAdminAddUrlBtn.addEventListener('click', () => {
                const url = this.modalAdmin2DUrlInput.value.trim();
                if (!url || !this.currentProject) return;
                const updatedImages = [...this.getProjectSlides(this.currentProject), url];
                this.modalAdmin2DUrlInput.value = '';
                this.persistModalGalleryChanges(updatedImages);
            });
        }

        if (this.modalAdminUploadBtn && this.modalAdmin2DFilesInput) {
            this.modalAdminUploadBtn.addEventListener('click', () => {
                this.modalAdmin2DFilesInput.click();
            });

            this.modalAdmin2DFilesInput.addEventListener('change', async () => {
                const files = Array.from(this.modalAdmin2DFilesInput.files || []);
                if (!files.length || !this.currentProject || typeof this.onUploadFiles !== 'function') return;

                const originalText = this.modalAdminUploadBtn.textContent;
                this.modalAdminUploadBtn.textContent = 'Subiendo...';
                this.modalAdminUploadBtn.disabled = true;

                const uploadedUrls = await this.onUploadFiles(files);

                this.modalAdminUploadBtn.textContent = originalText;
                this.modalAdminUploadBtn.disabled = false;
                this.modalAdmin2DFilesInput.value = '';

                if (uploadedUrls && uploadedUrls.length > 0) {
                    const updatedImages = [...this.getProjectSlides(this.currentProject), ...uploadedUrls];
                    this.persistModalGalleryChanges(updatedImages);
                }
            });
        }
    }

    persistModalGalleryChanges(newImages) {
        if (!this.currentProjectName || !this.currentProject) return;
        const cleanImages = newImages.filter(Boolean);
        if (cleanImages.length === 0 && this.currentProject.image) {
            cleanImages.push(this.currentProject.image);
        }

        this.currentProject.images = cleanImages;
        this.currentProject.type = '2d';
        this.slides = [...cleanImages];

        if (this.currentSlideIndex >= this.slides.length) {
            this.currentSlideIndex = Math.max(0, this.slides.length - 1);
        }

        this.render2DSlide();
        this.renderAdmin2DEditorList();

        if (typeof this.onSaveGallery === 'function') {
            this.onSaveGallery(this.currentProjectName, cleanImages);
        }
    }

    is2DProject(project) {
        if (!project) return false;
        if (project.type === '2d' || project.category === '2d') return true;
        if (!project.model && !project.embedUrl) return true;
        return false;
    }

    getProjectSlides(project) {
        if (!project) return [];
        if (Array.isArray(project.images) && project.images.length > 0) {
            return project.images.filter(Boolean);
        }
        return project.image ? [project.image] : [];
    }

    open2DSlider(project) {
        this.is2DActive = true;

        if (this.modalViewer) {
            this.modalViewer.style.display = 'none';
            this.modalViewer.removeAttribute('src');
        }
        if (this.modalIframe) {
            this.modalIframe.style.display = 'none';
            this.modalIframe.setAttribute('src', '');
        }
        if (this.modalImageFallback) {
            this.modalImageFallback.style.display = 'none';
            this.modalImageFallback.src = '';
        }
        if (this.modal2DSlider) {
            this.modal2DSlider.classList.remove('hidden');
        }

        this.slides = this.getProjectSlides(project);
        this.currentSlideIndex = 0;
        this.render2DSlide();
        this.renderAdmin2DEditorList();
    }

    render2DSlide() {
        if (!this.slides.length) return;
        const currentUrl = this.slides[this.currentSlideIndex] || this.slides[0];

        const hasMultiple = this.slides.length > 1;

        if (this.modal2DPrev) {
            this.modal2DPrev.classList.toggle('hidden', !hasMultiple);
        }
        if (this.modal2DNext) {
            this.modal2DNext.classList.toggle('hidden', !hasMultiple);
        }
        if (this.modal2DCounter) {
            this.modal2DCounter.classList.toggle('hidden', !hasMultiple);
            this.modal2DCounter.textContent = `${this.currentSlideIndex + 1} / ${this.slides.length}`;
        }

        if (this.modal2DThumbs) {
            this.modal2DThumbs.innerHTML = '';
            this.modal2DThumbs.classList.toggle('hidden', !hasMultiple);

            if (hasMultiple) {
                this.slides.forEach((imgUrl, idx) => {
                    const thumbBtn = document.createElement('button');
                    thumbBtn.type = 'button';
                    thumbBtn.className = `modal-2d-thumb ${idx === this.currentSlideIndex ? 'active' : ''}`;
                    thumbBtn.setAttribute('aria-label', `Ver imagen ${idx + 1}`);

                    const thumbImg = document.createElement('img');
                    thumbImg.src = imgUrl;
                    thumbImg.alt = `Miniatura ${idx + 1}`;
                    thumbImg.loading = 'lazy';

                    thumbBtn.appendChild(thumbImg);
                    thumbBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.goToSlide(idx);
                    });
                    this.modal2DThumbs.appendChild(thumbBtn);
                });
            }
        }

        // Reiniciar el estado de layout y cargar la imagen
        this.layoutState = {
            surfaceW: 0,
            surfaceH: 0,
            imgW: 0,
            imgH: 0,
            imgOffsetX: 0,
            imgOffsetY: 0
        };
        this.zoomLevel = 1;

        if (this.modal2DImg) {
            this.modal2DImg.src = currentUrl;
            this.modal2DImg.alt = `${this.currentProject?.name || 'Proyecto 2D'} — Imagen ${this.currentSlideIndex + 1} de ${this.slides.length}`;
            if (this.modal2DImg.complete && this.modal2DImg.naturalWidth > 0) {
                this.setZoom(1);
            } else {
                // Ajuste preliminar mientras termina el evento load
                this.setZoom(1);
            }
        }

        if (this.modalHint) {
            this.modalHint.textContent = hasMultiple
                ? 'Modo Slider 2D: Usa las flechas o miniaturas para cambiar de imagen · Rueda del ratón, doble clic o (+/-) para hacer Zoom y arrastrar'
                : 'Visor 2D con Zoom: Usa la rueda del ratón, doble clic o los botones (+/-) para acercar · Arrastra para explorar cada detalle';
        }
    }

    renderAdmin2DEditorList() {
        if (!this.modalAdmin2DEditor || !this.modalAdmin2DList) return;
        const shouldShow = this.isAdminActive && this.is2DActive;
        this.modalAdmin2DEditor.classList.toggle('hidden', !shouldShow);
        if (!shouldShow) return;

        this.modalAdmin2DList.innerHTML = '';
        this.slides.forEach((url, index) => {
            const item = document.createElement('div');
            item.className = `admin-2d-gallery-item ${index === this.currentSlideIndex ? 'active-slide' : ''}`;

            const thumb = document.createElement('img');
            thumb.src = url;
            thumb.alt = `Imagen ${index + 1}`;
            thumb.title = 'Clic para previsualizar en el slider';
            thumb.addEventListener('click', () => this.goToSlide(index));

            const badge = document.createElement('span');
            badge.className = 'admin-2d-item-index';
            badge.textContent = `#${index + 1}`;

            const controls = document.createElement('div');
            controls.className = 'admin-2d-item-controls';

            if (index > 0) {
                const leftBtn = document.createElement('button');
                leftBtn.type = 'button';
                leftBtn.className = 'admin-2d-ctrl-btn';
                leftBtn.title = 'Mover antes';
                leftBtn.innerHTML = '&#9664;';
                leftBtn.addEventListener('click', () => {
                    const updated = [...this.slides];
                    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
                    this.currentSlideIndex = index - 1;
                    this.persistModalGalleryChanges(updated);
                });
                controls.appendChild(leftBtn);
            }

            if (index < this.slides.length - 1) {
                const rightBtn = document.createElement('button');
                rightBtn.type = 'button';
                rightBtn.className = 'admin-2d-ctrl-btn';
                rightBtn.title = 'Mover después';
                rightBtn.innerHTML = '&#9654;';
                rightBtn.addEventListener('click', () => {
                    const updated = [...this.slides];
                    [updated[index + 1], updated[index]] = [updated[index], updated[index + 1]];
                    this.currentSlideIndex = index + 1;
                    this.persistModalGalleryChanges(updated);
                });
                controls.appendChild(rightBtn);
            }

            if (this.slides.length > 1) {
                const delBtn = document.createElement('button');
                delBtn.type = 'button';
                delBtn.className = 'admin-2d-ctrl-btn delete';
                delBtn.title = 'Quitar imagen del slider';
                delBtn.innerHTML = '&times;';
                delBtn.addEventListener('click', () => {
                    const updated = this.slides.filter((_, i) => i !== index);
                    this.persistModalGalleryChanges(updated);
                });
                controls.appendChild(delBtn);
            }

            item.appendChild(thumb);
            item.appendChild(badge);
            item.appendChild(controls);
            this.modalAdmin2DList.appendChild(item);
        });
    }

    goToSlide(index) {
        if (!this.slides.length) return;
        this.currentSlideIndex = (index + this.slides.length) % this.slides.length;
        this.render2DSlide();
        this.renderAdmin2DEditorList();
    }

    prevSlide() {
        this.goToSlide(this.currentSlideIndex - 1);
    }

    nextSlide() {
        this.goToSlide(this.currentSlideIndex + 1);
    }

    setZoom(nextZoom, clientX, clientY) {
        const clamped = Math.min(this.maxZoom, Math.max(this.minZoom, Number(nextZoom.toFixed(2))));
        this.zoomLevel = clamped;

        if (this.zoomLevelText) {
            this.zoomLevelText.textContent = `${Math.round(this.zoomLevel * 100)}%`;
        }

        if (!this.modal2DViewport || !this.modal2DSurface || !this.modal2DImg) return;

        const vp = this.modal2DViewport;
        const vpW = vp.clientWidth || 800;
        const vpH = vp.clientHeight || 500;
        const pad = 28;

        const natW = this.modal2DImg.naturalWidth || vpW;
        const natH = this.modal2DImg.naturalHeight || vpH;

        const availW = Math.max(100, vpW - pad * 2);
        const availH = Math.max(100, vpH - pad * 2);

        // Escala base (zoom = 1) respetando la relación de aspecto real (ej. 1920x1080, vertical, panorámica, etc.)
        const fitScale = Math.min(availW / natW, availH / natH);
        const baseW = natW * fitScale;
        const baseH = natH * fitScale;

        // Punto focal en coordenadas del viewport (centro del visor si se usan botones +/-, o posición del cursor)
        let focalX = vpW / 2;
        let focalY = vpH / 2;

        if (clientX !== undefined && clientY !== undefined) {
            const rect = vp.getBoundingClientRect();
            const scaleX = rect.width / (vp.offsetWidth || 1);
            const scaleY = rect.height / (vp.offsetHeight || 1);
            focalX = (clientX - rect.left) / scaleX;
            focalY = (clientY - rect.top) / scaleY;
        }

        // Coordenada normalizada (u, v) dentro de la imagen [0..1] que está actualmente bajo el punto focal
        let u = 0.5;
        let v = 0.5;

        if (this.layoutState.imgW > 0 && this.layoutState.imgH > 0) {
            const prevSurfaceX = vp.scrollLeft + focalX;
            const prevSurfaceY = vp.scrollTop + focalY;
            u = (prevSurfaceX - this.layoutState.imgOffsetX) / this.layoutState.imgW;
            v = (prevSurfaceY - this.layoutState.imgOffsetY) / this.layoutState.imgH;
            u = Math.min(1, Math.max(0, u));
            v = Math.min(1, Math.max(0, v));
        }

        // Nuevas dimensiones reales de la imagen según el zoom
        const newImgW = Math.round(baseW * this.zoomLevel);
        const newImgH = Math.round(baseH * this.zoomLevel);

        const newSurfaceW = Math.max(vpW, newImgW + pad * 2);
        const newSurfaceH = Math.max(vpH, newImgH + pad * 2);

        const newImgOffsetX = Math.round((newSurfaceW - newImgW) / 2);
        const newImgOffsetY = Math.round((newSurfaceH - newImgH) / 2);

        // Aplicar dimensiones exactas sin transiciones CSS que retrasen scrollWidth/scrollHeight
        this.modal2DSurface.style.width = `${newSurfaceW}px`;
        this.modal2DSurface.style.height = `${newSurfaceH}px`;

        this.modal2DImg.style.width = `${newImgW}px`;
        this.modal2DImg.style.height = `${newImgH}px`;
        this.modal2DImg.style.left = `${newImgOffsetX}px`;
        this.modal2DImg.style.top = `${newImgOffsetY}px`;

        this.layoutState = {
            surfaceW: newSurfaceW,
            surfaceH: newSurfaceH,
            imgW: newImgW,
            imgH: newImgH,
            imgOffsetX: newImgOffsetX,
            imgOffsetY: newImgOffsetY
        };

        vp.classList.toggle('is-zoomed', this.zoomLevel > 1);

        if (this.zoomLevel === 1) {
            vp.scrollLeft = 0;
            vp.scrollTop = 0;
        } else {
            // Mantener exactamente el punto (u, v) de la imagen bajo el punto focal (focalX, focalY)
            const targetScrollLeft = newImgOffsetX + u * newImgW - focalX;
            const targetScrollTop = newImgOffsetY + v * newImgH - focalY;
            vp.scrollLeft = Math.max(0, Math.round(targetScrollLeft));
            vp.scrollTop = Math.max(0, Math.round(targetScrollTop));
        }
    }

    showImageFallback(project) {
        this.open2DSlider(project);
    }

    open(project) {
        if (!this.modal || !project) return;

        this.currentProject = project;
        this.currentProjectName = project.name;
        if (this.modalTitle) {
            this.modalTitle.textContent = project.name;
        }

        this.updateDescriptionView(project);

        this.modal.classList.add('active');
        document.body.style.overflow = 'hidden';

        if (this.is2DProject(project)) {
            this.open2DSlider(project);
            return;
        }

        this.is2DActive = false;
        if (this.modal2DSlider) {
            this.modal2DSlider.classList.add('hidden');
        }
        if (this.modalAdmin2DEditor) {
            this.modalAdmin2DEditor.classList.add('hidden');
        }

        if (project.embedType === 'sketchfab' && project.embedUrl) {
            if (this.modalViewer) this.modalViewer.style.display = 'none';
            if (this.modalImageFallback) this.modalImageFallback.style.display = 'none';
            if (this.modalIframe) {
                this.modalIframe.style.display = 'block';
                this.modalIframe.setAttribute('src', project.embedUrl);
            }
            if (this.modalHint) {
                this.modalHint.textContent = 'Arrastra para rotar · usa la rueda para acercar · explora cada detalle del modelo';
            }
        } else if (project.model) {
            if (this.modalIframe) {
                this.modalIframe.style.display = 'none';
                this.modalIframe.setAttribute('src', '');
            }
            if (this.modalImageFallback) this.modalImageFallback.style.display = 'none';
            if (this.modalViewer) {
                this.modalViewer.style.display = 'block';
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        this.modalViewer.setAttribute('src', project.model);
                    }, 100);
                });
            }
            if (this.modalHint) {
                this.modalHint.textContent = 'Arrastra para rotar · usa la rueda para acercar · explora cada detalle del modelo';
            }
        } else {
            this.open2DSlider(project);
        }
    }

    updateDescriptionView(project) {
        if (this.modalDesc) {
            const descText = (project.description || '').trim();
            this.modalDesc.textContent = descText || 'Sin descripción adicional registrada para este proyecto.';
        }
        if (this.modalAdminEditor) {
            this.modalAdminEditor.classList.toggle('hidden', !this.isAdminActive);
        }
        if (this.modalDescTextarea) {
            this.modalDescTextarea.value = project.description || '';
        }
    }

    setAdminMode(isActive) {
        this.isAdminActive = isActive;
        if (this.modalAdminEditor) {
            this.modalAdminEditor.classList.toggle('hidden', !isActive);
        }
        this.renderAdmin2DEditorList();
    }

    close() {
        if (!this.modal) return;
        this.modal.classList.remove('active');
        document.body.style.overflow = '';
        this.currentProjectName = null;
        this.currentProject = null;
        this.is2DActive = false;

        setTimeout(() => {
            if (this.modalViewer) {
                this.modalViewer.removeAttribute('src');
                this.modalViewer.style.display = 'block';
                this.modalViewer.cameraOrbit = 'auto auto auto';
                this.modalViewer.fieldOfView = 'auto';
            }
            if (this.modalIframe) {
                this.modalIframe.setAttribute('src', '');
                this.modalIframe.style.display = 'none';
            }
            if (this.modalImageFallback) {
                this.modalImageFallback.src = '';
                this.modalImageFallback.style.display = 'none';
            }
            if (this.modal2DSlider) {
                this.modal2DSlider.classList.add('hidden');
            }
            if (this.modal2DImg) {
                this.modal2DImg.src = '';
            }
            this.setZoom(1);
        }, 500);
    }
}
