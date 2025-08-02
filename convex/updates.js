import { components } from "./_generated/api";
import { Resend } from "@convex-dev/resend";
import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const resend = new Resend(components.resend, {
  testMode: false, // Set to false for production
});

// Use a verified sender address for test mode
const SENDER_EMAIL = "onboarding@resend.dev"; // Resend's default verified sender

// Create a new update
export const createUpdate = mutation({
  args: {
    eventId: v.id("events"),
    title: v.string(),
    content: v.string(),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const updateId = await ctx.db.insert("updates", {
      eventId: args.eventId,
      title: args.title,
      content: args.content,
      status: "draft",
      createdBy: args.createdBy,
      createdAt: Date.now(),
    });

    return updateId;
  },
});

// Get all updates for an event
export const getUpdatesForEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("updates")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .order("desc")
      .collect();
  },
});

// Get all updates created by a user
export const getUpdatesByUser = query({
  args: { createdBy: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("updates")
      .withIndex("by_createdBy", (q) => q.eq("createdBy", args.createdBy))
      .order("desc")
      .collect();
  },
});

// Update an existing update
export const updateUpdate = mutation({
  args: {
    updateId: v.id("updates"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    status: v.optional(v.union(v.literal("draft"), v.literal("published"), v.literal("sent"))),
  },
  handler: async (ctx, args) => {
    const { updateId, ...updateData } = args;
    
    // If status is being changed to published, set publishedAt
    if (updateData.status === "published") {
      updateData.publishedAt = Date.now();
    }

    await ctx.db.patch(updateId, updateData);
    
    return { success: true };
  },
});

// Delete an update
export const deleteUpdate = mutation({
  args: { updateId: v.id("updates") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.updateId);
    return { success: true };
  },
});

// Send update to all event registrants
export const sendUpdateToRegistrants = internalMutation({
  args: { updateId: v.id("updates") },
  handler: async (ctx, args) => {
    const update = await ctx.db.get(args.updateId);
    if (!update) {
      throw new Error("Update not found");
    }

    // Get event details
    const event = await ctx.db.get(update.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    // Get all registrations for this event
    const registrations = await ctx.db
      .query("registrations")
      .withIndex("by_eventId", (q) => q.eq("eventId", update.eventId))
      .collect();

    if (registrations.length === 0) {
      // Mark as failed if no registrations
      await ctx.db.patch(args.updateId, { 
        status: "failed",
        error: "No registrations found for this event"
      });
      return;
    }

    // Send emails to all registrants
    const emailPromises = registrations.map(async (registration) => {
      return await resend.sendEmail(ctx, {
        from: `Event Flow <${SENDER_EMAIL}>`,
        to: registration.email,
        subject: `Event Update: ${update.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="margin: 0; font-size: 28px;">Event Update</h1>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333; margin-top: 0;">Hello ${registration.name},</h2>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
                <h3 style="margin-top: 0; color: #333;">Event: ${event.title}</h3>
                <p><strong>Date:</strong> ${new Date(event.date).toLocaleDateString()}</p>
                ${event.location ? `<p><strong>Location:</strong> ${event.location}</p>` : ''}
              </div>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
                <h3 style="margin-top: 0; color: #333;">${update.title}</h3>
                <div style="color: #666; line-height: 1.6;">
                  ${update.content.replace(/\n/g, '<br>')}
                </div>
              </div>
              
              <div style="text-align: center; margin-top: 30px;">
                <p style="color: #999; font-size: 14px;">Best regards,<br>The Event Flow Team</p>
              </div>
            </div>
          </div>
        `,
      });
    });

    try {
      const emailIds = await Promise.all(emailPromises);
      
      // Mark as sent
      await ctx.db.patch(args.updateId, {
        status: "sent",
        sentAt: Date.now(),
        emailIds: emailIds,
      });
    } catch (error) {
      // Mark as failed
      await ctx.db.patch(args.updateId, {
        status: "failed",
        error: error.message,
      });
      throw error;
    }
  },
});

// Publish and send update
export const publishAndSendUpdate = mutation({
  args: { updateId: v.id("updates") },
  handler: async (ctx, args) => {
    // First, mark as published
    await ctx.db.patch(args.updateId, {
      status: "published",
      publishedAt: Date.now(),
    });

    // Then send to all registrants
    await ctx.runMutation(api.updates.sendUpdateToRegistrants, {
      updateId: args.updateId,
    });

    return { success: true };
  },
});

// Get update statistics
export const getUpdateStats = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const updates = await ctx.db
      .query("updates")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .collect();

    const stats = {
      total: updates.length,
      draft: updates.filter(u => u.status === "draft").length,
      published: updates.filter(u => u.status === "published").length,
      sent: updates.filter(u => u.status === "sent").length,
      failed: updates.filter(u => u.status === "failed").length,
    };

    return stats;
  },
}); 