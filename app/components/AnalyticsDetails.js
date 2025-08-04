"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import Popup from "./Popup";
import DigitalProductModal from "./DigitalProductModal";
import SalesAnalytics from "./SalesAnalytics";

export default function AnalyticsDetails({ events, registrations, selectedEvent, onEventSelect }) {
  // Get registrations for selected event (including cancelled)
  const eventRegistrations = useQuery(
    api.registrations.getEventRegistrationsWithCancelled,
    selectedEvent?._id ? { eventId: selectedEvent._id } : "skip",
    selectedEvent?._id ? undefined : "skip"
  );

  // Get digital products for selected event
  const digitalProducts = useQuery(
    api.digitalProducts.getEventDigitalProducts,
    selectedEvent?._id ? { eventId: selectedEvent._id } : "skip",
    selectedEvent?._id ? undefined : "skip"
  );

  // Delete registration mutation
  const deleteRegistration = useMutation(api.registrations.cancelRegistration);
  const restoreRegistration = useMutation(api.registrations.restoreRegistration);
  const promoteWaitlisted = useMutation(api.registrations.promoteWaitlistedRegistration);
  const toggleRegistrationStatus = useMutation(api.events.toggleRegistrationStatus);
  const deleteDigitalProduct = useMutation(api.digitalProducts.deleteDigitalProduct);
  const deleteSalesAnalytics = useMutation(api.salesAnalytics.deleteSalesAnalytics);
  
  const [popup, setPopup] = useState({ isOpen: false, title: "", message: "", type: "info" });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState({ isOpen: false, registrationId: null, registrationName: "" });
  const [showRestoreConfirm, setShowRestoreConfirm] = useState({ isOpen: false, registrationId: null, registrationName: "" });
  const [showPromoteConfirm, setShowPromoteConfirm] = useState({ isOpen: false, registrationId: null, registrationName: "" });
  const [showDeleteProductConfirm, setShowDeleteProductConfirm] = useState({ isOpen: false, productId: null, productName: "" });
  const [activeTab, setActiveTab] = useState("all"); // "all", "registered", "waitlisted", or "cancelled"
  const [isDigitalProductModalOpen, setIsDigitalProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [digitalStoreTab, setDigitalStoreTab] = useState('digitalStore'); // "digitalStore" or "salesAnalytics"

  // Handle delete registration
  const handleDeleteRegistration = async (registrationId, registrationName) => {
    setShowDeleteConfirm({ isOpen: true, registrationId, registrationName });
  };

  // Handle restore registration
  const handleRestoreRegistration = async (registrationId, registrationName) => {
    setShowRestoreConfirm({ isOpen: true, registrationId, registrationName });
  };

  // Handle promote waitlisted registration
  const handlePromoteWaitlisted = async (registrationId, registrationName) => {
    setShowPromoteConfirm({ isOpen: true, registrationId, registrationName });
  };

  // Handle delete digital product
  const handleDeleteDigitalProduct = async (productId, productName, fileStorageId) => {
    setShowDeleteProductConfirm({ isOpen: true, productId, productName, fileStorageId });
  };

  // Handle add digital product
  const handleAddDigitalProduct = () => {
    setEditingProduct(null);
    setIsDigitalProductModalOpen(true);
  };

  // Handle edit digital product
  const handleEditDigitalProduct = (product) => {
    setEditingProduct(product);
    setIsDigitalProductModalOpen(true);
  };

  const confirmDeleteRegistration = async () => {
    try {
      await deleteRegistration({ registrationId: showDeleteConfirm.registrationId });
      setPopup({ isOpen: true, title: "Success", message: "Registration removed successfully!", type: "success", autoClose: true });
    } catch (error) {
      console.error("Error deleting registration:", error);
      setPopup({ isOpen: true, title: "Error", message: "Failed to remove registration. Please try again.", type: "error" });
    }
    setShowDeleteConfirm({ isOpen: false, registrationId: null, registrationName: "" });
  };

  const confirmRestoreRegistration = async () => {
    try {
      const result = await restoreRegistration({ registrationId: showRestoreConfirm.registrationId });
      const statusMessage = result.status === "waitlisted" 
        ? `Registration restored to waitlist position #${result.waitlistPosition}`
        : "Registration restored successfully!";
      setPopup({ isOpen: true, title: "Success", message: statusMessage, type: "success", autoClose: true });
    } catch (error) {
      console.error("Error restoring registration:", error);
      setPopup({ isOpen: true, title: "Error", message: "Failed to restore registration. Please try again.", type: "error" });
    }
    setShowRestoreConfirm({ isOpen: false, registrationId: null, registrationName: "" });
  };

  const confirmPromoteWaitlisted = async () => {
    try {
      await promoteWaitlisted({ registrationId: showPromoteConfirm.registrationId });
      setPopup({ isOpen: true, title: "Success", message: "Registration promoted to registered status successfully!", type: "success", autoClose: true });
    } catch (error) {
      console.error("Error promoting registration:", error);
      const errorMessage = error.message === "Event is full. Cannot promote waitlisted registration." 
        ? "Event is full. Cannot promote waitlisted registration."
        : "Failed to promote registration. Please try again.";
      setPopup({ isOpen: true, title: "Error", message: errorMessage, type: "error" });
    }
    setShowPromoteConfirm({ isOpen: false, registrationId: null, registrationName: "" });
  };

  const confirmDeleteDigitalProduct = async () => {
    try {
      // Delete the digital product
      await deleteDigitalProduct({ 
        id: showDeleteProductConfirm.productId, 
        fileStorageId: showDeleteProductConfirm.fileStorageId 
      });
      
      // Delete associated sales analytics
      await deleteSalesAnalytics({ 
        productId: showDeleteProductConfirm.productId 
      });
      
      setPopup({ isOpen: true, title: "Success", message: "Digital product and associated sales data deleted successfully!", type: "success", autoClose: true });
    } catch (error) {
      console.error("Error deleting digital product:", error);
      setPopup({ isOpen: true, title: "Error", message: "Failed to delete digital product. Please try again.", type: "error" });
    }
    setShowDeleteProductConfirm({ isOpen: false, productId: null, productName: "", fileStorageId: "" });
  };

  const closePopup = () => {
    setPopup({ isOpen: false, title: "", message: "", type: "info" });
  };

  const closeDeleteConfirm = () => {
    setShowDeleteConfirm({ isOpen: false, registrationId: null, registrationName: "" });
  };

  const closeRestoreConfirm = () => {
    setShowRestoreConfirm({ isOpen: false, registrationId: null, registrationName: "" });
  };

  const closePromoteConfirm = () => {
    setShowPromoteConfirm({ isOpen: false, registrationId: null, registrationName: "" });
  };

  const closeDeleteProductConfirm = () => {
    setShowDeleteProductConfirm({ isOpen: false, productId: null, productName: "", fileStorageId: "" });
  };

  const closeDigitalProductModal = () => {
    setIsDigitalProductModalOpen(false);
    setEditingProduct(null);
  };

  // Handle toggle registration status
  const handleToggleRegistration = async () => {
    try {
      const result = await toggleRegistrationStatus({
        eventId: selectedEvent._id,
        userEmail: selectedEvent.createdBy
      });
      
      const message = result.registrationClosed 
        ? "Registration closed successfully!" 
        : "Registration opened successfully!";
      
      setPopup({ isOpen: true, title: "Success", message: message, type: "success", autoClose: true });
    } catch (error) {
      console.error("Error toggling registration status:", error);
      setPopup({ isOpen: true, title: "Error", message: "Failed to toggle registration status. Please try again.", type: "error" });
    }
  };

  // Filter registrations based on active tab
  const filteredRegistrations = eventRegistrations ? 
    (activeTab === "all" 
      ? eventRegistrations.filter(reg => reg.status !== "cancelled")
      : activeTab === "registered"
      ? eventRegistrations.filter(reg => reg.status === "registered")
      : activeTab === "waitlisted"
      ? eventRegistrations.filter(reg => reg.status === "waitlisted")
      : eventRegistrations.filter(reg => reg.status === "cancelled")
    ) : [];

  return (
    <div className="space-y-6">
      {/* Popup Component */}
      <Popup
        isOpen={popup.isOpen}
        onClose={closePopup}
        title={popup.title}
        message={popup.message}
        type={popup.type}
        autoClose={popup.autoClose}
      />
      
      {/* Delete Confirmation Popup */}
      {showDeleteConfirm.isOpen && (
        <div className="fixed inset-0 bg-transparent backdrop-blur-md flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Remove Registration</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to remove <strong>{showDeleteConfirm.registrationName}</strong> from the registration list?
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={closeDeleteConfirm}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteRegistration}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Restore Confirmation Popup */}
      {showRestoreConfirm.isOpen && (
        <div className="fixed inset-0 bg-transparent backdrop-blur-md flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Restore Registration</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to restore <strong>{showRestoreConfirm.registrationName}</strong> to the registration list?
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={closeRestoreConfirm}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRestoreRegistration}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Restore
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Promote Confirmation Popup */}
      {showPromoteConfirm.isOpen && (
        <div className="fixed inset-0 bg-transparent backdrop-blur-md flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Promote to Registered</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to promote <strong>{showPromoteConfirm.registrationName}</strong> from waitlist to registered?
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={closePromoteConfirm}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmPromoteWaitlisted}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Promote
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Digital Product Confirmation Popup */}
      {showDeleteProductConfirm.isOpen && (
        <div className="fixed inset-0 bg-transparent backdrop-blur-md flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Digital Product</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete <strong>"{showDeleteProductConfirm.productName}"</strong>? This action cannot be undone.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={closeDeleteProductConfirm}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteDigitalProduct}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Digital Product Modal */}
      <DigitalProductModal
        isOpen={isDigitalProductModalOpen}
        onClose={closeDigitalProductModal}
        eventId={selectedEvent?._id}
        product={editingProduct}
      />

      {!selectedEvent ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Event Selected</h3>
          <p className="text-gray-500">Choose an event from the sidebar to view detailed analytics and registration information.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Event Details */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Event Details</h2>
                <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Title</label>
                  <p className="text-lg font-semibold text-gray-900">{selectedEvent.title}</p>
                </div>
                
                {selectedEvent.description && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <p className="text-gray-900">{selectedEvent.description}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <p className="text-gray-900">{new Date(selectedEvent.date).toLocaleDateString()}</p>
                  </div>
                  
                  {selectedEvent.location && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                      <p className="text-gray-900">{selectedEvent.location}</p>
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Created By</label>
                  <p className="text-gray-900">{selectedEvent.createdBy}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
                    <p className="text-gray-900">{new Date(selectedEvent.createdAt).toLocaleDateString()}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Updated</label>
                    <p className="text-gray-900">{new Date(selectedEvent.updatedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Registration Statistics */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Registration Statistics</h2>
                <div className="w-6 h-6 bg-green-100 rounded flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {eventRegistrations ? 
                      eventRegistrations.filter(reg => reg.status === "registered").length : 0
                    }
                  </div>
                  <div className="text-sm text-gray-600">Registered</div>
                </div>
                
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {eventRegistrations ? 
                      eventRegistrations.filter(reg => reg.status === "waitlisted").length : 0
                    }
                  </div>
                  <div className="text-sm text-gray-600">Waitlisted</div>
                </div>

                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {eventRegistrations ? 
                      eventRegistrations.filter(reg => reg.status === "cancelled").length : 0
                    }
                  </div>
                  <div className="text-sm text-gray-600">Cancelled</div>
                </div>
                
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {eventRegistrations ? 
                      eventRegistrations.filter(reg => {
                        const regDate = new Date(reg.registeredAt);
                        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                        return regDate > weekAgo && reg.status !== "cancelled";
                      }).length : 0
                    }
                  </div>
                  <div className="text-sm text-gray-600">This Week</div>
                </div>
              </div>
              
              {/* Email Domain Breakdown */}
              {eventRegistrations && eventRegistrations.filter(reg => reg.status !== "cancelled").length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Email Domain Breakdown</h3>
                  <div className="space-y-2">
                    {(() => {
                      const activeRegistrations = eventRegistrations.filter(reg => reg.status !== "cancelled");
                      const domains = {};
                      activeRegistrations.forEach(reg => {
                        const domain = reg.email.split('@')[1];
                        domains[domain] = (domains[domain] || 0) + 1;
                      });
                      
                      return Object.entries(domains)
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 5)
                        .map(([domain, count]) => {
                          const percentage = ((count / activeRegistrations.length) * 100).toFixed(1);
                          return (
                            <div key={domain} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <span className="text-sm text-gray-900">@{domain}</span>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm text-gray-600">{count}</span>
                                <span className="text-xs text-gray-500">({percentage}%)</span>
                              </div>
                            </div>
                          );
                        });
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Registration List */}
      {selectedEvent && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Registration List - {selectedEvent.title}
                </h2>
                <div className="w-6 h-6 bg-purple-100 rounded flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              
              {/* Registration Toggle Button */}
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-600">
                  {selectedEvent.registrationClosed ? "Registration Closed" : "Registration Open"}
                </span>
                <button
                  onClick={handleToggleRegistration}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    selectedEvent.registrationClosed
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-red-100 text-red-700 hover:bg-red-200'
                  }`}
                >
                  {selectedEvent.registrationClosed ? "Open Registration" : "Close Registration"}
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab("all")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "all"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                All Registrations
                {eventRegistrations && (
                  <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                    {eventRegistrations.filter(reg => reg.status !== "cancelled").length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("registered")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "registered"
                    ? "border-green-500 text-green-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Registered
                {eventRegistrations && (
                  <span className="ml-2 bg-green-100 text-green-900 py-0.5 px-2.5 rounded-full text-xs">
                    {eventRegistrations.filter(reg => reg.status === "registered").length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("waitlisted")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "waitlisted"
                    ? "border-yellow-500 text-yellow-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Waitlisted
                {eventRegistrations && (
                  <span className="ml-2 bg-yellow-100 text-yellow-900 py-0.5 px-2.5 rounded-full text-xs">
                    {eventRegistrations.filter(reg => reg.status === "waitlisted").length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("cancelled")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "cancelled"
                    ? "border-red-500 text-red-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Cancelled
                {eventRegistrations && (
                  <span className="ml-2 bg-red-100 text-red-900 py-0.5 px-2.5 rounded-full text-xs">
                    {eventRegistrations.filter(reg => reg.status === "cancelled").length}
                  </span>
                )}
              </button>
            </nav>
          </div>

          <div className="p-6">
            {!eventRegistrations || filteredRegistrations.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm">
                  {activeTab === "all" ? "No registrations for this event yet" : 
                   activeTab === "registered" ? "No registered users" : 
                   activeTab === "waitlisted" ? "No waitlisted registrations" : 
                   "No cancelled registrations"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Attendee
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Registration Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredRegistrations
                      .map((registration) => {
                      const isRecent = new Date(registration.registeredAt) > new Date(Date.now() - 24 * 60 * 60 * 1000);
                      return (
                        <tr key={registration._id} className="hover:bg-gray-50 transition-colors duration-150">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                {registration.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900">{registration.name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {registration.email}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {new Date(registration.registeredAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                              registration.status === "waitlisted"
                                ? 'bg-yellow-100 text-yellow-700'
                                : registration.status === "cancelled"
                                ? 'bg-red-100 text-red-700'
                                : isRecent 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {registration.status === "waitlisted" 
                                ? `Waitlisted #${registration.waitlistPosition || 'N/A'}`
                                : registration.status === "cancelled"
                                ? 'Cancelled'
                                : isRecent ? 'New' : 'Registered'
                              }
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {(activeTab === "all" || activeTab === "registered") ? (
                              <button
                                onClick={() => handleDeleteRegistration(registration._id, registration.name)}
                                className="text-red-600 hover:text-red-800 font-medium text-sm flex items-center space-x-1 transition-colors"
                                title="Remove registration"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                <span>Remove</span>
                              </button>
                            ) : activeTab === "waitlisted" ? (
                              <button
                                onClick={() => handlePromoteWaitlisted(registration._id, registration.name)}
                                className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center space-x-1 transition-colors"
                                title="Promote to registered"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                                <span>Promote</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleRestoreRegistration(registration._id, registration.name)}
                                className="text-green-600 hover:text-green-800 font-medium text-sm flex items-center space-x-1 transition-colors"
                                title="Restore registration"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span>Restore</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Digital Store and Sales Analytics Tabs */}
      {selectedEvent && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
                             <button
                 onClick={() => setDigitalStoreTab('digitalStore')}
                 className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                   digitalStoreTab === 'digitalStore'
                     ? 'border-purple-500 text-purple-600'
                     : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                 }`}
               >
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Digital Store</span>
                </div>
              </button>
                             <button
                 onClick={() => setDigitalStoreTab('salesAnalytics')}
                 className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                   digitalStoreTab === 'salesAnalytics'
                     ? 'border-purple-500 text-purple-600'
                     : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                 }`}
               >
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span>Sales Analytics</span>
                </div>
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Digital Store Tab */}
            {digitalStoreTab === 'digitalStore' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-md font-medium text-gray-700">Available Products</h3>
                  <button
                    onClick={handleAddDigitalProduct}
                    className="px-3 py-1 rounded-lg text-sm font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
                  >
                    Add Digital Product
                  </button>
                </div>
                {!digitalProducts || digitalProducts.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <p className="text-gray-500 text-sm">No digital products available for this event yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Product Name
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Price
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Downloads
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {digitalProducts.map((product) => (
                          <tr key={product._id} className="hover:bg-gray-50 transition-colors duration-150">
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {product.name}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              ${(product.price / 100).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {product.downloads || 0}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleEditDigitalProduct(product)}
                                  className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center space-x-1 transition-colors"
                                  title="Edit product"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                  <span>Edit</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteDigitalProduct(product._id, product.name, product.fileStorageId)}
                                  className="text-red-600 hover:text-red-800 font-medium text-sm flex items-center space-x-1 transition-colors"
                                  title="Delete product"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  <span>Delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Sales Analytics Tab */}
            {digitalStoreTab === 'salesAnalytics' && (
              <div>
                <SalesAnalytics eventId={selectedEvent._id} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 