import os
import sys
import io
import fitz
from PIL import Image

def compress_pdf(input_path: str, output_path: str, level: str = 'recommended'):
    """
    Compresses a PDF document using a robust multi-pass strategy:
    Pass 1: Native stream deflation, font/stream deduplication, and PyMuPDF image rewriting.
    Pass 2 (Image Compressor Logic): If Pass 1 cannot significantly reduce size (e.g. scanned
           or complex embedded raster pages), apply full-page image compression rasterization
           at the requested resolution/quality.
    Pass 3: Compare sizes across all attempts and save strictly the smallest result.
    """
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Input file not found: {input_path}")

    orig_size = os.path.getsize(input_path)
    level = (level or 'recommended').lower()

    if level == 'extreme':
        rewrite_thresh = 100
        rewrite_target = 85
        rewrite_qual = 55
        raster_dpi = 120
        raster_qual = 60
    elif level == 'lossless':
        rewrite_thresh = None
        rewrite_target = 0
        rewrite_qual = 0
        raster_dpi = None
        raster_qual = None
    else:  # recommended
        rewrite_thresh = 140
        rewrite_target = 110
        rewrite_qual = 72
        raster_dpi = 150
        raster_qual = 75

    candidates = []

    # --- PASS 1: Native Stream Cleaning + rewrite_images ---
    try:
        doc = fitz.open(input_path)
        if rewrite_thresh and rewrite_target:
            try:
                doc.rewrite_images(
                    dpi_threshold=rewrite_thresh,
                    dpi_target=rewrite_target,
                    quality=rewrite_qual,
                    lossy=True,
                    lossless=True
                )
            except Exception:
                pass

        pass1_bytes = doc.tobytes(
            garbage=4,
            deflate=True,
            deflate_images=True,
            deflate_fonts=True,
            clean=True
        )
        doc.close()

        if pass1_bytes and len(pass1_bytes) > 0:
            candidates.append(('pass1', len(pass1_bytes), pass1_bytes))
    except Exception:
        pass

    # --- PASS 2: Image Compressor Logic (Rasterization Fallback) ---
    # Triggered if lossless is not requested, and either Pass 1 failed or Pass 1
    # didn't achieve at least a 10% reduction.
    best_so_far = min([c[1] for c in candidates], default=orig_size)
    needs_raster = (raster_dpi is not None) and (best_so_far >= orig_size * 0.90)

    if needs_raster:
        try:
            doc_src = fitz.open(input_path)
            doc_new = fitz.open()

            for page in doc_src:
                pix = page.get_pixmap(dpi=raster_dpi)
                # Ensure RGB colorspace without alpha issues
                if pix.alpha:
                    pix = fitz.Pixmap(fitz.csRGB, pix)

                pil_img = Image.frombytes('RGB', [pix.width, pix.height], pix.samples)
                buf = io.BytesIO()
                pil_img.save(buf, format='JPEG', quality=raster_qual, optimize=True)
                img_bytes = buf.getvalue()

                new_page = doc_new.new_page(width=page.rect.width, height=page.rect.height)
                new_page.insert_image(page.rect, stream=img_bytes)

            pass2_bytes = doc_new.tobytes(garbage=4, deflate=True)
            doc_src.close()
            doc_new.close()

            if pass2_bytes and len(pass2_bytes) > 0:
                candidates.append(('pass2_raster', len(pass2_bytes), pass2_bytes))
        except Exception:
            pass

    # --- PASS 3: Select the strictly smallest output ---
    if candidates:
        # Sort candidates by file size ascending
        candidates.sort(key=lambda x: x[1])
        best_candidate = candidates[0]

        # Write out the smallest candidate
        with open(output_path, 'wb') as f:
            f.write(best_candidate[2])
    else:
        # Fallback: copy original if all else fails
        with open(input_path, 'rb') as f_in, open(output_path, 'wb') as f_out:
            f_out.write(f_in.read())

