"use client";

import { useUser, SignOutButton } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import Link from "next/link";

export default function Navbar() {
  const { user } = useUser();
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
                                {/* Logo and Brand */}
                      <div className="flex items-center space-x-8">
                        <div className="flex-shrink-0">
                          <Link href="/" className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer">
                            Event Flow
                          </Link>
                        </div>
                      </div>

                      {/* Navigation Tabs */}
                      <div className="hidden md:flex items-center">
                        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
                          <Link 
                            href="/" 
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                              pathname === '/' 
                                ? "bg-white text-gray-900 shadow-sm" 
                                : "text-gray-600 hover:text-gray-900"
                            }`}
                          >
                            Home
                          </Link>
                          <Link 
                            href="/my-events" 
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                              pathname === '/my-events' 
                                ? "bg-white text-gray-900 shadow-sm" 
                                : "text-gray-600 hover:text-gray-900"
                            }`}
                          >
                            My Events
                          </Link>
                          <Link 
                            href="/inbox" 
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                              pathname === '/inbox' 
                                ? "bg-white text-gray-900 shadow-sm" 
                                : "text-gray-600 hover:text-gray-900"
                            }`}
                          >
                            Inbox
                          </Link>
                        </div>
                      </div>

          {/* User Menu */}
          {user && (
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user.firstName ? user.firstName[0] : user.emailAddresses[0]?.emailAddress[0]}
                    </span>
                  </div>
                  <div className="hidden md:block">
                    <p className="text-sm font-medium text-gray-900">
                      {user.firstName || user.emailAddresses[0]?.emailAddress}
                    </p>
                  </div>
                </div>
                <SignOutButton>
                  <button className="text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors">
                    Sign out
                  </button>
                </SignOutButton>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
} 