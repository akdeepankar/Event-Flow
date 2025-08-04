"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import CreateEventCard from "./components/CreateEventCard";
import EventList from "./components/EventList";
import AnalyticsOverview from "./components/AnalyticsOverview";
import AuthForm from "./components/AuthForm";
import Navbar from "./components/Navbar";
import UserProfileSync from "./components/UserProfileSync";

export default function Home() {
  const { user, isLoaded } = useUser();
  const events = useQuery(api.events.getAllEvents);
  const registrations = useQuery(api.registrations.getAllRegistrations);

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
          <AuthForm />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <UserProfileSync />
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Dashboard
          </h1>
          <p className="text-gray-600">
            Create and manage your events
          </p>
        </div>

        {/* Dashboard Content */}
        <div className="grid gap-8 lg:grid-cols-3">
          <div>
            <CreateEventCard />
          </div>
          <div>
            <EventList />
          </div>
          <div>
            <AnalyticsOverview 
              events={events} 
              registrations={registrations}
              selectedEvent={null}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
