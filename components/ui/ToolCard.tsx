import React from 'react';
import Link from 'next/link';
import {
  Minimize2,
  Sparkles,
  Maximize2,
  Crop,
  RotateCw,
  FileImage,
  Zap,
  FileText,
  Layers,
  ArrowRight,
  Scissors,
  Trash2,
  Hash,
  Stamp,
  PenTool,
  FileSpreadsheet,
  FileCode,
  Bot,
  MessageSquare,
  Camera,
  ScanText,
} from 'lucide-react';
import { ToolMeta } from '@/lib/config/tools';

const ICON_MAP: Record<string, React.ReactNode> = {
  Minimize2: <Minimize2 className="w-5 h-5 text-blue-500" />,
  Sparkles: <Sparkles className="w-5 h-5 text-amber-500" />,
  SlidersHorizontal: <Minimize2 className="w-5 h-5 text-indigo-500" />,
  Maximize2: <Maximize2 className="w-5 h-5 text-teal-500" />,
  Crop: <Crop className="w-5 h-5 text-emerald-500" />,
  RotateCw: <RotateCw className="w-5 h-5 text-violet-500" />,
  FlipHorizontal: <RotateCw className="w-5 h-5 text-purple-500" />,
  FileImage: <FileImage className="w-5 h-5 text-orange-500" />,
  Zap: <Zap className="w-5 h-5 text-amber-500" />,
  FileText: <FileText className="w-5 h-5 text-red-500" />,
  Image: <FileImage className="w-5 h-5 text-blue-500" />,
  Layers: <Layers className="w-5 h-5 text-cyan-500" />,
  Scissors: <Scissors className="w-5 h-5 text-pink-500" />,
  Trash2: <Trash2 className="w-5 h-5 text-rose-500" />,
  Hash: <Hash className="w-5 h-5 text-emerald-500" />,
  Stamp: <Stamp className="w-5 h-5 text-purple-500" />,
  PenTool: <PenTool className="w-5 h-5 text-indigo-500" />,
  FileSpreadsheet: <FileSpreadsheet className="w-5 h-5 text-green-600" />,
  FileCode: <FileCode className="w-5 h-5 text-amber-600" />,
  Bot: <Bot className="w-5 h-5 text-violet-600" />,
  MessageSquare: <MessageSquare className="w-5 h-5 text-blue-600" />,
  Camera: <Camera className="w-5 h-5 text-teal-600" />,
  ScanText: <ScanText className="w-5 h-5 text-cyan-600" />,
};

export default function ToolCard({ tool }: { tool: ToolMeta }) {
  return (
    <Link
      href={`/${tool.slug}`}
      className="group relative flex flex-col justify-between p-5 rounded-2xl bg-base-100 border border-base-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200"
    >
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="w-11 h-11 rounded-xl bg-base-200 flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/10 transition-all">
            {ICON_MAP[tool.icon] || <FileText className="w-5 h-5 text-primary" />}
          </div>
          {tool.badge && (
            <span className="badge badge-sm badge-primary font-medium text-[11px] px-2">
              {tool.badge}
            </span>
          )}
        </div>

        <h3 className="font-semibold text-base text-base-content group-hover:text-primary transition-colors flex items-center gap-1.5">
          {tool.name}
        </h3>
        <p className="text-xs text-base-content/65 mt-1.5 line-clamp-2 leading-relaxed">
          {tool.description}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-base-200 flex items-center justify-between text-xs font-semibold text-primary">
        <span>Use Tool Free</span>
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </div>
    </Link>
  );
}
