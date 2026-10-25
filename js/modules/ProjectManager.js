class ProjectManager {
    constructor(storageService, notificationService) {
        this.storage = storageService;
        this.notifier = notificationService;
        this.storageKey = AppConfig.STORAGE_KEYS.PROJECTS;
        this.categoriesKey = AppConfig.STORAGE_KEYS.CATEGORIES;
        this.defaultProjects = AppConfig.DEFAULT_PROJECTS;
        this.defaultCategories = AppConfig.DEFAULT_CATEGORIES;

        this.gridContainer = document.querySelector('.projects-grid');
        this.filtersContainer = document.querySelector('.filters');
        this.projectForm = document.getElementById('project-form');
        this.categorySelect = document.getElementById('project-category');
        this.typeSelect = document.getElementById('project-type');
        this.fields3D = document.getElementById('project-3d-fields');
        this.fields2D = document.getElementById('project-2d-fields');
        this.new2DImageInput = document.getElementById('project-2d-new-image');
        this.add2DUrlBtn = document.getElementById('add-2d-url-btn');
        this.trigger2DFilesBtn = document.getElementById('trigger-2d-files-btn');
        this.files2DInput = document.getElementById('project-2d-files');
        this.gallery2DList = document.getElementById('project-2d-gallery-list');

        this.cancelEditBtn = document.getElementById('project-cancel-edit');
        this.submitBtn = document.getElementById('project-submit-btn');
        this.formTitle = document.getElementById('project-form-title');

        this.categoryForm = document.getElementById('category-form');
        this.newCategoryInput = document.getElementById('new-category-name');
        this.adminCategoriesList = document.getElementById('admin-categories-list');

        this.activeFilter = 'todas';
        this.isAdminActive = false;
        this.currentForm2DImages = [];

        this.modalViewer = new ModalViewer3D({
            onSaveDescription: (projectName, newDescription) => {
                this.updateProjectDescription(projectName, newDescription);
            },
            onSaveGallery: (projectName, newImages) => {
                this.updateProjectGallery(projectName, newImages);
            },
            onUploadFiles: (files) => this.uploadMultipleImages(files)
        });
    }

    init() {
        this.modalViewer.init();
        this.renderCategoriesUI();
        this.bindCategoryEvents();
        this.bindFormEvents();

        if (this.gridContainer) {
            const projects = this.loadProjects();
            this.renderProjects(projects);
            this.applyFilter('todas');
        }
    }

    slugifyCategory(text) {
        return text
            .toString()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    loadCategories() {
        const stored = this.storage.getJSON(this.categoriesKey, null);
        if (!Array.isArray(stored) || stored.length === 0) {
            return [...this.defaultCategories];
        }
        // Asegurar que la categoría '2d' esté presente si viene de una versión anterior
        if (!stored.some((c) => c.slug === '2d')) {
            const updated = [{ slug: '2d', label: '2D' }, ...stored];
            this.storage.setJSON(this.categoriesKey, updated, { syncCloud: false });
            return updated;
        }
        return stored;
    }

    saveCategories(categories) {
        this.storage.setJSON(this.categoriesKey, categories);
    }

    getCategoryLabel(slug) {
        const categories = this.loadCategories();
        const found = categories.find((c) => c.slug === slug);
        return found ? found.label : slug;
    }

    addCategory(rawLabel) {
        const label = (rawLabel || '').trim();
        if (!label) return false;

        const slug = this.slugifyCategory(label);
        if (!slug || slug === 'todas') {
            alert('Ingresa un nombre de categoría válido.');
            return false;
        }

        const categories = this.loadCategories();
        if (categories.some((c) => c.slug === slug)) {
            alert(`La categoría "${label}" ya existe.`);
            return false;
        }

        categories.push({ slug, label });
        this.saveCategories(categories);
        this.renderCategoriesUI();
        this.notifier.show(`Categoría "${label}" agregada.`);
        return true;
    }

    deleteCategory(slug) {
        const categories = this.loadCategories();
        const target = categories.find((c) => c.slug === slug);
        if (!target) return;

        if (categories.length <= 1) {
            alert('Debe existir al menos una categoría.');
            return;
        }

        if (!confirm(`¿Eliminar la categoría "${target.label}"?`)) {
            return;
        }

        const updated = categories.filter((c) => c.slug !== slug);
        this.saveCategories(updated);

        if (this.activeFilter === slug) {
            this.activeFilter = 'todas';
        }

        this.renderCategoriesUI();
        this.applyFilter(this.activeFilter);
        this.notifier.show(`Categoría "${target.label}" eliminada.`);
    }

    renderCategoriesUI() {
        const categories = this.loadCategories();

        // 1. Renderizar barra de filtros pública + controles Admin
        if (this.filtersContainer) {
            this.filtersContainer.innerHTML = '';

            const allBtn = document.createElement('button');
            allBtn.type = 'button';
            allBtn.className = `filter-btn ${this.activeFilter === 'todas' ? 'active' : ''}`;
            allBtn.dataset.filter = 'todas';
            allBtn.textContent = 'Todas';
            allBtn.addEventListener('click', () => this.selectFilter('todas'));
            this.filtersContainer.appendChild(allBtn);

            categories.forEach((cat) => {
                const btnWrapper = document.createElement('div');
                btnWrapper.className = 'filter-pill-wrapper';

                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = `filter-btn ${this.activeFilter === cat.slug ? 'active' : ''}`;
                btn.dataset.filter = cat.slug;
                btn.textContent = cat.label;
                btn.addEventListener('click', () => this.selectFilter(cat.slug));
                btnWrapper.appendChild(btn);

                if (this.isAdminActive) {
                    const delBtn = document.createElement('button');
                    delBtn.type = 'button';
                    delBtn.className = 'filter-delete-chip';
                    delBtn.title = `Eliminar categoría ${cat.label}`;
                    delBtn.setAttribute('aria-label', `Eliminar categoría ${cat.label}`);
                    delBtn.innerHTML = '&times;';
                    delBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.deleteCategory(cat.slug);
                    });
                    btnWrapper.appendChild(delBtn);
                }

                this.filtersContainer.appendChild(btnWrapper);
            });

            if (this.isAdminActive) {
                const quickAddBtn = document.createElement('button');
                quickAddBtn.type = 'button';
                quickAddBtn.className = 'filter-btn filter-add-btn';
                quickAddBtn.textContent = '+ Categoría';
                quickAddBtn.title = 'Agregar una nueva categoría de proyectos';
                quickAddBtn.addEventListener('click', () => {
                    const name = prompt('Nombre de la nueva categoría (ej. Exhibidores, Islas, Stands):');
                    if (name && name.trim()) {
                        this.addCategory(name.trim());
                    }
                });
                this.filtersContainer.appendChild(quickAddBtn);
            }
        }

        // 2. Poblar el <select id="project-category"> del formulario de proyectos
        if (this.categorySelect) {
            const currentVal = this.categorySelect.value;
            this.categorySelect.innerHTML = '';
            categories.forEach((cat) => {
                const opt = document.createElement('option');
                opt.value = cat.slug;
                opt.textContent = cat.label;
                this.categorySelect.appendChild(opt);
            });
            if (currentVal && categories.some((c) => c.slug === currentVal)) {
                this.categorySelect.value = currentVal;
            }
        }

        // 3. Poblar lista de categorías en el panel Admin si existe
        if (this.adminCategoriesList) {
            this.adminCategoriesList.innerHTML = '';
            categories.forEach((cat) => {
                const chip = document.createElement('span');
                chip.className = 'admin-category-chip';
                chip.innerHTML = `<span>${cat.label}</span>`;
                const removeBtn = document.createElement('button');
                removeBtn.type = 'button';
                removeBtn.innerHTML = '&times;';
                removeBtn.title = `Eliminar ${cat.label}`;
                removeBtn.addEventListener('click', () => this.deleteCategory(cat.slug));
                chip.appendChild(removeBtn);
                this.adminCategoriesList.appendChild(chip);
            });
        }
    }

    selectFilter(filterSlug) {
        this.activeFilter = filterSlug;
        if (this.filtersContainer) {
            this.filtersContainer.querySelectorAll('.filter-btn').forEach((btn) => {
                btn.classList.toggle('active', btn.dataset.filter === filterSlug);
            });
        }
        this.applyFilter(filterSlug);
    }

    bindCategoryEvents() {
        if (!this.categoryForm) return;
        this.categoryForm.addEventListener('submit', (event) => {
            event.preventDefault();
            if (!this.newCategoryInput) return;
            const added = this.addCategory(this.newCategoryInput.value);
            if (added) {
                this.newCategoryInput.value = '';
            }
        });
    }

    loadProjects() {
        const stored = this.storage.getJSON(this.storageKey, null);
        if (!Array.isArray(stored) || stored.length === 0) {
            this.storage.setJSON(this.storageKey, this.defaultProjects, { syncCloud: false });
            return [...this.defaultProjects];
        }

        let updatedCache = false;
        stored.forEach((proj) => {
            if (proj.image && proj.image.includes('Assets/Renders/Renders/')) {
                proj.image = proj.image.replace('Assets/Renders/Renders/', 'Assets/Renders/');
                updatedCache = true;
            }
            if (proj.description === undefined) {
                const match = this.defaultProjects.find((d) => d.name === proj.name);
                proj.description = match ? match.description : '';
                updatedCache = true;
            }
            if (!proj.type) {
                const is2D = (!proj.model && !proj.embedUrl) || proj.category === '2d';
                proj.type = is2D ? '2d' : '3d';
                if (is2D && (!Array.isArray(proj.images) || proj.images.length === 0) && proj.image) {
                    proj.images = [proj.image];
                }
                updatedCache = true;
            }
        });

        if (updatedCache) {
            this.storage.setJSON(this.storageKey, stored, { syncCloud: false });
        }

        return stored;
    }

    saveProjects(projects) {
        this.storage.setJSON(this.storageKey, projects);
    }

    updateProjectDescription(projectName, newDescription) {
        const projects = this.loadProjects();
        const index = projects.findIndex((p) => p.name === projectName);
        if (index < 0) return;

        projects[index].description = newDescription;
        this.saveProjects(projects);
        this.modalViewer.updateDescriptionView(projects[index]);
        this.renderProjects(projects);
        this.applyFilter(this.getActiveFilter());
        this.notifier.show('Descripción del proyecto actualizada.');
    }

    updateProjectGallery(projectName, newImages) {
        const projects = this.loadProjects();
        const index = projects.findIndex((p) => p.name === projectName);
        if (index < 0) return;

        projects[index].type = '2d';
        projects[index].images = newImages;
        if (!projects[index].image && newImages.length > 0) {
            projects[index].image = newImages[0];
        }
        this.saveProjects(projects);
        this.renderProjects(projects);
        this.applyFilter(this.getActiveFilter());
        this.notifier.show(`Slider 2D actualizado (${newImages.length} ${newImages.length === 1 ? 'imagen' : 'imágenes'}).`);
    }

    async uploadMultipleImages(files) {
        const uploaded = [];
        if (!files || !files.length) return uploaded;

        this.notifier.show(`Subiendo ${files.length} ${files.length === 1 ? 'imagen' : 'imágenes'}...`);
        for (const file of files) {
            const url = await this.storage.uploadAssetToCloud?.(file, 'renders');
            if (url) {
                uploaded.push(url);
            }
        }
        if (uploaded.length > 0) {
            this.notifier.show(`${uploaded.length} ${uploaded.length === 1 ? 'imagen agregada' : 'imágenes agregadas'} al slider.`);
        } else {
            alert('No se pudieron procesar las imágenes seleccionadas.');
        }
        return uploaded;
    }

    getActiveFilter() {
        return this.activeFilter || 'todas';
    }

    normalizeSketchfabEmbed(rawUrl) {
        const trimmed = (rawUrl || '').trim();
        if (!trimmed) return '';
        if (trimmed.includes('sketchfab.com/models/') && trimmed.endsWith('/embed')) {
            return trimmed;
        }
        const match = trimmed.match(/sketchfab\.com\/(?:3d-)?models\/(?:[^/]+-)?([a-f0-9]{32})/i);
        if (match && match[1]) {
            return `https://sketchfab.com/models/${match[1]}/embed`;
        }
        return trimmed;
    }

    toggleProjectTypeFields(type) {
        const is2D = type === '2d';
        if (this.fields3D) {
            this.fields3D.classList.toggle('hidden', is2D);
        }
        if (this.fields2D) {
            this.fields2D.classList.toggle('hidden', !is2D);
        }
        if (is2D) {
            const previewUrl = document.getElementById('project-image')?.value?.trim() || '';
            if (previewUrl && this.currentForm2DImages.length === 0) {
                this.currentForm2DImages = [previewUrl];
            }
            this.renderForm2DGallery();
        }
    }

    renderForm2DGallery() {
        if (!this.gallery2DList) return;
        this.gallery2DList.innerHTML = '';

        if (this.currentForm2DImages.length === 0) {
            const emptyHint = document.createElement('p');
            emptyHint.className = 'admin-2d-empty-hint';
            emptyHint.textContent = 'Sin imágenes adicionales aún. Al guardar se usará la imagen de portada (1 imagen), o sube varias imágenes aquí para activar el modo slider.';
            this.gallery2DList.appendChild(emptyHint);
            return;
        }

        this.currentForm2DImages.forEach((url, index) => {
            const item = document.createElement('div');
            item.className = 'admin-2d-gallery-item';

            const thumb = document.createElement('img');
            thumb.src = url;
            thumb.alt = `Slide ${index + 1}`;

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
                    [this.currentForm2DImages[index - 1], this.currentForm2DImages[index]] = [
                        this.currentForm2DImages[index],
                        this.currentForm2DImages[index - 1]
                    ];
                    this.renderForm2DGallery();
                });
                controls.appendChild(leftBtn);
            }

            if (index < this.currentForm2DImages.length - 1) {
                const rightBtn = document.createElement('button');
                rightBtn.type = 'button';
                rightBtn.className = 'admin-2d-ctrl-btn';
                rightBtn.title = 'Mover después';
                rightBtn.innerHTML = '&#9654;';
                rightBtn.addEventListener('click', () => {
                    [this.currentForm2DImages[index + 1], this.currentForm2DImages[index]] = [
                        this.currentForm2DImages[index],
                        this.currentForm2DImages[index + 1]
                    ];
                    this.renderForm2DGallery();
                });
                controls.appendChild(rightBtn);
            }

            const delBtn = document.createElement('button');
            delBtn.type = 'button';
            delBtn.className = 'admin-2d-ctrl-btn delete';
            delBtn.title = 'Quitar imagen del slider';
            delBtn.innerHTML = '&times;';
            delBtn.addEventListener('click', () => {
                this.currentForm2DImages.splice(index, 1);
                this.renderForm2DGallery();
            });
            controls.appendChild(delBtn);

            item.appendChild(thumb);
            item.appendChild(badge);
            item.appendChild(controls);
            this.gallery2DList.appendChild(item);
        });
    }

    bindFormEvents() {
        if (this.cancelEditBtn) {
            this.cancelEditBtn.addEventListener('click', () => this.resetFormEditingState());
        }

        // Cambio de tipo de proyecto (3D <-> 2D)
        if (this.typeSelect) {
            this.typeSelect.addEventListener('change', () => {
                this.toggleProjectTypeFields(this.typeSelect.value);
            });
        }

        // Si el usuario elige la categoría '2d', cambiar automáticamente el formato a '2d'
        if (this.categorySelect) {
            this.categorySelect.addEventListener('change', () => {
                if (this.categorySelect.value === '2d' && this.typeSelect) {
                    this.typeSelect.value = '2d';
                    this.toggleProjectTypeFields('2d');
                }
            });
        }

        // Subida directa de imagen de portada (Preview)
        const imageFileInput = document.getElementById('project-image-file');
        const triggerImageBtn = document.getElementById('trigger-project-image-btn');
        const imageInput = document.getElementById('project-image');
        if (triggerImageBtn && imageFileInput) {
            triggerImageBtn.addEventListener('click', () => imageFileInput.click());
        }
        if (imageInput) {
            imageInput.addEventListener('change', () => {
                const val = imageInput.value.trim();
                if (val && this.typeSelect?.value === '2d' && this.currentForm2DImages.length === 0) {
                    this.currentForm2DImages = [val];
                    this.renderForm2DGallery();
                }
            });
        }
        if (imageFileInput && imageInput) {
            imageFileInput.addEventListener('change', async () => {
                const file = imageFileInput.files?.[0];
                if (!file) return;
                if (triggerImageBtn) triggerImageBtn.textContent = 'Subiendo...';
                this.notifier.show('Subiendo imagen de portada...');
                const url = await this.storage.uploadAssetToCloud?.(file, 'renders');
                if (triggerImageBtn) triggerImageBtn.textContent = 'Subir portada';
                if (url) {
                    imageInput.value = url;
                    if (this.typeSelect?.value === '2d' && this.currentForm2DImages.length === 0) {
                        this.currentForm2DImages = [url];
                        this.renderForm2DGallery();
                    }
                    this.notifier.show('Imagen de portada lista.');
                } else {
                    alert('No se pudo subir la imagen de portada.');
                }
            });
        }

        // Controles para agregar 1 o varias imágenes al Slider 2D en el formulario
        if (this.add2DUrlBtn && this.new2DImageInput) {
            const addUrlFromInput = () => {
                const url = this.new2DImageInput.value.trim();
                if (!url) return;
                this.currentForm2DImages.push(url);
                this.new2DImageInput.value = '';
                this.renderForm2DGallery();
            };

            this.add2DUrlBtn.addEventListener('click', addUrlFromInput);
            this.new2DImageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    addUrlFromInput();
                }
            });
        }

        if (this.trigger2DFilesBtn && this.files2DInput) {
            this.trigger2DFilesBtn.addEventListener('click', () => this.files2DInput.click());
            this.files2DInput.addEventListener('change', async () => {
                const files = Array.from(this.files2DInput.files || []);
                if (!files.length) return;

                const originalText = this.trigger2DFilesBtn.textContent;
                this.trigger2DFilesBtn.textContent = 'Subiendo...';
                this.trigger2DFilesBtn.disabled = true;

                const urls = await this.uploadMultipleImages(files);

                this.trigger2DFilesBtn.textContent = originalText;
                this.trigger2DFilesBtn.disabled = false;
                this.files2DInput.value = '';

                if (urls.length > 0) {
                    // Si aún no hay imagen de portada, usar la primera imagen subida como portada
                    if (imageInput && !imageInput.value.trim()) {
                        imageInput.value = urls[0];
                    }
                    this.currentForm2DImages.push(...urls);
                    this.renderForm2DGallery();
                }
            });
        }

        // Subida directa de modelo 3D (.glb)
        const modelFileInput = document.getElementById('project-model-file');
        const triggerModelBtn = document.getElementById('trigger-project-model-btn');
        const modelInput = document.getElementById('project-model');
        if (triggerModelBtn && modelFileInput) {
            triggerModelBtn.addEventListener('click', () => modelFileInput.click());
        }
        if (modelFileInput && modelInput) {
            modelFileInput.addEventListener('change', async () => {
                const file = modelFileInput.files?.[0];
                if (!file) return;
                if (triggerModelBtn) triggerModelBtn.textContent = 'Subiendo...';
                this.notifier.show('Subiendo modelo 3D (.glb) a la nube...');
                const url = await this.storage.uploadAssetToCloud?.(file, 'modelos3d');
                if (triggerModelBtn) triggerModelBtn.textContent = 'Subir .glb';
                if (url) {
                    modelInput.value = url;
                    this.notifier.show('Modelo 3D subido correctamente.');
                } else {
                    alert('No se pudo subir el modelo 3D a Supabase Storage.');
                }
            });
        }

        if (!this.projectForm) return;

        this.projectForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const projectName = document.getElementById('project-name')?.value.trim() || '';
            const projectCategory = document.getElementById('project-category')?.value || 'otros';
            const projectType = this.typeSelect?.value || (projectCategory === '2d' ? '2d' : '3d');
            let projectImage = document.getElementById('project-image')?.value.trim() || '';
            const rawModel = document.getElementById('project-model')?.value.trim() || '';
            const projectDescription = document.getElementById('project-description')?.value.trim() || '';

            // Si quedó una URL escrita en el campo de nueva imagen 2D sin pulsar "+ Agregar URL", incluirla
            const pending2DUrl = this.new2DImageInput?.value.trim() || '';
            if (projectType === '2d' && pending2DUrl) {
                this.currentForm2DImages.push(pending2DUrl);
                this.new2DImageInput.value = '';
            }

            if (projectType === '2d' && !projectImage && this.currentForm2DImages.length > 0) {
                projectImage = this.currentForm2DImages[0];
            }

            if (!projectName || !projectCategory || !projectImage) {
                alert('Completa el nombre, categoría e imagen de portada del proyecto.');
                return;
            }

            let projectModel = '';
            let embedType = '';
            let embedUrl = '';
            let projectImages = [];

            if (projectType === '2d') {
                projectImages =
                    this.currentForm2DImages.length > 0
                        ? [...this.currentForm2DImages]
                        : [projectImage];
            } else {
                projectModel = rawModel;
                if (rawModel.includes('sketchfab.com')) {
                    embedType = 'sketchfab';
                    embedUrl = this.normalizeSketchfabEmbed(rawModel);
                    projectModel = '';
                }
            }

            const projects = this.loadProjects();
            const editingName = this.projectForm.dataset.editingId;

            if (editingName) {
                const index = projects.findIndex((project) => project.name === editingName);
                if (index >= 0) {
                    projects[index] = {
                        ...projects[index],
                        name: projectName,
                        category: projectCategory,
                        type: projectType,
                        image: projectImage,
                        images: projectType === '2d' ? projectImages : [],
                        model: projectType === '2d' ? '' : projectModel,
                        embedType:
                            projectType === '2d'
                                ? ''
                                : embedType || (projectModel ? '' : projects[index].embedType || ''),
                        embedUrl:
                            projectType === '2d'
                                ? ''
                                : embedUrl || (projectModel ? '' : projects[index].embedUrl || ''),
                        description: projectDescription
                    };
                }
                this.notifier.show('Proyecto actualizado correctamente.');
            } else {
                projects.unshift({
                    name: projectName,
                    category: projectCategory,
                    type: projectType,
                    image: projectImage,
                    images: projectType === '2d' ? projectImages : [],
                    model: projectModel,
                    embedType,
                    embedUrl,
                    description: projectDescription
                });
                this.notifier.show(`Nuevo proyecto ${projectType.toUpperCase()} agregado.`);
            }

            this.saveProjects(projects);
            this.renderProjects(projects);
            this.applyFilter(this.getActiveFilter());
            this.resetFormEditingState();
        });
    }

    resetFormEditingState() {
        if (!this.projectForm) return;
        this.projectForm.reset();
        delete this.projectForm.dataset.editingId;
        this.currentForm2DImages = [];
        if (this.typeSelect) {
            this.typeSelect.value = this.categorySelect?.value === '2d' ? '2d' : '3d';
        }
        this.toggleProjectTypeFields(this.typeSelect?.value || '3d');
        this.renderForm2DGallery();
        if (this.submitBtn) this.submitBtn.textContent = 'Agregar proyecto';
        if (this.cancelEditBtn) this.cancelEditBtn.classList.add('hidden');
        if (this.formTitle) this.formTitle.textContent = 'Agregar / Editar Proyecto';
    }

    populateFormForEdit(project) {
        if (!this.projectForm) return;
        const is2D = this.modalViewer.is2DProject(project);

        document.getElementById('project-name').value = project.name;
        document.getElementById('project-category').value = project.category;
        if (this.typeSelect) {
            this.typeSelect.value = is2D ? '2d' : '3d';
        }
        document.getElementById('project-image').value = project.image || '';
        document.getElementById('project-model').value = project.embedUrl || project.model || '';
        const descInput = document.getElementById('project-description');
        if (descInput) {
            descInput.value = project.description || '';
        }

        this.currentForm2DImages = is2D ? [...this.modalViewer.getProjectSlides(project)] : [];
        this.toggleProjectTypeFields(is2D ? '2d' : '3d');
        this.renderForm2DGallery();

        this.projectForm.dataset.editingId = project.name;
        if (this.submitBtn) this.submitBtn.textContent = 'Guardar cambios del proyecto';
        if (this.cancelEditBtn) this.cancelEditBtn.classList.remove('hidden');
        if (this.formTitle) this.formTitle.textContent = `Editando proyecto: ${project.name}`;

        this.projectForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
        document.getElementById('project-name').focus();
    }

    deleteProject(projectName) {
        if (!confirm(`¿Seguro que deseas eliminar el proyecto "${projectName}"?`)) {
            return;
        }
        const projectsList = this.loadProjects();
        const updated = projectsList.filter((item) => item.name !== projectName);
        this.saveProjects(updated);
        this.renderProjects(updated);
        this.applyFilter(this.getActiveFilter());
        this.notifier.show('Proyecto eliminado.');
    }

    renderProjects(projects) {
        if (!this.gridContainer) return;
        this.gridContainer.innerHTML = '';

        projects.forEach((project) => {
            const is2D = this.modalViewer.is2DProject(project);
            const slides = this.modalViewer.getProjectSlides(project);

            const card = document.createElement('article');
            card.className = 'project-card';
            if (this.isAdminActive) {
                card.classList.add('privileged');
            }
            card.dataset.category = project.category;
            card.dataset.type = is2D ? '2d' : '3d';
            card.dataset.src = project.model || '';
            card.dataset.name = project.name;
            if (project.embedType) card.dataset.embed = project.embedType;
            if (project.embedUrl) card.dataset.embedUrl = project.embedUrl;

            const adminActions = document.createElement('div');
            adminActions.className = 'project-admin-actions';

            const editBtn = document.createElement('button');
            editBtn.type = 'button';
            editBtn.className = 'project-admin-btn edit';
            editBtn.textContent = 'Editar';

            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.className = 'project-admin-btn delete';
            deleteBtn.textContent = 'Eliminar';

            adminActions.appendChild(editBtn);
            adminActions.appendChild(deleteBtn);

            const preview = document.createElement('div');
            preview.className = 'card-preview';

            const img = document.createElement('img');
            img.src = project.image || slides[0] || '';
            img.alt = project.name;
            img.className = 'card-render-img';
            img.loading = 'lazy';

            const badge = document.createElement('span');
            badge.className = `card-3d-badge ${is2D ? 'badge-2d' : 'badge-3d'}`;
            badge.textContent = is2D
                ? slides.length > 1
                    ? `2D · ${slides.length}`
                    : '2D'
                : '3D';

            preview.appendChild(img);
            preview.appendChild(badge);

            const info = document.createElement('div');
            info.className = 'project-info';

            const tag = document.createElement('span');
            tag.className = 'project-tag';
            tag.textContent = this.getCategoryLabel(project.category);

            const title = document.createElement('h3');
            title.textContent = project.name;

            info.appendChild(tag);
            info.appendChild(title);

            if (project.description) {
                const shortDesc = document.createElement('p');
                shortDesc.className = 'project-card-desc';
                shortDesc.textContent = project.description;
                info.appendChild(shortDesc);
            }

            card.appendChild(adminActions);
            card.appendChild(preview);
            card.appendChild(info);

            card.addEventListener('click', (event) => {
                if (event.target.closest('.project-admin-btn')) return;
                const latestProjects = this.loadProjects();
                const currentProj = latestProjects.find((p) => p.name === project.name) || project;
                this.modalViewer.open(currentProj);
            });

            editBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                const latestProjects = this.loadProjects();
                const currentProj = latestProjects.find((p) => p.name === project.name) || project;
                this.populateFormForEdit(currentProj);
            });

            deleteBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                this.deleteProject(project.name);
            });

            this.gridContainer.appendChild(card);
        });
    }

    applyFilter(filter) {
        const cards = document.querySelectorAll('.project-card');
        if (!cards.length) return;

        cards.forEach((card) => {
            card.classList.add('fade-out');
        });

        setTimeout(() => {
            cards.forEach((card) => {
                const category = card.dataset.category;
                const type = card.dataset.type;
                const shouldShow =
                    filter === 'todas' ||
                    category === filter ||
                    (filter === '2d' && type === '2d');
                if (shouldShow) {
                    card.classList.remove('hidden', 'fade-out');
                } else {
                    card.classList.add('hidden');
                    card.classList.remove('fade-out');
                }
            });
        }, 220);
    }

    setAdminMode(isActive) {
        this.isAdminActive = isActive;
        this.modalViewer.setAdminMode(isActive);
        this.renderCategoriesUI();
        document.querySelectorAll('.project-card').forEach((card) => {
            card.classList.toggle('privileged', isActive);
        });
    }
}
