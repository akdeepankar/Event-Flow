import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Generate upload URL for file upload
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Save file metadata to database
export const saveFileMetadata = mutation({
  args: {
    name: v.string(),
    storageId: v.string(),
    contentType: v.string(),
    size: v.number(),
    uploadedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const fileId = await ctx.db.insert("files", {
      ...args,
      uploadedAt: Date.now(),
    });
    return fileId;
  },
});

// Get file by ID
export const getFileById = query({
  args: { id: v.id("files") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get file URL by storage ID
export const getFileUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    if (!args.storageId || args.storageId === "") {
      return null;
    }
    return await ctx.storage.getUrl(args.storageId);
  },
});

// Delete file
export const deleteFile = mutation({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    await ctx.storage.delete(args.storageId);
  },
}); 