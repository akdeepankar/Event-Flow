"use client";

import { useState, useEffect } from "react";

export default function Popup({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  type = "info", // "info", "success", "warning", "error"
  showCloseButton = true,
  autoClose = false,
  autoCloseDelay = 3000,
  eventUrl = ""
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      if (autoClose) {
        const timer = setTimeout(() => {
          handleClose();
        }, autoCloseDelay);
        return () => clearTimeout(timer);
      }
    } else {
      setIsVisible(false);
    }
  }, [isOpen, autoClose, autoCloseDelay]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 200); // Allow time for fade out animation
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(eventUrl);
      // You could add a toast notification here if you want
      console.log('Event URL copied to clipboard:', eventUrl);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  const getTypeStyles = () => {
    switch (type) {
      case "success":
        return {
          icon: (
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          bgColor: "bg-green-100",
          textColor: "text-green-600",
          buttonColor: "bg-green-600 hover:bg-green-700"
        };
      case "warning":
        return {
          icon: (
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          ),
          bgColor: "bg-yellow-100",
          textColor: "text-yellow-600",
          buttonColor: "bg-yellow-600 hover:bg-yellow-700"
        };
      case "error":
        return {
          icon: (
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          bgColor: "bg-red-100",
          textColor: "text-red-600",
          buttonColor: "bg-red-600 hover:bg-red-700"
        };
      default:
        return {
          icon: (
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          bgColor: "bg-blue-100",
          textColor: "text-blue-600",
          buttonColor: "bg-blue-600 hover:bg-blue-700"
        };
    }
  };

  const typeStyles = getTypeStyles();

  if (!isOpen) return null;

  return (
            <div className="fixed inset-0 bg-transparent backdrop-blur-md flex items-center justify-center z-60 p-4">
      <div 
        className={`bg-white rounded-2xl shadow-xl max-w-md w-full p-6 transform transition-all duration-200 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        <div className="text-center">
          <div className={`w-16 h-16 ${typeStyles.bgColor} rounded-full flex items-center justify-center mx-auto mb-4`}>
            {typeStyles.icon}
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600 mb-4 whitespace-pre-wrap">{message}</p>
          
          {eventUrl && (
            <div className="mb-6">
              <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <input
                  type="text"
                  value={eventUrl}
                  readOnly
                  className="flex-1 text-sm text-gray-600 bg-transparent border-none outline-none"
                />
                <button
                  onClick={handleCopyUrl}
                  className="text-blue-600 hover:text-blue-700 transition-colors p-1"
                  title="Copy link"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          
          {showCloseButton && (
            <button
              onClick={handleClose}
              className={`${typeStyles.buttonColor} text-white px-6 py-2 rounded-lg transition-colors`}
            >
              OK
            </button>
          )}
        </div>
      </div>
    </div>
  );
} 