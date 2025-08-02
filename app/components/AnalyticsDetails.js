"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import Popup from "./Popup";

export default function AnalyticsDetails({ events, registrations, selectedEvent, onEventSelect }) {
  // Get registrations for selected event
  const eventRegistrations = useQuery(
    api.registrations.getEventRegistrations,
    selectedEvent?._id ? { eventId: selectedEvent._id } : "skip",
    selectedEvent?._id ? undefined : "skip"
  );

  // Delete registration mutation
  const deleteRegistration = useMutation(api.registrations.deleteRegistration);
  const [popup, setPopup] = useState({ isOpen: false, title: "", message: "", type: "info" });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState({ isOpen: false, registrationId: null, registrationName: "" });

  // Handle delete registration
  const handleDeleteRegistration = async (registrationId, registrationName) => {
    setShowDeleteConfirm({ isOpen: true, registrationId, registrationName });
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

  const closePopup = () => {
    setPopup({ isOpen: false, title: "", message: "", type: "info" });
  };

  const closeDeleteConfirm = () => {
    setShowDeleteConfirm({ isOpen: false, registrationId: null, registrationName: "" });
  };

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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
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
      {/* Event Selection Dropdown */}
      <div className="mb-6">
        <label htmlFor="event-select" className="block text-sm font-medium text-gray-700 mb-2">
          Select Event
        </label>
        <select
          id="event-select"
          value={selectedEvent?._id || ""}
          onChange={(e) => {
            const event = events?.find(evt => evt._id === e.target.value);
            onEventSelect(event || null);
          }}
          className="block w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 text-sm"
        >
          <option value="">Choose an event...</option>
          {events?.map((event) => (
            <option key={event._id} value={event._id}>
              {event.title} - {new Date(event.date).toLocaleDateString()}
              {registrations && (
                ` (${registrations.filter(r => r.eventId === event._id).length} registrations)`
              )}
            </option>
          ))}
        </select>
      </div>

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
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{eventRegistrations?.length || 0}</div>
                  <div className="text-sm text-gray-600">Total Registrations</div>
                </div>
                
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {eventRegistrations ? 
                      eventRegistrations.filter(reg => {
                        const regDate = new Date(reg.registeredAt);
                        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                        return regDate > weekAgo;
                      }).length : 0
                    }
                  </div>
                  <div className="text-sm text-gray-600">This Week</div>
                </div>
              </div>
              
              {/* Email Domain Breakdown */}
              {eventRegistrations && eventRegistrations.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Email Domain Breakdown</h3>
                  <div className="space-y-2">
                    {(() => {
                      const domains = {};
                      eventRegistrations.forEach(reg => {
                        const domain = reg.email.split('@')[1];
                        domains[domain] = (domains[domain] || 0) + 1;
                      });
                      
                      return Object.entries(domains)
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 5)
                        .map(([domain, count]) => {
                          const percentage = ((count / eventRegistrations.length) * 100).toFixed(1);
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
              <h2 className="text-lg font-semibold text-gray-900">
                Registration List - {selectedEvent.title}
              </h2>
              <div className="w-6 h-6 bg-purple-100 rounded flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="p-6">
            {!eventRegistrations || eventRegistrations.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm">No registrations for this event yet</p>
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
                    {eventRegistrations.map((registration) => {
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
                              isRecent 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {isRecent ? 'New' : 'Registered'}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
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
    </div>
  );
} 