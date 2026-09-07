import React from 'react';
import type { Metadata } from 'next';
import { ShieldCheck, Lock, Trash2, EyeOff } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy - 100% In-Memory Processing Guarantee',
  description: 'Learn about our strict zero file storage policy and privacy architecture.',
};

export default function PrivacyPage() {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div className="space-y-3 text-center sm:text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20">
          <ShieldCheck className="w-4 h-4" />
          <span>Zero Permanent File Storage Guarantee</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-base-content">
          Privacy Policy
        </h1>
        <p className="text-sm text-base-content/60">
          Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      <div className="p-6 rounded-3xl bg-base-100 border border-base-300 space-y-6 text-sm text-base-content/80 leading-relaxed shadow-sm">
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" />
            1. In-Memory Processing Architecture
          </h2>
          <p>
            SnapDoc is designed around a strict <strong>ephemeral in-memory architecture</strong>. When you upload an image or PDF document to any of our tools, the file is temporarily processed in volatile RAM buffers solely to perform the requested optimization, conversion, or transformation.
          </p>
          <p>
            We do NOT write your uploaded files to any permanent disk storage, cloud bucket (like AWS S3, Cloudinary, or Firebase), or persistent database (like MongoDB or PostgreSQL).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-emerald-500" />
            2. Immediate File Destruction
          </h2>
          <p>
            Once your processed file is returned to your web browser for preview and download, the temporary memory buffer is immediately reclaimed by the garbage collector. No copy or backup is retained.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
            <EyeOff className="w-4 h-4 text-violet-500" />
            3. No Account or Personal Information
          </h2>
          <p>
            SnapDoc is completely free to use without creating an account, registering an email address, or submitting personal information. We do not track individual users across sessions.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-base-content">
            4. Analytics & Cookies
          </h2>
          <p>
            We may use minimal, privacy-friendly analytics and standard server telemetry to monitor website uptime, performance, and aggregate error rates. We do not sell user data or share document contents with third parties.
          </p>
        </section>
      </div>
    </div>
  );
}
