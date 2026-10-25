class StorageService {
    constructor() {
        this.dbConfig = AppConfig.CV_DB;
        this.supabaseConfig = AppConfig.SUPABASE;
        this.supabase = null;
        this.initSupabaseClient();
    }

    initSupabaseClient() {
        try {
            if (window.supabase && this.supabaseConfig?.URL && this.supabaseConfig?.ANON_KEY) {
                this.supabase = window.supabase.createClient(
                    this.supabaseConfig.URL,
                    this.supabaseConfig.ANON_KEY,
                    {
                        auth: {
                            persistSession: true,
                            autoRefreshToken: true,
                            detectSessionInUrl: true
                        }
                    }
                );
            }
        } catch (error) {
            console.warn('No se pudo inicializar el cliente de Supabase:', error);
        }
    }

    onPasswordRecovery(callback) {
        if (!this.supabase || typeof callback !== 'function') return;
        this.supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                callback(session);
            }
        });
    }

    async signInAdmin(email, password) {
        if (!this.supabase) {
            return { ok: false, error: 'Cliente Supabase no disponible' };
        }
        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email: email.trim(),
                password
            });
            if (error) {
                return { ok: false, error: error.message };
            }
            return { ok: true, user: data.user, session: data.session };
        } catch (err) {
            return { ok: false, error: err.message || 'Error de red al autenticar' };
        }
    }

    async sendPasswordRecoveryEmail(email) {
        if (!this.supabase) {
            return { ok: false, error: 'Cliente Supabase no disponible' };
        }
        try {
            const redirectTo = `${window.location.origin}${window.location.pathname}`;
            const { error } = await this.supabase.auth.resetPasswordForEmail(email.trim(), {
                redirectTo
            });
            if (error) {
                return { ok: false, error: error.message };
            }
            return { ok: true };
        } catch (err) {
            return { ok: false, error: err.message || 'Error enviando correo de recuperación' };
        }
    }

    getEffectiveAdminPassword() {
        const customPass = this.getJSON(AppConfig.STORAGE_KEYS.ADMIN_PASSWORD, null);
        if (customPass && typeof customPass === 'string' && customPass.trim().length > 0) {
            return customPass.trim();
        }
        return AppConfig.DEFAULT_PASSWORD;
    }

    async updateAdminPassword(newPassword) {
        const cleanPassword = (newPassword || '').trim();
        if (cleanPassword.length < 6) {
            return { ok: false, error: 'La nueva contraseña debe tener al menos 6 caracteres.' };
        }

        // 1. Guardar localmente y en la configuración de Supabase (textos_sitio -> config.admin_password)
        this.setJSON(AppConfig.STORAGE_KEYS.ADMIN_PASSWORD, cleanPassword, { syncCloud: true });

        // 2. Si hay sesión activa en Supabase Auth (ej. desde link de correo o login), actualizar también Auth
        if (this.supabase) {
            try {
                const { data: sessionData } = await this.supabase.auth.getSession();
                if (sessionData?.session) {
                    await this.supabase.auth.updateUser({ password: cleanPassword });
                }
            } catch (err) {
                console.warn('Nota: contraseña actualizada en base de datos; Auth se sincronizará en el próximo acceso:', err);
            }
        }

        return { ok: true };
    }

    async signOutAdmin() {
        if (!this.supabase) return;
        try {
            await this.supabase.auth.signOut();
        } catch (error) {
            console.warn('Error cerrando sesión en Supabase:', error);
        }
    }

    async hasActiveSupabaseSession() {
        if (!this.supabase) return false;
        try {
            const { data } = await this.supabase.auth.getSession();
            return Boolean(data?.session);
        } catch {
            return false;
        }
    }

    getJSON(key, fallback = null) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (error) {
            console.warn(`Error leyendo clave "${key}" de localStorage:`, error);
            return fallback;
        }
    }

    setJSON(key, value, options = { syncCloud: true }) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            if (options?.syncCloud !== false && this.supabase) {
                this.syncKeyToCloud(key, value);
            }
            return true;
        } catch (error) {
            console.error(`Error guardando clave "${key}" en localStorage:`, error);
            return false;
        }
    }

    getSession(key) {
        try {
            return sessionStorage.getItem(key);
        } catch (error) {
            return null;
        }
    }

    setSession(key, value) {
        try {
            sessionStorage.setItem(key, value);
        } catch (error) {
            console.warn('No se pudo guardar en sessionStorage:', error);
        }
    }

    async syncFromCloud() {
        if (!this.supabase) return false;
        let updatedAny = false;

        try {
            // 1. Sincronizar proyectos desde tabla 'proyectos'
            const { data: rowsProyectos, error: errProj } = await this.supabase
                .from(this.supabaseConfig.TABLES.PROJECTS)
                .select('*')
                .eq('activo', true)
                .order('orden', { ascending: true })
                .order('created_at', { ascending: true });

            if (!errProj && Array.isArray(rowsProyectos) && rowsProyectos.length > 0) {
                const mappedProjects = rowsProyectos.map((row) => {
                    const rawLink = row.enlace_proyecto || '';
                    const isGalleryLink = rawLink.startsWith('2d-gallery:');
                    let galleryImages = [];
                    if (isGalleryLink) {
                        try {
                            const parsed = JSON.parse(rawLink.slice('2d-gallery:'.length));
                            if (Array.isArray(parsed)) {
                                galleryImages = parsed.filter(Boolean);
                            }
                        } catch {}
                    }
                    const is2D = isGalleryLink || (!row.modelo_3d_url && !rawLink) || row.categoria === '2d';
                    if (is2D && galleryImages.length === 0 && row.imagen_url) {
                        galleryImages = [row.imagen_url];
                    }

                    return {
                        id: row.id,
                        name: row.titulo,
                        category: row.categoria || 'otros',
                        type: is2D ? '2d' : '3d',
                        image: row.imagen_url || galleryImages[0] || '',
                        images: galleryImages,
                        model: is2D ? '' : (row.modelo_3d_url || ''),
                        embedType: !is2D && rawLink ? 'sketchfab' : '',
                        embedUrl: !is2D ? rawLink : '',
                        description: row.descripcion || ''
                    };
                });
                this.setJSON(AppConfig.STORAGE_KEYS.PROJECTS, mappedProjects, { syncCloud: false });
                updatedAny = true;
            }

            // 2. Sincronizar textos editables y configuraciones (categorías, software, contraseña) desde 'textos_sitio'
            const { data: rowsTextos, error: errText } = await this.supabase
                .from(this.supabaseConfig.TABLES.TEXTS)
                .select('clave, contenido');

            if (!errText && Array.isArray(rowsTextos) && rowsTextos.length > 0) {
                const currentTexts = this.getJSON(AppConfig.STORAGE_KEYS.TEXTS, {});
                let hasPageKeys = false;

                rowsTextos.forEach((row) => {
                    if (!row.clave) return;

                    if (row.clave === 'config.categories') {
                        try {
                            const parsedCats = JSON.parse(row.contenido);
                            if (Array.isArray(parsedCats) && parsedCats.length > 0) {
                                this.setJSON(AppConfig.STORAGE_KEYS.CATEGORIES, parsedCats, { syncCloud: false });
                                updatedAny = true;
                            }
                        } catch {}
                    } else if (row.clave === 'config.software_stack') {
                        try {
                            const parsedSoft = JSON.parse(row.contenido);
                            if (Array.isArray(parsedSoft) && parsedSoft.length > 0) {
                                this.setJSON(AppConfig.STORAGE_KEYS.SOFTWARE, parsedSoft, { syncCloud: false });
                                updatedAny = true;
                            }
                        } catch {}
                    } else if (row.clave === 'config.admin_password') {
                        if (row.contenido && row.contenido.trim().length > 0) {
                            this.setJSON(AppConfig.STORAGE_KEYS.ADMIN_PASSWORD, row.contenido.trim(), { syncCloud: false });
                        }
                    } else if (row.clave.startsWith('index.') || row.clave.startsWith('about.')) {
                        currentTexts[row.clave] = row.contenido;
                        hasPageKeys = true;
                    }
                });

                if (hasPageKeys) {
                    this.setJSON(AppConfig.STORAGE_KEYS.TEXTS, currentTexts, { syncCloud: false });
                    updatedAny = true;
                }
            }

            // 3. Sincronizar enlaces y CV desde tabla 'enlaces_sitio'
            const { data: rowsEnlaces, error: errLinks } = await this.supabase
                .from(this.supabaseConfig.TABLES.LINKS)
                .select('clave, titulo, url');

            if (!errLinks && Array.isArray(rowsEnlaces) && rowsEnlaces.length > 0) {
                const linksObj = this.getJSON(AppConfig.STORAGE_KEYS.LINKS, { ...AppConfig.DEFAULT_LINKS });
                let linksChanged = false;

                rowsEnlaces.forEach((row) => {
                    if (row.clave === 'contactBtn' || row.clave === 'emailLink' || row.clave === 'instagramLink') {
                        linksObj[row.clave] = {
                            text: row.titulo || AppConfig.DEFAULT_LINKS[row.clave]?.text || '',
                            href: row.url || AppConfig.DEFAULT_LINKS[row.clave]?.href || '#'
                        };
                        linksChanged = true;
                    } else if (row.clave === 'cv_pdf' && row.url) {
                        this.setJSON(
                            AppConfig.STORAGE_KEYS.CV_META,
                            {
                                type: 'url',
                                url: row.url,
                                fileName: row.titulo || row.url.split('/').pop() || 'Hoja_de_Vida_Steban_Gomez.pdf',
                                updatedAt: new Date().toISOString()
                            },
                            { syncCloud: false }
                        );
                        updatedAny = true;
                    }
                });

                if (linksChanged) {
                    this.setJSON(AppConfig.STORAGE_KEYS.LINKS, linksObj, { syncCloud: false });
                    updatedAny = true;
                }
            }
        } catch (error) {
            console.warn('Error sincronizando datos desde Supabase:', error);
        }

        return updatedAny;
    }

    async syncKeyToCloud(key, value) {
        if (!this.supabase) return;

        try {
            if (key === AppConfig.STORAGE_KEYS.PROJECTS && Array.isArray(value)) {
                await this.syncProjectsToCloud(value);
            } else if (key === AppConfig.STORAGE_KEYS.TEXTS && value && typeof value === 'object') {
                await this.syncTextsToCloud(value);
            } else if (key === AppConfig.STORAGE_KEYS.LINKS && value && typeof value === 'object') {
                await this.syncLinksToCloud(value);
            } else if (key === AppConfig.STORAGE_KEYS.CV_META && value && value.url) {
                await this.syncCvMetaToCloud(value);
            } else if (key === AppConfig.STORAGE_KEYS.CATEGORIES && Array.isArray(value)) {
                await this.syncConfigRowToCloud('config.categories', JSON.stringify(value));
            } else if (key === AppConfig.STORAGE_KEYS.SOFTWARE && Array.isArray(value)) {
                await this.syncConfigRowToCloud('config.software_stack', JSON.stringify(value));
            } else if (key === AppConfig.STORAGE_KEYS.ADMIN_PASSWORD && typeof value === 'string') {
                await this.syncConfigRowToCloud('config.admin_password', value);
            }
        } catch (error) {
            console.warn(`Error sincronizando "${key}" hacia Supabase:`, error);
        }
    }

    async syncConfigRowToCloud(clave, contenido) {
        if (!this.supabase) return;
        const table = this.supabaseConfig.TABLES.TEXTS;
        const { error } = await this.supabase.from(table).upsert(
            [
                {
                    clave,
                    contenido: String(contenido ?? ''),
                    seccion: 'config'
                }
            ],
            { onConflict: 'clave' }
        );
        if (error) {
            console.warn(`Error guardando configuración "${clave}" en Supabase:`, error.message);
        }
    }

    async seedProjectsIfEmpty(defaultProjects) {
        if (!this.supabase || !Array.isArray(defaultProjects) || defaultProjects.length === 0) return;
        try {
            const { data, error } = await this.supabase
                .from(this.supabaseConfig.TABLES.PROJECTS)
                .select('id')
                .limit(1);
            if (!error && Array.isArray(data) && data.length === 0) {
                await this.syncProjectsToCloud(defaultProjects);
            }
        } catch (err) {
            console.warn('Error verificando semilla inicial de proyectos:', err);
        }
    }

    async syncProjectsToCloud(projects) {
        if (!this.supabase) return;
        const table = this.supabaseConfig.TABLES.PROJECTS;

        const { error: delError } = await this.supabase
            .from(table)
            .delete()
            .neq('titulo', '__never_match__');

        if (delError) {
            console.warn('No se pudo actualizar tabla proyectos:', delError.message);
            return;
        }

        if (projects.length === 0) return;

        const payload = projects.map((proj, index) => {
            const is2D = proj.type === '2d' || (!proj.model && !proj.embedUrl) || proj.category === '2d';
            const galleryList =
                Array.isArray(proj.images) && proj.images.length > 0
                    ? proj.images
                    : proj.image
                    ? [proj.image]
                    : [];
            const enlaceVal = is2D
                ? `2d-gallery:${JSON.stringify(galleryList)}`
                : proj.embedUrl || '';

            return {
                titulo: proj.name,
                categoria: proj.category || 'otros',
                imagen_url: proj.image || galleryList[0] || '',
                modelo_3d_url: is2D ? '' : (proj.model || ''),
                enlace_proyecto: enlaceVal,
                descripcion: proj.description || '',
                orden: index + 1,
                activo: true
            };
        });

        const { error: insError } = await this.supabase.from(table).insert(payload);
        if (insError) {
            console.warn('Error insertando proyectos en Supabase:', insError.message);
        }
    }

    async syncTextsToCloud(textsMap) {
        if (!this.supabase) return;
        const table = this.supabaseConfig.TABLES.TEXTS;
        const entries = Object.entries(textsMap);

        if (entries.length === 0) return;

        const rows = entries.map(([clave, contenido]) => ({
            clave,
            contenido: String(contenido ?? ''),
            seccion: clave.startsWith('about.') ? 'sobre_mi' : 'inicio'
        }));

        const { error } = await this.supabase.from(table).upsert(rows, { onConflict: 'clave' });
        if (error) {
            console.warn('Error guardando textos en Supabase:', error.message);
        }
    }

    async syncLinksToCloud(linksObj) {
        if (!this.supabase) return;
        const table = this.supabaseConfig.TABLES.LINKS;
        const rows = [];

        ['contactBtn', 'emailLink', 'instagramLink'].forEach((clave, idx) => {
            if (linksObj[clave]) {
                rows.push({
                    clave,
                    titulo: linksObj[clave].text || '',
                    url: linksObj[clave].href || '',
                    tipo: clave === 'instagramLink' ? 'red_social' : 'contacto',
                    orden: idx + 10,
                    activo: true
                });
            }
        });

        if (rows.length === 0) return;

        const { error } = await this.supabase.from(table).upsert(rows, { onConflict: 'clave' });
        if (error) {
            console.warn('Error guardando enlaces en Supabase:', error.message);
        }
    }

    async syncCvMetaToCloud(meta) {
        if (!this.supabase || !meta?.url) return;
        const table = this.supabaseConfig.TABLES.LINKS;
        const { error } = await this.supabase.from(table).upsert(
            [
                {
                    clave: 'cv_pdf',
                    titulo: meta.fileName || 'Hoja_de_Vida_Steban_Gomez.pdf',
                    url: meta.url,
                    tipo: 'archivo',
                    orden: 1,
                    activo: true
                }
            ],
            { onConflict: 'clave' }
        );
        if (error) {
            console.warn('Error sincronizando enlace de CV en Supabase:', error.message);
        }
    }

    readFileAsDataUrl(file) {
        return new Promise((resolve) => {
            if (!file) {
                resolve(null);
                return;
            }
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result || null);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
        });
    }

    async uploadAssetToCloud(file, folder = 'proyectos') {
        if (!file) return null;
        if (!this.supabase) {
            return file.type?.startsWith('image/') ? this.readFileAsDataUrl(file) : null;
        }
        const bucket = this.supabaseConfig.BUCKET;
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const filePath = `${folder}/${Date.now()}_${safeName}`;

        const { error: uploadError } = await this.supabase.storage
            .from(bucket)
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: true,
                contentType: file.type || 'application/octet-stream'
            });

        if (uploadError) {
            console.warn(`No se pudo subir el archivo a Supabase Storage (${folder}):`, uploadError.message);
            if (file.type && file.type.startsWith('image/')) {
                return this.readFileAsDataUrl(file);
            }
            return null;
        }

        const { data } = this.supabase.storage.from(bucket).getPublicUrl(filePath);
        return data?.publicUrl || null;
    }

    async uploadCvToCloud(file) {
        const publicUrl = await this.uploadAssetToCloud(file, 'cv');
        if (publicUrl) {
            await this.syncCvMetaToCloud({
                fileName: file.name,
                url: publicUrl
            });
        }
        return publicUrl;
    }

    openCvDatabase() {
        return new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                reject(new Error('IndexedDB no soportado'));
                return;
            }
            const request = indexedDB.open(this.dbConfig.NAME, this.dbConfig.VERSION);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.dbConfig.STORE)) {
                    db.createObjectStore(this.dbConfig.STORE);
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async saveCvFile(fileData) {
        const db = await this.openCvDatabase();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.dbConfig.STORE, 'readwrite');
            const store = tx.objectStore(this.dbConfig.STORE);
            store.put(fileData, this.dbConfig.RECORD_KEY);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    async getCvFile() {
        const db = await this.openCvDatabase();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.dbConfig.STORE, 'readonly');
            const store = tx.objectStore(this.dbConfig.STORE);
            const req = store.get(this.dbConfig.RECORD_KEY);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error);
        });
    }
}
