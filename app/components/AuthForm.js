"use client";

import { SignIn } from "@clerk/nextjs";

export default function AuthForm() {
  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="text-center mb-6">

      </div>
      
      <SignIn 
        appearance={{
          elements: {
            formButtonPrimary: "bg-blue-500 hover:bg-blue-600",
            card: "shadow-none",
            headerTitle: "hidden",
            headerSubtitle: "hidden",
          }
        }}
      />
      
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Don&apos;t have an account?{" "}
          <a href="/sign-up" className="text-blue-500 hover:text-blue-700 font-medium">
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
} 