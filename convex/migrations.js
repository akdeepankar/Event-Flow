import { internalMutation } from "./_generated/server";

// Migration to handle existing data with missing fields
export const migrateExistingData = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Get all events and ensure they have the headerImage field
    const events = await ctx.db.query("events").collect();
    
    for (const event of events) {
      if (!event.headerImage) {
        await ctx.db.patch(event._id, {
          headerImage: undefined
        });
      }
    }

    // Get all files and ensure they have the uploadedBy field
    const files = await ctx.db.query("files").collect();
    
    for (const file of files) {
      if (!file.uploadedBy) {
        await ctx.db.patch(file._id, {
          uploadedBy: undefined
        });
      }
    }

    console.log("Migration completed successfully");
  },
}); 