"use strict";
// Document Conversion Studio - Frontend Controller (Multilingual)
class ConversionApp {
    selectedFile = null;
    currentMode = 'pdf-to-excel';
    history = [];
    // DOM Elements
    dropZone;
    fileInput;
    fileDetailsCard;
    fileNameEl;
    fileSizeEl;
    fileIconEl;
    removeFileBtn;
    convertBtn;
    progressContainer;
    progressBar;
    progressText;
    statusMessage;
    historyList;
    modeCards;
    constructor() {
        this.initElements();
        this.bindEvents();
        this.updateModeUI('pdf-to-excel');
        this.checkServerHealth();
    }
    initElements() {
        this.dropZone = document.getElementById('drop-zone');
        this.fileInput = document.getElementById('file-input');
        this.fileDetailsCard = document.getElementById('file-details');
        this.fileNameEl = document.getElementById('file-name');
        this.fileSizeEl = document.getElementById('file-size');
        this.fileIconEl = document.getElementById('file-icon');
        this.removeFileBtn = document.getElementById('remove-file-btn');
        this.convertBtn = document.getElementById('convert-btn');
        this.progressContainer = document.getElementById('progress-container');
        this.progressBar = document.getElementById('progress-bar');
        this.progressText = document.getElementById('progress-text');
        this.statusMessage = document.getElementById('status-message');
        this.historyList = document.getElementById('history-list');
        this.modeCards = document.querySelectorAll('.mode-card');
    }
    bindEvents() {
        // Mode Selection
        this.modeCards.forEach(card => {
            card.addEventListener('click', () => {
                const mode = card.dataset.mode;
                if (mode) {
                    this.setMode(mode);
                }
            });
        });
        // Drag & Drop
        ['dragenter', 'dragover'].forEach(eventName => {
            this.dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.dropZone.classList.add('dragover');
            });
        });
        ['dragleave', 'drop'].forEach(eventName => {
            this.dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.dropZone.classList.remove('dragover');
            });
        });
        this.dropZone.addEventListener('drop', (e) => {
            const files = e.dataTransfer?.files;
            if (files && files.length > 0) {
                this.handleFileSelected(files[0]);
            }
        });
        this.dropZone.addEventListener('click', () => {
            this.fileInput.click();
        });
        this.fileInput.addEventListener('change', () => {
            if (this.fileInput.files && this.fileInput.files.length > 0) {
                this.handleFileSelected(this.fileInput.files[0]);
            }
        });
        // Remove File
        this.removeFileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.clearSelectedFile();
        });
        // Convert Action
        this.convertBtn.addEventListener('click', () => {
            this.startConversion();
        });
    }
    setMode(mode) {
        this.currentMode = mode;
        this.updateModeUI(mode);
        if (this.selectedFile) {
            this.validateFileForMode(this.selectedFile);
        }
    }
    updateModeUI(selectedMode) {
        this.modeCards.forEach(card => {
            if (card.dataset.mode === selectedMode) {
                card.classList.add('active');
            }
            else {
                card.classList.remove('active');
            }
        });
        if (this.fileInput) {
            if (selectedMode === 'pdf-to-excel' || selectedMode === 'pdf-to-word') {
                this.fileInput.accept = '.pdf';
            }
            else if (selectedMode === 'word-to-pdf') {
                this.fileInput.accept = '.docx,.doc';
            }
            else if (selectedMode === 'excel-to-pdf') {
                this.fileInput.accept = '.xlsx,.xls';
            }
            else {
                this.fileInput.accept = '.pdf,.docx,.doc,.xlsx,.xls';
            }
        }
    }
    handleFileSelected(file) {
        const ext = file.name.split('.').pop()?.toLowerCase();
        // Auto-switch mode based on file extension
        if (ext === 'pdf') {
            if (this.currentMode === 'word-to-pdf' || this.currentMode === 'excel-to-pdf') {
                this.setMode('pdf-to-word');
            }
        }
        else if (ext === 'docx' || ext === 'doc') {
            this.setMode('word-to-pdf');
        }
        else if (ext === 'xlsx' || ext === 'xls') {
            this.setMode('excel-to-pdf');
        }
        this.selectedFile = file;
        this.fileNameEl.textContent = file.name;
        this.fileSizeEl.textContent = this.formatFileSize(file.size);
        if (ext === 'pdf') {
            this.fileIconEl.innerHTML = `<svg class="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"></path></svg>`;
        }
        else if (ext === 'xlsx' || ext === 'xls') {
            this.fileIconEl.innerHTML = `<svg class="w-8 h-8 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"></path></svg>`;
        }
        else {
            this.fileIconEl.innerHTML = `<svg class="w-8 h-8 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"></path></svg>`;
        }
        this.fileDetailsCard.classList.remove('hidden');
        this.convertBtn.disabled = false;
        this.hideStatus();
    }
    validateFileForMode(file) {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if ((this.currentMode === 'pdf-to-excel' || this.currentMode === 'pdf-to-word') && ext !== 'pdf') {
            this.showToast('Please select a PDF file for this conversion.', 'warning');
            return false;
        }
        if (this.currentMode === 'word-to-pdf' && ext !== 'docx' && ext !== 'doc') {
            this.showToast('Please select a Word (.docx/.doc) file for this conversion.', 'warning');
            return false;
        }
        if (this.currentMode === 'excel-to-pdf' && ext !== 'xlsx' && ext !== 'xls') {
            this.showToast('Please select an Excel (.xlsx/.xls) file for this conversion.', 'warning');
            return false;
        }
        return true;
    }
    clearSelectedFile() {
        this.selectedFile = null;
        this.fileInput.value = '';
        this.fileDetailsCard.classList.add('hidden');
        this.convertBtn.disabled = true;
        this.hideStatus();
    }
    async startConversion() {
        if (!this.selectedFile)
            return;
        if (!this.validateFileForMode(this.selectedFile))
            return;
        let endpoint = '';
        let targetExt = '';
        if (this.currentMode === 'pdf-to-excel') {
            endpoint = '/api/convert/pdf-to-excel';
            targetExt = '.xlsx';
        }
        else if (this.currentMode === 'pdf-to-word') {
            endpoint = '/api/convert/pdf-to-word';
            targetExt = '.docx';
        }
        else if (this.currentMode === 'word-to-pdf') {
            endpoint = '/api/convert/word-to-pdf';
            targetExt = '.pdf';
        }
        else if (this.currentMode === 'excel-to-pdf') {
            endpoint = '/api/convert/excel-to-pdf';
            targetExt = '.pdf';
        }
        const baseName = this.selectedFile.name.substring(0, this.selectedFile.name.lastIndexOf('.')) || this.selectedFile.name;
        const outputFilename = `${baseName}${targetExt}`;
        // Update UI for Converting
        this.convertBtn.disabled = true;
        this.progressContainer.classList.remove('hidden');
        this.progressBar.style.width = '15%';
        this.progressText.textContent = 'Uploading & preparing file...';
        this.statusMessage.className = 'hidden';
        const formData = new FormData();
        formData.append('file', this.selectedFile);
        try {
            this.progressBar.style.width = '45%';
            this.progressText.textContent = 'Processing multilingual typography & layout...';
            const response = await fetch(endpoint, {
                method: 'POST',
                body: formData,
            });
            if (!response.ok) {
                let errorDetail = 'Conversion failed';
                try {
                    const errJson = await response.json();
                    errorDetail = errJson.detail || errorDetail;
                }
                catch (_) { }
                throw new Error(errorDetail);
            }
            this.progressBar.style.width = '85%';
            this.progressText.textContent = 'Finalizing output file...';
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            this.progressBar.style.width = '100%';
            this.progressText.textContent = 'Conversion 100% complete!';
            // Trigger automatic download
            this.triggerDownload(blobUrl, outputFilename);
            // Add to History
            this.addHistoryItem({
                id: Math.random().toString(36).substring(2, 9),
                filename: this.selectedFile.name,
                outputFilename: outputFilename,
                type: this.getModeDisplayName(this.currentMode),
                timestamp: new Date().toLocaleTimeString(),
                size: this.formatFileSize(blob.size),
                blobUrl: blobUrl,
            });
            this.showStatus(`Conversion successful! Saved as <strong>${outputFilename}</strong>`, 'success');
            this.showToast(`Converted ${outputFilename} successfully!`, 'success');
        }
        catch (err) {
            console.error(err);
            this.progressBar.style.width = '0%';
            this.showStatus(`Conversion error: ${err.message || 'An unexpected error occurred.'}`, 'error');
            this.showToast(err.message || 'Conversion failed', 'error');
        }
        finally {
            this.convertBtn.disabled = false;
        }
    }
    triggerDownload(url, filename) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
    addHistoryItem(item) {
        this.history.unshift(item);
        this.renderHistory();
    }
    renderHistory() {
        if (this.history.length === 0) {
            this.historyList.innerHTML = `<div class="text-center text-gray-400 py-6 text-sm">No conversions yet. Completed downloads will appear here.</div>`;
            return;
        }
        this.historyList.innerHTML = this.history.map(item => `
      <div class="flex items-center justify-between p-3.5 bg-slate-800/60 rounded-xl border border-slate-700/60 hover:border-indigo-500/50 transition">
        <div class="flex items-center space-x-3 truncate">
          <div class="w-10 h-10 rounded-lg flex items-center justify-center bg-indigo-950/80 border border-indigo-700/50 text-indigo-400 font-bold text-xs uppercase">
            ${item.outputFilename.split('.').pop()}
          </div>
          <div class="truncate">
            <div class="text-sm font-semibold text-slate-100 truncate">${item.outputFilename}</div>
            <div class="text-xs text-slate-400">From ${item.filename} &bull; ${item.size} &bull; ${item.timestamp}</div>
          </div>
        </div>
        <div class="flex items-center space-x-2 shrink-0">
          <a href="${item.blobUrl}" download="${item.outputFilename}" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg flex items-center space-x-1.5 transition">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            <span>Download</span>
          </a>
        </div>
      </div>
    `).join('');
    }
    getModeDisplayName(mode) {
        switch (mode) {
            case 'pdf-to-excel': return 'PDF to Excel';
            case 'pdf-to-word': return 'PDF to Word';
            case 'word-to-pdf': return 'Word to PDF';
            case 'excel-to-pdf': return 'Excel to PDF';
            default: return 'Auto Convert';
        }
    }
    formatFileSize(bytes) {
        if (bytes === 0)
            return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
    showStatus(msg, type) {
        this.statusMessage.className = `p-4 rounded-xl text-sm mt-4 ${type === 'success' ? 'bg-emerald-950/70 border border-emerald-500/50 text-emerald-200' : 'bg-rose-950/70 border border-rose-500/50 text-rose-200'}`;
        this.statusMessage.innerHTML = msg;
    }
    hideStatus() {
        this.statusMessage.className = 'hidden';
        this.progressContainer.classList.add('hidden');
    }
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        const bg = type === 'success' ? 'bg-emerald-600' : type === 'error' ? 'bg-rose-600' : type === 'warning' ? 'bg-amber-600' : 'bg-indigo-600';
        toast.className = `fixed bottom-6 right-6 ${bg} text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center space-x-2 text-sm z-50 animate-bounce`;
        toast.innerHTML = `<span>${message}</span>`;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.remove();
        }, 3500);
    }
    async checkServerHealth() {
        try {
            const res = await fetch('/api/health');
            if (res.ok) {
                console.log('Conversion Studio Server connected and ready.');
            }
        }
        catch (_) {
            console.warn('Server offline or starting up...');
        }
    }
}
// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    new ConversionApp();
});
