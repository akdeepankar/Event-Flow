"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "../../convex/_generated/api";
import Navbar from "../components/Navbar";
import AnalyticsOverview from "../components/AnalyticsOverview";
import AnalyticsDetails from "../components/AnalyticsDetails";

export default function AnalyticsPage() {
  const { user, isLoaded } = useUser();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  const events = useQuery(api.events.getAllEvents);
  const registrations = useQuery(api.registrations.getAllRegistrations);

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
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Sign in to view analytics</h1>
            <p className="text-gray-600 mb-6">You need to be signed in to access analytics.</p>
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
                  <div className="pt-16">
        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          {/* Tab Navigation and Header */}
          <div className="flex justify-between items-center mb-6 mt-4">
            {/* Tab Navigation */}
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveTab("overview")}
                className={`px-6 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === "overview"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab("details")}
                className={`px-6 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === "details"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Details
              </button>
            </div>

            {/* Analytics Header */}
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <h1 className="text-xl font-semibold text-gray-900">Analytics</h1>
                <p className="text-gray-500 text-sm">Event performance and insights</p>
              </div>
              <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2zm0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
                        </div>
          </div>

          {activeTab === "overview" ? (
            <AnalyticsOverview 
              events={events} 
              registrations={registrations}
              selectedEvent={selectedEvent}
            />
          ) : (
            <AnalyticsDetails 
              events={events} 
              registrations={registrations}
              selectedEvent={selectedEvent}
              onEventSelect={setSelectedEvent}
            />
              )}
            </div>
          </div>
    </div>
  );
} 