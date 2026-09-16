import os
import sys
import io
import fitz
from PIL import Image

def compress_pdf(input_path: str, output_path: str, level: str = '50'):
    """
    Compresses a PDF document with tiered size reduction targets:
    - '25': Mild compression, target ~25% reduction (~75% original size).
            High visual fidelity, font subsetting, stream deflation.
    - '50': Balanced compression, target ~50% reduction (~50% original size).
            Standard DPI downsampling (140-150 DPI), JPEG quality 68, font subsetting.
    - '75': Strongest compression, target ~75% reduction (~25% original size).
            Aggressive downsampling (96-110 DPI), JPEG quality 45, font subsetting, metadata scrub.
    """
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Input file not found: {input_path}")

    orig_size = os.path.getsize(input_path)
    if orig_size == 0:
        with open(input_path, 'rb') as f_in, open(output_path, 'wb') as f_out:
            f_out.write(f_in.read())
        return

    level_str = str(level).strip().lower()
    if level_str in ('25', 'low', 'lossless', '25%'):
        target_tier = '25'
        target_ratio = 0.75  # ~25% reduction
        max_dim = 1600
        quality = 82
        raster_dpi = 150
        raster_qual = 75
    elif level_str in ('75', 'extreme', 'high', '75%'):
        target_tier = '75'
        target_ratio = 0.25  # ~75% reduction
        max_dim = 750
        quality = 45
        raster_dpi = 96
        raster_qual = 45
    else:  # default '50', 'recommended', 'medium', '50%'
        target_tier = '50'
        target_ratio = 0.50  # ~50% reduction
        max_dim = 1150
        quality = 68
        raster_dpi = 120
        raster_qual = 60

    candidates = []

    def process_images_in_doc(doc_obj, dim_limit, jpg_qual):
        """Extracts, resizes, and re-encodes embedded images with PIL directly."""
        processed_xrefs = set()
        replaced_count = 0

        for page in doc_obj:
            images = page.get_images()
            for img_info in images:
                xref = img_info[0]
                if xref in processed_xrefs:
                    continue
                processed_xrefs.add(xref)

                try:
                    ext_info = doc_obj.extract_image(xref)
                    if not ext_info or not ext_info.get("image"):
                        continue

                    orig_img_bytes = ext_info["image"]
                    pil_im = Image.open(io.BytesIO(orig_img_bytes))

                    # Resize if dimensions exceed threshold
                    orig_w, orig_h = pil_im.size
                    if max(orig_w, orig_h) > dim_limit:
                        pil_im.thumbnail((dim_limit, dim_limit), Image.Resampling.LANCZOS)

                    buf = io.BytesIO()
                    # Handle transparency
                    if pil_im.mode in ('RGBA', 'LA') or (pil_im.mode == 'P' and 'transparency' in pil_im.info):
                        pil_im.save(buf, format='PNG', optimize=True)
                    else:
                        if pil_im.mode != 'RGB':
                            pil_im = pil_im.convert('RGB')
                        pil_im.save(buf, format='JPEG', quality=jpg_qual, optimize=True)

                    comp_bytes = buf.getvalue()
                    # Only replace if smaller than original image stream
                    if len(comp_bytes) < len(orig_img_bytes):
                        page.replace_image(xref, stream=comp_bytes)
                        replaced_count += 1
                except Exception:
                    pass

        return replaced_count

    # --- PASS 1: Native Stream Cleaning, Font Subsetting & Direct Image Recompression ---
    try:
        doc = fitz.open(input_path)
        try:
            doc.subset_fonts()
        except Exception:
            pass

        if target_tier == '75':
            try:
                doc.scrub(metadata=True, thumbnails=True, embedded_files=True)
            except Exception:
                pass

        replaced = process_images_in_doc(doc, max_dim, quality)

        pass1_bytes = doc.tobytes(
            garbage=4,
            deflate=True,
            deflate_images=True,
            deflate_fonts=True,
            clean=True
        )
        doc.close()

        if pass1_bytes and len(pass1_bytes) < orig_size:
            candidates.append(('pass1', len(pass1_bytes), pass1_bytes))
    except Exception:
        pass

    # --- PASS 2: Adaptive tighter pass if Pass 1 on image-rich PDF didn't reach target tier ---
    best_size = min([c[1] for c in candidates], default=orig_size)
    if target_tier in ('50', '75') and best_size > (orig_size * (target_ratio + 0.10)):
        try:
            doc2 = fitz.open(input_path)
            try:
                doc2.subset_fonts()
            except Exception:
                pass
            if target_tier == '75':
                try:
                    doc2.scrub(metadata=True, thumbnails=True, embedded_files=True)
                except Exception:
                    pass

            tighter_dim = 650 if target_tier == '75' else 950
            tighter_qual = 38 if target_tier == '75' else 55
            replaced2 = process_images_in_doc(doc2, tighter_dim, tighter_qual)

            if replaced2 > 0:
                pass2_bytes = doc2.tobytes(
                    garbage=4,
                    deflate=True,
                    deflate_images=True,
                    deflate_fonts=True,
                    clean=True
                )
                if pass2_bytes and len(pass2_bytes) < best_size:
                    candidates.append(('pass2_adaptive', len(pass2_bytes), pass2_bytes))
            doc2.close()
        except Exception:
            pass

    # --- PASS 3: Full-Page Rasterization Fallback (Scanned Documents / Flat Bitmaps) ---
    # Only triggered if no candidate yet or best reduction is under 10%
    best_size = min([c[1] for c in candidates], default=orig_size)
    if best_size >= orig_size * 0.90:
        try:
            doc_src = fitz.open(input_path)
            doc_raster = fitz.open()

            for page in doc_src:
                pix = page.get_pixmap(dpi=raster_dpi)
                if pix.alpha:
                    pix = fitz.Pixmap(fitz.csRGB, pix)

                pil_img = Image.frombytes('RGB', [pix.width, pix.height], pix.samples)
                buf = io.BytesIO()
                pil_img.save(buf, format='JPEG', quality=raster_qual, optimize=True)
                img_bytes = buf.getvalue()

                new_page = doc_raster.new_page(width=page.rect.width, height=page.rect.height)
                new_page.insert_image(page.rect, stream=img_bytes)

            raster_bytes = doc_raster.tobytes(garbage=4, deflate=True)
            doc_src.close()
            doc_raster.close()

            # Strictly only accept raster if smaller than vector candidate AND smaller than original
            if raster_bytes and len(raster_bytes) < min(best_size, orig_size):
                candidates.append(('pass3_raster', len(raster_bytes), raster_bytes))
        except Exception:
            pass

    # --- Final Candidate Selection ---
    if candidates:
        # Sort candidates ascending by size
        candidates.sort(key=lambda x: x[1])

        # Pick candidate closest to target without exceeding original size
        selected = candidates[0]
        if target_tier == '25':
            # For 25%, pick candidate closest to 0.75 * orig_size to avoid over-degrading quality
            target_bytes = orig_size * 0.75
            closest = min(candidates, key=lambda c: abs(c[1] - target_bytes))
            if closest[1] < orig_size:
                selected = closest

        with open(output_path, 'wb') as f:
            f.write(selected[2])
    else:
        # Fallback: copy original
        with open(input_path, 'rb') as f_in, open(output_path, 'wb') as f_out:
            f_out.write(f_in.read())
