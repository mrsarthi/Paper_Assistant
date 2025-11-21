/**
 * PAPER BUILDER PRO - Full Stack AI
 * Connects to local Python backend for perfect text extraction.
 */

// ==========================================
// CONFIGURATION
// ==========================================
const API_URL = "http://localhost:8000/process-image";

const SCHEMAS = {
    "english-lang-9": {
        name: "English Language (Class IX)",
        defaultSubjectTitle: "ENGLISH - I",
        standardInstructions: [
            "1. You will not be allowed to write during the first 15 minutes.",
            "2. This time is to be spent in reading the question paper.",
            "3. The time given at the head of this paper is the time allowed for writing the answer.",
            "4. Attempt all five questions. The intended marks for questions or parts of questions are given in brackets [ ]."
        ],
        sections: [
            { id: "HEADER", title: "Exam Header", marks: 0, instructions: [], keywords: [] },
            { id: "GEN_INST", title: "General Instructions", marks: 0, instructions: [], keywords: [] },
            { id: "Q1", title: "Question 1", marks: 20, instructions: ["(Do not spend more than 30 minutes...)", "Write a composition..."], keywords: [] },
            { id: "Q2", title: "Question 2", marks: 10, instructions: ["(Do not spend more than 20 minutes...)", "Select any one..."], keywords: [] },
            { id: "Q3", title: "Question 3", marks: 10, instructions: [], keywords: [] },
            { id: "Q4", title: "Question 4", marks: 20, instructions: ["Read the following passage carefully..."], keywords: [] },
            { id: "Q5", title: "Question 5", marks: 20, instructions: [], keywords: [] }
        ]
    },
    "generic": {
        name: "Generic Template",
        defaultSubjectTitle: "EXAMINATION",
        standardInstructions: ["Attempt all questions."],
        sections: [
            { id: "HEADER", title: "Header Info", marks: 0, instructions: [], keywords: [] },
            { id: "GEN_INST", title: "General Instructions", marks: 0, instructions: [], keywords: [] },
            { id: "SEC_A", title: "Section A", marks: 40, instructions: [], keywords: [] },
            { id: "SEC_B", title: "Section B", marks: 40, instructions: [], keywords: [] }
        ]
    }
};

if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '[https://cdn.jsdelivr.net/npm/pdfjs-dist@3/build/pdf.worker.min.js](https://cdn.jsdelivr.net/npm/pdfjs-dist@3/build/pdf.worker.min.js)';
}

