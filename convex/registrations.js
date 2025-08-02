import { mutation, query, internalMutation } from "./_generated/server";
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

    // Get event details to check participant limit
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    // Check if registration is closed
    if (event.registrationClosed) {
      throw new Error("Registration is closed for this event");
    }

    // Get current registrations count
    const currentRegistrations = await ctx.db
      .query("registrations")
      .withIndex("by_eventId_status", (q) => 
        q.eq("eventId", args.eventId).eq("status", "registered")
      )
      .collect();

    const currentCount = currentRegistrations.length;
    const hasLimit = event.participantLimit && event.participantLimit > 0;
    const isFull = hasLimit && currentCount >= event.participantLimit;

    let status = "registered";
    let waitlistPosition = null;

    if (isFull) {
      // Event is full, add to waitlist
      status = "waitlisted";
      
      // Get waitlist position
      const waitlistRegistrations = await ctx.db
        .query("registrations")
        .withIndex("by_eventId_status", (q) => 
          q.eq("eventId", args.eventId).eq("status", "waitlisted")
        )
        .collect();
      
      waitlistPosition = waitlistRegistrations.length + 1;
    }

    const registrationId = await ctx.db.insert("registrations", {
      eventId: args.eventId,
      name: args.name,
      email: args.email,
      status: status,
      waitlistPosition: waitlistPosition,
      registeredAt: Date.now(),
    });

    // Send confirmation email
    await ctx.scheduler.runAfter(0, internal.emails.sendRegistrationEmail, {
      eventId: args.eventId,
      registrationId: registrationId,
      to: args.email,
      name: args.name,
      status: status,
      waitlistPosition: waitlistPosition,
    });

    return { registrationId, status, waitlistPosition };
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

    return registration ? { 
      isRegistered: true, 
      status: registration.status, 
      waitlistPosition: registration.waitlistPosition 
    } : { isRegistered: false };
  },
});

// Get registrations for an event (excluding cancelled)
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
      .filter((q) => q.neq(q.field("status"), "cancelled"))
      .order("desc")
      .collect();

    return registrations;
  },
});

// Get all registrations for an event (including cancelled)
export const getEventRegistrationsWithCancelled = query({
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
    const registeredCount = await ctx.db
      .query("registrations")
      .withIndex("by_eventId_status", (q) => 
        q.eq("eventId", args.eventId).eq("status", "registered")
      )
      .collect();

    const waitlistCount = await ctx.db
      .query("registrations")
      .withIndex("by_eventId_status", (q) => 
        q.eq("eventId", args.eventId).eq("status", "waitlisted")
      )
      .collect();

    return {
      registered: registeredCount.length,
      waitlisted: waitlistCount.length,
      total: registeredCount.length + waitlistCount.length
    };
  },
});

// Cancel a registration
export const cancelRegistration = mutation({
  args: {
    registrationId: v.id("registrations"),
  },
  handler: async (ctx, args) => {
    // Check if registration exists
    const registration = await ctx.db.get(args.registrationId);
    if (!registration) {
      throw new Error("Registration not found");
    }

    // Update registration status to cancelled
    await ctx.db.patch(args.registrationId, {
      status: "cancelled"
    });

    // If this was a registered participant, promote someone from waitlist
    if (registration.status === "registered") {
      await ctx.scheduler.runAfter(0, internal.registrations.promoteFromWaitlist, {
        eventId: registration.eventId
      });
    }
    
    return { success: true };
  },
});

// Cancel user's registration for an event
export const cancelUserRegistration = mutation({
  args: {
    eventId: v.id("events"),
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    // Find the user's registration
    const registration = await ctx.db
      .query("registrations")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .filter((q) => q.eq(q.field("email"), args.userEmail))
      .filter((q) => q.neq(q.field("status"), "cancelled"))
      .first();

    if (!registration) {
      throw new Error("Registration not found");
    }

    // Update registration status to cancelled
    await ctx.db.patch(registration._id, {
      status: "cancelled"
    });

    // If this was a registered participant, promote someone from waitlist
    if (registration.status === "registered") {
      await ctx.scheduler.runAfter(0, internal.registrations.promoteFromWaitlist, {
        eventId: registration.eventId
      });
    }
    
    return { success: true };
  },
});

