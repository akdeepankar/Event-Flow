import { cronJobs } from "convex/server";
import { components, internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";

const crons = cronJobs();

// Clean up old emails every hour
crons.interval(
  "Remove old emails from the resend component",
  { hours: 1 },
  internal.crons.cleanupResend
);

// Send event reminders daily
crons.interval(
  "Send event reminders",
  { hours: 24 },
  internal.crons.sendEventReminders
);

// Process scheduled emails every minute
crons.interval(
  "Process scheduled emails",
  { minutes: 1 },
  internal.emails.processScheduledEmails
);

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export const cleanupResend = internalMutation({
  args: {},
  handler: async (ctx) => {
    await ctx.scheduler.runAfter(0, components.resend.lib.cleanupOldEmails, {
      olderThan: ONE_WEEK_MS,
    });
    await ctx.scheduler.runAfter(
      0,
      components.resend.lib.cleanupAbandonedEmails,
      // These generally indicate a bug, so keep them around for longer.
      { olderThan: 4 * ONE_WEEK_MS }
    );
  },
});

export const sendEventReminders = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Get all events happening tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const events = await ctx.db
      .query("events")
      .filter((q) => q.eq(q.field("date"), tomorrowStr))
      .collect();

    for (const event of events) {
      // Get all registrations for this event
      const registrations = await ctx.db
        .query("registrations")
        .withIndex("by_eventId", (q) => q.eq("eventId", event._id))
        .collect();

      // Send reminder emails to all registrants
      for (const registration of registrations) {
        await ctx.scheduler.runAfter(0, internal.emails.sendEventReminder, {
          eventId: event._id,
          to: registration.email,
          name: registration.name,
        });
      }
    }
  },
});

export default crons; 