import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service - SnapDoc',
  description: 'Terms and conditions for using SnapDoc online image and PDF tools.',
};

export default function TermsPage() {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-base-content">
          Terms of Service
        </h1>
        <p className="text-sm text-base-content/60">
          Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      <div className="p-6 rounded-3xl bg-base-100 border border-base-300 space-y-6 text-sm text-base-content/80 leading-relaxed shadow-sm">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-base-content">1. Acceptance of Terms</h2>
          <p>
            By accessing or using SnapDoc, you agree to comply with and be bound by these Terms of Service. If you do not agree, please do not use our services.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-base-content">2. Permitted Use</h2>
          <p>
            SnapDoc provides free image and PDF manipulation tools for personal, academic, and commercial purposes. You agree not to upload malicious software, illegal material, or use automated scrapers that excessively load our servers.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-base-content">3. Disclaimer of Warranties</h2>
          <p>
            The services are provided &quot;as is&quot; without warranty of any kind. While we strive for high conversion accuracy and file fidelity, SnapDoc is not liable for data loss or discrepancies in processed files. Always retain a local backup of your original files.
          </p>
        </section>
      </div>
    </div>
  );
}
