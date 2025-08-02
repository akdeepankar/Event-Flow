"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function UserProfileSync() {
  const { user, isLoaded } = useUser();
  const createOrUpdateUser = useMutation(api.users.createOrUpdateUser);

  useEffect(() => {
    if (isLoaded && user) {
      // Automatically create or update user profile in Convex
      const userEmail = user.emailAddresses[0]?.emailAddress || "";
      const userName = user.firstName || user.emailAddresses[0]?.emailAddress?.split('@')[0] || 'User';
      
      createOrUpdateUser({
        email: userEmail,
        name: userName,
      }).catch(console.error);
    }
  }, [isLoaded, user, createOrUpdateUser]);

  // This component doesn't render anything
  return null;
} 