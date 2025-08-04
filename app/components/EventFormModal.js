"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "../../convex/_generated/api";
import Popup from "./Popup";
import Image from "next/image";

export default function EventFormModal({ isOpen, onClose, event = null }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [participantLimit, setParticipantLimit] = useState("");
  const [headerImage, setHeaderImage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState("");
  const [popup, setPopup] = useState({ isOpen: false, title: "", message: "", type: "info" });
  const [pendingUpdate, setPendingUpdate] = useState(null);
  const fileInputRef = useRef(null);
  
  const { user } = useUser();
  const createEvent = useMutation(api.events.createEvent);
  const updateEvent = useMutation(api.events.updateEvent);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const saveFileMetadata = useMutation(api.files.saveFileMetadata);
  
  // Get header image URL for editing
  const headerImageUrl = useQuery(api.files.getFileUrl, { 
    storageId: event?.headerImage || "" 
  }, event?.headerImage ? undefined : "skip");

  // Initialize form when event prop changes (for editing)
  useEffect(() => {
    if (event) {
      setTitle(event.title || "");
      setDescription(event.description || "");
      setDate(event.date || "");
      setLocation(event.location || "");
      // Handle participantLimit properly - convert to string and handle null/undefined
      const limit = event.participantLimit;
      setParticipantLimit(limit && limit > 0 ? limit.toString() : "");
      setHeaderImage(event.headerImage || "");
    } else {
      // Reset form for creating new event
      setTitle("");
      setDescription("");
      setDate("");
      setLocation("");
      setParticipantLimit("");
      setHeaderImage("");
      setImagePreview("");
    }
  }, [event]);

  // Set image preview when header image URL loads (for editing)
  useEffect(() => {
    if (event?.headerImage && headerImageUrl && !imagePreview) {
      setImagePreview(headerImageUrl);
    }
  }, [event?.headerImage, headerImageUrl, imagePreview]);

  // Reset image preview when event changes
  useEffect(() => {
    if (!event?.headerImage) {
      setImagePreview("");
    }
  }, [event?.headerImage]);

  const isEditing = !!event;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title || !date) {
      setPopup({ isOpen: true, title: "Required Fields", message: "Please fill in at least title and date", type: "warning" });
      return;
    }

    if (!user) {
      setPopup({ isOpen: true, title: "Authentication Required", message: "Please sign in to manage events", type: "warning" });
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditing) {
        // Update existing event
        const updateData = {
          id: event._id,
          title,
          description,
          date,
          location,
          headerImage,
          userEmail: user.emailAddresses[0]?.emailAddress || "",
        };

        // Only include participantLimit if it has a value
        if (participantLimit && participantLimit.trim() !== "") {
          updateData.participantLimit = parseInt(participantLimit);
        }

        const result = await updateEvent(updateData);
        
        if (result && result.warning) {
          // Store the pending update and show confirmation popup
          setPendingUpdate({ updateData, result });
          setPopup({ 
            isOpen: true, 
            title: "Participant Limit Warning", 
            message: result.message, 
            type: "warning",
            autoClose: false,
            onConfirm: handleConfirmLimitDecrease,
            confirmText: "Continue",
            cancelText: "Cancel"
          });
          return; // Don't close modal, let user decide
        }
        
        const eventUrl = `${window.location.origin}/event/${event._id}`;
        setPopup({ 
          isOpen: true, 
          title: "Event Updated Successfully!", 
          message: "Your event has been updated. Share the link below with others:", 
          type: "success", 
          eventUrl: eventUrl,
          autoClose: false 
        });
      } else {
        // Create new event
        await createEvent({
          title,
          description,
          date,
          location,
          participantLimit: participantLimit ? parseInt(participantLimit) : undefined,
          headerImage,
          userEmail: user.emailAddresses[0]?.emailAddress || "",
        });
        
        // Reset form
        setTitle("");
        setDescription("");
        setDate("");
        setLocation("");
        setParticipantLimit("");
        setHeaderImage("");
        setImagePreview("");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        
        setPopup({ isOpen: true, title: "Success", message: "Event created successfully!", type: "success", autoClose: true });
      }
      
      // Close modal after success
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error("Error managing event:", error);
      setPopup({ isOpen: true, title: "Error", message: `Failed to ${isEditing ? 'update' : 'create'} event`, type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  const closePopup = () => {
    setPopup({ isOpen: false, title: "", message: "", type: "info" });
  };

  const handleConfirmLimitDecrease = async () => {
    if (!pendingUpdate) return;
    
    setIsSubmitting(true);
    try {
      // Proceed with the update with confirmed flag
      const updateDataWithConfirmation = {
        ...pendingUpdate.updateData,
        confirmedLimitDecrease: true
      };
      const result = await updateEvent(updateDataWithConfirmation);
      
              if (result && result.success) {
          const eventUrl = `${window.location.origin}/event/${event._id}`;
          const movedCount = pendingUpdate.result.currentRegisteredCount - pendingUpdate.result.newLimit;
          const message = movedCount > 0 
            ? `Your event has been updated. ${movedCount} participant(s) have been moved to the waitlist due to the reduced limit.`
            : "Your event has been updated successfully!";
          
          setPopup({ 
            isOpen: true, 
            title: "Event Updated Successfully!", 
            message: message, 
            type: "success", 
            eventUrl: eventUrl,
            autoClose: false 
          });
        
        // Close modal after success
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    } catch (error) {
      console.error("Error updating event:", error);
      setPopup({ isOpen: true, title: "Error", message: "Failed to update event", type: "error" });
    } finally {
      setIsSubmitting(false);
      setPendingUpdate(null);
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setPopup({ isOpen: true, title: "Invalid File", message: "Please select an image file", type: "warning" });
      return;
    }
    
    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setPopup({ isOpen: true, title: "File Too Large", message: "File size must be less than 5MB", type: "warning" });
      return;
    }

    setUploadingImage(true);
    
    try {
      // Generate upload URL
      const uploadUrl = await generateUploadUrl();
      
      // Upload file to Convex storage
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      
      if (!result.ok) {
        throw new Error("Upload failed");
      }
      
      const { storageId } = await result.json();
      
      // Save file metadata
      await saveFileMetadata({
        name: file.name,
        storageId,
        contentType: file.type,
        size: file.size,
        uploadedBy: user.emailAddresses[0]?.emailAddress || "",
      });
      
      // Set the storage ID as the header image
      setHeaderImage(storageId);
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
      
    } catch (error) {
      console.error("Error uploading file:", error);
      setPopup({ isOpen: true, title: "Upload Error", message: "Failed to upload image", type: "error" });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const removeImage = () => {
    setHeaderImage("");
    setImagePreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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
        eventUrl={popup.eventUrl}
        onConfirm={popup.onConfirm}
        confirmText={popup.confirmText}
        cancelText={popup.cancelText}
      />
      
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? "Edit Event" : "Create New Event"}
          </h2>
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
              Header Image
            </label>
            
            {imagePreview ? (
              <div className="mb-3">
                <Image 
                  src={imagePreview} 
                  alt="Preview" 
                  width={400}
                  height={300}
                  className="w-full rounded-lg border border-gray-200"
                  style={{ maxHeight: '300px', objectFit: 'cover' }}
                />
                <button
                  type="button"
                  onClick={removeImage}
                  disabled={isSubmitting || uploadingImage}
                  className="mt-2 text-sm text-red-600 hover:text-red-700 transition-colors disabled:opacity-50"
                >
                  Remove Image
                </button>
              </div>
            ) : event?.headerImage && !headerImageUrl ? (
              <div className="mb-3">
                <div className="w-full h-48 bg-gray-200 rounded-lg flex items-center justify-center">
                  <div className="text-gray-500">Loading image...</div>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isSubmitting || uploadingImage}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSubmitting || uploadingImage}
                  className="text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                >
                  {uploadingImage ? "Uploading..." : "Choose Image"}
                </button>
                <p className="text-xs text-gray-500 mt-1">
                  PNG, JPG, GIF up to 5MB
                </p>
              </div>
            )}
          </div>

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
              disabled={isSubmitting}
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
              disabled={isSubmitting}
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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Participant Limit (Optional)
            </label>
            <input
              type="number"
              value={participantLimit}
              onChange={(e) => setParticipantLimit(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Enter maximum number of participants"
              min="1"
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty for unlimited participants
            </p>
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
              disabled={isSubmitting}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors font-medium disabled:opacity-50"
            >
              {isSubmitting ? (isEditing ? "Saving..." : "Creating...") : (isEditing ? "Save Changes" : "Create Event")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 