import os
import uuid
import shutil
import mimetypes
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Header, Depends, Security
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security.api_key import APIKeyHeader
from converters import (
    convert_pdf_to_excel,
    convert_pdf_to_word,
    convert_word_to_pdf,
    convert_excel_to_pdf,
    compress_pdf
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
OUTPUT_DIR = os.path.join(BASE_DIR, "converted")
STATIC_DIR = os.path.join(BASE_DIR, "static")
EXPECTED_API_KEY = os.environ.get("CONVERSION_API_KEY", "").strip()

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(STATIC_DIR, exist_ok=True)

app = FastAPI(
    title="Document Conversion Studio",
    description="Localhost & Remote Multilingual Converter: PDF to Excel, PDF to Word, Word to PDF, Excel to PDF",
    version="1.2.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

api_key_header = APIKeyHeader(name="x-api-key", auto_error=False)

async def verify_api_key(x_api_key: str = Security(api_key_header)):
    if EXPECTED_API_KEY:
        if not x_api_key or x_api_key != EXPECTED_API_KEY:
            raise HTTPException(status_code=401, detail="Invalid or missing x-api-key header.")
    return True

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "engine": "Python 3.11 FastAPI Document Studio",
        "supported_conversions": [
            {"from": "pdf", "to": "xlsx", "name": "PDF to Excel (.xlsx)"},
            {"from": "pdf", "to": "docx", "name": "PDF to Word (.docx)"},
            {"from": "docx", "to": "pdf", "name": "Word (.docx) to PDF"},
            {"from": "xlsx", "to": "pdf", "name": "Excel (.xlsx) to PDF"},
            {"from": "pdf", "to": "pdf", "name": "Compress PDF"}
        ],
        "auth_required": bool(EXPECTED_API_KEY),
        "multilingual_support": True
    }


@app.post("/api/convert/compress-pdf", dependencies=[Depends(verify_api_key)])
async def api_compress_pdf(file: UploadFile = File(...), level: str = Form("recommended")):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Invalid file type. Expected .pdf file.")

    file_id = str(uuid.uuid4())
    base_name = os.path.splitext(os.path.basename(file.filename))[0]
    input_path = os.path.join(UPLOAD_DIR, f"{file_id}_{file.filename}")
    output_filename = f"{base_name}_compressed.pdf"
    output_path = os.path.join(OUTPUT_DIR, f"{file_id}_{output_filename}")

    try:
        with open(input_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        compress_pdf(input_path, output_path, level=level)

        if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
            raise RuntimeError("Compressed PDF file is empty or could not be generated.")

        return FileResponse(
            path=output_path,
            filename=output_filename,
            media_type="application/pdf",
            headers={
                "x-conversion-engine": "python-fastapi",
                "x-conversion-processor": "pymupdf-deflate",
                "x-conversion-status": "verified-success"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Compression failed: {str(e)}")
    finally:
        if os.path.exists(input_path):
            try:
                os.remove(input_path)
            except Exception:
                pass



@app.post("/api/convert/pdf-to-excel", dependencies=[Depends(verify_api_key)])
async def api_pdf_to_excel(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Invalid file type. Expected .pdf file.")
    
    file_id = str(uuid.uuid4())
    base_name = os.path.splitext(os.path.basename(file.filename))[0]
    input_path = os.path.join(UPLOAD_DIR, f"{file_id}_{file.filename}")
    output_filename = f"{base_name}.xlsx"
    output_path = os.path.join(OUTPUT_DIR, f"{file_id}_{output_filename}")

    try:
        with open(input_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        convert_pdf_to_excel(input_path, output_path)

        if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
            raise RuntimeError("Generated Excel file is empty.")

        return FileResponse(
            path=output_path,
            filename=output_filename,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "x-conversion-engine": "python-fastapi",
                "x-conversion-processor": "pymupdf-openpyxl",
                "x-conversion-status": "verified-success"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Conversion failed: {str(e)}")
    finally:
        if os.path.exists(input_path):
            try:
                os.remove(input_path)
            except Exception:
                pass

@app.post("/api/convert/pdf-to-word", dependencies=[Depends(verify_api_key)])
@app.post("/api/convert/pdf-to-doc", dependencies=[Depends(verify_api_key)])
async def api_pdf_to_word(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Invalid file type. Expected .pdf file.")
    
    file_id = str(uuid.uuid4())
    base_name = os.path.splitext(os.path.basename(file.filename))[0]
    input_path = os.path.join(UPLOAD_DIR, f"{file_id}_{file.filename}")
    output_filename = f"{base_name}.docx"
    output_path = os.path.join(OUTPUT_DIR, f"{file_id}_{output_filename}")

    try:
        with open(input_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        convert_pdf_to_word(input_path, output_path)

        if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
            raise RuntimeError("Generated Word document is empty.")

        return FileResponse(
            path=output_path,
            filename=output_filename,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={
                "x-conversion-engine": "python-fastapi",
                "x-conversion-processor": "pymupdf-docx",
                "x-conversion-status": "verified-success"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Conversion failed: {str(e)}")
    finally:
        if os.path.exists(input_path):
            try:
                os.remove(input_path)
            except Exception:
                pass

@app.post("/api/convert/word-to-pdf", dependencies=[Depends(verify_api_key)])
@app.post("/api/convert/doc-to-pdf", dependencies=[Depends(verify_api_key)])
async def api_word_to_pdf(file: UploadFile = File(...)):
    if not (file.filename.lower().endswith(".docx") or file.filename.lower().endswith(".doc") or file.filename.lower().endswith(".rtf")):
        raise HTTPException(status_code=400, detail="Invalid file type. Expected .docx, .doc, or .rtf file.")
    
    file_id = str(uuid.uuid4())
    base_name = os.path.splitext(os.path.basename(file.filename))[0]
    input_path = os.path.join(UPLOAD_DIR, f"{file_id}_{file.filename}")
    output_filename = f"{base_name}.pdf"
    output_path = os.path.join(OUTPUT_DIR, f"{file_id}_{output_filename}")

    try:
        with open(input_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        convert_word_to_pdf(input_path, output_path)

        if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
            raise RuntimeError("Generated PDF file is empty.")

        return FileResponse(
            path=output_path,
            filename=output_filename,
            media_type="application/pdf",
            headers={
                "x-conversion-engine": "python-fastapi",
                "x-conversion-processor": "python-docx-reportlab",
                "x-conversion-status": "verified-success"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Conversion failed: {str(e)}")
    finally:
        if os.path.exists(input_path):
            try:
                os.remove(input_path)
            except Exception:
                pass
            try:
                os.remove(input_path)
            except Exception:
                pass

@app.post("/api/convert/excel-to-pdf", dependencies=[Depends(verify_api_key)])
async def api_excel_to_pdf(file: UploadFile = File(...)):
    if not (file.filename.lower().endswith(".xlsx") or file.filename.lower().endswith(".xls")):
        raise HTTPException(status_code=400, detail="Invalid file type. Expected .xlsx or .xls file.")
    
    file_id = str(uuid.uuid4())
    base_name = os.path.splitext(os.path.basename(file.filename))[0]
    input_path = os.path.join(UPLOAD_DIR, f"{file_id}_{file.filename}")
    output_filename = f"{base_name}.pdf"
    output_path = os.path.join(OUTPUT_DIR, f"{file_id}_{output_filename}")

    try:
        with open(input_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        convert_excel_to_pdf(input_path, output_path)

        if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
            raise RuntimeError("Generated PDF file is empty.")

        return FileResponse(
            path=output_path,
            filename=output_filename,
            media_type="application/pdf"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Conversion failed: {str(e)}")
    finally:
        if os.path.exists(input_path):
            try:
                os.remove(input_path)
            except Exception:
                pass

@app.post("/api/convert/auto", dependencies=[Depends(verify_api_key)])
async def api_convert_auto(file: UploadFile = File(...), target_format: str = Form(...)):
    ext = os.path.splitext(file.filename)[1].lower()
    tgt = target_format.lower().replace(".", "")

    if ext == ".pdf":
        if tgt in ["xlsx", "excel", "xls"]:
            return await api_pdf_to_excel(file)
        elif tgt in ["docx", "word", "doc"]:
            return await api_pdf_to_word(file)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported target format '{target_format}' for PDF.")
    elif ext in [".docx", ".doc"]:
        if tgt in ["pdf"]:
            return await api_word_to_pdf(file)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported target format '{target_format}' for Word.")
    elif ext in [".xlsx", ".xls"]:
        if tgt in ["pdf"]:
            return await api_excel_to_pdf(file)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported target format '{target_format}' for Excel.")
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported input file type '{ext}'.")

if os.path.exists(STATIC_DIR):
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    import webbrowser
    port = int(os.environ.get("PORT", 5000))
    print(f"\n=======================================================")
    print(f"  Document Conversion Studio Running on port {port}")
    print(f"  Supported conversions (100% Multilingual):")
    print(f"   [1] PDF -> Excel (.xlsx)")
    print(f"   [2] PDF -> Word (.docx)")
    print(f"   [3] Word (.docx) -> PDF")
    print(f"   [4] Excel (.xlsx) -> PDF")
    print(f"=======================================================\n")
    uvicorn.run(app, host="0.0.0.0", port=port)

