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
    const TEST_MODE = false;

    // Uzun süre uzak kalma eşiği (ms cinsinden. Örn: 5 saniye = 5000)
    const AWAY_TIMEOUT_MS = 1000 * 60;

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
    backgroundAudio.volume = 0.25;
    let isMusicManuallyStopped = false;
    const musicIndicator = document.getElementById("music-indicator");
    const musicNameText = document.getElementById("music-name-text");

    function getCleanMusicName(src) {
        try {
            const decoded = decodeURIComponent(src);
            const fileName = decoded.split('/').pop();
            return fileName.replace(/\.[^/.]+$/, "");
        } catch (e) {
            return "Müzik";
        }
    }

    function updateMusicIndicator() {
        if (musicNameText && musicIndicator) {
            if (!backgroundAudio.paused && !backgroundAudio.ended && backgroundAudio.currentTime > 0) {
                const currentSrc = randomizedPlayList[currentMusicIndex];
                musicNameText.textContent = getCleanMusicName(currentSrc);
                musicIndicator.classList.add("active");
            } else {
                musicIndicator.classList.remove("active");
            }
        }
    }

    function playCurrentMusic() {
        if (isMusicManuallyStopped) return;
        backgroundAudio.src = randomizedPlayList[currentMusicIndex];
        backgroundAudio.load();
        backgroundAudio.play().then(() => {
            updateMusicIndicator();
        }).catch(err => {
            updateMusicIndicator();
            const startOnInteraction = () => {
                if (!isMusicManuallyStopped) {
                    backgroundAudio.play().then(() => {
                        updateMusicIndicator();
                    }).catch(e => console.log("Oynatma hatası:", e));
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

    backgroundAudio.addEventListener("play", updateMusicIndicator);
    backgroundAudio.addEventListener("pause", updateMusicIndicator);
    backgroundAudio.addEventListener("playing", updateMusicIndicator);
    backgroundAudio.addEventListener("timeupdate", updateMusicIndicator);

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
        if (!isPaused) {
            autoPauseByModal = true;
            setPausedState(true);
        }

        if (mediaModalContentContainer && mediaModal) {
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
    }

    function closeMediaModal() {
        if (mediaModal) {
            mediaModal.style.display = "none";
            mediaModalContentContainer.innerHTML = "";
        }

        if (autoPauseByModal && isPaused) {
            autoPauseByModal = false;
            setPausedState(false);
        }
    }

    if (mediaModalClose) mediaModalClose.addEventListener("click", closeMediaModal);
    if (mediaModal) {
        mediaModal.addEventListener("click", (e) => {
            if (e.target === mediaModal) closeMediaModal();
        });
    }

    if (chatMessages) {
        chatMessages.addEventListener("click", (e) => {
            if (e.target.tagName === "IMG" || e.target.tagName === "VIDEO") {
                openMediaModal(e.target);
            }
        });
    }

    try {
        const response = await fetch("assets/main.json");
        const items = await response.json();
        
        let currentIndex = 0;
        const savedIndex = localStorage.getItem("ezgi_chat_index");

        if (savedIndex !== null) {
            const parsed = parseInt(savedIndex, 10);
            if (!isNaN(parsed) && parsed > 0) {
                currentIndex = Math.min(parsed, items.length);
                for (let i = 0; i < currentIndex; i++) {
                    renderItemInstant(items[i]);
                }
            }
        }

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
                    hideTypingIndicator(); // Butonlar gösterilirken üç nokta kapatılıyor
                    renderButtons(item.buttons, () => {
                        currentIndex++;
                        saveCurrentProgress();
                        processNextItem();
                    });
                }, delay);
            } else if (item.type === "end") {
                hideTypingIndicator();
                currentIndex++;
                saveCurrentProgress();
                processNextItem();
            }
        }

        function showTypingIndicator() {
            if (chatMessages && typingIndicator) {
                chatMessages.appendChild(typingIndicator);
                typingIndicator.style.display = "flex";
                scrollToBottom();
            }
        }

        function hideTypingIndicator() {
            if (typingIndicator) {
                typingIndicator.style.display = "none";
            }
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
                        
                        // Bekleme durumlarında üç nokta efektini anında kapat
                        hideTypingIndicator();
                        
                        const systemMsg = document.createElement("div");
                        systemMsg.className = "message incoming";
                        systemMsg.textContent = "Tamam o zaman, daha sonra geldiğinde yine aynı linkten bu sayfayı açabilirsin, ben seni bekliyor olacağım.";
                        chatMessages.appendChild(systemMsg);
                        scrollToBottom();
                        
                        saveCurrentProgress();

                        localStorage.setItem("ezgi_waiting_later", "true");
                        renderResumeLaterButton(() => {
                            localStorage.removeItem("ezgi_waiting_later");
                            isPaused = false;
                            processNextItem();
                        });

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
            if (chatMessages) {
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
        }

        function setPausedState(paused) {
            isPaused = paused;
            if (isPaused) {
                hideTypingIndicator(); // Duraklatıldığında üç nokta efektini kesinlikle kapat
                if (pauseIcon) pauseIcon.style.display = "none";
                if (playIcon) playIcon.style.display = "block";
                if (currentTimeout) {
                    clearTimeout(currentTimeout);
                }
            } else {
                if (pauseIcon) pauseIcon.style.display = "block";
                if (playIcon) playIcon.style.display = "none";
                processNextItem();
            }
        }

        // Otomatik Duraklatma (Kaydırma Durumu)
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

        // Uzak kalma süresi kaydetme fonksiyonu
        function recordLeaveTime() {
            if (localStorage.getItem("ezgi_waiting_later") === "true" || localStorage.getItem("ezgi_away_paused") === "true") {
                return;
            }
            localStorage.setItem("ezgi_leave_time", Date.now());
        }

        // UZAK KALMA AKIŞI TETİKLEYİCİSİ (Üç nokta animasyonu olmadan direkt mesajı basar)
        function triggerAwayFlow() {
            isPaused = true;
            if (currentTimeout) clearTimeout(currentTimeout);

            hideTypingIndicator(); // Üç noktayı kapat

            const systemMsg = document.createElement("div");
            systemMsg.className = "message incoming";
            systemMsg.textContent = "Sanırım bir işin çıktı. Sorun değil ben burada bekliyorum, geldiğinde haber vermen yeterli.";
            chatMessages.appendChild(systemMsg);
            scrollToBottom();

            renderResumeAwayButton(() => {
                localStorage.removeItem("ezgi_away_paused");
                localStorage.removeItem("ezgi_leave_time");
                isPaused = false;
                processNextItem();
            });
        }

        // Tab Görünürlüğü Değiştiğinde
        document.addEventListener("visibilitychange", () => {
            if (document.hidden) {
                recordLeaveTime();
                if (!isMusicManuallyStopped) {
                    backgroundAudio.pause();
                }
                
                hideTypingIndicator(); // Sekme gizlendiğinde üç noktayı kapat
                if (currentTimeout) clearTimeout(currentTimeout);
                autoPauseByVisibility = true;

            } else {
                if (!isMusicManuallyStopped) {
                    backgroundAudio.play().catch(e => console.log("Müzik devam ettirme hatası:", e));
                }

                // Sekmeye GERİ DÖNÜLDÜĞÜNDE süre kontrolü:
                const leaveTime = localStorage.getItem("ezgi_leave_time");
                if (leaveTime && localStorage.getItem("ezgi_away_paused") !== "true") {
                    const elapsed = Date.now() - parseInt(leaveTime, 10);
                    
                    if (elapsed >= AWAY_TIMEOUT_MS) {
                        localStorage.removeItem("ezgi_leave_time");
                        localStorage.setItem("ezgi_away_paused", "true");
                        triggerAwayFlow();
                        return;
                    }
                }

                if (autoPauseByVisibility && !localStorage.getItem("ezgi_away_paused")) {
                    autoPauseByVisibility = false;
                    if (!isPaused) {
                        processNextItem();
                    }
                }
            }
        });

        window.addEventListener("beforeunload", recordLeaveTime);
        window.addEventListener("pagehide", recordLeaveTime);

        // Kullanıcı aktifken her 5 saniyede bir leave_time güncellenir
        setInterval(() => {
            if (!document.hidden && localStorage.getItem("ezgi_waiting_later") !== "true" && localStorage.getItem("ezgi_away_paused") !== "true") {
                localStorage.setItem("ezgi_leave_time", Date.now());
            }
        }, 5000);

        function renderResumeAwayButton(onResume) {
            actionButtonsWrapper.innerHTML = "";
            const btn = document.createElement("button");
            btn.className = "action-btn";
            btn.textContent = "Geldim geldim, devam edebilirsin";
            btn.addEventListener("click", () => {
                const userMsg = document.createElement("div");
                userMsg.className = "message outgoing";
                userMsg.textContent = "Geldim geldim, devam edebilirsin";
                chatMessages.appendChild(userMsg);
                scrollToBottom();

                actionButtonsWrapper.innerHTML = "";
                saveCurrentProgress();

                // Yazıyor animasyonunu göster ve yanıt ver
                showTypingIndicator();
                setTimeout(() => {
                    hideTypingIndicator();
                    const replyMsg = document.createElement("div");
                    replyMsg.className = "message incoming";
                    replyMsg.textContent = "Hos geldin tekrardan. ben devam ediyorum o zaman";
                    chatMessages.appendChild(replyMsg);
                    scrollToBottom();

                    if (onResume) onResume();
                }, 1000);
            });
            actionButtonsWrapper.appendChild(btn);
            scrollToBottom();
        }

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

        function showResetModal(onConfirm) {
            const overlay = document.createElement("div");
            overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;";
            
            const box = document.createElement("div");
            box.style.cssText = "background:#fff;padding:24px;border-radius:16px;max-width:320px;width:85%;text-align:center;box-shadow:0 10px 25px rgba(0,0,0,0.2);font-family:inherit;";
            
            const text = document.createElement("p");
            text.style.cssText = "margin:0 0 20px 0;font-size:15px;color:#2d3748;line-height:1.4;";
            text.textContent = "Sohbeti baştan başlatmak istediğine emin misin?";
            
            const btnContainer = document.createElement("div");
            btnContainer.style.cssText = "display:flex;gap:10px;justify-content:center;";
            
            const cancelBtn = document.createElement("button");
            cancelBtn.textContent = "Vazgeç";
            cancelBtn.style.cssText = "padding:8px 16px;border:none;background:#edf2f7;color:#4a5568;border-radius:8px;cursor:pointer;font-weight:500;";
            cancelBtn.addEventListener("click", () => document.body.removeChild(overlay));
            
            const confirmBtn = document.createElement("button");
            confirmBtn.textContent = "Sıfırla";
            confirmBtn.style.cssText = "padding:8px 16px;border:none;background:#e53e3e;color:#fff;border-radius:8px;cursor:pointer;font-weight:500;";
            confirmBtn.addEventListener("click", () => {
                document.body.removeChild(overlay);
                onConfirm();
            });
            
            btnContainer.appendChild(cancelBtn);
            btnContainer.appendChild(confirmBtn);
            box.appendChild(text);
            box.appendChild(btnContainer);
            overlay.appendChild(box);
            document.body.appendChild(overlay);
        }

        // Reset Butonu
        resetBtn.addEventListener("click", () => {
            showResetModal(() => {
                localStorage.removeItem("ezgi_chat_index");
                localStorage.removeItem("ezgi_waiting_later");
                localStorage.removeItem("ezgi_away_paused");
                localStorage.removeItem("ezgi_leave_time");
                localStorage.removeItem("ezgi_chat_ended");
                chatMessages.innerHTML = "";
                actionButtonsWrapper.innerHTML = "";
                location.reload();
            });
        });

        // Sayfa açılışında durum kontrolleri
        const isWaitingLater = localStorage.getItem("ezgi_waiting_later");
        const isAwayPaused = localStorage.getItem("ezgi_away_paused");

        let triggeredAwayOnLoad = false;
        if (isWaitingLater !== "true" && isAwayPaused !== "true") {
            const leaveTime = localStorage.getItem("ezgi_leave_time");
            if (leaveTime) {
                const elapsed = Date.now() - parseInt(leaveTime, 10);
                localStorage.removeItem("ezgi_leave_time");

                if (elapsed >= AWAY_TIMEOUT_MS) {
                    triggeredAwayOnLoad = true;
                    localStorage.setItem("ezgi_away_paused", "true");
                }
            }
        }

        if (isWaitingLater === "true") {
            isPaused = true;
            hideTypingIndicator();
            renderResumeLaterButton(() => {
                localStorage.removeItem("ezgi_waiting_later");
                isPaused = false;
                processNextItem();
            });
        } else if (isAwayPaused === "true" || triggeredAwayOnLoad) {
            triggerAwayFlow();
        } else {
            processNextItem();
        }

    } catch (error) {
        console.error("JSON yüklenirken hata oluştu:", error);
    }
});