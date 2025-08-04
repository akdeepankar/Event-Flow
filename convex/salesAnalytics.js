import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Update sales analytics when a payment is completed
export const updateSalesAnalytics = mutation({
  args: {
    paymentId: v.id("payments"),
  },
  handler: async (ctx, args) => {
    try {
      // Get payment details
      const payment = await ctx.db.get(args.paymentId);
      if (!payment || payment.status !== "completed") {
        return { success: false, error: "Payment not found or not completed" };
      }

      // Get product details
      const product = await ctx.db.get(payment.productId);
      if (!product) {
        return { success: false, error: "Product not found" };
      }

             // Check if sales analytics record exists for this product
       const existingAnalytics = await ctx.db
         .query("salesAnalytics")
         .withIndex("by_eventId_productId", (q) => 
           q.eq("eventId", payment.eventId || product.eventId).eq("productId", payment.productId)
         )
         .first();

      const customerData = {
        customerName: payment.customerName,
        customerEmail: payment.customerEmail,
        purchaseDate: payment.updatedAt || payment.createdAt,
        amount: payment.amount,
        paymentId: payment._id,
      };

      if (existingAnalytics) {
        // Update existing analytics
        const updatedCustomers = [...existingAnalytics.customers, customerData];
        const totalSales = existingAnalytics.totalSales + payment.amount;
        const totalUnits = existingAnalytics.totalUnits + 1;
        
        // Count unique customers
        const uniqueEmails = new Set(updatedCustomers.map(c => c.customerEmail));
        const customerCount = uniqueEmails.size;

        await ctx.db.patch(existingAnalytics._id, {
          totalSales,
          totalUnits,
          customerCount,
          customers: updatedCustomers,
          lastSaleDate: customerData.purchaseDate,
          updatedAt: Date.now(),
        });

        return { 
          success: true, 
          analyticsId: existingAnalytics._id,
          message: "Sales analytics updated successfully" 
        };
      } else {
                 // Create new analytics record
         const analyticsId = await ctx.db.insert("salesAnalytics", {
           eventId: payment.eventId || product.eventId,
           productId: payment.productId,
           productName: product.name,
           totalSales: payment.amount,
           totalUnits: 1,
           customerCount: 1,
           customers: [customerData],
           lastSaleDate: customerData.purchaseDate,
           createdAt: Date.now(),
           updatedAt: Date.now(),
         });

        return { 
          success: true, 
          analyticsId,
          message: "Sales analytics created successfully" 
        };
      }
    } catch (error) {
      console.error("Error updating sales analytics:", error);
      return { success: false, error: error.message };
    }
  },
});

// Delete sales analytics for a specific product
export const deleteSalesAnalytics = mutation({
  args: {
    productId: v.id("digitalProducts"),
  },
  handler: async (ctx, args) => {
    try {
      // Find and delete all sales analytics records for this product
      const analyticsRecords = await ctx.db
        .query("salesAnalytics")
        .withIndex("by_productId", (q) => q.eq("productId", args.productId))
        .collect();

      // Delete each analytics record
      for (const record of analyticsRecords) {
        await ctx.db.delete(record._id);
      }

      return { 
        success: true, 
        deletedCount: analyticsRecords.length,
        message: `Deleted ${analyticsRecords.length} sales analytics record(s) for the product` 
      };
    } catch (error) {
      console.error("Error deleting sales analytics:", error);
      return { success: false, error: error.message };
    }
  },
});

// Get sales analytics for a specific event
export const getEventSalesAnalytics = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    try {
      const analytics = await ctx.db
        .query("salesAnalytics")
        .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
        .collect();

      return analytics;
    } catch (error) {
      console.error("Error fetching event sales analytics:", error);
      return [];
    }
  },
});

// Get sales analytics for a specific product
export const getProductSalesAnalytics = query({
  args: { productId: v.id("digitalProducts") },
  handler: async (ctx, args) => {
    try {
      const analytics = await ctx.db
        .query("salesAnalytics")
        .withIndex("by_productId", (q) => q.eq("productId", args.productId))
        .first();

      return analytics;
    } catch (error) {
      console.error("Error fetching product sales analytics:", error);
      return null;
    }
  },
});

// Get all sales analytics for a user's events
export const getUserSalesAnalytics = query({
  args: { userEmail: v.string() },
  handler: async (ctx, args) => {
    try {
      // Get all events created by the user
      const events = await ctx.db
        .query("events")
        .withIndex("by_createdBy", (q) => q.eq("createdBy", args.userEmail))
        .collect();

      const eventIds = events.map(event => event._id);
      
      // Get sales analytics for all user's events
      const allAnalytics = [];
      for (const eventId of eventIds) {
        const analytics = await ctx.db
          .query("salesAnalytics")
          .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
          .collect();
        allAnalytics.push(...analytics);
      }

      return allAnalytics;
    } catch (error) {
      console.error("Error fetching user sales analytics:", error);
      return [];
    }
  },
});

// Get detailed sales report for an event
export const getEventSalesReport = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    try {
      // Get all sales analytics for the event
      const analytics = await ctx.db
        .query("salesAnalytics")
        .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
        .collect();

      // Calculate totals
      const totalRevenue = analytics.reduce((sum, item) => sum + item.totalSales, 0);
      const totalUnits = analytics.reduce((sum, item) => sum + item.totalUnits, 0);
      const totalCustomers = analytics.reduce((sum, item) => sum + item.customerCount, 0);

      // Get all unique customers across all products
      const allCustomers = new Set();
      analytics.forEach(item => {
        item.customers.forEach(customer => {
          allCustomers.add(customer.customerEmail);
        });
      });

      return {
        eventId: args.eventId,
        products: analytics,
        summary: {
          totalRevenue,
          totalUnits,
          totalCustomers: allCustomers.size,
          productCount: analytics.length,
        }
      };
    } catch (error) {
      console.error("Error fetching event sales report:", error);
      return null;
    }
  },
}); 