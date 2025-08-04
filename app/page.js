"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { api } from "../convex/_generated/api";
import CreateEventCard from "./components/CreateEventCard";
import EventList from "./components/EventList";
import AnalyticsOverview from "./components/AnalyticsOverview";
import Navbar from "./components/Navbar";
import UserProfileSync from "./components/UserProfileSync";

export default function Home() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const events = useQuery(api.events.getAllEvents);
  const registrations = useQuery(api.registrations.getAllRegistrations);

  // Redirect to sign-in if user is not authenticated
  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/sign-in');
    }
  }, [isLoaded, user, router]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
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
