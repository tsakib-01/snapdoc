'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  PenTool,
  Download,
  Loader2,
  CheckCircle2,
  RotateCcw,
  Type,
  Upload,
  Eraser,
  Hand,
  MousePointer,
  Calendar,
  Check,
  X,
  Circle,
  Minus,
  Plus,
  Trash2,
  Copy,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Undo,
  Redo,
  ShieldCheck,
  UserCheck,
  Users,
  FileSignature
} from 'lucide-react';
import UploadZone from '@/components/ui/UploadZone';
import { extractPdfThumbnails, PdfPageThumbnail } from '@/lib/pdf/pdfThumbnailHelper';
import { formatBytes } from '@/lib/utils/formatters';
import { PDFDocument } from 'pdf-lib';

export interface PlacedElement {
  id: string;
  type: 'signature' | 'initials' | 'text' | 'date' | 'check' | 'cross' | 'dot' | 'line';
  dataUrl?: string;
  text?: string;
  fontFamily?: string;
  x: number; // percentage (0 - 100)
  y: number; // percentage (0 - 100)
  width: number; // percentage (0 - 100)
  height: number; // percentage (0 - 100)
  pageIndex: number;
  color: string;
  opacity: number; // 0.1 to 1.0
}

interface SavedSignature {
  id: string;
  type: 'signature' | 'initials';
  dataUrl: string;
  label?: string;
}

