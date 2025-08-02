"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "../../convex/_generated/api";
import Popup from "./Popup";

export default function EventForm() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [popup, setPopup] = useState({ isOpen: false, title: "", message: "", type: "info" });
  
  const { user } = useUser();
  const createEvent = useMutation(api.events.createEvent);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title || !date) {
      setPopup({ isOpen: true, title: "Required Fields", message: "Please fill in at least title and date", type: "warning" });
      return;
    }

    if (!user) {
      setPopup({ isOpen: true, title: "Authentication Required", message: "Please sign in to create events", type: "warning" });
      return;
    }

    try {
      await createEvent({
        title,
        description,
        date,
        location,
        userEmail: user.emailAddresses[0]?.emailAddress || "",
      });
      
      // Reset form
      setTitle("");
      setDescription("");
      setDate("");
      setLocation("");
      
      setPopup({ isOpen: true, title: "Success", message: "Event created successfully!", type: "success", autoClose: true });
    } catch (error) {
      console.error("Error creating event:", error);
      setPopup({ isOpen: true, title: "Error", message: "Failed to create event", type: "error" });
    }
  };

  const closePopup = () => {
    setPopup({ isOpen: false, title: "", message: "", type: "info" });
  };

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
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Create Event</h2>
        <p className="text-sm text-gray-600 mt-1">Add a new event to your calendar</p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Event Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            placeholder="Enter event title"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            rows="3"
            placeholder="Enter event description"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date *
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Enter location"
            />
          </div>
        </div>
        
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors font-medium"
        >
          Create Event
        </button>
      </form>
    </div>
  );
} 