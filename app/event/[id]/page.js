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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }
      // Show event not found message
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
      {/* Popup Component */}
      <Popup
        isOpen={popup.isOpen}
        onClose={() => setPopup({ isOpen: false, title: "", message: "", type: "info" })}
        title={popup.title}
        message={popup.message}
        type={popup.type}
        autoClose={popup.autoClose}
      />


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

            {/* Action Buttons */}
            <div className="flex space-x-3">
              {user ? (
                event.registrationClosed ? (
                  <div className="px-4 py-2 rounded-lg bg-red-100 text-red-700 flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>Registration Closed</span>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsRegistrationModalOpen(true)}
                    className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                      event.participantLimit && registrationCount?.registered >= event.participantLimit
                        ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>
                      {event.participantLimit && registrationCount?.registered >= event.participantLimit
                        ? 'Get Waitlisted'
                        : 'Register'
                      }
                    </span>
                  </button>
                )
              ) : (
                event.registrationClosed ? (
                  <div className="px-4 py-2 rounded-lg bg-red-100 text-red-700 flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>Registration Closed</span>
                  </div>
                ) : (
                  <button
                    onClick={() => router.push("/sign-up")}
                    className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                      event.participantLimit && registrationCount?.registered >= event.participantLimit
                        ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>
                      {event.participantLimit && registrationCount?.registered >= event.participantLimit
                        ? 'Sign Up to Get Waitlisted'
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

          {/* Registration Count - Always visible */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">
                    {registrationCount?.registered || 0} people registered
                  </span>
                </div>
                {registrationCount?.waitlisted > 0 && (
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700">
                      {registrationCount.waitlisted} on waitlist
                    </span>
                  </div>
                )}
                {event.participantLimit && (
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700">
                      Limit: {event.participantLimit}
                    </span>
                  </div>
                )}
              </div>
              
              {/* User Registration Status */}
              {user && userRegistration?.isRegistered && (
                <div className="flex items-center space-x-3">
                  {userRegistration.status === "waitlisted" && (
                    <div className="flex items-center space-x-2 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>You&apos;re #{userRegistration.waitlistPosition} in line</span>
                    </div>
                  )}

                </div>
              )}
            </div>
          </div>
        </div>

        {/* Event Updates Section - Always visible */}
        {updates && updates.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Event Updates</h2>
            <div className="space-y-4">
              {updates.map((update) => (
                <div key={update._id} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">{update.title}</h3>
                  <p className="text-gray-600 text-sm mb-2">
                    {new Date(update.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-gray-700">{update.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Digital Store Section - Only show if digital products exist */}
        {digitalProducts && digitalProducts.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Digital Store</h2>
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {digitalProducts.map((product) => (
                <div key={product._id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-gray-900">
                        ${(product.price / 100).toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{product.name}</h3>
                  {product.description && (
                    <p className="text-gray-600 text-sm mb-4">{product.description}</p>
                  )}
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <span>{product.fileName}</span>
                    <span>{(product.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                  <button
                    className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center space-x-2"
                    onClick={() => {
                      setSelectedProduct(product);
                      setIsPurchaseModalOpen(true);
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m6 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
                    </svg>
                    <span>Purchase</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
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