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
    userEmail: v.string(),
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
    
    await ctx.db.patch(id, {
      ...updateData,
      updatedAt: now,
    });
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