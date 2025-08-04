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

// Migration to add eventId to existing payment records
export const migratePaymentEventIds = mutation({
  args: {},
  handler: async (ctx) => {
    try {
      // Get all payment records that don't have eventId
      const payments = await ctx.db
        .query("payments")
        .filter((q) => q.eq(q.field("eventId"), undefined))
        .collect();

      console.log(`Found ${payments.length} payment records without eventId`);

      let updatedCount = 0;
      let errorCount = 0;

      for (const payment of payments) {
        try {
          // Get the product to find the eventId
          const product = await ctx.db.get(payment.productId);
          if (product && product.eventId) {
            // Update the payment record with the eventId
            await ctx.db.patch(payment._id, {
              eventId: product.eventId,
              updatedAt: Date.now(),
            });
            updatedCount++;
            console.log(`Updated payment ${payment._id} with eventId ${product.eventId}`);
          } else {
            console.error(`Product not found or missing eventId for payment ${payment._id}`);
            errorCount++;
          }
        } catch (error) {
          console.error(`Error updating payment ${payment._id}:`, error);
          errorCount++;
        }
      }

      return {
        success: true,
        message: `Migration completed. Updated: ${updatedCount}, Errors: ${errorCount}`,
        updatedCount,
        errorCount,
      };
    } catch (error) {
      console.error("Migration error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  },
}); 