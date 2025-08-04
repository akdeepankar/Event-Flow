import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  events: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    date: v.string(),
    location: v.optional(v.string()),
    headerImage: v.optional(v.string()),
    participantLimit: v.optional(v.number()), // Maximum number of participants
    registrationClosed: v.optional(v.boolean()), // Whether registration is closed
    createdBy: v.string(), // Clerk user ID
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_createdBy", ["createdBy"]),
  
  users: defineTable({
    clerkId: v.string(), // User's email address (used as unique identifier)
    name: v.string(),
    email: v.string(),
    razorpayKeyId: v.optional(v.string()),
    razorpayKeySecret: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_clerkId", ["clerkId"]).index("by_email", ["email"]),
  
  files: defineTable({
    storageId: v.string(),
    name: v.string(),
    contentType: v.string(),
    size: v.number(),
    uploadedAt: v.number(),
    uploadedBy: v.optional(v.string()), // Clerk user ID
  }).index("by_storageId", ["storageId"]),
  
  digitalProducts: defineTable({
    eventId: v.id("events"),
    name: v.string(),
    description: v.optional(v.string()),
    price: v.number(), // Price in cents
    fileStorageId: v.string(), // Reference to the file in storage
    fileName: v.string(),
    fileSize: v.number(),
    fileType: v.string(),
    downloads: v.optional(v.number()), // Number of downloads
    createdBy: v.string(), // Clerk user ID
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_eventId", ["eventId"]).index("by_createdBy", ["createdBy"]),

  payments: defineTable({
    productId: v.id("digitalProducts"),
    eventId: v.optional(v.id("events")), // Made optional for existing records
    customerName: v.string(),
    customerEmail: v.string(),
    amount: v.number(), // Amount in cents
    currency: v.string(),
    paymentLinkId: v.string(),
    paymentLinkUrl: v.string(),
    status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed")),
    emailSent: v.optional(v.boolean()),
    emailSentAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_productId", ["productId"]).index("by_eventId", ["eventId"]).index("by_status", ["status"]).index("by_eventId_status", ["eventId", "status"]),
  
  registrations: defineTable({
    eventId: v.id("events"),
    name: v.string(),
    email: v.string(),
    status: v.union(v.literal("registered"), v.literal("waitlisted"), v.literal("cancelled")),
    waitlistPosition: v.optional(v.number()), // Position in waitlist (1-based)
    registeredAt: v.number(),
  }).index("by_eventId", ["eventId"]).index("by_eventId_status", ["eventId", "status"]),

  scheduledEmails: defineTable({
    eventId: v.id("events"),
    registrationIds: v.array(v.id("registrations")),
    subject: v.string(),
    content: v.string(),
    scheduledFor: v.number(), // Unix timestamp
    status: v.union(v.literal("pending"), v.literal("sent"), v.literal("failed"), v.literal("cancelled")),
    createdAt: v.number(),
    sentAt: v.optional(v.number()),
    emailIds: v.optional(v.array(v.string())),
    error: v.optional(v.string()),
  }).index("by_eventId", ["eventId"]).index("by_status", ["status"]).index("by_scheduledFor", ["scheduledFor"]),

  updates: defineTable({
    eventId: v.id("events"),
    title: v.string(),
    content: v.string(),
    status: v.union(v.literal("draft"), v.literal("published"), v.literal("sent")),
    createdBy: v.string(), // Clerk user ID
    createdAt: v.number(),
    publishedAt: v.optional(v.number()),
    sentAt: v.optional(v.number()),
    emailIds: v.optional(v.array(v.string())),
    error: v.optional(v.string()),
  }).index("by_eventId", ["eventId"]).index("by_status", ["status"]).index("by_createdBy", ["createdBy"]),

  // Sales analytics table for tracking product-wise sales
  salesAnalytics: defineTable({
    eventId: v.id("events"),
    productId: v.id("digitalProducts"),
    productName: v.string(),
    totalSales: v.number(), // Total amount in cents
    totalUnits: v.number(), // Total number of units sold
    customerCount: v.number(), // Number of unique customers
    customers: v.array(v.object({
      customerName: v.string(),
      customerEmail: v.string(),
      purchaseDate: v.number(),
      amount: v.number(),
      paymentId: v.id("payments"),
    })),
    lastSaleDate: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_eventId", ["eventId"]).index("by_productId", ["productId"]).index("by_eventId_productId", ["eventId", "productId"]),
}); 