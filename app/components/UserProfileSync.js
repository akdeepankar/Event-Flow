"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function UserProfileSync() {
  const { user, isLoaded } = useUser();
  const upsertUser = useMutation(api.users.upsertUser);

  useEffect(() => {
    if (isLoaded && user) {
      // Automatically create or update user profile in Convex
      const userEmail = user.emailAddresses[0]?.emailAddress || "";
      const userName = user.firstName || user.emailAddresses[0]?.emailAddress?.split('@')[0] || 'User';
      
      upsertUser({
        clerkId: userEmail, // Use email as the unique identifier
        email: userEmail,
        name: userName,
      }).catch(console.error);
    }
  }, [isLoaded, user, upsertUser]);

  // This component doesn't render anything
  return null;
} 