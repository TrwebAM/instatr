/**
 * Global Event Feed - Lógica e Integración con Firebase (app.js)
 * Proyecto: instatr-75546 - PARTE 1 (Publicaciones en Vivo)
 */

// I. IMPORTAR LIBRERÍAS DE FIREBASE DESDE LA CDN OFICIAL (Versión Módulos)
// Firebase Core
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

// Cloud Firestore
import {
    getFirestore,
    collection,
    addDoc,
    serverTimestamp,
    query,
    orderBy,
    onSnapshot,
    updateDoc,
    doc,
    increment
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

// Cloud Storage
import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-storage.js";

// II. CONFIGURACIÓN DE TUS CREDENCIALES REALES
const firebaseConfig = {
    apiKey: "AIzaSyCSgIYiNPq1ZRyFZwGSiniWzbPbYALMkHY",
    authDomain: "://firebaseapp.com",
    projectId: "instatr-75546",
    storageBucket: "instatr-75546.firebasestorage.app",
    messagingSenderId: "397516947439",
    appId: "1:397516947439:web:dbb6182669194f6adc001a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let idPublicacionActiva = null;
let desescribirComentariosQuery = null;

document.addEventListener("DOMContentLoaded", () => {

    const feedScroll = document.querySelector(".feed-scroll");
    const botonCamara = document.getElementById("btn-camara");
    const modalPublish = document.getElementById("modal-publicar");
    const btnCancelarPublish = document.getElementById("btn-cancelar");
    const btnSubirPublish = document.getElementById("btn-subir");
    const imgPreview = document.getElementById("img-preview");
    const txtCaption = document.getElementById("txt-caption");
    const charCount = document.getElementById("char-count");

    const modalComments = document.getElementById("modal-comentarios");
    const btnCerrarComments = document.getElementById("btn-cerrar-comentarios");
    const listaComentarios = document.getElementById("lista-comentarios");
    const inputNuevoComentario = document.getElementById("input-nuevo-comentario");
    const btnEnviarComentario = document.getElementById("btn-enviar-comentario");


    // ==========================================================================
    // CONTROL DE NAVEGACIÓN: HOME SCREEN Y SCROLL AUTOMÁTICO
    // ==========================================================================
    const homeBienvenida = document.getElementById("home-bienvenida");
    const btnEntrarApp = document.getElementById("btn-entrar-app");
    const navHome = document.getElementById("nav-home");
    const navScrollTop = document.getElementById("nav-scroll-top");

    if (homeBienvenida && btnEntrarApp) {
        const yaHaVisitado = localStorage.getItem("trane_visited");

        if (yaHaVisitado) {
            homeBienvenida.style.display = "none";
            homeBienvenida.classList.add("hidden");
        }

        // Al dar clic en "Entrar" desvanecemos el Home
        btnEntrarApp.addEventListener("click", () => {
            localStorage.setItem("trane_visited", "true");
            homeBienvenida.classList.add("hidden");
            setTimeout(() => {
                homeBienvenida.style.display = "none";
            }, 500);
        });
    }

    // ACCIÓN: Regresar al Home al pulsar la Casita (revelar la pantalla de bienvenida)
    if (navHome && homeBienvenida) {
        navHome.addEventListener("click", () => {
            homeBienvenida.style.display = "flex";
            // Forzar un pequeño retraso para que el navegador capte el cambio antes de animar la opacidad
            setTimeout(() => {
                homeBienvenida.classList.remove("hidden");
            }, 10);
        });
    }

    // ACCIÓN NUEVA: Hacer scroll automático suave hasta arriba del todo (último post subido)
    if (navScrollTop && feedScroll) {
        navScrollTop.addEventListener("click", () => {
            feedScroll.scrollTo({
                top: 0,
                behavior: "smooth" // Deslizamiento fluido estilo Instagram móvil
            });
        });
    }


   const navShareQr = document.getElementById("nav-share-qr");
    const modalShareQr = document.getElementById("modal-compartir-qr");
    const btnCerrarShareQr = document.getElementById("btn-cerrar-share-qr");
    const containerCanvasQr = document.getElementById("canvas-qr-compartir");

    if (navShareQr && modalShareQr && containerCanvasQr) {
        navShareQr.addEventListener("click", async () => {
            try {
                // 1. Validar si el SVG ya fue cargado previamente para no repetir la petición
                if (!containerCanvasQr.querySelector("svg")) {
                    // 2. Leer el archivo local de forma pura y asíncrona
                    const respuesta = await fetch("qr-code.svg");
                    if (!respuesta.ok) throw new Error("No se encontró el archivo qr-code.svg");
                    
                    const codigoSvgPuro = await respuesta.text();
                    
                    // 3. Inyectar el código XML del vector directamente en el DOM
                    containerCanvasQr.innerHTML = codigoSvgPuro;
                }
                
                // 4. Desplegar el modal hacia arriba
                modalShareQr.classList.add("active");
                
            } catch (error) {
                console.error("Error al inyectar el SVG nativo:", error);
                containerCanvasQr.innerHTML = "<p style='font-size:12px; color:#666;'>Error al cargar el QR</p>";
                modalShareQr.classList.add("active");
            }
        });
    }

    if (btnCerrarShareQr && modalShareQr) {
        btnCerrarShareQr.addEventListener("click", () => {
            modalShareQr.classList.remove("active");
        });
    }

    // EL BOTÓN DE LA FLECHA: Hace scroll suave inmediato al inicio (último post en Firebase)
    if (navScrollTop && feedScroll) {
        navScrollTop.addEventListener("click", () => {
            feedScroll.scrollTo({
                top: 0,
                behavior: "smooth" // Desplazamiento animado estilo móvil
            });
        });
    }

    // ==========================================================================
    // CONTROL DE PRIMERA VISITA (HOME SCREEN AUTO-SKIP)
    // ==========================================================================
   
    if (homeBienvenida && btnEntrarApp) {
        // Verificar si la marca "trane_visited" ya existe en la memoria del celular
        const yaHaVisitado = localStorage.getItem("trane_visited");

        if (yaHaVisitado) {
            // Si ya ha entrado antes, eliminamos el Home de inmediato sin animaciones
            homeBienvenida.style.display = "none";
        } else {
            // Si es su primera vez, dejamos la pantalla visible y activamos el botón
            btnEntrarApp.addEventListener("click", () => {
                // Guardar la marca permanente en el navegador del dispositivo
                localStorage.setItem("trane_visited", "true");

                // Transición de desvanecimiento suave para revelar el carrusel directo
                homeBienvenida.classList.add("hidden");

                // Opcional: Remover del DOM tras terminar la animación para liberar memoria
                setTimeout(() => {
                    homeBienvenida.style.display = "none";
                }, 500);
            });
        }
    }



    let imagenBase64ParaSubir = null;

    // ==========================================================================
    // 1. ESCUCHAR PUBLICACIONES EN TIEMPO REAL (VISTA DEL FEED GLOBAL)
    // ==========================================================================
    const qPosts = query(collection(db, "publicaciones"), orderBy("createdAt", "desc"));

    onSnapshot(qPosts, (snapshot) => {
        feedScroll.innerHTML = "";

        if (snapshot.empty) {
            feedScroll.innerHTML = `
                <div style="text-align: center; color: #8e8e8e; margin-top: 50%; padding: 20px;">
                    <p style="font-size: 24px;">📸</p>
                    <p style="font-size: 14px; font-weight: 500;">¡El muro está vacío!</p>
                    <p style="font-size: 12px; margin-top: 5px;">Sé el primero en inaugurar el carrusel.</p>
                </div>
            `;
            return;
        }

        snapshot.forEach((postDoc) => {
            const data = postDoc.data();
            const fechaFirebase = data.createdAt ? data.createdAt.toDate() : new Date();
            const horaMinuto = fechaFirebase.toLocaleTimeString('es-ES', {
                hour: '2-digit', minute: '2-digit', hour12: true
            });

            const llaveVotoLocal = localStorage.getItem(`liked_post_${postDoc.id}`);
            const claseLiked = llaveVotoLocal ? "liked" : "";
            const estiloEsteticoSvg = llaveVotoLocal ? "fill: #FF4B4B; stroke: #FF4B4B;" : "fill: none; stroke: #262626;";

            const postSection = document.createElement("section");
            postSection.className = "post-card";

            // CAMBIO AQUÍ: Ahora inyectamos una etiqueta <img> en lugar de un background-image inline
            postSection.innerHTML = `
    <div class="post-image">
        <img src="${data.imageData}" alt="Post Event" class="post-main-img">
        
        <div class="post-content">
            <p class="post-caption">${data.caption || ""}</p>
            
            <div class="interaction-bar">
                <div class="action-group">
                    <button class="action-btn btn-like ${claseLiked}" data-id="${postDoc.id}">
                        <svg viewBox="0 0 24 24" style="${estiloEsteticoSvg} stroke-width: 2;"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                        <span>${data.likesCount || 0}</span>
                    </button>
                    <button class="action-btn btn-comment-trigger" data-id="${postDoc.id}">
                        <svg viewBox="0 0 24 24" style="fill: none; stroke: #262626; stroke-width: 2;"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                        <span>${data.commentsCount || 0}</span>
                    </button>
                </div>
                <div class="post-time">${horaMinuto}</div>
            </div>
        </div>
    </div>
`;


            feedScroll.appendChild(postSection);
        });


        vincularEventosMuro();
    });

    function vincularEventosMuro() {
        // A. Interacción de "Me gusta" globales (Control de un solo voto por dispositivo)
        document.querySelectorAll(".btn-like").forEach(boton => {
            boton.addEventListener("click", async () => {
                const postId = boton.getAttribute("data-id");
                const docRef = doc(db, "publicaciones", postId);
                const svg = boton.querySelector("svg");

                let dispositivoId = localStorage.getItem("trane_device_id");
                if (!dispositivoId) {
                    dispositivoId = "dev_" + Math.random().toString(36).substring(2, 15) + Date.now();
                    localStorage.setItem("trane_device_id", dispositivoId);
                }

                const llaveVoto = `liked_post_${postId}`;
                const yaVoto = localStorage.getItem(llaveVoto);

                if (yaVoto) {
                    boton.classList.remove("liked");
                    svg.style.fill = "none";
                    svg.style.stroke = "#262626";
                    localStorage.removeItem(llaveVoto);
                    await updateDoc(docRef, { likesCount: increment(-1) });
                } else {
                    boton.classList.add("liked");
                    svg.style.fill = "#FF4B4B";
                    svg.style.stroke = "#FF4B4B";
                    localStorage.setItem(llaveVoto, "true");
                    await updateDoc(docRef, { likesCount: increment(1) });
                }
            });
        });

        // B. Interacción para desplegar la ventana de comentarios en tiempo real
        document.querySelectorAll(".btn-comment-trigger").forEach(boton => {
            boton.addEventListener("click", () => {
                idPublicacionActiva = boton.getAttribute("data-id");
                abrirModalComentarios(idPublicacionActiva);
            });
        });

        // C. ACTUALIZADO: Interacción para abrir la imagen en Pantalla Completa con su Pie de Foto
        const lightbox = document.getElementById("lightbox-foto");
        const imgLightboxSrc = document.getElementById("img-lightbox-src");
        const txtLightboxCaption = document.getElementById("txt-lightbox-caption");

        document.querySelectorAll(".post-card").forEach(card => {
            const imagen = card.querySelector(".post-main-img");
            const captionOriginal = card.querySelector(".post-caption");

            if (imagen) {
                imagen.addEventListener("click", () => {
                    // Pasar la cadena Base64 al visor grande
                    imgLightboxSrc.src = imagen.src;

                    // Extraer de forma exacta el pie de página de esta tarjeta y pasarlo abajo de la foto grande
                    txtLightboxCaption.innerText = captionOriginal ? captionOriginal.innerText : "";

                    // Activar la clase CSS para hacer visible el Lightbox con su animación suave
                    lightbox.classList.add("active");
                });
            }
        });
    }

    // Escuchador global fuera de la función para cerrar la pantalla completa (Lightbox) y vaciar textos
    const btnCerrarLightbox = document.getElementById("btn-cerrar-lightbox");
    const lightboxContainer = document.getElementById("lightbox-foto");

    if (btnCerrarLightbox && lightboxContainer) {
        btnCerrarLightbox.addEventListener("click", () => {
            lightboxContainer.classList.remove("active");
            document.getElementById("img-lightbox-src").src = ""; // Liberar memoria del navegador
            document.getElementById("txt-lightbox-caption").innerText = ""; // Limpiar texto al ocultarse
        });
    }

    // LISTAR COMENTARIOS EN TIEMPO REAL
    function abrirModalComentarios(postId) {
        listaComentarios.innerHTML = "<p style='text-align:center; font-size:12px; color:#8e8e8e;'>Cargando comentarios...</p>";
        modalComments.classList.add("active");

        if (desescribirComentariosQuery) desescribirComentariosQuery();

        const qComments = query(collection(db, "publicaciones", postId, "comentarios"), orderBy("createdAt", "asc"));

        desescribirComentariosQuery = onSnapshot(qComments, (snapshot) => {
            listaComentarios.innerHTML = "";
            if (snapshot.empty) {
                listaComentarios.innerHTML = "<p style='text-align:center; font-size:12px; color:#8e8e8e; margin-top:20px;'>No hay comentarios en esta foto.</p>";
                return;
            }
            snapshot.forEach((cDoc) => {
                const cData = cDoc.data();
                const cFecha = cData.createdAt ? cData.createdAt.toDate() : new Date();
                const cHora = cFecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true });

                const item = document.createElement("div");
                item.className = "comment-item";
                item.innerHTML = `${cData.texto} <span>${cHora}</span>`;
                listaComentarios.appendChild(item);
            });
            listaComentarios.scrollTop = listaComentarios.scrollHeight;
        });
    }

    if (btnCerrarComments) {
        btnCerrarComments.addEventListener("click", () => {
            modalComments.classList.remove("active");
            if (desescribirComentariosQuery) desescribirComentariosQuery();
            idPublicacionActiva = null;
        });
    }

    // ESCRIBIR Y ENVIAR NUEVO COMENTARIO
    if (btnEnviarComentario) {
        btnEnviarComentario.addEventListener("click", async () => {
            const texto = inputNuevoComentario.value.trim();
            if (!texto || !idPublicacionActiva) return;
            inputNuevoComentario.value = "";
            try {
                await addDoc(collection(db, "publicaciones", idPublicacionActiva, "comentarios"), {
                    texto: texto, createdAt: serverTimestamp()
                });
                await updateDoc(doc(db, "publicaciones", idPublicacionActiva), { commentsCount: increment(1) });
            } catch (err) { console.error(err); }
        });
    }

    // ==========================================================================
    // 2. CAPTURA NATIVA, COMPRESIÓN ULTRA-LIVIANA Y TRATAMIENTO EN BASE64
    // ==========================================================================
    if (botonCamara) {
        const inputCamaraHidden = document.createElement("input");
        inputCamaraHidden.type = "file";
        inputCamaraHidden.accept = "image/*";
        inputCamaraHidden.capture = "environment";

        botonCamara.addEventListener("click", () => { inputCamaraHidden.click(); });

        inputCamaraHidden.addEventListener("change", (evento) => {
            const archivos = evento.target.files;
            if (archivos && archivos.length > 0) {
                const file = archivos[0]; // Capturar el primer archivo del arreglo de forma explícita

                const lector = new FileReader();
                lector.onload = (e) => {
                    const imgElement = new Image();
                    imgElement.src = e.target.result;

                    imgElement.onload = () => {
                        const canvas = document.createElement("canvas");
                        const MAX_ANCHO = 800; // Ancho máximo para optimizar peso (ideal pantallas móviles)
                        let ancho = imgElement.width;
                        let alto = imgElement.height;

                        if (ancho > MAX_ANCHO) {
                            alto = Math.round((alto * MAX_ANCHO) / ancho);
                            ancho = MAX_ANCHO;
                        }

                        canvas.width = ancho;
                        canvas.height = alto;
                        const ctx = canvas.getContext("2d");
                        ctx.drawImage(imgElement, 0, 0, ancho, alto);

                        // Reducción al 70% de calidad JPEG (Pesa apenas entre 80kb y 150kb)
                        imagenBase64ParaSubir = canvas.toDataURL("image/jpeg", 0.7);
                        imgPreview.src = imagenBase64ParaSubir;

                        txtCaption.value = "";
                        charCount.innerText = "0";
                        modalPublish.classList.add("active");
                    };
                };
                lector.readAsDataURL(file);
            }
        });
    }

    if (btnCancelarPublish) {
        btnCancelarPublish.addEventListener("click", () => {
            modalPublish.classList.remove("active");
            imagenBase64ParaSubir = null;
            imgPreview.src = "";
        });
    }

    if (txtCaption) {
        txtCaption.addEventListener("input", (e) => { charCount.innerText = e.target.value.length; });
    }

    // ==========================================================================
    // 3. ENVÍO DEL PAYLOAD TEXTUAL A CLOUD FIRESTORE
    // ==========================================================================
    if (btnSubirPublish) {
        btnSubirPublish.addEventListener("click", async () => {
            if (!imagenBase64ParaSubir) {
                alert("Por favor toma una foto primero.");
                return;
            }

            const textoPie = txtCaption.value.trim();
            btnSubirPublish.disabled = true;
            btnSubirPublish.innerText = "Publicando...";

            try {
                // Registro del documento indexando los bytes como cadena String pura
                await addDoc(collection(db, "publicaciones"), {
                    imageData: imagenBase64ParaSubir,
                    caption: textoPie,
                    likesCount: 0,
                    commentsCount: 0,
                    createdAt: serverTimestamp()
                });

                modalPublish.classList.remove("active");
                imagenBase64ParaSubir = null;
                imgPreview.src = "";

            } catch (error) {
                console.error("Error al guardar en Firestore:", error);
                alert("Error al publicar. Revisa que las Reglas de Firestore estén en modo público.");
            } finally {
                btnSubirPublish.disabled = false;
                btnSubirPublish.innerText = "Publicar";
            }
        });
    }
});
