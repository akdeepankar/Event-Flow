"use client";

import { useUser, SignOutButton } from "@clerk/nextjs";

export default function UserProfile() {
  const { user } = useUser();

  if (!user) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Welcome, {user.firstName || user.emailAddresses[0]?.emailAddress}!
          </h3>
          <p className="text-sm text-gray-600">
            {user.emailAddresses[0]?.emailAddress}
          </p>
        </div>
        <SignOutButton>
          <button className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500">
            Sign Out
          </button>
        </SignOutButton>
      </div>
    </div>
  );
} 