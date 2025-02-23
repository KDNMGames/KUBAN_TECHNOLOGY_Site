document.addEventListener('DOMContentLoaded', () => {
    // Получаем элементы только когда они существуют в DOM
    const getElement = (id) => document.getElementById(id) || null;

    // Основные элементы
    const dropZone = getElement('file-drop-zone');
    const fileInput = getElement('file-input');
    const topicsList = getElement('topics-list');
    const createTopicFinalBtn = getElement('create-topic-final');
    const convertBtn = getElement('convert-btn');
    const selectedFileText = getElement('selected-file');
    const fileSizeText = getElement('file-size');
    const downloadSection = getElement('download-section');
    const downloadLink = getElement('download-link');
    const messagesContainer = getElement('messages');

    // Элементы инициализируются только когда они нужны
    let selectedFile = null;
    let topics = [];
    let currentTopic = null;
    let currentUser = { name: 'Default User' };

    // Инициализация drag & drop с проверкой существования
    if (dropZone) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        dropZone.addEventListener('drop', handleDrop);
    }

    // Остальной код обернут в проверки существования элементов
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }

    function handleDrop(e) {
        handleFiles(e.dataTransfer.files);
    }

    function handleFileSelect(e) {
        handleFiles(e.target.files);
    }

    function handleFiles(files) {
        if (!files.length) return;
        handleFile(files[0]);
    }

    function handleFile(file) {
        if (file.size > 100 * 1024 * 1024) {
            alert('Размер файла не должен превышать 100 МБ');
            return;
        }

        selectedFile = file;
        if (selectedFileText) {
            selectedFileText.textContent = `Выбран файл: ${file.name}`;
        }
        if (fileSizeText) {
            fileSizeText.textContent = `Размер: ${(file.size / 1024 / 1024).toFixed(2)} МБ`;
        }
        if (convertBtn) {
            convertBtn.disabled = false;
        }

        if (currentTopic) {
            currentTopic.messages.push({
                type: 'file',
                name: file.name,
                data: URL.createObjectURL(file),
                timestamp: new Date().toISOString()
            });
            saveTopics();
            renderMessages();
        }
    }

    if (convertBtn) {
        convertBtn.addEventListener('click', async () => {
            if (!selectedFile) return;

            try {
                const pdfBytes = await convertToPDF(selectedFile);
                
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                
                if (downloadLink) {
                    downloadLink.href = url;
                    downloadLink.download = selectedFile.name.replace(/\.[^/.]+$/, "") + '.pdf';
                }
                if (downloadSection) {
                    downloadSection.style.display = 'block';
                }
            } catch (error) {
                console.error('Ошибка конвертации:', error);
                alert('Не удалось конвертировать файл');
            }
        });
    }

    async function convertToPDF(file) {
        // Этот метод не определен в плане, но необходим для сохранения функциональности
        // const { PDFDocument } = window.PDFLib;
        // const pdfDoc = await PDFDocument.create();
        // const page = pdfDoc.addPage([595.28, 841.89]);
        // page.drawText(`Конвертация файла: ${file.name}`, {
        //     x: 50,
        //     y: 100,
        //     size: 15
        // });
        // const pdfBytes = await pdfDoc.save();
        // return pdfBytes;
        throw new Error('Метод convertToPDF не реализован');
    }

    const pageFormats = {
        A1: [1683.78, 2384.13],  // 594mm x 841mm
        A2: [1190.55, 1683.78],  // 420mm x 594mm
        A3: [841.89, 1190.55],   // 297mm x 420mm
        A4: [595.28, 841.89]     // 210mm x 297mm
    };

    const renderTopics = () => {
        if (topicsList) {
            topicsList.innerHTML = topics
                .filter(topic => 
                    topic.isPublic ||
                    topic.allowedUsers.includes(currentUser.name)
                )
                .map(topic => `
                    <div class="topic-card" data-id="${topic.id}">
                        <h3>${topic.name}</h3>
                        <p>${topic.messages.length} сообщений</p>
                    </div>
                `).join('');
        }
    };

    if (createTopicFinalBtn) {
        createTopicFinalBtn.addEventListener('click', handleCreateTopic);
    }

    function handleCreateTopic() {
        const topicNameInput = getElement('topic-name');
        const isPublicInput = getElement('is-public');
        const allowedUsersInput = getElement('allowed-users');

        if (!topicNameInput || !isPublicInput || !allowedUsersInput) return;

        const topicName = topicNameInput.value.trim();
        if (!topicName) return alert('Введите название темы');
        
        const newTopic = {
            id: Date.now().toString(36),
            name: topicName,
            isPublic: isPublicInput.checked,
            allowedUsers: allowedUsersInput.value
                .split(',')
                .map(s => s.trim())
                .filter(Boolean),
            messages: [],
            password: crypto.getRandomValues(new Uint8Array(32)).join('')
        };
        
        topics.push(newTopic);
        saveTopics();
        showView('main-view');
        renderTopics();
    }

    if (topicsList) {
        topicsList.addEventListener('click', handleTopicClick);
    }

    function handleTopicClick(e) {
        const topicCard = e.target.closest('.topic-card');
        if (!topicCard) return;
        
        const topicId = topicCard.dataset.id;
        currentTopic = topics.find(t => t.id === topicId);
        
        if (!currentTopic.isPublic && 
            !currentTopic.allowedUsers.includes(currentUser.name)) {
            deleteTopic(topicId);
            return alert('Доступ запрещен. Тема удалена.');
        }
        
        showView('topic-view');
        renderMessages();
    }

    const deleteTopic = (topicId) => {
        topics = topics.filter(t => t.id !== topicId);
        saveTopics();
        renderTopics();
    };

    const renderMessages = () => {
        if (messagesContainer) {
            messagesContainer.innerHTML = currentTopic.messages
                .map(msg => `
                    <div class="message">
                        ${msg.from ? `<div class="from">${msg.from}</div>` : ''}
                        ${msg.type === 'file' ? `
                            <a href="#" class="download-link" data-file="${msg.data}">
                                ${msg.name}
                            </a>
                        ` : `
                            <div class="text">${msg.text}</div>
                        `}
                    </div>
                `).join('');
        }
    };

    const views = ['main-view', 'create-topic-view', 'topic-view'];
    function showView(viewId) {
        views.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = id === viewId ? 'block' : 'none';
        });
    }

    function saveTopics() {
        // Implement your own save function
    }

    function scrollToSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth' });
        }
    }

    function copyEmail(email) {
        navigator.clipboard.writeText(email).then(() => {
            const message = document.getElementById('email-copied-message');
            message.textContent = 'E-mail is copied';
            message.style.display = 'block';
            setTimeout(() => {
                message.style.display = 'none';
            }, 2000);
        });
    }

    // Attach scroll function to window
    window.scrollToSection = scrollToSection;

    // Email copy functionality
    const emailContacts = document.querySelectorAll('.email-contact');
    emailContacts.forEach(contact => {
        contact.addEventListener('click', (e) => {
            const email = e.currentTarget.getAttribute('data-email');
            copyEmail(email);
        });
    });
});