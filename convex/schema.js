import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  events: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    date: v.string(),
    location: v.optional(v.string()),
    headerImage: v.optional(v.string()),
    createdBy: v.string(), // Clerk user ID
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_createdBy", ["createdBy"]),
  
  users: defineTable({
    clerkId: v.string(), // Clerk user ID
    name: v.string(),
    email: v.string(),
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
  
  registrations: defineTable({
    eventId: v.id("events"),
    name: v.string(),
    email: v.string(),
    registeredAt: v.number(),
  }).index("by_eventId", ["eventId"]),

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
}); 