"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function MigratePage() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState(null);
  
  const migratePaymentEventIds = useMutation(api.migrations.migratePaymentEventIds);

  const handleMigration = async () => {
    setIsRunning(true);
    setResult(null);
    
    try {
      const migrationResult = await migratePaymentEventIds();
      setResult(migrationResult);
    } catch (error) {
      setResult({
        success: false,
        error: error.message
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Database Migration</h1>
          
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Payment EventId Migration
            </h2>
            <p className="text-gray-600 mb-4">
              This migration will update existing payment records that are missing the eventId field.
              This is needed for the new sales analytics feature.
            </p>
            
            <button
              onClick={handleMigration}
              disabled={isRunning}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRunning ? "Running Migration..." : "Run Migration"}
            </button>
          </div>

          {result && (
            <div className={`p-4 rounded-lg ${
              result.success 
                ? "bg-green-50 border border-green-200 text-green-800" 
                : "bg-red-50 border border-red-200 text-red-800"
            }`}>
              <h3 className="font-semibold mb-2">
                {result.success ? "Migration Successful" : "Migration Failed"}
              </h3>
              <p className="text-sm">{result.message || result.error}</p>
              {result.success && (
                <div className="mt-2 text-sm">
                  <p>Updated: {result.updatedCount} records</p>
                  <p>Errors: {result.errorCount} records</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 