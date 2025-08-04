"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function RazorpaySettings() {
  const { user } = useUser();
  const [razorpayKeyId, setRazorpayKeyId] = useState("");
  const [razorpayKeySecret, setRazorpayKeySecret] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const updateCredentials = useMutation(api.users.updateRazorpayCredentials);
  const upsertUser = useMutation(api.users.upsertUser);
  const credentials = useQuery(api.users.getRazorpayCredentials, 
    user?.emailAddresses[0]?.emailAddress ? { clerkId: user.emailAddresses[0].emailAddress } : "skip"
  );

  useEffect(() => {
    if (credentials) {
      setRazorpayKeyId(credentials.razorpayKeyId || "");
      setRazorpayKeySecret(credentials.razorpayKeySecret || "");
    }
  }, [credentials]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!razorpayKeyId.trim() || !razorpayKeySecret.trim()) {
      alert("Please enter both Razorpay Key ID and Key Secret");
      return;
    }

    setIsSubmitting(true);

    try {
      const userEmail = user.emailAddresses[0]?.emailAddress || "";
      
      // First, ensure the user exists in the database
      await upsertUser({
        clerkId: userEmail,
        name: user.fullName || userEmail || "User",
        email: userEmail,
      });

      // Then update the Razorpay credentials
      await updateCredentials({
        clerkId: userEmail,
        razorpayKeyId: razorpayKeyId.trim(),
        razorpayKeySecret: razorpayKeySecret.trim(),
      });
      
      alert("Razorpay credentials updated successfully!");
    } catch (error) {
      console.error("Error updating credentials:", error);
      alert("Failed to update credentials. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Razorpay Settings</h2>
        <p className="text-gray-600 text-sm">
          Add your Razorpay API credentials to enable payment processing for your digital products.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="razorpayKeyId" className="block text-sm font-medium text-gray-700 mb-1">
            Razorpay Key ID *
          </label>
          <input
            type="text"
            id="razorpayKeyId"
            value={razorpayKeyId}
            onChange={(e) => setRazorpayKeyId(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="rzp_test_xxxxxxxxxxxxx"
            disabled={isSubmitting}
          />
          <p className="text-xs text-gray-500 mt-1">
            Your Razorpay Key ID (starts with rzp_test_ for test mode or rzp_live_ for live mode)
          </p>
        </div>

        <div>
          <label htmlFor="razorpayKeySecret" className="block text-sm font-medium text-gray-700 mb-1">
            Razorpay Key Secret *
          </label>
          <div className="relative">
            <input
              type={showSecret ? "text" : "password"}
              id="razorpayKeySecret"
              value={razorpayKeySecret}
              onChange={(e) => setRazorpayKeySecret(e.target.value)}
              required
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your Razorpay Key Secret"
              disabled={isSubmitting}
            />
            <button
              type="button"
              onClick={() => setShowSecret(!showSecret)}
              className="absolute right-2 top-2 text-gray-500 hover:text-gray-700"
            >
              {showSecret ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Your Razorpay Key Secret (keep this secure and never share it)
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-blue-900 mb-1">How to get your Razorpay credentials:</h3>
              <ol className="text-sm text-blue-800 space-y-1">
                <li>1. Go to <a href="https://dashboard.razorpay.com/" target="_blank" rel="noopener noreferrer" className="underline">Razorpay Dashboard</a></li>
                <li>2. Sign up or log in to your account</li>
                <li>3. Navigate to Settings → API Keys</li>
                <li>4. Copy your Key ID and Key Secret</li>
                <li>5. Use test keys for development, live keys for production</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-yellow-900 mb-1">Security Notice:</h3>
              <p className="text-sm text-yellow-800">
                Your Razorpay credentials are encrypted and stored securely. Never share your Key Secret with anyone.
                For production use, make sure to use live mode keys and configure webhooks properly.
              </p>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !razorpayKeyId.trim() || !razorpayKeySecret.trim()}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Updating...</span>
            </div>
          ) : (
            "Update Razorpay Credentials"
          )}
        </button>
      </form>
    </div>
  );
} 