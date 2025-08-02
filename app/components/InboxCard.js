"use client";

import Link from "next/link";

export default function InboxCard() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Inbox</h3>
            <p className="text-sm text-gray-600">Email management</p>
          </div>
        </div>
      </div>
      
      <p className="text-gray-600 text-sm mb-4">
        Send bulk emails to event registrants, manage email templates, and track delivery status.
      </p>
      
      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm text-gray-600">
          <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
          Bulk email sending
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
          Event-specific targeting
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
          Delivery tracking
        </div>
      </div>
      
      <Link
        href="/inbox"
        className="inline-flex items-center justify-center w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
      >
        Open Inbox
        <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </div>
  );
} 