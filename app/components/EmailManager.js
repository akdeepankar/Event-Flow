"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import Popup from "./Popup";

export default function EmailManager() {
  const [emailId, setEmailId] = useState("");
  const [emailStatus, setEmailStatus] = useState(null);
  const [popup, setPopup] = useState({ isOpen: false, title: "", message: "", type: "info" });
  
  const sendTestEmail = useMutation(api.emails.sendTestEmail);
  const getEmailStatus = useQuery(api.emails.getEmailStatus, emailId ? { emailId } : "skip");
  const cancelEmail = useMutation(api.emails.cancelEmail);

  const handleSendTestEmail = async () => {
    try {
      await sendTestEmail();
      setPopup({ isOpen: true, title: "Success", message: "Test email sent successfully!", type: "success", autoClose: true });
    } catch (error) {
      console.error("Error sending test email:", error);
      setPopup({ isOpen: true, title: "Error", message: "Failed to send test email", type: "error" });
    }
  };

  const handleCheckStatus = async () => {
    if (!emailId) {
      setPopup({ isOpen: true, title: "Required Field", message: "Please enter an email ID", type: "warning" });
      return;
    }
    setEmailStatus(getEmailStatus);
  };

  const handleCancelEmail = async () => {
    if (!emailId) {
      setPopup({ isOpen: true, title: "Required Field", message: "Please enter an email ID", type: "warning" });
      return;
    }
    try {
      await cancelEmail({ emailId });
      setPopup({ isOpen: true, title: "Success", message: "Email cancelled successfully!", type: "success", autoClose: true });
    } catch (error) {
      console.error("Error cancelling email:", error);
      setPopup({ isOpen: true, title: "Error", message: "Failed to cancel email", type: "error" });
    }
  };

  const closePopup = () => {
    setPopup({ isOpen: false, title: "", message: "", type: "info" });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Popup Component */}
      <Popup
        isOpen={popup.isOpen}
        onClose={closePopup}
        title={popup.title}
        message={popup.message}
        type={popup.type}
        autoClose={popup.autoClose}
      />
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Email Management</h2>
      
      <div className="space-y-4">
        {/* Send Test Email */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-md font-medium text-gray-900 mb-2">Send Test Email</h3>
          <p className="text-sm text-gray-600 mb-3">
            Send a test email to verify your email configuration.
          </p>
          <button
            onClick={handleSendTestEmail}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Send Test Email
          </button>
        </div>

        {/* Check Email Status */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-md font-medium text-gray-900 mb-2">Check Email Status</h3>
          <p className="text-sm text-gray-600 mb-3">
            Enter an email ID to check its delivery status.
          </p>
          <div className="flex space-x-2">
            <input
              type="text"
              value={emailId}
              onChange={(e) => setEmailId(e.target.value)}
              placeholder="Enter email ID"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={handleCheckStatus}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              Check Status
            </button>
          </div>
          
          {emailStatus && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-1">Email Status:</h4>
              <pre className="text-xs text-gray-600 overflow-auto">
                {JSON.stringify(emailStatus, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Cancel Email */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-md font-medium text-gray-900 mb-2">Cancel Email</h3>
          <p className="text-sm text-gray-600 mb-3">
            Cancel an email that hasn&apos;t been sent yet.
          </p>
          <div className="flex space-x-2">
            <input
              type="text"
              value={emailId}
              onChange={(e) => setEmailId(e.target.value)}
              placeholder="Enter email ID"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={handleCancelEmail}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Cancel Email
            </button>
          </div>
        </div>

        {/* Email Features Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-md font-medium text-blue-900 mb-2">Email Features</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Automatic confirmation emails when users register for events</li>
            <li>• Scheduled reminder emails sent 24 hours before events</li>
            <li>• Email status tracking and delivery confirmation</li>
            <li>• Automatic cleanup of old emails (7 days)</li>
            <li>• Rate limiting and idempotency protection</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 