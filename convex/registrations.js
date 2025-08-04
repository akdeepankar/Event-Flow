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
    // Get event details to check participant limit
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      return; // Event not found, skip promotion
    }

    // Check if event is full
    const currentRegistrations = await ctx.db
      .query("registrations")
      .withIndex("by_eventId_status", (q) => 
        q.eq("eventId", args.eventId).eq("status", "registered")
      )
      .collect();

    const currentCount = currentRegistrations.length;
    const hasLimit = event.participantLimit && event.participantLimit > 0;
    const isFull = hasLimit && currentCount >= event.participantLimit;

    if (isFull) {
      return; // Event is full, cannot promote
    }

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
      return { 
        success: false, 
        error: "Event is full. Cannot promote waitlisted registration.",
        currentCount,
        participantLimit: event.participantLimit
      };
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

// Internal function to promote waitlisted participants when participant limit is increased
export const promoteWaitlistedOnLimitIncrease = internalMutation({
  args: {
    eventId: v.id("events"),
    newLimit: v.number(),
    oldLimit: v.number(),
  },
  handler: async (ctx, args) => {
    // Get current registered count
    const currentRegistrations = await ctx.db
      .query("registrations")
      .withIndex("by_eventId_status", (q) => 
        q.eq("eventId", args.eventId).eq("status", "registered")
      )
      .collect();

    const currentRegisteredCount = currentRegistrations.length;
    const availableSpots = args.newLimit - currentRegisteredCount;
    
    if (availableSpots <= 0) {
      return; // No spots available
    }

    // Get waitlisted participants ordered by registration time (first come, first serve)
    const waitlistedRegistrations = await ctx.db
      .query("registrations")
      .withIndex("by_eventId_status", (q) => 
        q.eq("eventId", args.eventId).eq("status", "waitlisted")
      )
      .order("asc") // Order by registration time (earliest first)
      .collect();

    // Promote participants up to the available spots
    const participantsToPromote = Math.min(availableSpots, waitlistedRegistrations.length);
    
    for (let i = 0; i < participantsToPromote; i++) {
      const registration = waitlistedRegistrations[i];
      
      // Promote to registered
      await ctx.db.patch(registration._id, {
        status: "registered",
        waitlistPosition: null // Clear waitlist position
      });

      // Send promotion email
      await ctx.scheduler.runAfter(0, internal.emails.sendLimitIncreasePromotionEmail, {
        eventId: args.eventId,
        registrationId: registration._id,
        to: registration.email,
        name: registration.name,
        newLimit: args.newLimit,
      });
    }

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
  },
});

// Mutation to promote waitlisted participants till the event limit
export const promoteWaitlistedTillLimit = mutation({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    // Get event details to check participant limit
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    // Check if event has a participant limit
    if (!event.participantLimit || event.participantLimit <= 0) {
      return { 
        success: false, 
        error: "Event has no participant limit set",
        promotedCount: 0
      };
    }

    // Get current registered count
    const currentRegistrations = await ctx.db
      .query("registrations")
      .withIndex("by_eventId_status", (q) => 
        q.eq("eventId", args.eventId).eq("status", "registered")
      )
      .collect();

    const currentRegisteredCount = currentRegistrations.length;
    const availableSpots = event.participantLimit - currentRegisteredCount;
    
    if (availableSpots <= 0) {
      return { 
        success: false, 
        error: "Event is already at full capacity",
        promotedCount: 0,
        currentCount: currentRegisteredCount,
        participantLimit: event.participantLimit
      };
    }

    // Get waitlisted participants ordered by registration time (first come, first serve)
    const waitlistedRegistrations = await ctx.db
      .query("registrations")
      .withIndex("by_eventId_status", (q) => 
        q.eq("eventId", args.eventId).eq("status", "waitlisted")
      )
      .order("asc") // Order by registration time (earliest first)
      .collect();

    if (waitlistedRegistrations.length === 0) {
      return { 
        success: false, 
        error: "No waitlisted participants to promote",
        promotedCount: 0
      };
    }

    // Promote participants up to the available spots
    const participantsToPromote = Math.min(availableSpots, waitlistedRegistrations.length);
    
    for (let i = 0; i < participantsToPromote; i++) {
      const registration = waitlistedRegistrations[i];
      
      // Promote to registered
      await ctx.db.patch(registration._id, {
        status: "registered",
        waitlistPosition: null // Clear waitlist position
      });

      // Send promotion email
      await ctx.scheduler.runAfter(0, internal.emails.sendWaitlistPromotionEmail, {
        eventId: args.eventId,
        registrationId: registration._id,
        to: registration.email,
        name: registration.name,
      });
    }

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

    return { 
      success: true,
      promotedCount: participantsToPromote 
    };
  },
});

// Mutation to move a registered participant to waitlist
export const moveToWaitlist = mutation({
  args: {
    registrationId: v.id("registrations"),
  },
  handler: async (ctx, args) => {
    // Get the registration
    const registration = await ctx.db.get(args.registrationId);
    
    if (!registration) {
      throw new Error("Registration not found");
    }

    if (registration.status !== "registered") {
      throw new Error("Registration is not in registered status");
    }

    // Get current waitlist count to determine new position
    const waitlistRegistrations = await ctx.db
      .query("registrations")
      .withIndex("by_eventId_status", (q) => 
        q.eq("eventId", registration.eventId).eq("status", "waitlisted")
      )
      .collect();
    
    const newWaitlistPosition = waitlistRegistrations.length + 1;

    // Move to waitlist
    await ctx.db.patch(args.registrationId, {
      status: "waitlisted",
      waitlistPosition: newWaitlistPosition
    });

    // Send notification email
    await ctx.scheduler.runAfter(0, internal.emails.sendWaitlistNotificationEmail, {
      eventId: registration.eventId,
      registrationId: args.registrationId,
      to: registration.email,
      name: registration.name,
      waitlistPosition: newWaitlistPosition,
    });

    // Promote someone from waitlist if there are people waiting
    if (waitlistRegistrations.length > 0) {
      await ctx.scheduler.runAfter(0, internal.registrations.promoteFromWaitlist, {
        eventId: registration.eventId
      });
    }
    
    return { waitlistPosition: newWaitlistPosition };
  },
});