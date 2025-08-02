import { mutation } from "./_generated/server";

// Migration to add status field to existing registrations
export const migrateRegistrations = mutation({
  args: {},
  handler: async (ctx) => {
    // Get all existing registrations
    const registrations = await ctx.db.query("registrations").collect();
    
    // Update each registration to have "registered" status
    for (const registration of registrations) {
      await ctx.db.patch(registration._id, {
        status: "registered"
      });
    }
    
    return { updated: registrations.length };
  },
});

// Migration to add participant limits to existing events (optional)
export const addParticipantLimits = mutation({
  args: {},
  handler: async (ctx) => {
    // Get all existing events
    const events = await ctx.db.query("events").collect();
    
    // Update each event to have no participant limit (null)
    for (const event of events) {
      await ctx.db.patch(event._id, {
        participantLimit: null
      });
    }
    
    return { updated: events.length };
  },
}); 