"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { api } from "../../../convex/_generated/api";
import Navbar from "../../components/Navbar";
import RegistrationModal from "../../components/RegistrationModal";
import Image from "next/image";

export default function EventPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
  
  const event = useQuery(api.events.getEventById, { id: params.id });
  const headerImageUrl = useQuery(api.files.getFileUrl, { 
    storageId: event?.headerImage || "" 
  }, event?.headerImage ? undefined : "skip");
  const registrationCount = useQuery(api.registrations.getEventRegistrationCount, {
    eventId: params.id
  }, event ? undefined : "skip");
  
  // Get updates for this event
  const updates = useQuery(api.updates.getUpdatesForEvent, {
    eventId: params.id
  }, event ? undefined : "skip");

  // Handle redirect when user is authenticated
  useEffect(() => {
    if (isLoaded && user) {
      // User is authenticated, show the full event page
      return;
    }
  }, [isLoaded, user]);

  // Show loading while checking authentication
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Show loading while checking authentication
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // If user is not authenticated, show public preview
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">Event Flow</h1>
              <div className="flex space-x-3">
                <button
                  onClick={() => router.push("/sign-in")}
                  className="text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => router.push("/sign-up")}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Sign Up
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {!event ? (
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Event not found</h1>
              <p className="text-gray-600 mb-6">The event you&apos;re looking for doesn&apos;t exist or has been deleted.</p>
              <button
                onClick={() => router.push("/")}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go Home
              </button>
            </div>
          ) : (
            <>
                             {/* Event Preview */}
               <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8">
                 {headerImageUrl && (
                   <div className="mb-6">
                     <Image 
                       src={headerImageUrl} 
                       alt={event.title}
                       width={800}
                       height={400}
                       className="w-full rounded-lg"
                       style={{ maxHeight: '400px', objectFit: 'cover' }}
                       onError={(e) => {
                         e.target.style.display = 'none';
                       }}
                     />
                   </div>
                 )}
                 <div className="mb-6">
                   <h1 className="text-3xl font-bold text-gray-900 mb-2">{event.title}</h1>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mb-6">
                    <div className="flex items-center space-x-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{event.date}</span>
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

                  {event.description && (
                    <p className="text-gray-700 text-lg leading-relaxed mb-6">
                      {event.description}
                    </p>
                  )}
                </div>

                {/* Sign Up CTA */}
                <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                  <div className="text-center">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                      Join this event
                    </h2>
                    <p className="text-gray-600 mb-6">
                      Sign up or sign in to view full event details, edit the event, and share it with others.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <button
                        onClick={() => router.push("/sign-up")}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        Create Account
                      </button>
                      <button
                        onClick={() => router.push("/sign-in")}
                        className="bg-white text-blue-600 px-6 py-3 rounded-lg border border-blue-600 hover:bg-blue-50 transition-colors font-medium"
                      >
                        Sign In
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Features Preview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl p-6 border border-gray-200 text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Create Events</h3>
                  <p className="text-sm text-gray-600">Create and manage your own events with our easy-to-use platform.</p>
                </div>

                <div className="bg-white rounded-xl p-6 border border-gray-200 text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Share & Collaborate</h3>
                  <p className="text-sm text-gray-600">Share events with others and collaborate on event planning.</p>
                </div>

                <div className="bg-white rounded-xl p-6 border border-gray-200 text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Real-time Updates</h3>
                  <p className="text-sm text-gray-600">Get real-time updates and notifications about your events.</p>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    );
  }

  // Authenticated user - show full event page (NO EDIT BUTTON)
  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Event not found</h1>
            <p className="text-gray-600 mb-6">The event you&apos;re looking for doesn&apos;t exist or has been deleted.</p>
            <button
              onClick={() => router.push("/")}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                 {/* Event Header */}
         <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8">
           {headerImageUrl && (
             <div className="mb-6">
               <Image 
                 src={headerImageUrl} 
                 alt={event.title}
                 width={800}
                 height={400}
                 className="w-full rounded-lg"
                 style={{ maxHeight: '400px', objectFit: 'cover' }}
                 onError={(e) => {
                   e.target.style.display = 'none';
                 }}
               />
             </div>
           )}
           <div className="flex justify-between items-start mb-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{event.title}</h1>
              
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>{event.date}</span>
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

            {/* Action Buttons - SHARE AND REGISTER */}
            <div className="flex space-x-3">
              <button
                onClick={() => setIsRegistrationModalOpen(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Register</span>
              </button>
              <button
                onClick={() => {
                  const link = `${window.location.origin}/event/${params.id}`;
                  navigator.clipboard.writeText(link);
                  alert("Event link copied to clipboard!");
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
                <span>Share</span>
              </button>
            </div>
          </div>

          {/* Event Description */}
          <div className="mb-6">
            <p className="text-gray-700 text-lg leading-relaxed">
              {event.description || "No description provided."}
            </p>
          </div>

                     {/* Event Details */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
               <h3 className="text-sm font-medium text-gray-500 mb-2">Date</h3>
               <p className="text-gray-900">{event.date}</p>
             </div>

             <div>
               <h3 className="text-sm font-medium text-gray-500 mb-2">Location</h3>
               <p className="text-gray-900">{event.location || "No location specified"}</p>
             </div>
           </div>

           {/* Registration Count */}
           <div className="mt-6 pt-6 border-t border-gray-200">
             <div className="flex items-center space-x-2">
               <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
               </svg>
               <span className="text-sm font-medium text-gray-700">
                 {registrationCount || 0} people registered
               </span>
             </div>
           </div>
         </div>

         {/* Event Updates Section */}
         {updates && updates.length > 0 && (
           <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8">
             <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
               <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
               </svg>
               Event Updates
             </h2>
             
             <div className="space-y-6">
               {updates
                 .filter(update => update.status === "sent" || update.status === "published")
                 .map((update) => (
                   <div key={update._id} className="border border-gray-200 rounded-lg p-6">
                     <div className="flex items-center justify-between mb-3">
                       <h3 className="text-lg font-semibold text-gray-900">{update.title}</h3>
                       <div className="flex items-center space-x-2">
                         <span className="text-xs text-gray-500">
                           {new Date(update.createdAt).toLocaleDateString()}
                         </span>
                         <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                           update.status === "sent" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
                         }`}>
                           {update.status === "sent" ? "Sent" : "Published"}
                         </span>
                       </div>
                     </div>
                     
                     <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                       {update.content}
                     </div>
                     
                     {update.sentAt && (
                       <div className="mt-4 pt-4 border-t border-gray-100">
                         <p className="text-xs text-gray-500">
                           Sent to all registrants on {new Date(update.sentAt).toLocaleString()}
                         </p>
                       </div>
                     )}
                   </div>
                 ))}
             </div>
           </div>
         )}
       </main>

       {/* Registration Modal */}
       <RegistrationModal
         isOpen={isRegistrationModalOpen}
         onClose={() => setIsRegistrationModalOpen(false)}
         eventId={params.id}
         eventTitle={event?.title}
       />
     </div>
   );
 } 