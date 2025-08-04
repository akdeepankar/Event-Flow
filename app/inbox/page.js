"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "../../convex/_generated/api";
import Navbar from "../components/Navbar";
import Popup from "../components/Popup";

export default function InboxPage() {
  const { user, isLoaded } = useUser();
  const [selectedEvent, setSelectedEvent] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailContent, setEmailContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [sendMode, setSendMode] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("schedule");
  const [scheduledDateTime, setScheduledDateTime] = useState("");
  const [isScheduling, setIsScheduling] = useState(false);
  
  // Updates state
  const [updateTitle, setUpdateTitle] = useState("");
  const [updateContent, setUpdateContent] = useState("");
  const [isCreatingUpdate, setIsCreatingUpdate] = useState(false);
  const [selectedUpdate, setSelectedUpdate] = useState(null);
  const [popup, setPopup] = useState({ isOpen: false, title: "", message: "", type: "info" });
  
  const events = useQuery(api.events.getAllEvents);
  const registrations = useQuery(api.registrations.getAllRegistrations);
  const scheduledEmails = useQuery(api.emails.getScheduledEmailsForEvent, 
    selectedEvent ? { eventId: selectedEvent } : "skip"
  );
  const sendBulkEmail = useMutation(api.emails.sendBulkEmail);
  const sendEmailToSelectedUsers = useMutation(api.emails.sendEmailToSelectedUsers);
  const scheduleEmail = useMutation(api.emails.scheduleEmail);
  const cancelScheduledEmail = useMutation(api.emails.cancelScheduledEmail);
  
  // Updates queries and mutations
  const updates = useQuery(api.updates.getUpdatesForEvent, 
    selectedEvent ? { eventId: selectedEvent } : "skip"
  );
  const updateStats = useQuery(api.updates.getUpdateStats, 
    selectedEvent ? { eventId: selectedEvent } : "skip"
  );
  const createUpdate = useMutation(api.updates.createUpdate);
  const updateUpdate = useMutation(api.updates.updateUpdate);
  const deleteUpdate = useMutation(api.updates.deleteUpdate);

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
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Sign in to access outbox</h1>
            <p className="text-gray-600 mb-6">You need to be signed in to send emails.</p>
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

  // Get registrations for selected event
  const eventRegistrations = selectedEvent 
    ? registrations?.filter(reg => reg.eventId === selectedEvent) || []
    : [];

  // Filter registrations based on search term
  const filteredRegistrations = eventRegistrations.filter(registration =>
    registration.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    registration.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get selected event details
  const selectedEventDetails = events?.find(event => event._id === selectedEvent);

  // Helper functions for user selection
  const handleUserSelection = (registrationId) => {
    const newSelectedUsers = new Set(selectedUsers);
    if (newSelectedUsers.has(registrationId)) {
      newSelectedUsers.delete(registrationId);
    } else {
      newSelectedUsers.add(registrationId);
    }
    setSelectedUsers(newSelectedUsers);
  };

  const selectAllUsers = () => {
    const allUserIds = new Set(eventRegistrations.map(reg => reg._id));
    setSelectedUsers(allUserIds);
  };

  const clearSelection = () => {
    setSelectedUsers(new Set());
  };

  const handleSendEmail = async () => {
    if (!selectedEvent || !emailSubject || !emailContent) {
      setPopup({ isOpen: true, title: "Required Fields", message: "Please fill in all fields", type: "warning" });
      return;
    }

    if (sendMode === "selected" && selectedUsers.size === 0) {
      setPopup({ isOpen: true, title: "No Recipients", message: "Please select at least one recipient", type: "warning" });
      return;
    }

    if (eventRegistrations.length === 0) {
      setPopup({ isOpen: true, title: "No Registrations", message: "No registrations found for this event", type: "warning" });
      return;
    }

    setIsSending(true);
    try {
      if (sendMode === "all") {
      await sendBulkEmail({
        eventId: selectedEvent,
        subject: emailSubject,
        content: emailContent,
      });
        setPopup({ isOpen: true, title: "Success", message: `Email sent successfully to ${eventRegistrations.length} recipients!`, type: "success", autoClose: true });
      } else {
        await sendEmailToSelectedUsers({
          eventId: selectedEvent,
          registrationIds: Array.from(selectedUsers),
          subject: emailSubject,
          content: emailContent,
        });
        setPopup({ isOpen: true, title: "Success", message: `Email sent successfully to ${selectedUsers.size} selected recipients!`, type: "success", autoClose: true });
      }
      
      setEmailSubject("");
      setEmailContent("");
      setSelectedUsers(new Set());
    } catch (error) {
      console.error("Error sending email:", error);
      setPopup({ isOpen: true, title: "Error", message: "Failed to send email. Please try again.", type: "error" });
    } finally {
      setIsSending(false);
    }
  };

  const handleScheduleEmail = async () => {
    if (!selectedEvent || !emailSubject || !emailContent || !scheduledDateTime) {
      setPopup({ isOpen: true, title: "Required Fields", message: "Please fill in all fields including scheduled date/time", type: "warning" });
      return;
    }

    if (sendMode === "selected" && selectedUsers.size === 0) {
      setPopup({ isOpen: true, title: "No Recipients", message: "Please select at least one recipient", type: "warning" });
      return;
    }

    setIsScheduling(true);
    try {
      // Convert the datetime-local value to a proper ISO string
      const scheduledDate = new Date(scheduledDateTime);
      const isoString = scheduledDate.toISOString();
      
      await scheduleEmail({
        eventId: selectedEvent,
        registrationIds: sendMode === "all" 
          ? eventRegistrations.map(reg => reg._id)
          : Array.from(selectedUsers),
        subject: emailSubject,
        content: emailContent,
        scheduledFor: isoString,
      });
      
      const scheduledTime = new Date(scheduledDateTime).toLocaleString();
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setPopup({ isOpen: true, title: "Success", message: `Email scheduled successfully for ${scheduledTime} (${timezone})`, type: "success", autoClose: true });
      setEmailSubject("");
      setEmailContent("");
      setScheduledDateTime("");
      setSelectedUsers(new Set());
      
      // Return true to indicate success (for modal closing)
      return true;
    } catch (error) {
      console.error("Error scheduling email:", error);
      setPopup({ isOpen: true, title: "Error", message: "Failed to schedule email. Please try again.", type: "error" });
      return false;
    } finally {
      setIsScheduling(false);
    }
  };

  const handleCancelScheduledEmail = async (emailId) => {
    if (confirm("Are you sure you want to cancel this scheduled email?")) {
      try {
        await cancelScheduledEmail({ emailId });
        setPopup({ isOpen: true, title: "Success", message: "Scheduled email cancelled successfully", type: "success", autoClose: true });
      } catch (error) {
        console.error("Error cancelling email:", error);
        setPopup({ isOpen: true, title: "Error", message: "Failed to cancel email. Please try again.", type: "error" });
      }
    }
  };

  // Update handling functions
  const handleCreateUpdate = async () => {
    if (!selectedEvent || !updateTitle || !updateContent) {
      setPopup({ isOpen: true, title: "Required Fields", message: "Please fill in all fields", type: "warning" });
      return false;
    }

    setIsCreatingUpdate(true);
    try {
      await createUpdate({
        eventId: selectedEvent,
        title: updateTitle,
        content: updateContent,
        createdBy: user.id,
      });
      
      setPopup({ isOpen: true, title: "Success", message: "Update published and sent to all registrants!", type: "success", autoClose: true });
      setUpdateTitle("");
      setUpdateContent("");
      return true;
    } catch (error) {
      console.error("Error creating update:", error);
      setPopup({ isOpen: true, title: "Error", message: "Failed to publish update. Please try again.", type: "error" });
      return false;
    } finally {
      setIsCreatingUpdate(false);
    }
  };

  // Removed handlePublishAndSendUpdate since updates are now published automatically

  const handleDeleteUpdate = async (updateId) => {
    if (confirm("Are you sure you want to delete this update?")) {
      try {
        await deleteUpdate({ updateId });
        setPopup({ isOpen: true, title: "Success", message: "Update deleted successfully!", type: "success", autoClose: true });
      } catch (error) {
        console.error("Error deleting update:", error);
        setPopup({ isOpen: true, title: "Error", message: "Failed to delete update. Please try again.", type: "error" });
      }
    }
  };

  const handleEditUpdate = (update) => {
    setSelectedUpdate(update);
    setUpdateTitle(update.title);
    setUpdateContent(update.content);
  };

  const handleSaveEdit = async () => {
    if (!selectedUpdate || !updateTitle || !updateContent) {
      setPopup({ isOpen: true, title: "Required Fields", message: "Please fill in all fields", type: "warning" });
      return;
    }

    try {
      await updateUpdate({
        updateId: selectedUpdate._id,
        title: updateTitle,
        content: updateContent,
      });
      
      setPopup({ isOpen: true, title: "Success", message: "Update saved successfully!", type: "success", autoClose: true });
      setSelectedUpdate(null);
      setUpdateTitle("");
      setUpdateContent("");
    } catch (error) {
      console.error("Error saving update:", error);
      setPopup({ isOpen: true, title: "Error", message: "Failed to save update. Please try again.", type: "error" });
    }
  };

  const handleCancelEdit = () => {
    setSelectedUpdate(null);
    setUpdateTitle("");
    setUpdateContent("");
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "sent": return "bg-green-100 text-green-800";
      case "failed": return "bg-red-100 text-red-800";
      case "cancelled": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const closePopup = () => {
    setPopup({ isOpen: false, title: "", message: "", type: "info" });
  };

  const tabs = [
    { id: "schedule", name: "Schedule", icon: "📅" },
    { id: "updates", name: "Updates", icon: "📢" },
  ];

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
      />
      <Navbar />
      
      <div className="pt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Outbox</h1>
            <p className="text-gray-600">Send emails to event registrants</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200">
            {/* Event Selection */}
            <div className="p-6 border-b border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Event
              </label>
              <select
                value={selectedEvent}
                onChange={(e) => {
                  setSelectedEvent(e.target.value);
                  setSelectedUsers(new Set());
                  setSearchTerm("");
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Choose an event...</option>
                {events?.map((event) => (
                  <option key={event._id} value={event._id}>
                    {event.title} ({new Date(event.date).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>

            {/* Event Info */}
            {selectedEventDetails && (
              <div className="p-6 border-b border-gray-200 bg-blue-50">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {selectedEventDetails.title}
                </h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Date:</strong> {new Date(selectedEventDetails.date).toLocaleDateString()}</p>
                  {selectedEventDetails.location && (
                    <p><strong>Location:</strong> {selectedEventDetails.location}</p>
                  )}
                  <p><strong>Registrations:</strong> {eventRegistrations.length} participants</p>
                </div>
              </div>
            )}

            {/* Tabs */}
            {selectedEvent && (
              <>
                <div className="px-6 py-4">
                  <nav className="flex space-x-1 bg-gray-50 rounded-xl p-1" aria-label="Tabs">
                    {tabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                          activeTab === tab.id
                            ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-200"
                            : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
                        }`}
                      >
                        <span className="mr-2 text-base">{tab.icon}</span>
                        {tab.name}
                      </button>
                    ))}
                  </nav>
                </div>

                {/* Tab Content */}
                <div className="px-6 pb-6">
                  {activeTab === "schedule" && (
                    <ScheduleTab
                      selectedEventDetails={selectedEventDetails}
                      eventRegistrations={eventRegistrations}
                      filteredRegistrations={filteredRegistrations}
                      emailSubject={emailSubject}
                      setEmailSubject={setEmailSubject}
                      emailContent={emailContent}
                      setEmailContent={setEmailContent}
                      sendMode={sendMode}
                      setSendMode={setSendMode}
                      selectedUsers={selectedUsers}
                      searchTerm={searchTerm}
                      setSearchTerm={setSearchTerm}
                      handleUserSelection={handleUserSelection}
                      selectAllUsers={selectAllUsers}
                      clearSelection={clearSelection}
                      scheduledDateTime={scheduledDateTime}
                      setScheduledDateTime={setScheduledDateTime}
                      handleScheduleEmail={handleScheduleEmail}
                      isScheduling={isScheduling}
                      scheduledEmails={scheduledEmails}
                      handleCancelScheduledEmail={handleCancelScheduledEmail}
                      getStatusColor={getStatusColor}
                    />
                  )}

                  {activeTab === "updates" && (
                                <UpdatesTab
              selectedEventDetails={selectedEventDetails}
              updates={updates}
              updateStats={updateStats}
              updateTitle={updateTitle}
              setUpdateTitle={setUpdateTitle}
              updateContent={updateContent}
              setUpdateContent={setUpdateContent}
              selectedUpdate={selectedUpdate}
              isCreatingUpdate={isCreatingUpdate}
              handleCreateUpdate={handleCreateUpdate}
              handleDeleteUpdate={handleDeleteUpdate}
              handleEditUpdate={handleEditUpdate}
              handleSaveEdit={handleSaveEdit}
              handleCancelEdit={handleCancelEdit}
            />
                  )}
                </div>
              </>
            )}

            {/* Instructions */}
            {!selectedEvent && (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Ready to Send Emails?</h3>
                <p className="text-gray-600 max-w-md mx-auto mb-6">
                  Choose an event from the dropdown above to start composing and sending emails to your event registrants.
                </p>
                <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Professional templates
                  </div>
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Bulk or selective sending
                  </div>
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Advanced options
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Updates Tab Component
function UpdatesTab({
  selectedEventDetails,
  updates,
  updateStats,
  updateTitle,
  setUpdateTitle,
  updateContent,
  setUpdateContent,
  selectedUpdate,
  isCreatingUpdate,
  handleCreateUpdate,
  handleDeleteUpdate,
  handleEditUpdate,
  handleSaveEdit,
  handleCancelEdit
}) {
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  
  const getUpdateStatusColor = (status) => {
    switch (status) {
      case "draft": return "bg-gray-100 text-gray-800";
      case "published": return "bg-blue-100 text-blue-800";
      case "sent": return "bg-green-100 text-green-800";
      case "failed": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-8">
      {/* Header with Add Update Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Event Updates</h3>
          <p className="text-gray-600">Publish updates and announcements to all event registrants</p>
        </div>
          <button
          onClick={() => setShowUpdateModal(true)}
          className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
          <span>Publish Update</span>
          </button>
      </div>

      {/* Update Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Updates</p>
              <p className="text-2xl font-bold text-gray-900">{updateStats?.total || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Published</p>
              <p className="text-2xl font-bold text-blue-600">{updateStats?.published || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Sent</p>
              <p className="text-2xl font-bold text-green-600">{updateStats?.sent || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Failed</p>
              <p className="text-2xl font-bold text-red-600">{updateStats?.failed || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Updates List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Update History
          </h3>
        </div>
        
        <div className="p-6">
          {!updates || updates.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">No Updates Yet</h4>
              <p className="text-gray-500 mb-6">You haven&apos;t created any updates yet</p>
                        <button
                onClick={() => setShowUpdateModal(true)}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Publish Your First Update
          </button>
            </div>
          ) : (
            <div className="space-y-4">
              {updates.map((update) => (
                <div key={update._id} className="bg-gray-50 rounded-xl p-6 hover:bg-gray-100 transition-all duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 text-lg mb-2">
                        {selectedUpdate?._id === update._id ? (
                          <input
                            type="text"
                            value={updateTitle}
                            onChange={(e) => setUpdateTitle(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          />
                        ) : (
                          update.title
                        )}
                      </h4>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>Created: {new Date(update.createdAt).toLocaleDateString()}</span>
                        {update.publishedAt && (
                          <span>Published: {new Date(update.publishedAt).toLocaleDateString()}</span>
                        )}
                        {update.sentAt && (
                          <span>Sent: {new Date(update.sentAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getUpdateStatusColor(update.status)}`}>
                        {update.status}
                      </span>
                      <div className="flex items-center space-x-1">
                        {selectedUpdate?._id === update._id ? (
                          <>
          <button
                              onClick={handleSaveEdit}
                              className="text-green-600 hover:text-green-800 p-1"
                              title="Save changes"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
          </button>
                            <button
                              onClick={handleCancelEdit}
                              className="text-gray-600 hover:text-gray-800 p-1"
                              title="Cancel editing"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleDeleteUpdate(update._id)}
                              className="text-red-600 hover:text-red-800 p-1"
                              title="Delete update"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
        </div>
      </div>

                  <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {selectedUpdate?._id === update._id ? (
                      <textarea
                        value={updateContent}
                        onChange={(e) => setUpdateContent(e.target.value)}
                        rows={6}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-vertical"
                      />
                    ) : (
                      update.content
                    )}
                  </div>
                  
                  {update.error && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-600">
                        <strong>Error:</strong> {update.error}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Update Modal */}
      {showUpdateModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/20">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Create New Update</h2>
                <button
                  onClick={() => setShowUpdateModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <UpdateForm
                selectedEventDetails={selectedEventDetails}
                updateTitle={updateTitle}
                setUpdateTitle={setUpdateTitle}
                updateContent={updateContent}
                setUpdateContent={setUpdateContent}
                isCreatingUpdate={isCreatingUpdate}
                handleCreateUpdate={handleCreateUpdate}
                onClose={() => setShowUpdateModal(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Update Form Component for Modal
function UpdateForm({
  selectedEventDetails,
  updateTitle,
  setUpdateTitle,
  updateContent,
  setUpdateContent,
  isCreatingUpdate,
  handleCreateUpdate,
  onClose
}) {
  return (
    <div className="space-y-8">
      {/* Update Form */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-2xl">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
          Publish New Update
        </h3>
        
        <div className="space-y-6">
                <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Update Title <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="text"
              value={updateTitle}
              onChange={(e) => setUpdateTitle(e.target.value)}
              placeholder="Enter update title..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 placeholder-gray-400 transition-all duration-200"
                  />
                </div>

                <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Update Content <span className="text-red-500 ml-1">*</span>
                  </label>
            <div className="relative">
                  <textarea
                value={updateContent}
                onChange={(e) => setUpdateContent(e.target.value)}
                placeholder="Write your update content..."
                rows={12}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-vertical text-gray-900 placeholder-gray-400 transition-all duration-200"
                  />
              <div className="absolute bottom-3 right-3 text-xs text-gray-400 bg-white/80 px-2 py-1 rounded-full">
                {updateContent.length} characters
              </div>
            </div>
          </div>
            </div>
          </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4 pt-6">
                  <button
          onClick={onClose}
          className="px-6 py-3 text-gray-700 bg-gray-100 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200"
                  >
          Cancel
                  </button>
                  <button
          onClick={async () => {
            const success = await handleCreateUpdate();
            if (success) {
              onClose();
            }
          }}
          disabled={isCreatingUpdate || !updateTitle || !updateContent}
          className={`px-8 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center space-x-2 ${
            isCreatingUpdate || !updateTitle || !updateContent
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          }`}
        >
          {isCreatingUpdate ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              <span>Publishing...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              <span>Publish Update</span>
            </>
          )}
                  </button>
                </div>
              </div>
  );
}

// Schedule Tab Component
function ScheduleTab({
  selectedEventDetails,
  eventRegistrations,
  filteredRegistrations,
  emailSubject,
  setEmailSubject,
  emailContent,
  setEmailContent,
  sendMode,
  setSendMode,
  selectedUsers,
  searchTerm,
  setSearchTerm,
  handleUserSelection,
  selectAllUsers,
  clearSelection,
  scheduledDateTime,
  setScheduledDateTime,
  handleScheduleEmail,
  isScheduling,
  scheduledEmails,
  handleCancelScheduledEmail,
  getStatusColor
}) {
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  return (
    <div className="space-y-8">
      {/* Header with Add Schedule Button */}
      <div className="flex items-center justify-between">
                    <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">My Schedules</h3>
          <p className="text-gray-600">Manage your scheduled emails and view history</p>
                    </div>
        <button
          onClick={() => setShowScheduleModal(true)}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>Add Schedule</span>
        </button>
                    </div>

      {/* Scheduled Email History */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Scheduled Email History
          </h3>
        </div>
        
        <div className="p-6">
          {scheduledEmails?.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">No Scheduled Emails</h4>
              <p className="text-gray-500 mb-6">You haven&apos;t scheduled any emails yet</p>
              <button
                onClick={() => setShowScheduleModal(true)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Your First Schedule
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {scheduledEmails?.map((email) => (
                <div key={email._id} className="bg-gray-50 rounded-xl p-6 hover:bg-gray-100 transition-all duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-gray-900 text-lg">{email.subject}</h4>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(email.status)}`}>
                      {email.status}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span><strong>Scheduled:</strong> {new Date(email.scheduledFor).toLocaleDateString()} at {new Date(email.scheduledFor).toLocaleTimeString()}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span><strong>Recipients:</strong> {email.registrationIds.length}</span>
                    </div>
                    {email.sentAt && (
                      <div className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span><strong>Sent:</strong> {new Date(email.sentAt).toLocaleDateString()} at {new Date(email.sentAt).toLocaleTimeString()}</span>
                  </div>
                )}
                    {email.error && (
                      <div className="flex items-center text-sm text-red-600">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span><strong>Error:</strong> {email.error}</span>
        </div>
                    )}
      </div>

                  <div className="text-sm text-gray-600 mb-4 p-3 bg-white rounded-lg">
                    {email.content.substring(0, 120)}...
                  </div>
                  
                  {email.status === "pending" && (
                <button
                      onClick={() => handleCancelScheduledEmail(email._id)}
                      className="text-sm text-red-600 hover:text-red-800 font-semibold flex items-center transition-colors"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Cancel Email
                    </button>
                  )}
                    </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/20">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Schedule New Email</h2>
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
      </div>
            </div>
            
            <div className="p-6">
              <ScheduleForm
                selectedEventDetails={selectedEventDetails}
                eventRegistrations={eventRegistrations}
                filteredRegistrations={filteredRegistrations}
                emailSubject={emailSubject}
                setEmailSubject={setEmailSubject}
                emailContent={emailContent}
                setEmailContent={setEmailContent}
                sendMode={sendMode}
                setSendMode={setSendMode}
                selectedUsers={selectedUsers}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                handleUserSelection={handleUserSelection}
                selectAllUsers={selectAllUsers}
                clearSelection={clearSelection}
                scheduledDateTime={scheduledDateTime}
                setScheduledDateTime={setScheduledDateTime}
                handleScheduleEmail={handleScheduleEmail}
                isScheduling={isScheduling}
                onClose={() => setShowScheduleModal(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Schedule Form Component for Modal
function ScheduleForm({
  selectedEventDetails,
  eventRegistrations,
  filteredRegistrations,
  emailSubject,
  setEmailSubject,
  emailContent,
  setEmailContent,
  sendMode,
  setSendMode,
  selectedUsers,
  searchTerm,
  setSearchTerm,
  handleUserSelection,
  selectAllUsers,
  clearSelection,
  scheduledDateTime,
  setScheduledDateTime,
  handleScheduleEmail,
  isScheduling,
  onClose
}) {
  return (
    <div className="space-y-8">
      {/* Email Template Selection */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Quick Templates
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => {
              setEmailSubject("Event Update: " + selectedEventDetails?.title);
              setEmailContent("Dear participants,\n\nWe hope this message finds you well. We wanted to share some important updates regarding the upcoming event.\n\nBest regards,\nEvent Organizer");
            }}
            className="p-4 text-left bg-white/70 backdrop-blur-sm border border-white/50 rounded-xl hover:bg-white hover:shadow-md transition-all duration-200 group"
          >
            <div className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">Event Update</div>
            <div className="text-sm text-gray-600 mt-1">General event information and updates</div>
          </button>
          <button
            onClick={() => {
              setEmailSubject("Reminder: " + selectedEventDetails?.title + " is approaching");
              setEmailContent("Dear participants,\n\nThis is a friendly reminder that our event is approaching. Please make sure to mark your calendar and prepare accordingly.\n\nWe look forward to seeing you!\n\nBest regards,\nEvent Organizer");
            }}
            className="p-4 text-left bg-white/70 backdrop-blur-sm border border-white/50 rounded-xl hover:bg-white hover:shadow-md transition-all duration-200 group"
          >
            <div className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">Event Reminder</div>
            <div className="text-sm text-gray-600 mt-1">Friendly reminder about upcoming event</div>
          </button>
          <button
            onClick={() => {
              setEmailSubject("Important Information: " + selectedEventDetails?.title);
              setEmailContent("Dear participants,\n\nWe have some important information to share with you regarding the event logistics and requirements.\n\nPlease review this information carefully.\n\nBest regards,\nEvent Organizer");
            }}
            className="p-4 text-left bg-white/70 backdrop-blur-sm border border-white/50 rounded-xl hover:bg-white hover:shadow-md transition-all duration-200 group"
          >
            <div className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">Important Info</div>
            <div className="text-sm text-gray-600 mt-1">Critical information and logistics</div>
          </button>
        </div>
      </div>

      {/* Email Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <label className="block text-sm font-semibold text-gray-900 mb-3 flex items-center">
              <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              Email Subject <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="text"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder="Enter a compelling subject line..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 transition-all duration-200"
            />
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <label className="block text-sm font-semibold text-gray-900 mb-3 flex items-center">
              <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Email Content <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="relative">
              <textarea
                value={emailContent}
                onChange={(e) => setEmailContent(e.target.value)}
                placeholder="Write your message here..."
                rows={12}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical text-gray-900 placeholder-gray-400 transition-all duration-200"
              />
              <div className="absolute bottom-3 right-3 text-xs text-gray-400 bg-white/80 px-2 py-1 rounded-full">
                {emailContent.length} characters
              </div>
            </div>
          </div>
        </div>

        {/* Recipients and Schedule */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
              <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Recipients
            </h4>
        <div className="space-y-4">
              <label className="flex items-center p-3 rounded-xl border-2 border-gray-100 hover:border-blue-200 transition-all duration-200 cursor-pointer group">
                <input
                  type="radio"
                  value="all"
                  checked={sendMode === "all"}
                  onChange={(e) => setSendMode(e.target.value)}
                  className="mr-3 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">Send to All</span>
                  <div className="text-xs text-gray-500 mt-1">{eventRegistrations.length} recipients</div>
                </div>
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </label>
              <label className="flex items-center p-3 rounded-xl border-2 border-gray-100 hover:border-blue-200 transition-all duration-200 cursor-pointer group">
                <input
                  type="radio"
                  value="selected"
                  checked={sendMode === "selected"}
                  onChange={(e) => setSendMode(e.target.value)}
                  className="mr-3 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">Send to Selected</span>
                  <div className="text-xs text-gray-500 mt-1">{selectedUsers.size} recipients selected</div>
                </div>
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </label>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
              <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Schedule
            </h4>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Send Date & Time <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="datetime-local"
                value={scheduledDateTime}
                onChange={(e) => setScheduledDateTime(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 transition-all duration-200"
              />
              <div className="mt-3 space-y-1">
                <p className="text-xs text-gray-500 flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
              </p>
              {scheduledDateTime && (
                  <p className="text-xs text-blue-600 flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Scheduled for: {new Date(scheduledDateTime).toLocaleString()}
                </p>
              )}
              </div>
            </div>
          </div>

          {sendMode === "selected" && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Select Recipients
                </h4>
                <div className="flex space-x-2">
                  <button
                    onClick={selectAllUsers}
                    className="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-200 transition-colors font-medium"
                  >
                    Select All
                  </button>
                  <button
                    onClick={clearSelection}
                    className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    Clear
                  </button>
                </div>
              </div>
              
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              />
              
              <div className="max-h-48 overflow-y-auto space-y-2">
                {filteredRegistrations.map((registration) => (
                  <label key={registration._id} className="flex items-center p-3 rounded-xl border border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition-all duration-200 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedUsers.has(registration._id)}
                      onChange={() => handleUserSelection(registration._id)}
                      className="mr-3 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">{registration.name}</div>
                      <div className="text-xs text-gray-500">{registration.email}</div>
                    </div>
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 text-sm font-medium">
                      {registration.name.charAt(0).toUpperCase()}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Schedule Button */}
      <div className="flex justify-end space-x-4 pt-6">
        <button
          onClick={onClose}
          className="px-6 py-3 text-gray-700 bg-gray-100 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200"
        >
          Cancel
        </button>
        <button
          onClick={async () => {
            const success = await handleScheduleEmail();
            if (success) {
              onClose();
            }
          }}
          disabled={isScheduling || !emailSubject || !emailContent || !scheduledDateTime || (sendMode === "selected" && selectedUsers.size === 0)}
          className={`px-8 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center space-x-2 ${
            isScheduling || !emailSubject || !emailContent || !scheduledDateTime || (sendMode === "selected" && selectedUsers.size === 0)
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          }`}
        >
          {isScheduling ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              <span>Scheduling...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
              <span>
                {scheduledDateTime 
                  ? `Schedule for ${new Date(scheduledDateTime).toLocaleDateString()} at ${new Date(scheduledDateTime).toLocaleTimeString()}`
                  : 'Select Date & Time'
                }
                </span>
            </>
          )}
                </button>
          </div>
    </div>
  );
} 

