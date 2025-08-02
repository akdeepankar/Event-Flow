import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Register for an event
export const registerForEvent = mutation({
  args: {
    eventId: v.id("events"),
    name: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if already registered
    const existingRegistration = await ctx.db
      .query("registrations")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();

    if (existingRegistration) {
      throw new Error("Already registered for this event");
    }

    const registrationId = await ctx.db.insert("registrations", {
      eventId: args.eventId,
      name: args.name,
      email: args.email,
      registeredAt: Date.now(),
    });

    // Send confirmation email
    await ctx.scheduler.runAfter(0, internal.emails.sendRegistrationEmail, {
      eventId: args.eventId,
      registrationId: registrationId,
      to: args.email,
      name: args.name,
    });

    return registrationId;
  },
});

// Check if user is registered for an event
export const isRegisteredForEvent = query({
  args: {
    eventId: v.id("events"),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const registration = await ctx.db
      .query("registrations")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();

    return !!registration;
  },
});

// Get registrations for an event
export const getEventRegistrations = query({
  args: {
    eventId: v.optional(v.id("events")),
  },
  handler: async (ctx, args) => {
    if (!args.eventId) {
      return [];
    }
    
    const registrations = await ctx.db
      .query("registrations")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .order("desc")
      .collect();

    return registrations;
  },
});

// Get all registrations for analytics
export const getAllRegistrations = query({
  args: {},
  handler: async (ctx) => {
    const registrations = await ctx.db
      .query("registrations")
      .order("desc")
      .collect();

    return registrations;
  },
});

// Get registration count for an event
export const getEventRegistrationCount = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const registrations = await ctx.db
      .query("registrations")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .collect();

    return registrations.length;
  },
});

// Delete a registration
export const deleteRegistration = mutation({
  args: {
    registrationId: v.id("registrations"),
  },
  handler: async (ctx, args) => {
    // Check if registration exists
    const registration = await ctx.db.get(args.registrationId);
    if (!registration) {
      throw new Error("Registration not found");
    }

    // Delete the registration
    await ctx.db.delete(args.registrationId);
    
    return { success: true };
  },
});