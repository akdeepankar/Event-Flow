"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { api } from "../../convex/_generated/api";
import Popup from "./Popup";

// Component to render event with header image
function EventItem({ event, onDelete, onClick }) {
  const headerImageUrl = useQuery(api.files.getFileUrl, { 
    storageId: event?.headerImage || "" 
  }, event?.headerImage ? undefined : "skip");

  return (
    <div
      className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow cursor-pointer"
      onClick={onClick}
    >
      {event.headerImage && headerImageUrl && (
        <div className="mb-3">
          <img 
            src={headerImageUrl}
            alt={event.title}
            className="w-full rounded-lg"
            style={{ maxHeight: '120px', objectFit: 'cover' }}
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        </div>
      )}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-medium text-gray-900">
            {event.title}
          </h3>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>
        <button
          onClick={(e) => onDelete(event._id, e)}
          className="text-gray-400 hover:text-red-500 transition-colors p-1"
          title="Delete event"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
      
      {event.description && (
        <p className="text-gray-600 text-sm mb-3">
          {event.description}
        </p>
      )}
      
      <div className="flex items-center space-x-4 text-sm text-gray-500">
        <div className="flex items-center space-x-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>{new Date(event.date).toLocaleDateString()}</span>
        </div>
        
        {event.location && (
          <div className="flex items-center space-x-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{event.location}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function EventList() {
  const router = useRouter();
  const { user } = useUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress || "";
  const events = useQuery(api.events.getMyEvents, { userEmail });
  const deleteEvent = useMutation(api.events.deleteEvent);
  const [popup, setPopup] = useState({ isOpen: false, title: "", message: "", type: "info" });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState({ isOpen: false, eventId: null });

  const handleDelete = async (eventId, e) => {
    e.stopPropagation(); // Prevent event bubbling
    setShowDeleteConfirm({ isOpen: true, eventId });
  };

  const confirmDelete = async () => {
    try {
      await deleteEvent({ id: showDeleteConfirm.eventId, userEmail });
      setPopup({ isOpen: true, title: "Success", message: "Event deleted successfully!", type: "success", autoClose: true });
    } catch (error) {
      console.error("Error deleting event:", error);
      setPopup({ isOpen: true, title: "Error", message: "Failed to delete event", type: "error" });
    }
    setShowDeleteConfirm({ isOpen: false, eventId: null });
  };

  const closePopup = () => {
    setPopup({ isOpen: false, title: "", message: "", type: "info" });
  };

  const closeDeleteConfirm = () => {
    setShowDeleteConfirm({ isOpen: false, eventId: null });
  };

  const handleEventClick = (eventId) => {
    router.push(`/create/${eventId}`); // Navigate to edit page instead of view page
  };

  if (events === undefined) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">My Events</h2>
          <p className="text-sm text-gray-600 mt-1">Click any event to edit it</p>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-3 text-gray-600 text-sm">Loading events...</p>
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">My Events</h2>
          <p className="text-sm text-gray-600 mt-1">Click any event to edit it</p>
        </div>
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-gray-600 text-sm">No events yet</p>
          <p className="text-gray-500 text-xs mt-1">Create your first event to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Event</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this event? This action cannot be undone.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={closeDeleteConfirm}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">My Events</h2>
        <p className="text-sm text-gray-600 mt-1">Click any event to edit it</p>
      </div>
      
      <div className="space-y-4">
        {events.map((event) => (
          <EventItem
            key={event._id}
            event={event}
            onDelete={handleDelete}
            onClick={() => handleEventClick(event._id)}
          />
        ))}
      </div>
    </div>
  );
} 