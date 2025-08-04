import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new digital product
export const createDigitalProduct = mutation({
  args: {
    eventId: v.id("events"),
    name: v.string(),
    description: v.optional(v.string()),
    price: v.number(), // Price in cents
    fileStorageId: v.string(),
    fileName: v.string(),
    fileSize: v.number(),
    fileType: v.string(),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const productId = await ctx.db.insert("digitalProducts", {
      ...args,
      downloads: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return productId;
  },
});

// Get all digital products for an event
export const getEventDigitalProducts = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("digitalProducts")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .order("desc")
      .collect();
  },
});

// Get a single digital product by ID
export const getDigitalProductById = query({
  args: { id: v.id("digitalProducts") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Update a digital product
export const updateDigitalProduct = mutation({
  args: {
    id: v.id("digitalProducts"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    fileStorageId: v.optional(v.string()),
    fileName: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    fileType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Delete a digital product
export const deleteDigitalProduct = mutation({
  args: { 
    id: v.id("digitalProducts"),
    fileStorageId: v.string(),
  },
  handler: async (ctx, args) => {
    // Delete the file from storage
    await ctx.storage.delete(args.fileStorageId);
    
    // Delete the product from database
    await ctx.db.delete(args.id);
  },
});

// Get all digital products created by a user
export const getUserDigitalProducts = query({
  args: { createdBy: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("digitalProducts")
      .withIndex("by_createdBy", (q) => q.eq("createdBy", args.createdBy))
      .order("desc")
      .collect();
  },
});

// Update product downloads count
export const updateProductDownloads = mutation({
  args: {
    productId: v.id("digitalProducts"),
    downloads: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.productId, {
      downloads: args.downloads,
      updatedAt: Date.now(),
    });
  },
}); 