export default function SignPdfTool() {
  // File & Rendering States
  const [file, setFile] = useState<File | null>(null);
  const [loadingPdf, setLoadingPdf] = useState<boolean>(false);
  const [pages, setPages] = useState<PdfPageThumbnail[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [activeTool, setActiveTool] = useState<'pointer' | 'hand'>('pointer');

  // Modal Flow States
  const [showWhoSigningModal, setShowWhoSigningModal] = useState<boolean>(false);
  const [showSealingModal, setShowSealingModal] = useState<boolean>(false);
  const [showSignatureCreator, setShowSignatureCreator] = useState<boolean>(false);
  const [creatorMode, setCreatorMode] = useState<'signature' | 'initials'>('signature');
  const [creatorTab, setCreatorTab] = useState<'draw' | 'type' | 'upload'>('draw');

  // Signatures Dropdown & Saved Signatures
  const [showSignaturesDropdown, setShowSignaturesDropdown] = useState<boolean>(false);
  const [showSymbolsDropdown, setShowSymbolsDropdown] = useState<boolean>(false);
  const [savedSignatures, setSavedSignatures] = useState<SavedSignature[]>([]);

  // Signature Creator Internals
  const [creatorColor, setCreatorColor] = useState<string>('#1e293b'); // Black, Blue, Red
  const [typedText, setTypedText] = useState<string>('');
  const [selectedFont, setSelectedFont] = useState<string>('Caveat');
  const [uploadedSignatureUrl, setUploadedSignatureUrl] = useState<string | null>(null);
  const [drawHistory, setDrawHistory] = useState<ImageData[]>([]);
  const [drawHistoryStep, setDrawHistoryStep] = useState<number>(-1);

  // Placed Elements on the PDF Pages
  const [placedElements, setPlacedElements] = useState<PlacedElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<PlacedElement[][]>([]);
  const [redoStack, setRedoStack] = useState<PlacedElement[][]>([]);

  // Dragging & Resizing States
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isResizing, setIsResizing] = useState<string | null>(null); // handle: 'se', 'sw', 'ne', 'nw', etc.
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [elementInitialRect, setElementInitialRect] = useState<{ x: number; y: number; width: number; height: number }>({ x: 0, y: 0, width: 0, height: 0 });

  // Processing & Final Result
  const [processing, setProcessing] = useState<boolean>(false);
  const [resultData, setResultData] = useState<{
    dataUrl: string;
    filename: string;
    size: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // References
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef<boolean>(false);
  const pageContainerRef = useRef<HTMLDivElement | null>(null);

  // Push state to undo stack
  const recordState = (newElements: PlacedElement[]) => {
    setUndoStack((prev) => [...prev.slice(-20), placedElements]);
    setRedoStack([]);
    setPlacedElements(newElements);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setRedoStack((prev) => [...prev, placedElements]);
    setUndoStack((prev) => prev.slice(0, -1));
    setPlacedElements(previous);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((prev) => [...prev, placedElements]);
    setRedoStack((prev) => prev.slice(0, -1));
    setPlacedElements(next);
  };

  // 1. File Upload & Thumbnail Generation
  const handleFilesSelected = async (files: File[]) => {
    const selectedFile = files[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setLoadingPdf(true);
    setError(null);

    try {
      const { thumbnails } = await extractPdfThumbnails(selectedFile, { scale: 1.2 });
      if (!thumbnails || thumbnails.length === 0) {
        throw new Error('Unable to render PDF pages. The file may be password protected or corrupted.');
      }
      setPages(thumbnails);
      setCurrentPage(1);
      setShowWhoSigningModal(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load PDF.');
    } finally {
      setLoadingPdf(false);
    }
  };

  // 2. Setup Drawing Canvas in Creator Modal
  useEffect(() => {
    if (showSignatureCreator && creatorTab === 'draw' && drawCanvasRef.current) {
      const canvas = drawCanvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0)';
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = creatorColor;
        ctx.lineWidth = 2.8;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        saveDrawHistory();
      }
    }
  }, [showSignatureCreator, creatorTab, creatorColor]);

  const saveDrawHistory = () => {
    if (!drawCanvasRef.current) return;
    const ctx = drawCanvasRef.current.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const imgData = ctx.getImageData(0, 0, drawCanvasRef.current.width, drawCanvasRef.current.height);
    setDrawHistory((prev) => [...prev.slice(0, drawHistoryStep + 1), imgData]);
    setDrawHistoryStep((prev) => prev + 1);
  };

  const handleDrawUndo = () => {
    if (drawHistoryStep <= 0 || !drawCanvasRef.current) return;
    const ctx = drawCanvasRef.current.getContext('2d');
    if (!ctx) return;
    const prevStep = drawHistoryStep - 1;
    ctx.putImageData(drawHistory[prevStep], 0, 0);
    setDrawHistoryStep(prevStep);
  };

  const handleDrawRedo = () => {
    if (drawHistoryStep >= drawHistory.length - 1 || !drawCanvasRef.current) return;
    const ctx = drawCanvasRef.current.getContext('2d');
    if (!ctx) return;
    const nextStep = drawHistoryStep + 1;
    ctx.putImageData(drawHistory[nextStep], 0, 0);
    setDrawHistoryStep(nextStep);
  };

  const clearDrawingCanvas = () => {
    if (!drawCanvasRef.current) return;
    const ctx = drawCanvasRef.current.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, drawCanvasRef.current.width, drawCanvasRef.current.height);
      saveDrawHistory();
    }
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    isDrawing.current = true;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.strokeStyle = creatorColor;
    ctx.lineWidth = 2.8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const onDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || !drawCanvasRef.current) return;
    const ctx = drawCanvasRef.current.getContext('2d');
    if (!ctx) return;

    const rect = drawCanvasRef.current.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDraw = () => {
    if (isDrawing.current) {
      isDrawing.current = false;
      saveDrawHistory();
    }
  };

  // Convert typed cursive font to high-res transparent PNG
  const renderTypedSignatureToPng = (text: string, font: string, color: string): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = `italic 72px '${font}', cursive, sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    return canvas.toDataURL('image/png');
  };

  // Save Created Signature & Place onto Page
  const handleSaveCreatedSignature = () => {
    let finalDataUrl = '';

    if (creatorTab === 'draw' && drawCanvasRef.current) {
      finalDataUrl = drawCanvasRef.current.toDataURL('image/png');
    } else if (creatorTab === 'type' && typedText) {
      finalDataUrl = renderTypedSignatureToPng(typedText, selectedFont, creatorColor);
    } else if (creatorTab === 'upload' && uploadedSignatureUrl) {
      finalDataUrl = uploadedSignatureUrl;
    }

    if (!finalDataUrl) return;

    const newSig: SavedSignature = {
      id: `sig_${Date.now()}`,
      type: creatorMode,
      dataUrl: finalDataUrl,
      label: creatorMode === 'signature' ? (typedText || 'Signature') : (typedText || 'Initials'),
    };

    setSavedSignatures((prev) => [...prev, newSig]);
    setShowSignatureCreator(false);

    // Place directly onto current page at default central position
    placeItemOnPage({
      id: `elem_${Date.now()}`,
      type: creatorMode,
      dataUrl: finalDataUrl,
      x: 35,
      y: 40,
      width: creatorMode === 'signature' ? 26 : 14,
      height: creatorMode === 'signature' ? 12 : 10,
      pageIndex: currentPage - 1,
      color: creatorColor,
      opacity: 1.0,
    });
  };

  // Place element onto the PDF page
  const placeItemOnPage = (item: PlacedElement) => {
    const newItems = [...placedElements, item];
    recordState(newItems);
    setSelectedElementId(item.id);
  };

  // Quick Place Pre-saved Signature or Initials
  const handleSelectSavedSignature = (sig: SavedSignature) => {
    setShowSignaturesDropdown(false);
    placeItemOnPage({
      id: `elem_${Date.now()}`,
      type: sig.type,
      dataUrl: sig.dataUrl,
      x: 35,
      y: 40,
      width: sig.type === 'signature' ? 26 : 14,
      height: sig.type === 'signature' ? 12 : 10,
      pageIndex: currentPage - 1,
      color: '#1e293b',
      opacity: 1.0,
    });
  };

  // Place Date Stamp
  const handlePlaceDate = () => {
    const now = new Date();
    const formatted = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/${now.getFullYear()}`;
    placeItemOnPage({
      id: `elem_${Date.now()}`,
      type: 'date',
      text: formatted,
      x: 40,
      y: 45,
      width: 18,
      height: 6,
      pageIndex: currentPage - 1,
      color: '#1e293b',
      opacity: 1.0,
    });
  };

  // Place Custom Text
  const handlePlaceText = () => {
    placeItemOnPage({
      id: `elem_${Date.now()}`,
      type: 'text',
      text: 'Type text here',
      x: 35,
      y: 45,
      width: 25,
      height: 6,
      pageIndex: currentPage - 1,
      color: '#1e293b',
      opacity: 1.0,
    });
  };

  // Place Checkmark / Symbol
  const handlePlaceSymbol = (symbolType: 'check' | 'cross' | 'dot' | 'line') => {
    setShowSymbolsDropdown(false);
    placeItemOnPage({
      id: `elem_${Date.now()}`,
      type: symbolType,
      x: 45,
      y: 45,
      width: symbolType === 'line' ? 15 : 6,
      height: 6,
      pageIndex: currentPage - 1,
      color: symbolType === 'cross' ? '#dc2626' : '#16a34a',
      opacity: 1.0,
    });
  };

  // Delete Element
  const handleDeleteElement = (id: string) => {
    const newItems = placedElements.filter((el) => el.id !== id);
    recordState(newItems);
    if (selectedElementId === id) setSelectedElementId(null);
  };

  // Duplicate Element
  const handleDuplicateElement = (id: string) => {
    const el = placedElements.find((item) => item.id === id);
    if (!el) return;
    const duplicated: PlacedElement = {
      ...el,
      id: `elem_${Date.now()}`,
      x: Math.min(el.x + 3, 80),
      y: Math.min(el.y + 3, 80),
    };
    recordState([...placedElements, duplicated]);
    setSelectedElementId(duplicated.id);
  };

  // Update selected element property (color, opacity, text)
  const updateElementProp = (id: string, updates: Partial<PlacedElement>) => {
    const newItems = placedElements.map((el) => (el.id === id ? { ...el, ...updates } : el));
    recordState(newItems);
  };

  // Dragging on Page
  const handleElementMouseDown = (e: React.MouseEvent, elem: PlacedElement) => {
    e.stopPropagation();
    if (activeTool === 'hand') return;
    setSelectedElementId(elem.id);
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setElementInitialRect({ x: elem.x, y: elem.y, width: elem.width, height: elem.height });
  };

  const handleResizeHandleMouseDown = (e: React.MouseEvent, handle: string, elem: PlacedElement) => {
    e.stopPropagation();
    setSelectedElementId(elem.id);
    setIsResizing(handle);
    setDragStart({ x: e.clientX, y: e.clientY });
    setElementInitialRect({ x: elem.x, y: elem.y, width: elem.width, height: elem.height });
  };

  const handlePageMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!pageContainerRef.current) return;
      const rect = pageContainerRef.current.getBoundingClientRect();
      const deltaXPercent = ((e.clientX - dragStart.x) / rect.width) * 100;
      const deltaYPercent = ((e.clientY - dragStart.y) / rect.height) * 100;

      if (isDragging && selectedElementId) {
        const newX = Math.max(0, Math.min(100 - elementInitialRect.width, elementInitialRect.x + deltaXPercent));
        const newY = Math.max(0, Math.min(100 - elementInitialRect.height, elementInitialRect.y + deltaYPercent));

        setPlacedElements((prev) =>
          prev.map((el) => (el.id === selectedElementId ? { ...el, x: newX, y: newY } : el))
        );
      } else if (isResizing && selectedElementId) {
        let newWidth = elementInitialRect.width;
        let newHeight = elementInitialRect.height;
        let newX = elementInitialRect.x;
        let newY = elementInitialRect.y;

        if (isResizing.includes('e')) {
          newWidth = Math.max(4, Math.min(100 - newX, elementInitialRect.width + deltaXPercent));
        }
        if (isResizing.includes('s')) {
          newHeight = Math.max(3, Math.min(100 - newY, elementInitialRect.height + deltaYPercent));
        }
        if (isResizing.includes('w')) {
          const possibleWidth = elementInitialRect.width - deltaXPercent;
          if (possibleWidth >= 4) {
            newWidth = possibleWidth;
            newX = elementInitialRect.x + deltaXPercent;
          }
        }
        if (isResizing.includes('n')) {
          const possibleHeight = elementInitialRect.height - deltaYPercent;
          if (possibleHeight >= 3) {
            newHeight = possibleHeight;
            newY = elementInitialRect.y + deltaYPercent;
          }
        }

        setPlacedElements((prev) =>
          prev.map((el) =>
            el.id === selectedElementId
              ? { ...el, x: newX, y: newY, width: newWidth, height: newHeight }
              : el
          )
        );
      }
    },
    [isDragging, isResizing, selectedElementId, dragStart, elementInitialRect]
  );

  const handlePageMouseUp = () => {
    setIsDragging(false);
    setIsResizing(null);
  };

  // 3. Finalize & Sign PDF using pdf-lib
  const handleFinalizeAndDownload = async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);

    try {
      const fileBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
      const pdfPages = pdfDoc.getPages();

      for (const el of placedElements) {
        if (el.pageIndex >= pdfPages.length) continue;
        const page = pdfPages[el.pageIndex];
        const { width: pageWidth, height: pageHeight } = page.getSize();

        // Convert percentage coordinates to PDF points (PDF (0,0) is bottom-left)
        const pdfX = (el.x / 100) * pageWidth;
        const pdfWidth = (el.width / 100) * pageWidth;
        const pdfHeight = (el.height / 100) * pageHeight;
        const pdfY = pageHeight - (el.y / 100) * pageHeight - pdfHeight;

        if (el.dataUrl) {
          // Embed PNG Signature/Initials
          const pngImage = await pdfDoc.embedPng(el.dataUrl);
          page.drawImage(pngImage, {
            x: pdfX,
            y: pdfY,
            width: pdfWidth,
            height: pdfHeight,
            opacity: el.opacity,
          });
        } else if (el.type === 'text' || el.type === 'date') {
          // Render text onto offscreen canvas to guarantee exact styling and crispness
          const offCanvas = document.createElement('canvas');
          offCanvas.width = 600;
          offCanvas.height = 150;
          const offCtx = offCanvas.getContext('2d');
          if (offCtx) {
            offCtx.fillStyle = el.color;
            offCtx.font = `bold 44px sans-serif`;
            offCtx.textBaseline = 'middle';
            offCtx.fillText(el.text || '', 20, 75);
            const textDataUrl = offCanvas.toDataURL('image/png');
            const pngImage = await pdfDoc.embedPng(textDataUrl);
            page.drawImage(pngImage, {
              x: pdfX,
              y: pdfY,
              width: pdfWidth,
              height: pdfHeight,
              opacity: el.opacity,
            });
          }
        } else if (['check', 'cross', 'dot', 'line'].includes(el.type)) {
          const symCanvas = document.createElement('canvas');
          symCanvas.width = 200;
          symCanvas.height = 200;
          const sCtx = symCanvas.getContext('2d');
          if (sCtx) {
            sCtx.strokeStyle = el.color;
            sCtx.fillStyle = el.color;
            sCtx.lineWidth = 14;
            sCtx.lineCap = 'round';
            sCtx.lineJoin = 'round';

            if (el.type === 'check') {
              sCtx.beginPath();
              sCtx.moveTo(40, 100);
              sCtx.lineTo(85, 145);
              sCtx.lineTo(160, 55);
              sCtx.stroke();
            } else if (el.type === 'cross') {
              sCtx.beginPath();
              sCtx.moveTo(40, 40);
              sCtx.lineTo(160, 160);
              sCtx.moveTo(160, 40);
              sCtx.lineTo(40, 160);
              sCtx.stroke();
            } else if (el.type === 'dot') {
              sCtx.beginPath();
              sCtx.arc(100, 100, 45, 0, Math.PI * 2);
              sCtx.fill();
            } else if (el.type === 'line') {
              sCtx.beginPath();
              sCtx.moveTo(20, 100);
              sCtx.lineTo(180, 100);
              sCtx.stroke();
            }

            const symDataUrl = symCanvas.toDataURL('image/png');
            const pngImage = await pdfDoc.embedPng(symDataUrl);
            page.drawImage(pngImage, {
              x: pdfX,
              y: pdfY,
              width: pdfWidth,
              height: pdfHeight,
              opacity: el.opacity,
            });
          }
        }
      }

      const signedPdfBytes = await pdfDoc.save();
      const signedBlob = new Blob([signedPdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const signedUrl = URL.createObjectURL(signedBlob);

      setResultData({
        dataUrl: signedUrl,
        filename: `${file.name.replace(/\.[^/.]+$/, '')}_signed.pdf`,
        size: signedBlob.size,
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error signing PDF document.');
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPages([]);
    setPlacedElements([]);
    setSelectedElementId(null);
    setResultData(null);
    setError(null);
  };

  const currentElements = placedElements.filter((el) => el.pageIndex === currentPage - 1);
  const selectedElement = placedElements.find((el) => el.id === selectedElementId);

  return (
    <div className="w-full mx-auto select-none">
      {/* 0. Initial Upload Screen */}
      {!file && (
        <div className="max-w-4xl mx-auto space-y-6">
          <UploadZone
            accept="application/pdf"
            maxFiles={1}
            maxSizeMb={50}
            title="Upload PDF to eSign"
            subtitle="Sign yourself or request signatures. Draw, type, or upload your signature and place it anywhere with drag-and-drop."
            onFilesSelected={handleFilesSelected}
          />
          {loadingPdf && (
            <div className="flex items-center justify-center gap-3 p-6 rounded-2xl bg-base-100 border border-base-300">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
              <span className="text-sm font-medium text-base-content">Preparing PDF pages & eSign studio...</span>
            </div>
          )}
        </div>
      )}

      {/* 1. Modal: Choose who's signing (Screenshot 1) */}
      {showWhoSigningModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-base-100 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-base-300 space-y-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-base-content">Choose who&apos;s signing</h2>
              <button
                onClick={() => setShowWhoSigningModal(false)}
                className="btn btn-sm btn-circle btn-ghost"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option 1: Sign Myself */}
              <div className="rounded-2xl border-2 border-primary/20 hover:border-primary bg-base-200/40 p-5 flex flex-col justify-between items-center text-center space-y-4 hover:shadow-lg transition-all group">
                <div className="w-full h-36 bg-base-100 rounded-xl border border-base-300 p-3 flex flex-col items-center justify-center relative overflow-hidden">
                  <div className="w-24 h-16 border border-dashed border-primary/40 rounded-lg flex items-center justify-center bg-primary/5">
                    <span className="font-serif italic text-2xl text-primary transform -rotate-6">Signature</span>
                  </div>
                </div>
                <div className="space-y-1 w-full">
                  <button
                    onClick={() => {
                      setShowWhoSigningModal(false);
                      setShowSealingModal(true);
                    }}
                    className="btn btn-primary w-full gap-2 rounded-xl"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Sign myself</span>
                  </button>
                  <p className="text-xs text-base-content/60 pt-1">Create a signature and sign a document.</p>
                </div>
              </div>

              {/* Option 2: Get signatures from others */}
              <div className="rounded-2xl border-2 border-emerald-500/20 hover:border-emerald-500 bg-emerald-50/10 p-5 flex flex-col justify-between items-center text-center space-y-4 hover:shadow-lg transition-all relative group">
                <div className="absolute top-3 right-3 badge badge-success badge-sm gap-1 text-[10px] font-bold text-white">
                  <ShieldCheck className="w-3 h-3" />
                  Verified signing
                </div>
                <div className="w-full h-36 bg-base-100 rounded-xl border border-base-300 p-3 flex flex-col items-center justify-center relative overflow-hidden">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs">A</div>
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">B</div>
                  </div>
                  <span className="text-[11px] text-emerald-600 font-semibold mt-2">Multi-party Signing</span>
                </div>
                <div className="space-y-1 w-full">
                  <button
                    onClick={() => {
                      setShowWhoSigningModal(false);
                      setShowSealingModal(true);
                    }}
                    className="btn btn-primary w-full gap-2 rounded-xl"
                  >
                    <Users className="w-4 h-4" />
                    <span>Get signatures from others</span>
                  </button>
                  <p className="text-xs text-base-content/60 pt-1">SnapDoc Sign document product</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal: Choose sealing type (Screenshot 2) */}
      {showSealingModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-base-100 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-base-300 space-y-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-base-content">Choose sealing type</h2>
              <button
                onClick={() => setShowSealingModal(false)}
                className="btn btn-sm btn-circle btn-ghost"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option 1: Sign without a seal */}
              <div className="rounded-2xl border-2 border-base-300 hover:border-primary bg-base-200/40 p-5 flex flex-col justify-between items-center text-center space-y-4 hover:shadow-lg transition-all">
                <div className="w-full h-32 bg-base-100 rounded-xl border border-base-300 p-3 flex flex-col items-center justify-center relative">
                  <span className="font-serif italic text-2xl text-base-content/70">Signature</span>
                </div>
                <div className="space-y-1 w-full">
                  <button
                    onClick={() => setShowSealingModal(false)}
                    className="btn btn-primary w-full gap-2 rounded-xl"
                  >
                    <FileSignature className="w-4 h-4" />
                    <span>Sign without a seal</span>
                  </button>
                  <p className="text-xs text-base-content/60 pt-1">Sign without adding a digital seal.</p>
                </div>
              </div>

              {/* Option 2: Sign with digital seal */}
              <div className="rounded-2xl border-2 border-emerald-500/20 hover:border-emerald-500 bg-emerald-50/10 p-5 flex flex-col justify-between items-center text-center space-y-4 hover:shadow-lg transition-all">
                <div className="w-full h-32 bg-base-100 rounded-xl border border-base-300 p-3 flex flex-col items-center justify-center relative">
                  <div className="flex items-center gap-1.5 text-emerald-600 font-semibold text-xs mb-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verified Audit Trail</span>
                  </div>
                  <span className="font-serif italic text-2xl text-emerald-700">Digital Seal</span>
                </div>
                <div className="space-y-1 w-full">
                  <button
                    onClick={() => setShowSealingModal(false)}
                    className="btn btn-primary w-full gap-2 rounded-xl"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Sign with digital seal</span>
                  </button>
                  <p className="text-xs text-base-content/60 pt-1">Add a digital seal with audit trail certificate.</p>
                  <div className="text-[11px] text-emerald-600 font-semibold pt-1">✨ 100% Free with SnapDoc</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Modal: Signature Creator (Screenshot 4) */}
      {showSignatureCreator && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-base-100 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-base-300 space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-base-200 pb-3">
              <h2 className="text-xl font-bold text-base-content capitalize">
                Create {creatorMode}
              </h2>
              <button
                onClick={() => setShowSignatureCreator(false)}
                className="btn btn-sm btn-circle btn-ghost"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Creator Tabs: Draw / Type / Upload */}
            <div className="flex items-center bg-base-200 p-1 rounded-2xl">
              <button
                onClick={() => setCreatorTab('draw')}
                className={`flex-1 btn btn-sm rounded-xl gap-1.5 border-0 ${creatorTab === 'draw' ? 'btn-primary shadow-sm' : 'btn-ghost'}`}
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>Draw</span>
              </button>
              <button
                onClick={() => setCreatorTab('type')}
                className={`flex-1 btn btn-sm rounded-xl gap-1.5 border-0 ${creatorTab === 'type' ? 'btn-primary shadow-sm' : 'btn-ghost'}`}
              >
                <Type className="w-3.5 h-3.5" />
                <span>Type</span>
              </button>
              <button
                onClick={() => setCreatorTab('upload')}
                className={`flex-1 btn btn-sm rounded-xl gap-1.5 border-0 ${creatorTab === 'upload' ? 'btn-primary shadow-sm' : 'btn-ghost'}`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload</span>
              </button>
            </div>

            {/* Color Selector Dots */}
            {creatorTab !== 'upload' && (
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setCreatorColor('#1e293b')}
                  className={`w-6 h-6 rounded-full bg-slate-900 transition-all ${creatorColor === '#1e293b' ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setCreatorColor('#2563eb')}
                  className={`w-6 h-6 rounded-full bg-blue-600 transition-all ${creatorColor === '#2563eb' ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setCreatorColor('#dc2626')}
                  className={`w-6 h-6 rounded-full bg-red-600 transition-all ${creatorColor === '#dc2626' ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''}`}
                />
              </div>
            )}

            {/* TAB 1: DRAW CANVAS */}
            {creatorTab === 'draw' && (
              <div className="space-y-2">
                <div className="relative rounded-2xl border-2 border-dashed border-base-300 bg-base-200/30 overflow-hidden">
                  <canvas
                    ref={drawCanvasRef}
                    width={520}
                    height={180}
                    onMouseDown={startDraw}
                    onMouseMove={onDraw}
                    onMouseUp={stopDraw}
                    onMouseLeave={stopDraw}
                    onTouchStart={startDraw}
                    onTouchMove={onDraw}
                    onTouchEnd={stopDraw}
                    className="w-full h-44 bg-base-100 cursor-crosshair touch-none"
                  />
                  <div className="absolute inset-x-8 bottom-12 border-b border-primary/20 pointer-events-none flex justify-center">
                    <span className="text-[11px] text-primary/40 -mt-5">Draw here</span>
                  </div>
                  {/* Canvas Bottom Action Controls */}
                  <div className="absolute bottom-2 left-2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleDrawUndo}
                      disabled={drawHistoryStep <= 0}
                      className="btn btn-xs btn-ghost btn-circle"
                    >
                      <Undo className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={handleDrawRedo}
                      disabled={drawHistoryStep >= drawHistory.length - 1}
                      className="btn btn-xs btn-ghost btn-circle"
                    >
                      <Redo className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="absolute bottom-2 right-2">
                    <button
                      type="button"
                      onClick={clearDrawingCanvas}
                      className="btn btn-xs btn-ghost text-error gap-1 font-normal"
                    >
                      <Eraser className="w-3 h-3" />
                      <span>Clear</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: TYPE SIGNATURE */}
            {creatorTab === 'type' && (
              <div className="space-y-4">
                <input
                  type="text"
                  value={typedText}
                  onChange={(e) => setTypedText(e.target.value)}
                  placeholder={`Type your ${creatorMode}...`}
                  className="input input-bordered w-full rounded-2xl text-base"
                />

                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {['Caveat', 'Dancing Script', 'Great Vibes', 'Pacifico', 'Sacramento'].map((font) => (
                    <div
                      key={font}
                      onClick={() => setSelectedFont(font)}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${selectedFont === font ? 'border-primary bg-primary/5 shadow-sm' : 'border-base-200 hover:border-base-300'}`}
                    >
                      <span
                        style={{ fontFamily: font, color: creatorColor }}
                        className="text-2xl sm:text-3xl italic"
                      >
                        {typedText || 'Your Signature'}
                      </span>
                      {selectedFont === font && <Check className="w-4 h-4 text-primary" />}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: UPLOAD SIGNATURE */}
            {creatorTab === 'upload' && (
              <div className="space-y-3">
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      const reader = new FileReader();
                      reader.onload = () => setUploadedSignatureUrl(reader.result as string);
                      reader.readAsDataURL(f);
                    }
                  }}
                  className="file-input file-input-bordered file-input-md w-full rounded-2xl"
                />
                {uploadedSignatureUrl && (
                  <div className="p-4 rounded-2xl border border-base-300 bg-base-200/40 flex items-center justify-center">
                    <img
                      src={uploadedSignatureUrl}
                      alt="Uploaded preview"
                      className="max-h-28 object-contain"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Creator Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-base-200">
              <button
                type="button"
                onClick={() => setShowSignatureCreator(false)}
                className="btn btn-ghost rounded-xl px-5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCreatedSignature}
                className="btn btn-primary rounded-xl px-6"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Main eSign Studio Workspace */}
      {file && pages.length > 0 && !resultData && (
        <div className="w-full rounded-3xl bg-base-100 border border-base-300 shadow-xl overflow-hidden flex flex-col h-[680px] sm:h-[720px] max-h-[85vh]">
          {/* Top Signature Toolbar */}
          <div className="p-3 sm:px-5 border-b border-base-200 bg-base-200/40 flex flex-wrap items-center justify-between gap-3 shrink-0">
            {/* Left: Reset & File Title */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                title="Sign another file"
                className="btn btn-ghost btn-sm btn-circle"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <div className="max-w-[150px] sm:max-w-[220px] truncate">
                <span className="font-bold text-xs sm:text-sm text-base-content truncate block">
                  {file.name}
                </span>
              </div>
            </div>

            {/* Center Tools */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Hand Tool */}
              <button
                onClick={() => {
                  setActiveTool('hand');
                  setSelectedElementId(null);
                }}
                className={`btn btn-sm btn-circle ${activeTool === 'hand' ? 'btn-primary' : 'btn-ghost'}`}
                title="Pan Mode"
              >
                <Hand className="w-4 h-4" />
              </button>

              {/* Pointer Tool */}
              <button
                onClick={() => setActiveTool('pointer')}
                className={`btn btn-sm btn-circle ${activeTool === 'pointer' ? 'btn-primary' : 'btn-ghost'}`}
                title="Select & Move Tool"
              >
                <MousePointer className="w-4 h-4" />
              </button>

              <div className="h-5 w-px bg-base-300 mx-1" />

              {/* Signatures Dropdown Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowSignaturesDropdown(!showSignaturesDropdown)}
                  className="btn btn-sm rounded-xl gap-1.5 btn-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white"
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span>Signatures</span>
                  <ChevronDown className="w-3 h-3" />
                </button>

                {showSignaturesDropdown && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-base-100 rounded-2xl shadow-2xl border border-base-300 p-3 z-40 space-y-3">
                    {/* Signatures Section */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-base-content/60 px-1">
                        Signatures
                      </span>
                      {savedSignatures
                        .filter((s) => s.type === 'signature')
                        .map((sig) => (
                          <div
                            key={sig.id}
                            onClick={() => handleSelectSavedSignature(sig)}
                            className="p-2 rounded-xl bg-base-200/50 hover:bg-primary/10 border border-base-200 cursor-pointer flex items-center justify-between group"
                          >
                            <img src={sig.dataUrl} alt="Signature" className="h-7 object-contain" />
                            <span className="text-xs text-primary opacity-0 group-hover:opacity-100">Place</span>
                          </div>
                        ))}
                      <button
                        onClick={() => {
                          setShowSignaturesDropdown(false);
                          setCreatorMode('signature');
                          setShowSignatureCreator(true);
                        }}
                        className="btn btn-xs btn-outline w-full rounded-xl gap-1.5 py-2.5 h-auto text-xs"
                      >
                        <Plus className="w-3 h-3" />
                        <span>New signature</span>
                      </button>
                    </div>

                    {/* Initials Section */}
                    <div className="space-y-1.5 pt-2 border-t border-base-200">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-base-content/60 px-1">
                        Initials
                      </span>
                      {savedSignatures
                        .filter((s) => s.type === 'initials')
                        .map((sig) => (
                          <div
                            key={sig.id}
                            onClick={() => handleSelectSavedSignature(sig)}
                            className="p-2 rounded-xl bg-base-200/50 hover:bg-primary/10 border border-base-200 cursor-pointer flex items-center justify-between group"
                          >
                            <img src={sig.dataUrl} alt="Initials" className="h-7 object-contain" />
                            <span className="text-xs text-primary opacity-0 group-hover:opacity-100">Place</span>
                          </div>
                        ))}
                      <button
                        onClick={() => {
                          setShowSignaturesDropdown(false);
                          setCreatorMode('initials');
                          setShowSignatureCreator(true);
                        }}
                        className="btn btn-xs btn-outline w-full rounded-xl gap-1.5 py-2.5 h-auto text-xs"
                      >
                        <Plus className="w-3 h-3" />
                        <span>New initials</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Add Signees Tool */}
              <button
                onClick={() => setShowWhoSigningModal(true)}
                className="btn btn-sm btn-ghost rounded-xl gap-1 hidden md:flex text-xs"
                title="Add Signees"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Add signees</span>
              </button>

              {/* Date Stamp */}
              <button
                onClick={handlePlaceDate}
                className="btn btn-sm btn-circle btn-ghost"
                title="Add Date Stamp"
              >
                <Calendar className="w-4 h-4" />
              </button>

              {/* Text Tool */}
              <button
                onClick={handlePlaceText}
                className="btn btn-sm btn-circle btn-ghost"
                title="Add Text"
              >
                <Type className="w-4 h-4" />
              </button>

              {/* Symbols Tool */}
              <div className="relative">
                <button
                  onClick={() => setShowSymbolsDropdown(!showSymbolsDropdown)}
                  className="btn btn-sm btn-ghost rounded-xl gap-1 px-2"
                  title="Add Symbols"
                >
                  <Check className="w-4 h-4 text-emerald-600" />
                  <ChevronDown className="w-3 h-3" />
                </button>
                {showSymbolsDropdown && (
                  <div className="absolute top-full left-0 mt-2 bg-base-100 rounded-2xl shadow-xl border border-base-300 p-2 z-40 flex flex-col gap-1">
                    <button
                      onClick={() => handlePlaceSymbol('check')}
                      className="btn btn-xs btn-ghost gap-2 justify-start"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Checkmark</span>
                    </button>
                    <button
                      onClick={() => handlePlaceSymbol('cross')}
                      className="btn btn-xs btn-ghost gap-2 justify-start"
                    >
                      <X className="w-3.5 h-3.5 text-red-600" />
                      <span>Cross</span>
                    </button>
                    <button
                      onClick={() => handlePlaceSymbol('dot')}
                      className="btn btn-xs btn-ghost gap-2 justify-start"
                    >
                      <Circle className="w-3.5 h-3.5 fill-current text-slate-800" />
                      <span>Dot</span>
                    </button>
                    <button
                      onClick={() => handlePlaceSymbol('line')}
                      className="btn btn-xs btn-ghost gap-2 justify-start"
                    >
                      <Minus className="w-3.5 h-3.5 text-slate-800" />
                      <span>Line</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="h-5 w-px bg-base-300 mx-1" />

              {/* Undo / Redo */}
              <button
                onClick={handleUndo}
                disabled={undoStack.length === 0}
                className="btn btn-sm btn-circle btn-ghost"
                title="Undo"
              >
                <Undo className="w-4 h-4" />
              </button>
              <button
                onClick={handleRedo}
                disabled={redoStack.length === 0}
                className="btn btn-sm btn-circle btn-ghost"
                title="Redo"
              >
                <Redo className="w-4 h-4" />
              </button>
            </div>

            {/* Right: Download & Finish */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleFinalizeAndDownload}
                disabled={processing}
                className="btn btn-sm btn-primary rounded-xl gap-2 shadow-md shadow-primary/20 px-4"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Main Area: Sidebar Thumbnails + Center PDF Canvas */}
          <div className="flex-1 flex overflow-hidden min-h-0 relative bg-base-300/30">
            {/* Left Page Thumbnails Sidebar */}
            <div className="w-24 sm:w-28 border-r border-base-300 bg-base-100 overflow-y-auto p-2.5 space-y-2.5 shrink-0 flex flex-col items-center h-full">
              {pages.map((pg) => (
                <div
                  key={pg.pageNumber}
                  onClick={() => {
                    setCurrentPage(pg.pageNumber);
                    setSelectedElementId(null);
                  }}
                  className={`w-full rounded-xl p-1.5 border-2 cursor-pointer transition-all flex flex-col items-center gap-1 group ${currentPage === pg.pageNumber ? 'border-primary bg-primary/5 shadow-md' : 'border-base-200 hover:border-base-300'}`}
                >
                  <div className="w-full bg-white rounded-lg shadow-sm overflow-hidden flex items-center justify-center">
                    <img
                      src={pg.dataUrl}
                      alt={`Page ${pg.pageNumber}`}
                      className="w-full h-auto object-contain"
                    />
                  </div>
                  <span className="text-[11px] font-bold text-base-content/70">
                    {pg.pageNumber}
                  </span>
                </div>
              ))}
            </div>

            {/* Center Canvas Area */}
            <div
              className="flex-1 h-full overflow-auto p-4 sm:p-6 flex items-center justify-center relative"
              onMouseMove={handlePageMouseMove}
              onMouseUp={handlePageMouseUp}
              onClick={() => setSelectedElementId(null)}
            >
              {pages[currentPage - 1] && (
                <div
                  ref={pageContainerRef}
                  style={{
                    width: `${Math.min(pages[currentPage - 1].width * (zoomLevel / 100), 720)}px`,
                    maxWidth: '100%',
                    aspectRatio: `${pages[currentPage - 1].aspectRatio}`,
                  }}
                  className="relative bg-white shadow-xl rounded-lg overflow-hidden select-none border border-base-300 my-auto"
                >
                  {/* Rendered PDF Page Background */}
                  <img
                    src={pages[currentPage - 1].dataUrl}
                    alt={`Current Page ${currentPage}`}
                    className="w-full h-full object-contain pointer-events-none"
                  />

                  {/* Placed Elements on Current Page */}
                  {currentElements.map((elem) => {
                    const isSelected = selectedElementId === elem.id;

                    return (
                      <div
                        key={elem.id}
                        onMouseDown={(e) => handleElementMouseDown(e, elem)}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          left: `${elem.x}%`,
                          top: `${elem.y}%`,
                          width: `${elem.width}%`,
                          height: `${elem.height}%`,
                          opacity: elem.opacity,
                        }}
                        className={`absolute cursor-move flex items-center justify-center transition-shadow ${
                          isSelected
                            ? 'ring-2 ring-red-500 rounded-md shadow-lg z-30'
                            : 'hover:ring-1 hover:ring-primary/60 z-20'
                        }`}
                      >
                        {/* Render Placed Signature/Initials Image */}
                        {elem.dataUrl && (
                          <img
                            src={elem.dataUrl}
                            alt="Placed signature"
                            className="w-full h-full object-contain pointer-events-none"
                          />
                        )}

                        {/* Render Placed Text or Date */}
                        {(elem.type === 'text' || elem.type === 'date') && (
                          <input
                            type="text"
                            value={elem.text || ''}
                            onChange={(e) => updateElementProp(elem.id, { text: e.target.value })}
                            style={{ color: elem.color }}
                            className="w-full h-full bg-transparent font-bold text-center border-none outline-none text-xs sm:text-sm"
                          />
                        )}

                        {/* Render Placed Symbols */}
                        {elem.type === 'check' && (
                          <Check style={{ color: elem.color }} className="w-full h-full stroke-[3]" />
                        )}
                        {elem.type === 'cross' && (
                          <X style={{ color: elem.color }} className="w-full h-full stroke-[3]" />
                        )}
                        {elem.type === 'dot' && (
                          <Circle style={{ color: elem.color }} className="w-1/2 h-1/2 fill-current" />
                        )}
                        {elem.type === 'line' && (
                          <Minus style={{ color: elem.color }} className="w-full h-full stroke-[4]" />
                        )}

                        {/* Selected Element Floating Toolbar & Handles (Screenshot 5) */}
                        {isSelected && (
                          <>
                            {/* Floating Toolbar anchored above element */}
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute -top-12 left-1/2 -translate-x-1/2 bg-base-100 rounded-2xl shadow-xl border border-base-300 px-3 py-1.5 flex items-center gap-2 z-40 animate-in fade-in zoom-in-95 duration-150"
                            >
                              {/* Color Picker */}
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => updateElementProp(elem.id, { color: '#1e293b' })}
                                  className={`w-4 h-4 rounded-full bg-slate-900 ${elem.color === '#1e293b' ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                                />
                                <button
                                  type="button"
                                  onClick={() => updateElementProp(elem.id, { color: '#2563eb' })}
                                  className={`w-4 h-4 rounded-full bg-blue-600 ${elem.color === '#2563eb' ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                                />
                                <button
                                  type="button"
                                  onClick={() => updateElementProp(elem.id, { color: '#dc2626' })}
                                  className={`w-4 h-4 rounded-full bg-red-600 ${elem.color === '#dc2626' ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                                />
                              </div>

                              <div className="h-4 w-px bg-base-300 mx-0.5" />

                              {/* Opacity Selector */}
                              <select
                                value={elem.opacity}
                                onChange={(e) => updateElementProp(elem.id, { opacity: parseFloat(e.target.value) })}
                                className="select select-xs rounded-lg bg-base-200 border-none text-[11px] font-semibold"
                              >
                                <option value="1">100%</option>
                                <option value="0.8">80%</option>
                                <option value="0.5">50%</option>
                              </select>

                              <div className="h-4 w-px bg-base-300 mx-0.5" />

                              {/* Duplicate Button */}
                              <button
                                type="button"
                                onClick={() => handleDuplicateElement(elem.id)}
                                title="Duplicate"
                                className="btn btn-xs btn-ghost btn-circle"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete Button */}
                              <button
                                type="button"
                                onClick={() => handleDeleteElement(elem.id)}
                                title="Delete"
                                className="btn btn-xs btn-ghost btn-circle text-error"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Resize Handles (Corners) */}
                            <div
                              onMouseDown={(e) => handleResizeHandleMouseDown(e, 'nw', elem)}
                              className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-red-500 rounded-full border border-white cursor-nwse-resize z-30"
                            />
                            <div
                              onMouseDown={(e) => handleResizeHandleMouseDown(e, 'ne', elem)}
                              className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-red-500 rounded-full border border-white cursor-nesw-resize z-30"
                            />
                            <div
                              onMouseDown={(e) => handleResizeHandleMouseDown(e, 'se', elem)}
                              className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-red-500 rounded-full border border-white cursor-nwse-resize z-30"
                            />
                            <div
                              onMouseDown={(e) => handleResizeHandleMouseDown(e, 'sw', elem)}
                              className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-red-500 rounded-full border border-white cursor-nesw-resize z-30"
                            />
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Floating Controls: Page Navigator & Zoom */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-base-100/95 backdrop-blur-md rounded-2xl shadow-xl border border-base-300 px-3.5 py-1.5 flex items-center gap-2.5 z-30">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="btn btn-xs btn-ghost btn-circle"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-base-content min-w-[50px] text-center">
                {currentPage} / {pages.length}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(pages.length, p + 1))}
                disabled={currentPage >= pages.length}
                className="btn btn-xs btn-ghost btn-circle"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <div className="h-4 w-px bg-base-300" />

              <button
                onClick={() => setZoomLevel((z) => Math.max(50, z - 15))}
                className="btn btn-xs btn-ghost btn-circle"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-semibold text-base-content/70 min-w-[36px] text-center">
                {zoomLevel}%
              </span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(200, z + 15))}
                className="btn btn-xs btn-ghost btn-circle"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Success Download Screen */}
      {resultData && (
        <div className="p-8 sm:p-12 rounded-3xl bg-base-100 border border-base-300 shadow-xl text-center space-y-6 max-w-2xl mx-auto">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-success/10 text-success flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-extrabold text-base-content">Signed Document Ready!</h3>
            <p className="text-xs text-base-content/60">
              {resultData.filename} • {formatBytes(resultData.size)}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <a
              href={resultData.dataUrl}
              download={resultData.filename}
              className="btn btn-primary px-8 gap-2 shadow-lg shadow-primary/25 rounded-2xl w-full sm:w-auto"
            >
              <Download className="w-4 h-4" />
              <span>Download Signed PDF</span>
            </a>
            <button
              onClick={handleReset}
              className="btn btn-ghost text-xs rounded-2xl w-full sm:w-auto"
            >
              Sign Another Document
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
