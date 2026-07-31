document.addEventListener("DOMContentLoaded", async () => {
    const chatMessages = document.getElementById("chat-messages");
    const typingIndicator = document.getElementById("typing-indicator");
    const actionButtonsWrapper = document.getElementById("action-buttons-wrapper");
    const pauseResumeBtn = document.getElementById("pause-resume-btn");
    const pauseIcon = document.getElementById("pause-icon");
    const playIcon = document.getElementById("play-icon");
    const resetBtn = document.getElementById("reset-btn");

    let isPaused = false;
    let autoPauseByScroll = false;
    let autoPauseByVisibility = false;
    let autoPauseByModal = false;
    let currentTimeout = null;

    // Test modu için hızlı süre ayarı (true iken delay ve duration'lar 500ms olur)
    const TEST_MODE = true;

    // Arka Plan Müzik Sistemi
    const musicFiles = [
        "assets/musics/Another Bond.mp3",
        "assets/musics/Apocalypse (Instrumental Version).mp3",
        "assets/musics/oneheart - this feeling.mp3",
        "assets/musics/oneheart x reidenshi - snowfall.mp3",
        "assets/musics/Routine.mp3",
        "assets/musics/the end..mp3"
    ];

    function shuffleArray(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    let randomizedPlayList = shuffleArray(musicFiles);
    let currentMusicIndex = 0;
    const backgroundAudio = new Audio();
    backgroundAudio.volume = 0.25; // Ambiyans için düşük ses seviyesi
    let isMusicManuallyStopped = false;

    function playCurrentMusic() {
        if (isMusicManuallyStopped) return;
        backgroundAudio.src = randomizedPlayList[currentMusicIndex];
        backgroundAudio.load();
        backgroundAudio.play().then(() => {
            console.log("Müzik çalmaya başladı:", randomizedPlayList[currentMusicIndex]);
        }).catch(err => {
            console.log("Tarayıcı otomatik oynatma engeli, ilk kullanıcı etkileşimi bekleniyor...", err);
            const startOnInteraction = () => {
                if (!isMusicManuallyStopped) {
                    backgroundAudio.play().catch(e => console.log("Oynatma hatası:", e));
                }
                document.removeEventListener("click", startOnInteraction);
                document.removeEventListener("keydown", startOnInteraction);
                document.removeEventListener("touchstart", startOnInteraction);
            };
            document.addEventListener("click", startOnInteraction, { once: true });
            document.addEventListener("keydown", startOnInteraction, { once: true });
            document.addEventListener("touchstart", startOnInteraction, { once: true });
        });
    }

    backgroundAudio.addEventListener("ended", () => {
        currentMusicIndex = (currentMusicIndex + 1) % randomizedPlayList.length;
        if (currentMusicIndex === 0) {
            randomizedPlayList = shuffleArray(musicFiles);
        }
        playCurrentMusic();
    });

    playCurrentMusic();

    // Tam Ekran Medya Modal İşlevselliği
    const mediaModal = document.getElementById("media-modal");
    const mediaModalContentContainer = document.getElementById("media-modal-content-container");
    const mediaModalClose = document.querySelector(".media-modal-close");

    function openMediaModal(element) {
        // Modal açıldığında sohbet akışını otomatik durdur
        if (!isPaused) {
            autoPauseByModal = true;
            setPausedState(true);
        }

        mediaModalContentContainer.innerHTML = "";
        let clonedElement;
        if (element.tagName === "IMG") {
            clonedElement = document.createElement("img");
            clonedElement.src = element.src;
            clonedElement.alt = element.alt || "Tam Ekran Görsel";
        } else if (element.tagName === "VIDEO") {
            clonedElement = document.createElement("video");
            clonedElement.src = element.src;
            clonedElement.controls = true;
            clonedElement.autoplay = true;
            clonedElement.playsInline = true;
        }
        if (clonedElement) {
            mediaModalContentContainer.appendChild(clonedElement);
            mediaModal.style.display = "flex";
        }
    }

    function closeMediaModal() {
        mediaModal.style.display = "none";
        mediaModalContentContainer.innerHTML = "";

        // Modal kapandığında eğer otomatik durdurulduysa akışı devam ettir
        if (autoPauseByModal && isPaused) {
            autoPauseByModal = false;
            setPausedState(false);
        }
    }

    mediaModalClose.addEventListener("click", closeMediaModal);
    mediaModal.addEventListener("click", (e) => {
        if (e.target === mediaModal) {
            closeMediaModal();
        }
    });

    // Sohbet içerisindeki görsellere ve videolara tıklama olayı ekleme (Event Delegation)
    chatMessages.addEventListener("click", (e) => {
        if (e.target.tagName === "IMG" || e.target.tagName === "VIDEO") {
            openMediaModal(e.target);
        }
    });

    try {
        const response = await fetch("assets/main.json");
        const items = await response.json();
        
        let currentIndex = 0;
        const savedIndex = localStorage.getItem("ezgi_chat_index");

        // 4. Eğer daha önceden kalınan bir index varsa, 0'dan o indexe kadar olanları delay'siz (instant) render et
        if (savedIndex !== null) {
            const parsed = parseInt(savedIndex, 10);
            if (!isNaN(parsed) && parsed > 0) {
                currentIndex = Math.min(parsed, items.length);
                for (let i = 0; i < currentIndex; i++) {
                    renderItemInstant(items[i]);
                }
            }
        }

        // 3. Sadece index kaydedilecek (chat history localStorage'da saklanmayacak)
        function saveCurrentProgress() {
            localStorage.setItem("ezgi_chat_index", currentIndex);
        }

        function processNextItem() {
            if (isPaused) return;
            if (currentIndex >= items.length) return;

            const item = items[currentIndex];

            if (item.type === "message" || item.type === "letter") {
                showTypingIndicator();

                const delay = TEST_MODE ? 500 : (item.delay !== undefined ? item.delay : 1000);
                const duration = TEST_MODE ? 500 : (item.duration !== undefined ? item.duration : 2000);

                currentTimeout = setTimeout(() => {
                    if (isPaused) return;
                    hideTypingIndicator();
                    renderItem(item);
                    currentIndex++; 
                    saveCurrentProgress();
                    
                    currentTimeout = setTimeout(() => {
                        if (isPaused) return;
                        processNextItem();
                    }, duration);

                }, delay);

            } else if (item.type === "buttons") {
                const delay = TEST_MODE ? 500 : (item.delay !== undefined ? item.delay : 1000);
                currentTimeout = setTimeout(() => {
                    if (isPaused) return;
                    renderButtons(item.buttons, () => {
                        currentIndex++;
                        saveCurrentProgress();
                        processNextItem();
                    });
                }, delay);
            } else if (item.type === "end") {
                // End bloğu gelince de index'i kaydedip ilerleyelim
                currentIndex++;
                saveCurrentProgress();
                processNextItem();
            }
        }

        function showTypingIndicator() {
            chatMessages.appendChild(typingIndicator);
            typingIndicator.style.display = "flex";
            scrollToBottom();
        }

        function hideTypingIndicator() {
            typingIndicator.style.display = "none";
        }

        function renderItem(item) {
            if (item.type === "message") {
                const msgDiv = document.createElement("div");
                msgDiv.className = "message incoming";
                
                let contentHtml = "";
                
                let hasMultipleMedia = (
                    (item.photos && item.photos.length > 1) ||
                    (item.videos && item.videos.length > 1) ||
                    ((item.photos && item.photos.length > 0) && (item.videos && item.videos.length > 0))
                );

                if (hasMultipleMedia) {
                    contentHtml += `<div class="photo-gallery">`;
                    if (item.photos && Array.isArray(item.photos)) {
                        item.photos.forEach(photoUrl => {
                            contentHtml += `<img src="${photoUrl}" alt="Hatıra">`;
                        });
                    }
                    if (item.videos && Array.isArray(item.videos)) {
                        item.videos.forEach(videoUrl => {
                            contentHtml += `<video src="${videoUrl}" autoplay muted loop playsinline></video>`;
                        });
                    }
                    contentHtml += `</div>`;
                } else {
                    if (item.photos && Array.isArray(item.photos) && item.photos.length === 1) {
                        contentHtml += `<img src="${item.photos[0]}" alt="Hatıra" class="single-photo">`;
                    }
                    if (item.videos && Array.isArray(item.videos) && item.videos.length === 1) {
                        contentHtml += `<video src="${item.videos[0]}" autoplay muted loop playsinline class="single-video"></video>`;
                    }
                }

                contentHtml += `<p>${item.text}</p>`;

                msgDiv.innerHTML = contentHtml;
                chatMessages.appendChild(msgDiv);
            } else if (item.type === "letter") {
                const letterDiv = document.createElement("div");
                letterDiv.className = "letter-card";
                
                const formattedContent = item.content ? item.content.replace(/\n\n/g, '<br><br>') : '';
                letterDiv.innerHTML = `<p>${formattedContent}</p>`;
                chatMessages.appendChild(letterDiv);
            }
            scrollToBottom();
        }

        function renderItemInstant(item) {
            if (item.type === "message") {
                const msgDiv = document.createElement("div");
                msgDiv.className = "message incoming";
                
                let contentHtml = "";
                
                let hasMultipleMedia = (
                    (item.photos && item.photos.length > 1) ||
                    (item.videos && item.videos.length > 1) ||
                    ((item.photos && item.photos.length > 0) && (item.videos && item.videos.length > 0))
                );

                if (hasMultipleMedia) {
                    contentHtml += `<div class="photo-gallery">`;
                    if (item.photos && Array.isArray(item.photos)) {
                        item.photos.forEach(photoUrl => {
                            contentHtml += `<img src="${photoUrl}" alt="Hatıra">`;
                        });
                    }
                    if (item.videos && Array.isArray(item.videos)) {
                        item.videos.forEach(videoUrl => {
                            contentHtml += `<video src="${videoUrl}" autoplay muted loop playsinline></video>`;
                        });
                    }
                    contentHtml += `</div>`;
                } else {
                    if (item.photos && Array.isArray(item.photos) && item.photos.length === 1) {
                        contentHtml += `<img src="${item.photos[0]}" alt="Hatıra" class="single-photo">`;
                    }
                    if (item.videos && Array.isArray(item.videos) && item.videos.length === 1) {
                        contentHtml += `<video src="${item.videos[0]}" autoplay muted loop playsinline class="single-video"></video>`;
                    }
                }

                contentHtml += `<p>${item.text}</p>`;

                msgDiv.innerHTML = contentHtml;
                chatMessages.appendChild(msgDiv);
            } else if (item.type === "letter") {
                const letterDiv = document.createElement("div");
                letterDiv.className = "letter-card";
                
                const formattedContent = item.content ? item.content.replace(/\n\n/g, '<br><br>') : '';
                letterDiv.innerHTML = `<p>${formattedContent}</p>`;
                chatMessages.appendChild(letterDiv);
            } else if (item.type === "buttons") {
                // Butonlar geçmişte kaldıysa es geçilir
            }
            scrollToBottom();
        }

        function renderButtons(buttonsArray, onSelect) {
            actionButtonsWrapper.innerHTML = "";
            buttonsArray.forEach(btnData => {
                const btn = document.createElement("button");
                btn.className = "action-btn";
                btn.textContent = btnData.text;
                btn.addEventListener("click", () => {
                    const userMsg = document.createElement("div");
                    userMsg.className = "message outgoing";
                    userMsg.textContent = btnData.text;
                    chatMessages.appendChild(userMsg);
                    scrollToBottom();

                    actionButtonsWrapper.innerHTML = "";

                    saveCurrentProgress();

                    if (btnData.action === "later") {
                        isPaused = true;
                        if (currentTimeout) clearTimeout(currentTimeout);
                        
                        showTypingIndicator();
                        
                        setTimeout(() => {
                            hideTypingIndicator();
                            const systemMsg = document.createElement("div");
                            systemMsg.className = "message incoming";
                            systemMsg.textContent = "Tamam o zaman, daha sonra geldiğinde yine aynı linkten bu sayfayı açabilirsin, ben seni bekliyor olacağım.";
                            chatMessages.appendChild(systemMsg);
                            scrollToBottom();
                            
                            currentIndex++;
                            saveCurrentProgress();

                            localStorage.setItem("ezgi_waiting_later", "true");
                            renderResumeLaterButton(() => {
                                localStorage.removeItem("ezgi_waiting_later");
                                isPaused = false;
                                processNextItem();
                            });
                        }, 1200);

                        return;
                    }

                    if (onSelect) onSelect();
                });
                actionButtonsWrapper.appendChild(btn);
            });
            scrollToBottom();
        }

        function renderResumeLaterButton(onResume) {
            actionButtonsWrapper.innerHTML = "";
            const btn = document.createElement("button");
            btn.className = "action-btn";
            btn.textContent = "Geldim, devam edebilirsin";
            btn.addEventListener("click", () => {
                const userMsg = document.createElement("div");
                userMsg.className = "message outgoing";
                userMsg.textContent = "Geldim, devam edebilirsin";
                chatMessages.appendChild(userMsg);
                scrollToBottom();

                actionButtonsWrapper.innerHTML = "";
                saveCurrentProgress();

                if (onResume) onResume();
            });
            actionButtonsWrapper.appendChild(btn);
            scrollToBottom();
        }

        function scrollToBottom() {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        function setPausedState(paused) {
            isPaused = paused;
            if (isPaused) {
                pauseIcon.style.display = "none";
                playIcon.style.display = "block";
                if (currentTimeout) {
                    clearTimeout(currentTimeout);
                }
            } else {
                pauseIcon.style.display = "block";
                playIcon.style.display = "none";
                processNextItem();
            }
        }

        // Kullanıcı yukarı kaydırdığında veya aşağıda olmadığında otomatik duraklatma (Mobile touch & scroll detection)
        let lastScrollTop = chatMessages.scrollTop;
        
        chatMessages.addEventListener("scroll", () => {
            const currentScrollTop = chatMessages.scrollTop;
            const maxScrollTop = chatMessages.scrollHeight - chatMessages.clientHeight;
            const isAtBottom = maxScrollTop - currentScrollTop <= 20;

            if (currentScrollTop < lastScrollTop && !isAtBottom) {
                if (!isPaused) {
                    autoPauseByScroll = true;
                    setPausedState(true);
                }
            } 
            else if (isAtBottom && autoPauseByScroll && isPaused) {
                autoPauseByScroll = false;
                setPausedState(false);
            }

            lastScrollTop = currentScrollTop;
        });

        // Sayfa görünürlük değişimi (Ekran kapatma, sekme değiştirme, arka plana atma)
        document.addEventListener("visibilitychange", () => {
            if (localStorage.getItem("ezgi_waiting_later") === "true") {
                return;
            }

            if (document.hidden) {
                if (!isMusicManuallyStopped) {
                    backgroundAudio.pause();
                }
                if (!isPaused) {
                    autoPauseByVisibility = true;
                    setPausedState(true);
                }
            } else {
                if (!isMusicManuallyStopped) {
                    backgroundAudio.play().catch(e => console.log("Müzik devam ettirme hatası:", e));
                }
                if (autoPauseByVisibility && isPaused) {
                    autoPauseByVisibility = false;
                    setPausedState(false);
                }
            }
        });

        // Duraklat / Devam Et buton işlevi
        pauseResumeBtn.addEventListener("click", () => {
            autoPauseByScroll = false;
            autoPauseByVisibility = false;
            autoPauseByModal = false;
            
            const willBePaused = !isPaused;
            setPausedState(willBePaused);

            if (willBePaused) {
                backgroundAudio.pause();
                isMusicManuallyStopped = true;
            } else {
                isMusicManuallyStopped = false;
                backgroundAudio.play().catch(e => console.log("Müzik devam ettirme hatası:", e));
            }
        });

        // 5. Reset butonuna basıldığında index silinir, chat-messages temizlenir ve sayfa yenilenir (veya baştan başlar)
        resetBtn.addEventListener("click", () => {
            if (confirm("Sohbeti baştan başlatmak istediğine emin misin?")) {
                localStorage.removeItem("ezgi_chat_index");
                localStorage.removeItem("ezgi_waiting_later");
                localStorage.removeItem("ezgi_chat_ended");
                chatMessages.innerHTML = "";
                actionButtonsWrapper.innerHTML = "";
                location.reload();
            }
        });

        // Sayfa açıldığında "Daha sonra geleceğim" kontrolü veya akışı başlatma
        const isWaitingLater = localStorage.getItem("ezgi_waiting_later");
        if (isWaitingLater === "true") {
            isPaused = true;
            renderResumeLaterButton(() => {
                localStorage.removeItem("ezgi_waiting_later");
                isPaused = false;
                processNextItem();
            });
        } else {
            processNextItem();
        }

    } catch (error) {
        console.error("JSON yüklenirken hata oluştu:", error);
    }
});
