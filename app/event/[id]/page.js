"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { api } from "../../../convex/_generated/api";
import Navbar from "../../components/Navbar";
import RegistrationModal from "../../components/RegistrationModal";
import PurchaseModal from "../../components/PurchaseModal";
import Popup from "../../components/Popup";
import Image from "next/image";

export default function EventPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [popup, setPopup] = useState({ isOpen: false, title: "", message: "", type: "info" });

  
  const event = useQuery(api.events.getEventById, { id: params.id });
  const headerImageUrl = useQuery(api.files.getFileUrl, { 
    storageId: event?.headerImage || "" 
  }, event?.headerImage ? undefined : "skip");

  const registrationCount = useQuery(api.registrations.getEventRegistrationCount, {
    eventId: params.id
  }, event ? undefined : "skip");
  
  // Check if current user is registered for this event
  const userRegistration = useQuery(
    api.registrations.isRegisteredForEvent,
    user?.emailAddresses[0]?.emailAddress && event ? { 
      eventId: params.id, 
      email: user.emailAddresses[0].emailAddress 
    } : "skip"
  );
  
  // Get updates for this event
  const updates = useQuery(api.updates.getUpdatesForEvent, {
    eventId: params.id
  }, event ? undefined : "skip");

  // Get digital products for this event
  const digitalProducts = useQuery(api.digitalProducts.getEventDigitalProducts, {
    eventId: params.id
  }, event ? undefined : "skip");

  // Show loading while data is loading
  if (!event && !isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading event details...</p>
        </div>
      </div>
    );
  }

  // Show event not found message
  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Event Not Found</h1>
            <p className="text-gray-600 mb-8 text-lg">The event you&apos;re looking for doesn&apos;t exist or has been deleted.</p>
            <button
              onClick={() => router.push("/")}
              className="bg-blue-600 text-white px-8 py-3 rounded-xl hover:bg-blue-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Popup Component */}
      <Popup
        isOpen={popup.isOpen}
        onClose={() => setPopup({ isOpen: false, title: "", message: "", type: "info" })}
        title={popup.title}
        message={popup.message}
        type={popup.type}
        autoClose={popup.autoClose}
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section with Header Image */}
        <div className="relative mb-8">
          {headerImageUrl && (
            <div className="relative h-96 rounded-3xl overflow-hidden shadow-2xl">
              <Image 
                src={headerImageUrl} 
                alt={event.title}
                fill
                className="object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 drop-shadow-lg">
                  {event.title}
                </h1>
                <div className="flex flex-wrap items-center gap-4 text-white/90">
                  <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="font-medium">{event.date}</span>
                  </div>
                  {event.location && (
                    <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="font-medium">{event.location}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Fallback header when no image */}
          {!headerImageUrl && (
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-8 shadow-2xl">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                {event.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-white/90">
                <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="font-medium">{event.date}</span>
                </div>
                {event.location && (
                  <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="font-medium">{event.location}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Event Description */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                About This Event
              </h2>
              <div className="prose prose-lg max-w-none">
                <p className="text-gray-700 leading-relaxed text-lg">
                  {event.description || "No description provided for this event."}
                </p>
              </div>
            </div>

            {/* Event Updates Section */}
            {updates && updates.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  Latest Updates
                </h2>
                <div className="space-y-6">
                  {updates.map((update, index) => (
                    <div key={update._id} className="border-l-4 border-green-500 pl-6 py-4 bg-green-50 rounded-r-xl">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 text-lg">{update.title}</h3>
                        <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full">
                          {new Date(update.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-gray-700 leading-relaxed">{update.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Digital Store Section */}
            {digitalProducts && digitalProducts.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  Digital Store
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {digitalProducts.map((product) => (
                    <div key={product._id} className="border border-gray-200 rounded-xl p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-gradient-to-br from-white to-gray-50">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                          <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-900">
                            ₹{(product.price / 100).toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">{product.name}</h3>
                      {product.description && (
                        <p className="text-gray-600 mb-4 leading-relaxed">{product.description}</p>
                      )}
                      <div className="flex items-center justify-between text-sm text-gray-500 mb-6">
                        <span className="bg-gray-100 px-3 py-1 rounded-full">{product.fileName}</span>
                        <span className="bg-gray-100 px-3 py-1 rounded-full">{(product.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                      </div>
                      <button
                        className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-3 rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center justify-center space-x-2"
                        onClick={() => {
                          setSelectedProduct(product);
                          setIsPurchaseModalOpen(true);
                        }}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m6 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
                        </svg>
                        <span>Purchase Now</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Registration Card */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>

              {/* Registration Stats */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 mb-6">
                <div className={`grid gap-4 text-center ${event.participantLimit ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{registrationCount?.registered || 0}</div>
                    <div className="text-sm text-gray-600">Registered</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {event.participantLimit ? event.participantLimit : 'No Limit'}
                    </div>
                    <div className="text-sm text-gray-600">Capacity</div>
                  </div>
                  {event.participantLimit && (
                    <div>
                      <div className="text-2xl font-bold text-orange-600">{Math.max(0, event.participantLimit - (registrationCount?.registered || 0))}</div>
                      <div className="text-sm text-gray-600">Available</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {user ? (
                  event.registrationClosed ? (
                    <div className="px-4 py-3 rounded-xl bg-red-100 text-red-700 flex items-center justify-center space-x-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span className="font-medium">Registration Closed</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsRegistrationModalOpen(true)}
                      className={`w-full px-6 py-3 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center justify-center space-x-2 font-medium ${
                        event.participantLimit && registrationCount?.registered >= event.participantLimit
                          ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white'
                          : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span>
                        {event.participantLimit && registrationCount?.registered >= event.participantLimit
                          ? 'Join Waitlist'
                          : 'Register Now'
                        }
                      </span>
                    </button>
                  )
                ) : (
                  event.registrationClosed ? (
                    <div className="px-4 py-3 rounded-xl bg-red-100 text-red-700 flex items-center justify-center space-x-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span className="font-medium">Registration Closed</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => router.push("/sign-up")}
                      className={`w-full px-6 py-3 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center justify-center space-x-2 font-medium ${
                        event.participantLimit && registrationCount?.registered >= event.participantLimit
                          ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white'
                          : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span>
                        {event.participantLimit && registrationCount?.registered >= event.participantLimit
                          ? 'Sign Up for Waitlist'
                          : 'Sign Up to Register'
                        }
                      </span>
                    </button>
                  )
                )}

                <button
                  onClick={() => {
                    const link = `${window.location.origin}/event/${params.id}`;
                    navigator.clipboard.writeText(link);
                    setPopup({ isOpen: true, title: "Success", message: "Event link copied to clipboard!", type: "success", autoClose: true });
                  }}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center justify-center space-x-2 font-medium"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                  </svg>
                  <span>Share Event</span>
                </button>
              </div>

              {/* User Registration Status */}
              {user && userRegistration?.isRegistered && (
                <div className="mt-6 p-4 bg-green-50 rounded-xl border border-green-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium text-green-800">You&apos;re Registered!</span>
                  </div>
                  {userRegistration.status === "waitlisted" && (
                    <p className="text-sm text-green-700">
                      You&apos;re #{userRegistration.waitlistPosition} in the waitlist
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Event Details Card */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center mr-2">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                Event Details
              </h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <div className="text-sm text-gray-500">Date</div>
                    <div className="font-medium text-gray-900">{event.date}</div>
                  </div>
                </div>
                
                {event.location && (
                  <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <div>
                      <div className="text-sm text-gray-500">Location</div>
                      <div className="font-medium text-gray-900">{event.location}</div>
                    </div>
                  </div>
                )}

                {registrationCount?.waitlisted > 0 && (
                  <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg">
                    <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <div className="text-sm text-yellow-600">Waitlist</div>
                      <div className="font-medium text-yellow-800">{registrationCount.waitlisted} people waiting</div>
                    </div>
                  </div>
                )}
              </div>
            </div>


          </div>
        </div>
      </main>

      {/* Registration Modal - Only show if user is authenticated */}
      {user && (
        <RegistrationModal
          isOpen={isRegistrationModalOpen}
          onClose={() => setIsRegistrationModalOpen(false)}
          eventId={params.id}
          eventTitle={event.title}
          isEventFull={event.participantLimit && registrationCount?.registered >= event.participantLimit}
        />
      )}

      {/* Purchase Modal */}
      <PurchaseModal
        isOpen={isPurchaseModalOpen}
        onClose={() => {
          setIsPurchaseModalOpen(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
      />
    </div>
  );
}