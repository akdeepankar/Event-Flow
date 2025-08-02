"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { useState, useRef, useEffect } from "react";
import { api } from "../../../convex/_generated/api";
import Navbar from "../../components/Navbar";
import Popup from "../../components/Popup";

export default function EditEventPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState("");
  const [popup, setPopup] = useState({ isOpen: false, title: "", message: "", type: "info", eventUrl: "" });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fileInputRef = useRef(null);
  
     const event = useQuery(api.events.getEventById, { id: params.id });
   const headerImageUrl = useQuery(api.files.getFileUrl, { 
     storageId: event?.headerImage || "" 
   }, event?.headerImage ? undefined : "skip");
   const updateEvent = useMutation(api.events.updateEvent);
   const deleteEvent = useMutation(api.events.deleteEvent);
   const generateUploadUrl = useMutation(api.files.generateUploadUrl);
   const saveFileMetadata = useMutation(api.files.saveFileMetadata);

  // Form state for editing
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    date: "",
    location: "",
    participantLimit: "",
    headerImage: ""
  });

     // Initialize edit form when event loads
  useEffect(() => {
    if (event && editForm.title === "") {
      setEditForm({
        title: event.title || "",
        description: event.description || "",
        date: event.date || "",
        location: event.location || "",
        participantLimit: event.participantLimit ? event.participantLimit.toString() : "",
        headerImage: event.headerImage || ""
      });
    }
  }, [event, editForm.title]);

  // Set image preview when header image URL loads
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

  const handleSave = async (e) => {
    e.preventDefault();
    
    if (!editForm.title || !editForm.date) {
      setPopup({ isOpen: true, title: "Required Fields", message: "Please fill in at least title and date", type: "warning" });
      return;
    }

    setIsSubmitting(true);

    try {
      const updateData = {
        id: params.id,
        title: editForm.title,
        description: editForm.description,
        date: editForm.date,
        location: editForm.location,
        headerImage: editForm.headerImage,
        userEmail: user.emailAddresses[0]?.emailAddress || "",
      };

      // Only include participantLimit if it has a value
      if (editForm.participantLimit && editForm.participantLimit.trim() !== "") {
        updateData.participantLimit = parseInt(editForm.participantLimit);
      }

      await updateEvent(updateData);
      
      const eventUrl = `${window.location.origin}/event/${params.id}`;
      setPopup({ 
        isOpen: true, 
        title: "Event Updated Successfully!", 
        message: "Your event has been updated. Share the link below with others:", 
        type: "success", 
        eventUrl: eventUrl,
        autoClose: false 
      });
    } catch (error) {
      console.error("Error updating event:", error);
      setPopup({ isOpen: true, title: "Error", message: "Failed to update event", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteEvent({ id: params.id, userEmail: user.emailAddresses[0]?.emailAddress || "" });
      setPopup({ isOpen: true, title: "Success", message: "Event deleted successfully!", type: "success", autoClose: true });
      setTimeout(() => router.push("/"), 1500);
    } catch (error) {
      console.error("Error deleting event:", error);
      setPopup({ isOpen: true, title: "Error", message: "Failed to delete event", type: "error" });
    }
    setShowDeleteConfirm(false);
  };

  const closePopup = () => {
    setPopup({ isOpen: false, title: "", message: "", type: "info", eventUrl: "" });
  };

  const closeDeleteConfirm = () => {
    setShowDeleteConfirm(false);
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
      setEditForm({ ...editForm, headerImage: storageId });
      
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
    setEditForm({ ...editForm, headerImage: "" });
    setImagePreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-md mx-auto pt-20">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Sign in to edit events</h1>
            <p className="text-gray-600 mb-6">You need to be signed in to edit events.</p>
            <button
              onClick={() => router.push("/")}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Event not found</h1>
            <p className="text-gray-600 mb-6">The event you&apos;re looking for doesn&apos;t exist or has been deleted.</p>
            <button
              onClick={() => router.push("/")}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isOwner = user.emailAddresses[0]?.emailAddress === event.createdBy;

  if (!isOwner) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <p className="text-gray-600 mb-6">You can only edit events that you created.</p>
            <button
              onClick={() => router.push(`/event/${params.id}`)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              View Event
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Popup Component */}
             <Popup
         isOpen={popup.isOpen}
         onClose={closePopup}
         title={popup.title}
         message={popup.message}
         type={popup.type}
         autoClose={popup.autoClose}
         eventUrl={popup.eventUrl}
       />
      
      {/* Delete Confirmation Popup */}
      {showDeleteConfirm && (
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
      <Navbar />
      
             <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-8">
        {/* Edit Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Event</h1>
              <p className="text-gray-600">Update your event details</p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => router.push(`/event/${params.id}`)}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                View Event
              </button>
              <button
                onClick={handleDelete}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete Event
              </button>
            </div>
          </div>

                                           {/* Edit Form */}
            <form onSubmit={handleSave} className="space-y-6">

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Header Image
                </label>
                
                {imagePreview ? (
                  <div className="mb-3">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
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
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
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
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                rows="4"
                placeholder="Enter event description"
                disabled={isSubmitting}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  value={editForm.date}
                  onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
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
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
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
                value={editForm.participantLimit}
                onChange={(e) => setEditForm({ ...editForm, participantLimit: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Enter maximum number of participants"
                min="1"
                disabled={isSubmitting}
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty for unlimited participants
              </p>
            </div>

                         

            {/* Form Actions */}
            <div className="flex space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => router.push(`/event/${params.id}`)}
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
                {isSubmitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
} 