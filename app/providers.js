"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ClerkProvider } from "@clerk/nextjs";
import { useState, useEffect } from "react";

export function Providers({ children }) {
  const [convex, setConvex] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
      
      if (!convexUrl) {
        console.warn("NEXT_PUBLIC_CONVEX_URL is not defined - using fallback");
        // Use a fallback URL or show a configuration message
        setError("Convex URL not configured. Please check your environment variables.");
        return;
      }

      try {
        const convexClient = new ConvexReactClient(convexUrl);
        setConvex(convexClient);
      } catch (err) {
        console.error("Failed to initialize Convex client:", err);
        setError("Failed to initialize Convex client. Please check your configuration.");
      }
    }
  }, []);

  if (error) {
    return (
      <ClerkProvider>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="text-red-600 mb-4 text-lg font-semibold">Configuration Error</div>
            <div className="text-gray-600 mb-4">{error}</div>
            <div className="text-sm text-gray-500">
              Please check your environment variables and try refreshing the page.
            </div>
          </div>
        </div>
      </ClerkProvider>
    );
  }

  if (!convex) {
    return (
      <ClerkProvider>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </ClerkProvider>
    );
  }

  return (
    <ClerkProvider>
      <ConvexProvider client={convex}>
        {children}
      </ConvexProvider>
    </ClerkProvider>
  );
} 