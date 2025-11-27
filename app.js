/* --- Configuration & Constants --- */
const STORAGE_KEY = 'seaAssign_v1';
const ANIMATION_DURATION = 300;

// Status Definitions: Cycle Order
const STATUSES = [
    { label: "Not Provided", icon: "circle", colorVar: "0" }, // 0
    { label: "Pending", icon: "clock", colorVar: "1" },       // 1
    { label: "Completed", icon: "check", colorVar: "2" },     // 2
    { label: "Checked", icon: "check-circle", colorVar: "3" },// 3
    { label: "Uploaded", icon: "upload-cloud", colorVar: "4" }// 4
];

// SVG Icons Map (Inline for performance)
const ICONS = {
    circle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>`,
    clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`,
    "check-circle": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    "upload-cloud": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 16l-4-4-4 4M12 12v9"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>`
};

/* --- State Management --- */
let appState = {
    version: 1,
    theme: 'sea',
    subjects: []
};

// Undo Buffer
let undoStack = null;
let undoTimeout = null;

/* --- Initialization --- */
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initEventListeners();
    applyTheme(appState.theme);
    render();
});

/* --- Core Functions --- */

function loadData() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            // Basic migration check could go here
            appState = { ...appState, ...parsed };
        } catch (e) {
            console.error("Data corruption detected, resetting to defaults.");
        }
    }
}

function saveData() {
    // Debounce handled by UI responsiveness, but we save immediately 
    // to ensure data safety on close.
    appState.lastUpdated = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
}

function addSubject(name) {
    if (!name.trim()) return;
    
    const newSubject = {
        id: crypto.randomUUID(),
        name: name.trim(),
        assignments: [0, 0, 0, 0, 0], // Indexes mapping to STATUSES
        createdAt: Date.now()
    };

    appState.subjects.push(newSubject);
    saveData();
    render();
    document.getElementById('newSubjectInput').value = '';
}

function deleteSubject(id) {
    const index = appState.subjects.findIndex(s => s.id === id);
    if (index > -1) {
        // Store for Undo
        undoStack = { item: appState.subjects[index], index: index };
        
        appState.subjects.splice(index, 1);
        saveData();
        render();
        showToast("Subject deleted", true);
    }
}

function undoDelete() {
    if (undoStack) {
        appState.subjects.splice(undoStack.index, 0, undoStack.item);
        undoStack = null;
        saveData();
        render();
        hideToast();
    }
}

function resetSubject(id) {
    const sub = appState.subjects.find(s => s.id === id);
    if (sub) {
        sub.assignments = [0, 0, 0, 0, 0];
        saveData();
        render();
    }
}

function toggleStatus(subjectId, assignIndex) {
    const sub = appState.subjects.find(s => s.id === subjectId);
    if (sub) {
        // Cycle: (current + 1) % 5
        const current = sub.assignments[assignIndex];
        const next = (current + 1) % STATUSES.length;
        sub.assignments[assignIndex] = next;
        saveData();
        
        // Targeted Re-render (Optimization)
        updateCellUI(subjectId, assignIndex, next);
    }
}

function updateName(id, newName) {
    const sub = appState.subjects.find(s => s.id === id);
    if (sub && newName.trim() !== sub.name) {
        sub.name = newName.trim();
        saveData();
    }
}

/* --- UI Rendering --- */

function render() {
    const grid = document.getElementById('subjectGrid');
    const emptyState = document.getElementById('emptyState');
    
    grid.innerHTML = '';

    if (appState.subjects.length === 0) {
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
        appState.subjects.forEach(sub => {
            const card = createSubjectCard(sub);
            grid.appendChild(card);
        });
    }
}

function createSubjectCard(subject) {
    const card = document.createElement('div');
    card.className = 'subject-card';
    card.dataset.id = subject.id;

    // 1. Title Section
    const header = document.createElement('div');
    header.className = 'card-header';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'subject-name';
    nameInput.value = subject.name;
    nameInput.ariaLabel = "Edit Subject Name";
    
    // Auto-save on blur/enter
    nameInput.addEventListener('blur', (e) => updateName(subject.id, e.target.value));
    nameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') e.target.blur();
    });

    header.appendChild(nameInput);

    // 2. Assignments Section
    const assignRow = document.createElement('div');
    assignRow.className = 'assignments-row';

    subject.assignments.forEach((statusIdx, i) => {
        const cell = document.createElement('div');
        cell.className = 'assignment-cell';
        cell.role = "button";
        cell.tabIndex = "0";
        cell.ariaLabel = `Assignment ${i+1}: ${STATUSES[statusIdx].label}`;
        cell.dataset.idx = i;
        cell.id = `cell-${subject.id}-${i}`;

        // Initial UI
        cell.innerHTML = getCellHTML(i, statusIdx);

        // Events
        cell.addEventListener('click', () => toggleStatus(subject.id, i));
        cell.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleStatus(subject.id, i);
            }
        });

        assignRow.appendChild(cell);
    });

    // 3. Actions Section
    const actions = document.createElement('div');
    actions.className = 'card-actions';
    
    const btnReset = document.createElement('button');
    btnReset.className = 'btn-mini';
    btnReset.textContent = 'Reset';
    btnReset.addEventListener('click', () => {
        const isAlreadyEmpty = subject.assignments.every(status => status === 0);
        if (isAlreadyEmpty) {
            showToast("Nothing to reset here");
            return;
        }
        showModal('Reset Subject?', 'Clear all progress for this subject?', () => resetSubject(subject.id))
    });

    const btnDel = document.createElement('button');
    btnDel.className = 'btn-mini delete';
    btnDel.textContent = 'Delete';
    btnDel.addEventListener('click', () => showModal('Delete Subject?', 'This can be undone briefly.', () => deleteSubject(subject.id)));

    actions.appendChild(btnReset);
    actions.appendChild(btnDel);

    card.appendChild(header);
    card.appendChild(assignRow);
    card.appendChild(actions);

    return card;
}

