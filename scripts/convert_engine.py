import sys
import os
import argparse

# Add scripts directory and converters directory to sys.path
SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, SCRIPTS_DIR)

from converters import (
    convert_pdf_to_excel,
    convert_pdf_to_word,
    convert_word_to_pdf,
    convert_excel_to_pdf
)

def main():
    parser = argparse.ArgumentParser(description="Professional Multilingual Document Converter Engine")
    parser.add_argument("mode", choices=["pdf2docx", "pdf2excel", "word2pdf", "excel2pdf", "docx2pdf", "pdf-to-word", "pdf-to-excel", "word-to-pdf", "excel-to-pdf", "compress-pdf"])
    parser.add_argument("input", help="Input file path")
    parser.add_argument("output", help="Output file path")
    parser.add_argument("--level", default="recommended", help="Compression level (recommended, extreme, lossless)")

    args = parser.parse_args()

    if not os.path.exists(args.input):
        print(f"Error: Input file '{args.input}' not found", file=sys.stderr)
        sys.exit(1)

    os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)

    try:
        mode = args.mode.lower()
        if mode in ["pdf2docx", "pdf-to-word"]:
            convert_pdf_to_word(args.input, args.output)
        elif mode in ["pdf2excel", "pdf-to-excel"]:
            convert_pdf_to_excel(args.input, args.output)
        elif mode in ["word2pdf", "docx2pdf", "word-to-pdf"]:
            convert_word_to_pdf(args.input, args.output)
        elif mode in ["excel2pdf", "excel-to-pdf"]:
            convert_excel_to_pdf(args.input, args.output)
        elif mode == "compress-pdf":
            from converters.compress_pdf import compress_pdf
            compress_pdf(args.input, args.output, level=args.level)
        else:
            raise ValueError(f"Unsupported mode: {args.mode}")

        if not os.path.exists(args.output) or os.path.getsize(args.output) == 0:
            raise RuntimeError(f"Output file '{args.output}' was not generated or is empty.")

        print("SUCCESS")
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
