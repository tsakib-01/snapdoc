import React from 'react';

interface AdSlotProps {
  slot?: string;
  format?: 'horizontal' | 'rectangle' | 'banner';
  className?: string;
}

export default function AdSlot({
  slot = 'default',
  format = 'horizontal',
  className = '',
}: AdSlotProps) {
  // Production ready ad placeholder structure for Google AdSense or Carbon Ads
  const dimensions =
    format === 'horizontal'
      ? 'min-h-[90px] max-h-[100px]'
      : format === 'banner'
      ? 'min-h-[120px]'
      : 'min-h-[250px]';

  return (
    <div
      className={`w-full my-6 flex flex-col items-center justify-center rounded-2xl bg-base-200/40 border border-dashed border-base-300 p-3 text-center overflow-hidden transition-all ${dimensions} ${className}`}
      data-ad-slot={slot}
    >
      <div className="flex flex-col items-center justify-center gap-1 opacity-40 hover:opacity-75 transition-opacity select-none">
        <span className="text-[10px] uppercase tracking-widest font-semibold text-base-content/60">
          Advertisement
        </span>
        <span className="text-xs text-base-content/40">
          Reserved Clean Ad Placement Spot
        </span>
      </div>
    </div>
  );
}
