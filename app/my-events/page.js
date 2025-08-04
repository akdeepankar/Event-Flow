"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { api } from "../../convex/_generated/api";
import Navbar from "../components/Navbar";
import AnalyticsDetails from "../components/AnalyticsDetails";
import EventFormModal from "../components/EventFormModal";
import Popup from "../components/Popup";

export default function MyEventsPage() {
  const { user, isLoaded } = useUser();
  const searchParams = useSearchParams();
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState({ isOpen: false, eventId: null, eventTitle: "" });
  const [popup, setPopup] = useState({ isOpen: false, title: "", message: "", type: "info" });
  
  const events = useQuery(api.events.getAllEvents);
  const registrations = useQuery(api.registrations.getAllRegistrations);
  const deleteEvent = useMutation(api.events.deleteEvent);

  // Handle pre-selecting event from query parameter
  useEffect(() => {
    const eventId = searchParams.get('event');
    if (eventId && events && !selectedEvent) {
      const event = events.find(evt => evt._id === eventId);
      if (event) {
        setSelectedEvent(event);
      }
    }
  }, [searchParams, events, selectedEvent]);

  // Show loading while checking authentication
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // If user is not authenticated, redirect to sign in
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-md mx-auto pt-20">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Sign in to view your events</h1>
            <p className="text-gray-600 mb-6">You need to be signed in to access your events.</p>
            <button
              onClick={() => window.location.href = "/"}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleCreateEvent = () => {
    setEditingEvent(null);
    setIsEventModalOpen(true);
  };

  const handleEditEvent = () => {
    if (selectedEvent) {
      setEditingEvent(selectedEvent);
      setIsEventModalOpen(true);
    }
  };

  const handleDeleteEvent = () => {
    if (selectedEvent) {
      setShowDeleteConfirm({ 
        isOpen: true, 
        eventId: selectedEvent._id, 
        eventTitle: selectedEvent.title 
      });
    }
  };

  const confirmDeleteEvent = async () => {
    try {
      await deleteEvent({ 
        id: showDeleteConfirm.eventId, 
        userEmail: user.emailAddresses[0]?.emailAddress || "" 
      });
      setPopup({ 
        isOpen: true, 
        title: "Success", 
        message: "Event deleted successfully!", 
        type: "success", 
        autoClose: true 
      });
      setSelectedEvent(null);
    } catch (error) {
      console.error("Error deleting event:", error);
      setPopup({ 
        isOpen: true, 
        title: "Error", 
        message: "Failed to delete event. Please try again.", 
        type: "error" 
      });
    }
    setShowDeleteConfirm({ isOpen: false, eventId: null, eventTitle: "" });
  };

  const handleCloseEventModal = () => {
    setIsEventModalOpen(false);
    setEditingEvent(null);
  };

  const closePopup = () => {
    setPopup({ isOpen: false, title: "", message: "", type: "info" });
  };

  const closeDeleteConfirm = () => {
    setShowDeleteConfirm({ isOpen: false, eventId: null, eventTitle: "" });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="pt-16">
        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          {/* Header and Event Selection Row */}
          <div className="flex justify-between items-center mb-6 mt-4">
            {/* Event Selection Dropdown */}
            <div className="flex items-center space-x-3">
              <label htmlFor="event-select" className="block text-sm font-medium text-gray-700">
                Select Event
              </label>
              <select
                id="event-select"
                value={selectedEvent?._id || ""}
                onChange={(e) => {
                  const event = events?.find(evt => evt._id === e.target.value);
                  setSelectedEvent(event || null);
                }}
                className="block px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 text-sm"
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

            {/* Header */}
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <h1 className="text-xl font-semibold text-gray-900">My Events</h1>
                <p className="text-gray-500 text-sm">Manage your events and registrations</p>
              </div>
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex space-x-3">
              <button
                onClick={handleCreateEvent}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Create Event</span>
              </button>
              {selectedEvent && (
                <>
                  <button
                    onClick={handleEditEvent}
                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>Edit Event</span>
                  </button>
                  <button
                    onClick={handleDeleteEvent}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Delete Event</span>
                  </button>
                </>
              )}
            </div>
          </div>

          <AnalyticsDetails 
            events={events} 
            registrations={registrations}
            selectedEvent={selectedEvent}
            onEventSelect={setSelectedEvent}
          />
        </div>
      </div>

      {/* Event Form Modal */}
      <EventFormModal
        isOpen={isEventModalOpen}
        onClose={handleCloseEventModal}
        event={editingEvent}
      />

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
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Event</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete <strong>&quot;{showDeleteConfirm.eventTitle}&quot;</strong>? This action cannot be undone.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={closeDeleteConfirm}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteEvent}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 