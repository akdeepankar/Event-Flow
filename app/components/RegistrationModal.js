"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import Popup from "./Popup";

export default function RegistrationModal({ isOpen, onClose, eventId, eventTitle, isEventFull = false }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [showAlreadyRegistered, setShowAlreadyRegistered] = useState(false);
  const [popup, setPopup] = useState({ isOpen: false, title: "", message: "", type: "info" });
  
  const registerForEvent = useMutation(api.registrations.registerForEvent);
  
  // Check if user is already registered when email changes
  const registrationStatus = useQuery(
    api.registrations.isRegisteredForEvent,
    email && eventId ? { eventId, email } : "skip"
  );

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (e) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    setShowAlreadyRegistered(false); // Reset the already registered popup
    
    if (newEmail && !validateEmail(newEmail)) {
      setEmailError("Please enter a valid email address");
    } else {
      setEmailError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setPopup({ isOpen: true, title: "Required Field", message: "Please enter your name", type: "warning" });
      return;
    }
    
    if (!email.trim()) {
      setPopup({ isOpen: true, title: "Required Field", message: "Please enter your email", type: "warning" });
      return;
    }
    
    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    // Check if already registered before submitting
    if (registrationStatus?.isRegistered) {
      setShowAlreadyRegistered(true);
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await registerForEvent({
        eventId,
        name: name.trim(),
        email: email.trim(),
      });
      
      setName("");
      setEmail("");
      setEmailError("");
      onClose();
      
      const message = result.status === "waitlisted" 
        ? `Successfully added to waitlist! You are #${result.waitlistPosition} in line.`
        : "Successfully registered for the event!";
      
      setPopup({ isOpen: true, title: "Success", message: message, type: "success", autoClose: true });
    } catch (error) {
      console.error("Error registering for event:", error);
      if (error.message === "Already registered for this event") {
        setShowAlreadyRegistered(true);
      } else {
        setPopup({ isOpen: true, title: "Error", message: "Failed to register for event. Please try again.", type: "error" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setName("");
      setEmail("");
      setEmailError("");
      setShowAlreadyRegistered(false);
      onClose();
    }
  };

  const closePopup = () => {
    setPopup({ isOpen: false, title: "", message: "", type: "info" });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-transparent backdrop-blur-md flex items-center justify-center z-50 p-4">
      {/* Popup Component */}
      <Popup
        isOpen={popup.isOpen}
        onClose={closePopup}
        title={popup.title}
        message={popup.message}
        type={popup.type}
        autoClose={popup.autoClose}
      />
      
      {/* Already Registered Popup */}
      {showAlreadyRegistered && (
        <div className="fixed inset-0 bg-transparent backdrop-blur-md flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Already Registered</h3>
              <p className="text-gray-600 mb-6">
                You are already registered for this event with the email <strong>{email}</strong>.
              </p>
              <button
                onClick={() => setShowAlreadyRegistered(false)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {isEventFull ? "Get Waitlisted" : "Register for Event"}
            </h2>
            <p className="text-sm text-gray-600 mt-1">{eventTitle}</p>
            {isEventFull && (
              <p className="text-sm text-yellow-600 mt-1 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Event is full. You&apos;ll be notified when a spot opens up.
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Enter your full name"
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              value={email}
              onChange={handleEmailChange}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                emailError ? 'border-red-300' : registrationStatus?.isRegistered ? 'border-yellow-300' : 'border-gray-300'
              }`}
              placeholder="Enter your email address"
              required
              disabled={isSubmitting}
            />
            {emailError && (
              <p className="text-red-600 text-sm mt-1">{emailError}</p>
            )}
            {registrationStatus?.isRegistered && email && !emailError && (
              <p className="text-yellow-600 text-sm mt-1 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                {registrationStatus.status === "waitlisted" 
                  ? `Already on waitlist (#${registrationStatus.waitlistPosition})`
                  : "Already registered for this event"
                }
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !!emailError || registrationStatus?.isRegistered}
              className={`flex-1 text-white py-2 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors font-medium disabled:opacity-50 ${
                isEventFull 
                  ? 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500' 
                  : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
              }`}
            >
              {isSubmitting 
                ? (isEventFull ? "Adding to Waitlist..." : "Registering...") 
                : registrationStatus?.isRegistered 
                ? "Already Registered" 
                : isEventFull 
                ? "Get Waitlisted" 
                : "Register"
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 