// Internal function to promote someone from waitlist
export const promoteFromWaitlist = internalMutation({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    // Get the first person on the waitlist
    const waitlistRegistration = await ctx.db
      .query("registrations")
      .withIndex("by_eventId_status", (q) => 
        q.eq("eventId", args.eventId).eq("status", "waitlisted")
      )
      .order("asc")
      .first();

    if (waitlistRegistration) {
      // Promote them to registered
      await ctx.db.patch(waitlistRegistration._id, {
        status: "registered"
      });

      // Send notification email
      await ctx.scheduler.runAfter(0, internal.emails.sendWaitlistPromotionEmail, {
        eventId: args.eventId,
        registrationId: waitlistRegistration._id,
        to: waitlistRegistration.email,
        name: waitlistRegistration.name,
      });

      // Update waitlist positions for remaining waitlisted people
      const remainingWaitlist = await ctx.db
        .query("registrations")
        .withIndex("by_eventId_status", (q) => 
          q.eq("eventId", args.eventId).eq("status", "waitlisted")
        )
        .order("asc")
        .collect();

      for (let i = 0; i < remainingWaitlist.length; i++) {
        await ctx.db.patch(remainingWaitlist[i]._id, {
          waitlistPosition: i + 1
        });
      }
    }
  },
});

// Restore cancelled registration
export const restoreRegistration = mutation({
  args: {
    registrationId: v.id("registrations"),
  },
  handler: async (ctx, args) => {
    // Get the registration
    const registration = await ctx.db.get(args.registrationId);
    
    if (!registration) {
      throw new Error("Registration not found");
    }

    if (registration.status !== "cancelled") {
      throw new Error("Registration is not cancelled");
    }

    // Get event details to check participant limit
    const event = await ctx.db.get(registration.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    // Check if event is full
    const currentRegistrations = await ctx.db
      .query("registrations")
      .withIndex("by_eventId_status", (q) => 
        q.eq("eventId", registration.eventId).eq("status", "registered")
      )
      .collect();

    const currentCount = currentRegistrations.length;
    const hasLimit = event.participantLimit && event.participantLimit > 0;
    const isFull = hasLimit && currentCount >= event.participantLimit;

    let status = "registered";
    let waitlistPosition = null;

    if (isFull) {
      // Event is full, add to waitlist
      status = "waitlisted";
      
      // Get waitlist position
      const waitlistRegistrations = await ctx.db
        .query("registrations")
        .withIndex("by_eventId_status", (q) => 
          q.eq("eventId", registration.eventId).eq("status", "waitlisted")
        )
        .collect();
      
      waitlistPosition = waitlistRegistrations.length + 1;
    }

    // Update registration status
    const updateData = {
      status: status
    };
    
    // Only include waitlistPosition if it has a value
    if (waitlistPosition !== null) {
      updateData.waitlistPosition = waitlistPosition;
    }

    await ctx.db.patch(args.registrationId, updateData);

    // Send notification email
    await ctx.scheduler.runAfter(0, internal.emails.sendRegistrationEmail, {
      eventId: registration.eventId,
      registrationId: args.registrationId,
      to: registration.email,
      name: registration.name,
      status: status,
      waitlistPosition: waitlistPosition,
    });
    
    return { success: true, status, waitlistPosition };
  },
});

// Promote waitlisted registration to registered
export const promoteWaitlistedRegistration = mutation({
  args: {
    registrationId: v.id("registrations"),
  },
  handler: async (ctx, args) => {
    // Get the registration
    const registration = await ctx.db.get(args.registrationId);
    
    if (!registration) {
      throw new Error("Registration not found");
    }

    if (registration.status !== "waitlisted") {
      throw new Error("Registration is not waitlisted");
    }

    // Get event details to check participant limit
    const event = await ctx.db.get(registration.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    // Check if event is full
    const currentRegistrations = await ctx.db
      .query("registrations")
      .withIndex("by_eventId_status", (q) => 
        q.eq("eventId", registration.eventId).eq("status", "registered")
      )
      .collect();

    const currentCount = currentRegistrations.length;
    const hasLimit = event.participantLimit && event.participantLimit > 0;
    const isFull = hasLimit && currentCount >= event.participantLimit;

    if (isFull) {
      throw new Error("Event is full. Cannot promote waitlisted registration.");
    }

    // Promote to registered
    await ctx.db.patch(args.registrationId, {
      status: "registered"
    });

    // Send notification email
    await ctx.scheduler.runAfter(0, internal.emails.sendWaitlistPromotionEmail, {
      eventId: registration.eventId,
      registrationId: args.registrationId,
      to: registration.email,
      name: registration.name,
    });

    // Update waitlist positions for remaining waitlisted people
    const remainingWaitlist = await ctx.db
      .query("registrations")
      .withIndex("by_eventId_status", (q) => 
        q.eq("eventId", registration.eventId).eq("status", "waitlisted")
      )
      .order("asc")
      .collect();

    for (let i = 0; i < remainingWaitlist.length; i++) {
      await ctx.db.patch(remainingWaitlist[i]._id, {
        waitlistPosition: i + 1
      });
    }
    
    return { success: true };
  },
});