const App = {
    state: {
        currentSchemaKey: 'english-lang-9',
        uploadMode: 'images',
        extractedText: '',
        questions: [] 
    },

    init: () => {
        const selector = document.getElementById('subject-selector');
        Object.keys(SCHEMAS).forEach(key => {
            const opt = document.createElement('option');
            opt.value = key;
            opt.textContent = SCHEMAS[key].name;
            selector.appendChild(opt);
        });

        selector.addEventListener('change', (e) => {
            App.state.currentSchemaKey = e.target.value;
            App.ui.renderUploadSlots();
        });

        App.ui.setMode('images'); 
        App.ui.renderUploadSlots();
    },

    getSchema: () => SCHEMAS[App.state.currentSchemaKey],

    processText: (rawText) => {
        // AI output is usually clean, but we force newlines for sub-questions just in case
        return rawText.replace(/(\(\w\)|[ivx]+\)|\d+\.)/gi, '\n$1');
    },

    // ==========================================
    // SMART DOCX GENERATION
    // ==========================================
    generateDoc: async () => {
        if (typeof docx === 'undefined') return alert("DOCX library not loaded.");

        const schema = App.getSchema();
        const { Document, Packer, Paragraph, TextRun, AlignmentType, TabStopType, TabStopPosition } = docx;

        const GLOBAL_FONT = "Times New Roman";
        const GLOBAL_SIZE = 28; 

        const docChildren = [];

        // HEADER
        const customHeader = App.state.questions.find(q => q.sectionId === 'HEADER');
        if (customHeader) {
            const lines = customHeader.text.split('\n');
            lines.forEach(line => {
                docChildren.push(new Paragraph({ children: [new TextRun({ text: line, font: GLOBAL_FONT, size: GLOBAL_SIZE, bold: true })], alignment: AlignmentType.CENTER }));
            });
            docChildren.push(new Paragraph({ text: "", spacing: { after: 240 } }));
        } else {
            const examName = document.getElementById('meta-exam').value || "";
            const className = document.getElementById('meta-class').value || "";
            const subject = schema.defaultSubjectTitle;
            const time = document.getElementById('meta-time').value;
            const marks = document.getElementById('meta-marks').value;

            docChildren.push(
                new Paragraph({ children: [new TextRun({ text: examName, font: GLOBAL_FONT, size: GLOBAL_SIZE, bold: true })], alignment: AlignmentType.CENTER }),
                new Paragraph({ children: [new TextRun({ text: className, font: GLOBAL_FONT, size: GLOBAL_SIZE, bold: true })], alignment: AlignmentType.CENTER }),
                new Paragraph({ children: [new TextRun({ text: subject, font: GLOBAL_FONT, size: GLOBAL_SIZE, bold: true })], alignment: AlignmentType.CENTER, spacing: { after: 240 } }),
                new Paragraph({
                    children: [
                        new TextRun({ text: `Time: ${time}`, font: GLOBAL_FONT, size: GLOBAL_SIZE, bold: true }),
                        new TextRun({ text: `\t\t\t\t\t\t\t\t\t\tM.M: ${marks}`, font: GLOBAL_FONT, size: GLOBAL_SIZE, bold: true })
                    ],
                    tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
                    spacing: { after: 240 }
                })
            );
        }

        // INSTRUCTIONS
        const customInst = App.state.questions.find(q => q.sectionId === 'GEN_INST');
        docChildren.push(new Paragraph({ children: [new TextRun({ text: "General Instructions:", font: GLOBAL_FONT, size: GLOBAL_SIZE, bold: true, underline: {} })] }));

        if (customInst) {
            const lines = customInst.text.split('\n');
            lines.forEach(line => {
                docChildren.push(new Paragraph({ children: [new TextRun({ text: line, font: GLOBAL_FONT, size: GLOBAL_SIZE })] }));
            });
        } else if (schema.standardInstructions) {
            schema.standardInstructions.forEach(inst => {
                docChildren.push(new Paragraph({ children: [new TextRun({ text: inst, font: GLOBAL_FONT, size: GLOBAL_SIZE })] }));
            });
        }
        docChildren.push(new Paragraph({ text: "", spacing: { after: 240 } })); 

        // SECTIONS
        schema.sections.forEach(sectionDef => {
            if (sectionDef.id === 'HEADER' || sectionDef.id === 'GEN_INST') return;

            const questions = App.state.questions.filter(q => q.sectionId === sectionDef.id);
            if (questions.length > 0) {
                docChildren.push(new Paragraph({
                    children: [
                        new TextRun({ text: sectionDef.title, font: GLOBAL_FONT, size: GLOBAL_SIZE, bold: true }),
                        new TextRun({ text: `\t[${sectionDef.marks}]`, font: GLOBAL_FONT, size: GLOBAL_SIZE, bold: true })
                    ],
                    tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
                    spacing: { before: 300, after: 120 }
                }));

                sectionDef.instructions.forEach(inst => {
                    docChildren.push(new Paragraph({
                        children: [new TextRun({ text: inst, font: GLOBAL_FONT, size: GLOBAL_SIZE, italics: true })],
                        spacing: { after: 120 }
                    }));
                });

                questions.forEach(q => {
                    let cleanText = q.text.replace(/Question\s*\d+/i, "").trim();
                    const lines = cleanText.split('\n');
                    lines.forEach(line => {
                        line = line.trim();
                        if(!line) return;
                        let lineMarks = "";
                        const marksMatch = line.match(/\[\s*(\d+)\s*\]$/); 
                        if (marksMatch) { lineMarks = marksMatch[0]; line = line.replace(marksMatch[0], "").trim(); }
                        let indentObj = {};
                        const isSubQuestion = line.match(/^(\(?\w+\)|\d+\.)/); 
                        if (isSubQuestion) indentObj = { left: 720, hanging: 360 };

                        docChildren.push(new Paragraph({
                            indent: indentObj,
                            children: [
                                new TextRun({ text: line, font: GLOBAL_FONT, size: GLOBAL_SIZE }),
                                ...(lineMarks ? [new TextRun({ text: `\t${lineMarks}`, font: GLOBAL_FONT, size: GLOBAL_SIZE, bold: true })] : [])
                            ],
                            tabStops: lineMarks ? [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }] : [],
                            spacing: { after: 120 }
                        }));
                    });
                });
            }
        });

        const doc = new Document({
            sections: [{
                properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } },
                children: docChildren
            }]
        });

        const blob = await Packer.toBlob(doc);
        App.utils.downloadBlob(blob, `Exam_Paper.docx`);
    },

    // --- UTILS & UI ---
    utils: {
        downloadBlob: (blob, filename) => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        },
        // === SEND TO AI BACKEND ===
        sendToAI: async (file, sectionId) => {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("section", sectionId);

            try {
                const response = await fetch(API_URL, {
                    method: "POST",
                    body: formData
                });
                if (!response.ok) throw new Error("Backend failed");
                const data = await response.json();
                return data.text;
            } catch (error) {
                console.error(error);
                alert("Cannot connect to Python Server. Ensure 'server.py' is running.");
                throw error;
            }
        },
        // Fallback PDF reader
        readPDF: async (file) => {
            const buffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
            let full = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                full += content.items.map(x => x.str).join(' ') + '\n';
            }
            return full;
        }
    },

    ui: {
        switchPanel: (panelId) => {
            document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
            document.getElementById(`${panelId}-panel`).classList.add('active');
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            const navMap = { 'upload': 0, 'process': 1, 'classify': 2, 'review': 3 };
            document.querySelectorAll('.nav-btn')[navMap[panelId]].classList.add('active');
            if (panelId === 'classify') App.ui.renderQuestions();
        },
        setMode: (mode) => {
            App.state.uploadMode = mode;
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            document.getElementById(`mode-${mode}`).classList.add('active');
            
            if (mode === 'pdf') {
                document.getElementById('zone-pdf').classList.remove('hidden');
                document.getElementById('zone-images').classList.add('hidden');
                document.getElementById('image-actions').classList.add('hidden');
            } else {
                document.getElementById('zone-pdf').classList.add('hidden');
                document.getElementById('zone-images').classList.remove('hidden');
                document.getElementById('image-actions').classList.remove('hidden');
                App.ui.renderUploadSlots();
            }
        },
        renderUploadSlots: () => {
            const container = document.getElementById('section-grid-container');
            const schema = App.getSchema();
            container.innerHTML = '';

            schema.sections.forEach(sec => {
                const div = document.createElement('div');
                div.className = 'section-upload-item';

                let toggleHTML = '';
                let inputStyle = '';
                
                if (sec.id === 'HEADER' || sec.id === 'GEN_INST') {
                    toggleHTML = `
                        <div class="source-toggle">
                            <label><input type="radio" name="src-${sec.id}" value="default" checked onchange="App.ui.toggleSource('${sec.id}')"> Use Default</label>
                            <label><input type="radio" name="src-${sec.id}" value="upload" onchange="App.ui.toggleSource('${sec.id}')"> Upload Image</label>
                        </div>
                    `;
                    inputStyle = 'display:none;';
                }

                div.innerHTML = `
                    <div class="section-header-row">
                        <div>
                            <div style="font-weight:600">${sec.title}</div>
                            ${toggleHTML}
                        </div>
                    </div>
                    <div id="action-area-${sec.id}" class="upload-actions" style="${inputStyle}">
                        <button class="btn btn-secondary" onclick="document.getElementById('file-${sec.id}').click()" style="padding:4px 8px; font-size:12px;">Select Images</button>
                        <span id="status-${sec.id}" class="upload-status">Empty</span>
                        <input type="file" id="file-${sec.id}" class="hidden" accept="image/*" multiple onchange="App.handlers.sectionUpload(event, '${sec.id}')">
                    </div>
                `;
                container.appendChild(div);
            });
        },
        toggleSource: (sectionId) => {
            const mode = document.querySelector(`input[name="src-${sectionId}"]:checked`).value;
            const actionArea = document.getElementById(`action-area-${sectionId}`);
            if (mode === 'upload') {
                actionArea.style.display = 'flex';
            } else {
                actionArea.style.display = 'none';
                const idx = App.state.questions.findIndex(q => q.sectionId === sectionId);
                if (idx > -1) App.state.questions.splice(idx, 1);
            }
        },
        renderQuestions: () => {
            const container = document.getElementById('questions-container');
            const schema = App.getSchema();
            container.innerHTML = App.state.questions.map((q, idx) => `
                <div class="question-card">
                    <div class="question-controls">
                        <strong>Block ${idx + 1}</strong>
                        <select onchange="App.handlers.updateSection(${idx}, this.value)" class="form-select" style="flex:1; margin: 0 10px;">
                            ${schema.sections.map(s => `<option value="${s.id}" ${q.sectionId === s.id ? 'selected' : ''}>${s.title}</option>`).join('')}
                        </select>
                        <button class="btn-secondary" onclick="App.handlers.deleteQuestion(${idx})">🗑️</button>
                    </div>
                    <textarea class="question-textarea" onchange="App.handlers.updateText(${idx}, this.value)">${q.text}</textarea>
                </div>
            `).join('');
        }
    },

    handlers: {
        sectionUpload: async (e, sectionId) => {
            const files = Array.from(e.target.files);
            if (files.length === 0) return;

            const statusEl = document.getElementById(`status-${sectionId}`);
            statusEl.innerText = "AI Processing...";
            statusEl.classList.add('scanning');
            statusEl.classList.remove('error');
            
            let combinedText = "";

            try {
                for (let i = 0; i < files.length; i++) {
                    statusEl.innerText = `AI Scanning ${i+1}/${files.length}`;
                    const text = await App.utils.sendToAI(files[i], sectionId);
                    combinedText += App.processText(text) + "\n\n";
                }

                const existingIdx = App.state.questions.findIndex(q => q.sectionId === sectionId);
                if (existingIdx >= 0) {
                    App.state.questions[existingIdx].text = combinedText; 
                } else {
                    App.state.questions.push({ id: Date.now(), text: combinedText, sectionId: sectionId });
                }

                statusEl.innerText = `${files.length} file(s) ready`;
                statusEl.classList.remove('scanning');
                statusEl.classList.add('done');
            } catch (err) {
                console.error(err);
                statusEl.innerText = "Server Error";
                statusEl.classList.remove('scanning');
                statusEl.classList.add('error');
            }
        },

        finishImageUploads: () => {
            if (App.state.questions.length === 0) {
                alert("No images uploaded yet!");
                return;
            }
            
            const schema = App.getSchema();
            let previewText = "--- EXTRACTED TEXT PREVIEW (AI ENHANCED) ---\n\n";
            
            schema.sections.forEach(sec => {
                const q = App.state.questions.find(item => item.sectionId === sec.id);
                if (q) {
                    previewText += `=== ${sec.title} ===\n${q.text}\n\n`;
                }
            });

            App.state.extractedText = previewText;
            document.getElementById('extracted-text').textContent = previewText;
            App.ui.switchPanel('process');
            document.getElementById('text-preview-section').classList.remove('hidden');
            document.getElementById('btn-segment').classList.add('hidden');
            document.getElementById('btn-organize-direct').classList.remove('hidden');
        },

        fileUploadPdf: async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            document.getElementById('progress-section').classList.remove('hidden');
            App.ui.switchPanel('process');
            try {
                const text = await App.utils.readPDF(file);
                App.state.extractedText = App.processText(text);
                document.getElementById('extracted-text').textContent = App.state.extractedText;
                document.getElementById('btn-segment').classList.remove('hidden');
                document.getElementById('btn-organize-direct').classList.add('hidden');
            } catch (err) {
                console.error(err);
                alert("Error reading PDF");
            }
            document.getElementById('progress-section').classList.add('hidden');
            document.getElementById('text-preview-section').classList.remove('hidden');
        },

        segment: () => {
            const text = App.state.extractedText;
            const segments = text.split(/(?=Question\s*\d+|Q\s*\d+)/i);
            App.state.questions = segments.filter(s => s.trim().length > 5).map((txt, i) => ({
                id: Date.now() + i,
                text: txt.trim(),
                sectionId: "Q" + (i+1)
            }));
            App.ui.switchPanel('classify');
        },

        addQuestion: () => {
            App.state.questions.push({ id: Date.now(), text: '', sectionId: App.getSchema().sections[2].id });
            App.ui.renderQuestions();
        },
        deleteQuestion: (idx) => {
            if (confirm('Delete this?')) { App.state.questions.splice(idx, 1); App.ui.renderQuestions(); }
        },
        updateSection: (idx, val) => { App.state.questions[idx].sectionId = val; },
        updateText: (idx, val) => { App.state.questions[idx].text = val; },
        export: () => App.generateDoc()
    }
};

App.init();
