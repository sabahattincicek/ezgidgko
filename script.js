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
    let currentTimeout = null;

    // Test modu için hızlı süre ayarı (true iken delay ve duration'lar 500ms olur)
    const TEST_MODE = true;

    try {
        const response = await fetch("assets/main.json");
        const items = await response.json();
        
        // localStorage'dan kalınan index'i, bitiş durumunu ve kullanıcı seçimlerini/mesajlarını yükle
        let currentIndex = 0;
        const savedIndex = localStorage.getItem("ezgi_chat_index");
        const savedHistory = localStorage.getItem("ezgi_chat_history");
        const chatEnded = localStorage.getItem("ezgi_chat_ended");

        if (chatEnded === "true") {
            // Eğer daha önceden bitmişse (storage'da end yazıyorsa), geçmişi doğrudan bas ve baştan başlatma
            if (savedHistory !== null) {
                chatMessages.innerHTML = savedHistory;
            } else if (savedIndex !== null) {
                const parsed = parseInt(savedIndex, 10);
                if (!isNaN(parsed)) {
                    for (let i = 0; i < parsed && i < items.length; i++) {
                        renderItemInstant(items[i]);
                    }
                }
            }
            // Butonları gizle / etkisizleştir
            actionButtonsWrapper.innerHTML = "";
            return;
        }

        if (savedHistory !== null) {
            chatMessages.innerHTML = savedHistory;
        }

        if (savedIndex !== null) {
            const parsed = parseInt(savedIndex, 10);
            if (!isNaN(parsed) && parsed >= 0 && parsed < items.length) {
                currentIndex = parsed;
                // Eğer daha önceden kayıtlı history yoksa ve index ilerideyse fallback olarak instant render yapalım
                if (savedHistory === null) {
                    for (let i = 0; i < currentIndex; i++) {
                        renderItemInstant(items[i]);
                    }
                }
            }
        }

        function saveCurrentProgress() {
            localStorage.setItem("ezgi_chat_index", currentIndex);
            localStorage.setItem("ezgi_chat_history", chatMessages.innerHTML);
            
            // Eğer şu anki item 'end' tipindeyse veya items[currentIndex] end ise end bayrağını kaydet
            if (currentIndex < items.length && items[currentIndex].type === "end") {
                localStorage.setItem("ezgi_chat_ended", "true");
            }
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
                
                let contentHtml = `<p>${item.text}</p>`;
                
                if (item.photos && Array.isArray(item.photos) && item.photos.length > 0) {
                    if (item.photos.length === 1) {
                        contentHtml += `<img src="${item.photos[0]}" alt="Hatıra" class="single-photo">`;
                    } else {
                        contentHtml += `<div class="photo-gallery">`;
                        item.photos.forEach(photoUrl => {
                            contentHtml += `<img src="${photoUrl}" alt="Hatıra">`;
                        });
                        contentHtml += `</div>`;
                    }
                }

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
                
                let contentHtml = `<p>${item.text}</p>`;
                
                if (item.photos && Array.isArray(item.photos) && item.photos.length > 0) {
                    if (item.photos.length === 1) {
                        contentHtml += `<img src="${item.photos[0]}" alt="Hatıra" class="single-photo">`;
                    } else {
                        contentHtml += `<div class="photo-gallery">`;
                        item.photos.forEach(photoUrl => {
                            contentHtml += `<img src="${photoUrl}" alt="Hatıra">`;
                        });
                        contentHtml += `</div>`;
                    }
                }

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

                    // Kullanıcının bastığı butonu ve giden mesajı da localStorage'a kaydet
                    saveCurrentProgress();

                    if (btnData.action === "later") {
                        // Süreci durdur ve üç nokta göstererek mesaj ekle
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
                            
                            // currentIndex'i bir sonraki adıma (butonlar öğesinden sonraki öğeye) taşıyalım ki
                            // geri gelip "Geldim, devam edebilirsin" denildiğinde eski butonlar tekrar gösterilmesin!
                            currentIndex++;
                            saveCurrentProgress();

                            // "Geldim, devam edebilirsin" butonunu göster ve bunu da localStorage'a kalıcı olarak kaydet
                            localStorage.setItem("ezgi_waiting_later", "true");
                            renderResumeLaterButton(() => {
                                // Devam et butonuna basıldığında
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

            // Yukarı doğru kaydırıyorsa ve en altta değilse
            if (currentScrollTop < lastScrollTop && !isAtBottom) {
                if (!isPaused) {
                    autoPauseByScroll = true;
                    setPausedState(true);
                }
            } 
            // Eğer kullanıcı tekrar en alta geldiyse ve bu otomatik durdurulduysa, devam ettir
            else if (isAtBottom && autoPauseByScroll && isPaused) {
                autoPauseByScroll = false;
                setPausedState(false);
            }

            lastScrollTop = currentScrollTop;
        });

        // Sayfa görünürlük değişimi (Ekran kapatma, sekme değiştirme, arka plana atma)
        document.addEventListener("visibilitychange", () => {
            // Eğer "Daha sonra geleceğim" modundaysak veya sohbet bitmişse bu otomatik mantık karışmasın
            if (localStorage.getItem("ezgi_waiting_later") === "true" || localStorage.getItem("ezgi_chat_ended") === "true") {
                return;
            }

            if (document.hidden) {
                // Sayfa arka plana geçti veya ekran kapatıldı
                if (!isPaused) {
                    autoPauseByVisibility = true;
                    setPausedState(true);
                }
            } else {
                // Sayfa tekrar ekrana geldi / ön plana alındı
                if (autoPauseByVisibility && isPaused) {
                    autoPauseByVisibility = false;
                    setPausedState(false);
                }
            }
        });

        // Duraklat / Devam Et buton işlevi
        pauseResumeBtn.addEventListener("click", () => {
            autoPauseByScroll = false; // Manuel müdahale
            autoPauseByVisibility = false; // Manuel müdahale
            setPausedState(!isPaused);
        });

        // Baştan Başlat Butonu
        resetBtn.addEventListener("click", () => {
            if (confirm("Sohbeti baştan başlatmak istediğine emin misin?")) {
                localStorage.removeItem("ezgi_chat_index");
                localStorage.removeItem("ezgi_chat_history");
                localStorage.removeItem("ezgi_waiting_later");
                localStorage.removeItem("ezgi_chat_ended");
                location.reload();
            }
        });

        // Sayfa açıldığında daha önceden "Daha sonra geleceğim" denilip denilmediğini kontrol et
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
