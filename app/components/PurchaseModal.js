"use client";

import { useState, useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function PurchaseModal({ isOpen, onClose, product }) {
  const { user } = useUser();
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentLink, setPaymentLink] = useState("");
  const [paymentId, setPaymentId] = useState(null);
  const [showPaymentLink, setShowPaymentLink] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState("");
  const [countdown, setCountdown] = useState(120); // 2 minutes in seconds
  const [isCountdownActive, setIsCountdownActive] = useState(false);
  const [autoCheckInterval, setAutoCheckInterval] = useState(null);
  const countdownRef = useRef(null);
  const autoCheckRef = useRef(null);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const generatePaymentLink = useAction(api.payments.generatePaymentLink);
  const manualPaymentCheck = useAction(api.payments.manualPaymentCheck);
  const getFileUrl = useQuery(api.files.getFileUrl, { 
    storageId: product?.fileStorageId || "" 
  }, product?.fileStorageId ? undefined : "skip");



  // Start countdown and auto-check when payment link is generated
  useEffect(() => {
    if (showPaymentLink && paymentId && !isCountdownActive) {
      setIsCountdownActive(true);
      setCountdown(120); // Reset to 2 minutes
      setPaymentStatus("");
      
      // Start countdown timer
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            setIsCountdownActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Start automatic payment checking every 10 seconds
      autoCheckRef.current = setInterval(async () => {
        try {
          const result = await manualPaymentCheck({
            paymentId: paymentId,
          });

          if (result.success) {
            // Payment successful, stop timers and show success
            clearInterval(countdownRef.current);
            clearInterval(autoCheckRef.current);
            setIsCountdownActive(false);
            setPaymentStatus("success");
            setSuccessMessage("Payment completed! Your digital product has been sent to your email.");
            setShowSuccessPopup(true);
          }
        } catch (error) {
          console.error("Auto-check payment error:", error);
        }
      }, 10000); // Check every 10 seconds
    }

    // Cleanup timers when component unmounts or modal closes
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
      if (autoCheckRef.current) {
        clearInterval(autoCheckRef.current);
      }
    };
  }, [showPaymentLink, paymentId, isCountdownActive, manualPaymentCheck]);

  // Add state for showing loading animation on button
  const [isAutoChecking, setIsAutoChecking] = useState(false);

  // Effect to show loading animation during auto-check
  useEffect(() => {
    if (isCountdownActive && !isCheckingPayment) {
      // Show loading animation every 10 seconds for 2 seconds
      const loadingInterval = setInterval(() => {
        setIsAutoChecking(true);
        setTimeout(() => setIsAutoChecking(false), 2000);
      }, 10000);

      return () => clearInterval(loadingInterval);
    }
  }, [isCountdownActive, isCheckingPayment]);

  // Debug: Log when auto-checking happens
  useEffect(() => {
    if (isAutoChecking) {
      console.log("Auto-checking payment status...");
    }
  }, [isAutoChecking]);

  // Format countdown time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!customerName.trim() || !customerEmail.trim()) {
      return;
    }

    if (!user) {
      alert("Please sign in to purchase this product.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await generatePaymentLink({
        productId: product._id,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        amount: product.price,
        userClerkId: user.emailAddresses[0]?.emailAddress || "",
      });

      if (result.success) {
        setPaymentLink(result.paymentLinkUrl);
        setPaymentId(result.paymentId);
        setShowPaymentLink(true);
      } else {
        setSuccessMessage("Error generating payment link: " + result.error);
        setShowSuccessPopup(true);
      }
    } catch (error) {
      console.error("Error generating payment link:", error);
      setSuccessMessage("Failed to generate payment link. Please try again.");
      setShowSuccessPopup(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualPaymentCheck = async () => {
    if (!paymentId) {
      setSuccessMessage("No payment ID available. Please generate a payment link first.");
      setShowSuccessPopup(true);
      return;
    }

    setIsCheckingPayment(true);
    setPaymentStatus("");

    try {
      const result = await manualPaymentCheck({
        paymentId: paymentId,
      });

      if (result.success) {
        setPaymentStatus("success");
        setSuccessMessage("Payment verified and email sent successfully! Check your email for the download link.");
        setShowSuccessPopup(true);
      } else {
        setPaymentStatus("failed");
        setSuccessMessage(`Payment check failed: ${result.message || result.error}`);
        setShowSuccessPopup(true);
      }
    } catch (error) {
      console.error("Error checking payment:", error);
      setPaymentStatus("error");
      setSuccessMessage("Failed to check payment status. Please try again.");
      setShowSuccessPopup(true);
    } finally {
      setIsCheckingPayment(false);
    }
  };

  const handleClose = () => {
    // Clear timers
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }
    if (autoCheckRef.current) {
      clearInterval(autoCheckRef.current);
    }
    
    setCustomerName("");
    setCustomerEmail("");
    setPaymentLink("");
    setPaymentId(null);
    setShowPaymentLink(false);
    setIsSubmitting(false);
    setIsCheckingPayment(false);
    setPaymentStatus("");
    setIsCountdownActive(false);
    setCountdown(120);
    setShowSuccessPopup(false);
    setSuccessMessage("");
    onClose();
  };

  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {showPaymentLink ? "Payment Link Generated" : "Purchase Digital Product"}
            </h2>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {!showPaymentLink ? (
            <div>
              {/* Product Details */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
                  <div className="text-lg font-bold text-gray-900">
                    ₹{(product.price / 100).toFixed(2)}
                  </div>
                </div>
                {product.description && (
                  <p className="text-gray-600 text-sm mb-2">{product.description}</p>
                )}
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{product.fileName}</span>
                  <span>{(product.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                </div>
              </div>

              {/* Customer Information Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your full name"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label htmlFor="customerEmail" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="customerEmail"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your email address"
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Your digital product will be sent to this email address after payment.
                  </p>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !customerName.trim() || !customerEmail.trim()}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Generating...</span>
                      </div>
                    ) : (
                      "Generate Payment Link"
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div>
              {/* Payment Link Display */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-2 mb-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-green-800 font-medium">Payment Link Generated Successfully!</span>
                </div>
                <p className="text-green-700 text-sm mb-3">
                  Click the link below to complete your payment. After successful payment, your digital product will be automatically sent to your email.
                </p>
                
                                 {/* Countdown Timer */}
                 {isCountdownActive && (
                   <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                     <div className="flex items-center justify-between">
                       <div className="flex items-center space-x-2">
                         <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                         </svg>
                         <span className="text-blue-800 text-sm font-medium">Time remaining to complete payment:</span>
                       </div>
                       <div className={`text-2xl font-bold ${countdown <= 30 ? 'text-red-600' : countdown <= 60 ? 'text-orange-600' : 'text-blue-600'}`}>
                         {formatTime(countdown)}
                       </div>
                     </div>
                     <div className="mt-2 text-xs text-blue-700">
                       Payment status is monitored automatically. You&apos;ll be notified when payment is completed.
                     </div>
                   </div>
                 )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Link
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={paymentLink}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                    />
                                         <button
                       onClick={() => {
                         navigator.clipboard.writeText(paymentLink);
                         setSuccessMessage("Payment link copied to clipboard!");
                         setShowSuccessPopup(true);
                       }}
                       className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                     >
                       Copy
                     </button>
                  </div>
                </div>

                                 <div className="space-y-3">
                   <div className="flex space-x-3">
                     <button
                       onClick={() => window.open(paymentLink, '_blank')}
                       className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                     >
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                       </svg>
                       <span>Open Payment Link</span>
                     </button>
                   </div>
                   
                                       <div className="flex space-x-3">
                                             <button
                         onClick={handleManualPaymentCheck}
                         disabled={isCheckingPayment}
                         className={`flex-1 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 ${
                           isCountdownActive 
                             ? 'bg-blue-600 text-white hover:bg-blue-700' 
                             : 'bg-gray-600 text-white hover:bg-gray-700'
                         }`}
                       >
                        {isCheckingPayment ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Checking...</span>
                          </>
                                                 ) : isAutoChecking ? (
                           <>
                             <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                             <span>Checking payment status...</span>
                           </>
                         ) : (
                           <>
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                             </svg>
                             <span>Check Payment Status</span>
                           </>
                         )}
                      </button>
                    </div>
                   
                   {paymentStatus && (
                     <div className={`p-3 rounded-lg text-sm ${
                       paymentStatus === "success" 
                         ? "bg-green-50 text-green-700 border border-green-200" 
                         : paymentStatus === "failed"
                         ? "bg-red-50 text-red-700 border border-red-200"
                         : paymentStatus === "error"
                         ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
                         : "bg-gray-50 text-gray-700 border border-gray-200"
                     }`}>
                       {paymentStatus === "success" && "✅ Payment verified and email sent!"}
                       {paymentStatus === "failed" && "❌ Payment not completed yet."}
                       {paymentStatus === "error" && "⚠️ Error checking payment status."}
                     </div>
                   )}
                   
                   {!isCountdownActive && countdown === 0 && !paymentStatus && (
                     <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm">
                       <div className="flex items-center space-x-2">
                         <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                         </svg>
                         <span className="text-orange-700 font-medium">Payment time expired</span>
                       </div>
                       <p className="text-orange-600 mt-1">
                         The 2-minute payment window has expired. You can still manually check payment status, but automatic checking has stopped.
                       </p>
                     </div>
                   )}
                 </div>

                                 <button
                   onClick={handleClose}
                   className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                 >
                   Close
                 </button>
               </div>
             </div>
           )}
         </div>
       </div>

               {/* Success/Error Popup */}
        {showSuccessPopup && (
          <div className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {paymentStatus === "success" ? "Success!" : "Notification"}
                </h3>
                <button
                  onClick={() => setShowSuccessPopup(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-gray-700 mb-6">{successMessage}</p>
              <div className="flex justify-end">
                <button
                  onClick={() => setShowSuccessPopup(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
     </div>
   );
 } 