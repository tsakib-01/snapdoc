# 📄 Localhost Document Conversion Studio

A high-fidelity, local web application to convert documents between **PDF**, **Excel (`.xlsx`)**, and **Word (`.docx`)** with 100% precision and universal multilingual support. All conversions run locally on your computer with complete privacy.

---

## ✨ Features (4-Way Conversions)

1. 📊 **PDF to Excel (`.xlsx`)**: Smart multi-page table detection, styled headers, preserved numbers, and automatic column widths. Full Unicode & Bangla support.
2. 📝 **PDF to Word (`.docx`)**: Preserves layouts, typography, complex Indic/Bangla ligatures and conjuncts, paragraphs, images, borders, and margins.
3. 📑 **Word (`.docx`) to PDF**: Converts Word documents to crisp, publication-quality PDFs via native Word COM engine or reportlab fallback.
4. 📈 **Excel (`.xlsx`) to PDF**: Converts spreadsheets, financial data tables, and multi-sheet workbooks to PDF with auto-fit layout and landscape/portrait orientation.
5. 🌐 **Universal Multilingual Engine**: Complete support for **Bangla (বাংলা)**, Hindi (हिन्दी), Arabic (العربية), Chinese (中文), Japanese, Korean, Cyrillic, Spanish, and 100+ languages.
6. ⚡ **Modern TypeScript Web UI**: Drag-and-drop file upload, instant format validation, real-time conversion progress, and download history.
7. 🔒 **100% On-Device & Private**: No files are sent to any external server.

---

## 🚀 Quick Start (Localhost)

### Option 1: Double-Click
Simply double-click **`start.bat`**. It will start the local server and open your default browser to `http://localhost:5000`.

### Option 2: Command Line
```bash
python server.py
```
Then open [http://localhost:5000](http://localhost:5000) in your web browser.

---

## 🛠️ Project Structure

```
converstion_image/
├── converters/
│   ├── __init__.py
│   ├── multilingual_helper.py # Unicode normalization, script detection & font styling
│   ├── pdf_to_excel.py        # Multi-page table & text extraction to .xlsx
│   ├── pdf_to_word.py         # Multi-tiered layout reconstruction to .docx
│   ├── word_to_pdf.py         # Native Word COM & reportlab fallback to .pdf
│   └── excel_to_pdf.py        # Multi-sheet spreadsheet & table rendering to .pdf
├── src/
│   └── app.ts                 # TypeScript frontend client controller
├── static/
│   ├── index.html             # Modern 4-way conversion web interface
│   ├── style.css              # Glassmorphic UI styling
│   └── app.js                 # Compiled client script
├── server.py                  # FastAPI localhost server + REST endpoints
├── test_conversions.py        # Core conversion test suite
├── test_multilingual.py       # Bangla & multilingual test suite
├── test_excel_to_pdf.py       # Excel to PDF test suite
├── start.bat                  # One-click Windows starter
├── tsconfig.json              # TypeScript configuration
└── package.json               # Node / TypeScript project config
```

---

## 🧪 Testing

To run the automated test suites:
```bash
# Test core conversions
python test_conversions.py

# Test Bangla & multilingual script preservation
python test_multilingual.py

# Test Excel to PDF feature
python test_excel_to_pdf.py
```