function getCellHTML(index, statusIdx) {
    const statusData = STATUSES[statusIdx];
    return `
        <span class="cell-label">A${index + 1}</span>
        <div class="status-chip" data-status="${statusIdx}">
            ${ICONS[statusData.icon]}
            <span>${statusData.label}</span>
        </div>
    `;
}

// Optimized partial update
function updateCellUI(subId, idx, statusIdx) {
    const cell = document.getElementById(`cell-${subId}-${idx}`);
    if (cell) {
        cell.innerHTML = getCellHTML(idx, statusIdx);
        cell.ariaLabel = `Assignment ${idx+1}: ${STATUSES[statusIdx].label}`;
        
        // Add subtle animation class
        const chip = cell.querySelector('.status-chip');
        chip.animate([
            { transform: 'scale(0.9)' },
            { transform: 'scale(1)' }
        ], { duration: 200, easing: 'ease-out' });
    }
}

/* --- Global Controls & Modals --- */

function initEventListeners() {
    // Add Subject
    document.getElementById('btnAddSubject').addEventListener('click', () => {
        addSubject(document.getElementById('newSubjectInput').value);
    });
    
    document.getElementById('newSubjectInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addSubject(e.target.value);
    });

    // Theme Selector
    const themeSel = document.getElementById('themeSelector');
    themeSel.value = appState.theme;
    themeSel.addEventListener('change', (e) => {
        applyTheme(e.target.value);
        saveData();
    });

    // Reset All
    document.getElementById('btnResetAll').addEventListener('click', () => {
        if (appState.subjects.length === 0) {
            showToast("The shore is already clear");
            return;
        }
        showModal('Factory Reset', 'This will delete ALL data. Cannot be undone.', () => {
            appState.subjects = [];
            saveData();
            render();
            showToast("All data cleared");
        });
    });

    // Export
    document.getElementById('btnExport').addEventListener('click', exportData);

    // Import
    document.getElementById('fileImport').addEventListener('change', importData);

    // Toast Undo
    document.getElementById('toastUndo').addEventListener('click', undoDelete);

    // Modal
    document.getElementById('modalCancel').addEventListener('click', hideModal);
}

/* --- Helpers --- */

function applyTheme(themeName) {
    document.body.dataset.theme = themeName;
    appState.theme = themeName;
}

function showModal(title, text, onConfirm) {
    const el = document.getElementById('modalOverlay');
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalText').textContent = text;
    
    // Clone button to remove old listeners
    const oldBtn = document.getElementById('modalConfirm');
    const newBtn = oldBtn.cloneNode(true);
    oldBtn.parentNode.replaceChild(newBtn, oldBtn);
    
    newBtn.addEventListener('click', () => {
        onConfirm();
        hideModal();
    });

    el.classList.remove('hidden');
}

function hideModal() {
    document.getElementById('modalOverlay').classList.add('hidden');
}

function showToast(msg, allowUndo = false) {
    const t = document.getElementById('toast');
    document.getElementById('toastMessage').textContent = msg;
    document.getElementById('toastUndo').style.display = allowUndo ? 'block' : 'none';
    
    t.classList.remove('hidden');
    
    clearTimeout(undoTimeout);
    undoTimeout = setTimeout(() => {
        hideToast();
        undoStack = null; // Clear undo buffer after timeout
    }, 5000);
}

function hideToast() {
    document.getElementById('toast').classList.add('hidden');
}

function exportData() {
    // 1. Pretty print the JSON so it's readable in the text file
    const dataStr = JSON.stringify(appState, null, 2);
    
    // 2. Create a Blob (Binary Large Object) with text/plain type
    // Mobile browsers handle Blobs much better than data URIs
    const blob = new Blob([dataStr], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    
    // 3. Create download link
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.href = url;
    // Changed extension to .txt for mobile compatibility
    downloadAnchorNode.download = `seamist_backup_${new Date().toISOString().slice(0,10)}.txt`;
    
    // 4. Trigger download
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    
    // 5. Cleanup (important for memory)
    document.body.removeChild(downloadAnchorNode);
    URL.revokeObjectURL(url);
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            // Text files contain the same string data, so JSON.parse still works
            const parsed = JSON.parse(e.target.result);
            
            if (parsed.subjects && Array.isArray(parsed.subjects)) {
                showModal("Import Data", "This will overwrite your current data.", () => {
                    appState = parsed;
                    saveData();
                    applyTheme(appState.theme);
                    document.getElementById('themeSelector').value = appState.theme;
                    render();
                    showToast("Data imported successfully");
                });
            } else {
                alert("Invalid backup file format.");
            }
        } catch (ex) {
            console.error(ex);
            alert("Error reading file. Make sure it is a valid backup .txt file.");
        }
    };
    // This reads the .txt file content nicely
    reader.readAsText(file);
    event.target.value = ''; // Reset input so you can reload same file if needed
}