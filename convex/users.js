import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get user by email (clerkId field stores email)
export const getUserByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();
  },
});

// Get user by email
export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

// Create or update user
export const upsertUser = mutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existingUser) {
      return await ctx.db.patch(existingUser._id, {
        name: args.name,
        email: args.email,
      });
    } else {
      return await ctx.db.insert("users", {
        ...args,
        createdAt: Date.now(),
      });
    }
  },
});

// Update user's Razorpay credentials
export const updateRazorpayCredentials = mutation({
  args: {
    clerkId: v.string(), // User's email address
    razorpayKeyId: v.string(),
    razorpayKeySecret: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    return await ctx.db.patch(user._id, {
      razorpayKeyId: args.razorpayKeyId,
      razorpayKeySecret: args.razorpayKeySecret,
    });
  },
});

// Get user's Razorpay credentials
export const getRazorpayCredentials = query({
  args: { clerkId: v.string() }, // User's email address
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      return null;
    }

    return {
      razorpayKeyId: user.razorpayKeyId,
      razorpayKeySecret: user.razorpayKeySecret,
    };
  },
}); 