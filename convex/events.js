import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Query to get all events
export const getAllEvents = query({
  args: {},
  handler: async (ctx) => {
    const events = await ctx.db.query("events").order("desc").collect();
    return events;
  },
});

// Query to get events created by the current user
export const getMyEvents = query({
  args: { userEmail: v.string() },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_createdBy", (q) => q.eq("createdBy", args.userEmail))
      .order("desc")
      .collect();
    return events;
  },
});

// Query to get a specific event by ID
export const getEventById = query({
  args: { id: v.id("events") },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.id);
    return event;
  },
});

// Mutation to create a new event
export const createEvent = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    date: v.string(),
    location: v.optional(v.string()),
    headerImage: v.optional(v.string()),
    participantLimit: v.optional(v.number()),
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const { userEmail, ...eventData } = args;
    const now = Date.now();
    
    const eventId = await ctx.db.insert("events", {
      ...eventData,
      createdBy: userEmail,
      createdAt: now,
      updatedAt: now,
    });
    return eventId;
  },
});

// Mutation to update an event
export const updateEvent = mutation({
  args: {
    id: v.id("events"),
    title: v.string(),
    description: v.optional(v.string()),
    date: v.string(),
    location: v.optional(v.string()),
    headerImage: v.optional(v.string()),
    participantLimit: v.optional(v.number()),
    userEmail: v.string(),
    confirmedLimitDecrease: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, userEmail, ...updateData } = args;
    const event = await ctx.db.get(id);
    
    if (!event) {
      throw new Error("Event not found");
    }
    
    if (event.createdBy !== userEmail) {
      throw new Error("Not authorized to update this event");
    }
    
    const now = Date.now();
    
    // Check if participant limit was increased
    const oldLimit = event.participantLimit || 0;
    const newLimit = updateData.participantLimit || 0;
    const limitIncreased = newLimit > oldLimit;
    
    // Check if new limit is less than current registered participants
    const currentRegistrations = await ctx.db
      .query("registrations")
      .withIndex("by_eventId_status", (q) => 
        q.eq("eventId", id).eq("status", "registered")
      )
      .collect();
    
    const currentRegisteredCount = currentRegistrations.length;
    const limitDecreased = newLimit > 0 && newLimit < currentRegisteredCount;
    
    // Only show warning if not already confirmed
    if (limitDecreased && !args.confirmedLimitDecrease) {
      return {
        success: false,
        warning: true,
        message: `The new participant limit (${newLimit}) is less than the current number of registered participants (${currentRegisteredCount}). Some participants will need to be moved to the waitlist to continue.`,
        currentRegisteredCount,
        newLimit
      };
    }
    
    // If limit is being decreased and user confirmed, move excess participants to waitlist
    const limitDecreasedConfirmed = args.confirmedLimitDecrease && newLimit > 0 && newLimit < currentRegisteredCount;
    
    if (limitDecreasedConfirmed) {
      // Move excess participants to waitlist (last registered first)
      const excessCount = currentRegisteredCount - newLimit;
      const participantsToMove = currentRegistrations
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) // Last registered first
        .slice(0, excessCount);
      
      // Get current waitlist count for positioning
      const waitlistRegistrations = await ctx.db
        .query("registrations")
        .withIndex("by_eventId_status", (q) => 
          q.eq("eventId", id).eq("status", "waitlisted")
        )
        .collect();
      
      const startWaitlistPosition = waitlistRegistrations.length + 1;
      
      // Move participants to waitlist
      for (let i = 0; i < participantsToMove.length; i++) {
        const registration = participantsToMove[i];
        await ctx.db.patch(registration._id, {
          status: "waitlisted",
          waitlistPosition: startWaitlistPosition + i
        });
        
        // Send notification email
        await ctx.scheduler.runAfter(0, "emails:sendWaitlistNotificationEmail", {
          eventId: id,
          registrationId: registration._id,
          to: registration.email,
          name: registration.name,
          waitlistPosition: startWaitlistPosition + i,
        });
      }
    }
    
    await ctx.db.patch(id, {
      ...updateData,
      updatedAt: now,
    });
    
    // If participant limit was increased, promote waitlisted participants
    if (limitIncreased) {
      await ctx.scheduler.runAfter(0, "registrations:promoteWaitlistedOnLimitIncrease", {
        eventId: id,
        newLimit: newLimit,
        oldLimit: oldLimit,
      });
    }
    
    return { success: true };
  },
});

// Mutation to delete an event
export const deleteEvent = mutation({
  args: { 
    id: v.id("events"),
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.id);
    
    if (!event) {
      throw new Error("Event not found");
    }
    
    if (event.createdBy !== args.userEmail) {
      throw new Error("Not authorized to delete this event");
    }
    
    await ctx.db.delete(args.id);
  },
}); 

// Toggle registration status
export const toggleRegistrationStatus = mutation({
  args: {
    eventId: v.id("events"),
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    
    if (!event) {
      throw new Error("Event not found");
    }
    
    if (event.createdBy !== args.userEmail) {
      throw new Error("Not authorized to update this event");
    }
    
    const now = Date.now();
    const newStatus = !event.registrationClosed;
    
    await ctx.db.patch(args.eventId, {
      registrationClosed: newStatus,
      updatedAt: now,
    });
    
    return { registrationClosed: newStatus };
  },
}); 