import { components } from "./_generated/api";
import { Resend } from "@convex-dev/resend";
import { internalMutation, mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

export const resend = new Resend(components.resend, {
  testMode: false, // Set to false for production
});

// Use a verified sender address for test mode
const SENDER_EMAIL = "onboarding@resend.dev"; // Resend's default verified sender

// Define cron jobs for email scheduling
export const crons = cronJobs();

// Process scheduled emails action
export const processScheduledEmails = action({
  handler: async (ctx) => {
    const now = new Date();
    
    // Get all scheduled emails that should be sent now
    const scheduledEmails = await ctx.runQuery(api.emails.getScheduledEmails, {
      currentTime: now.toISOString(),
    });

    // Send each scheduled email
    for (const email of scheduledEmails) {
      try {
        await ctx.runMutation(api.emails.sendScheduledEmail, {
          emailId: email._id,
        });
      } catch (error) {
        console.error(`Failed to send scheduled email ${email._id}:`, error);
      }
    }
  },
});

// Get scheduled emails that should be sent now
export const getScheduledEmails = query({
  args: { currentTime: v.string() },
  handler: async (ctx, args) => {
    const currentTime = new Date(args.currentTime).getTime();
    
    return await ctx.db
      .query("scheduledEmails")
      .filter((q) => q.lte(q.field("scheduledFor"), currentTime))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();
  },
});

// Send a scheduled email
export const sendScheduledEmail = internalMutation({
  args: { emailId: v.id("scheduledEmails") },
  handler: async (ctx, args) => {
    const scheduledEmail = await ctx.db.get(args.emailId);
    if (!scheduledEmail) {
      throw new Error("Scheduled email not found");
    }

    // Get event details
    const event = await ctx.db.get(scheduledEmail.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    // Get registrations
    const registrations = await Promise.all(
      scheduledEmail.registrationIds.map(id => ctx.db.get(id))
    );

    const validRegistrations = registrations.filter(reg => reg !== null);

    if (validRegistrations.length === 0) {
      // Mark as failed if no valid registrations
      await ctx.db.patch(args.emailId, { status: "failed" });
      return;
    }

    // Send emails
    const emailPromises = validRegistrations.map(async (registration) => {
      return await resend.sendEmail(ctx, {
        from: `Event Flow <${SENDER_EMAIL}>`,
        to: registration.email,
        subject: scheduledEmail.subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="margin: 0; font-size: 28px;">Event Update</h1>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333; margin-top: 0;">Hello ${registration.name},</h2>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
                <h3 style="margin-top: 0; color: #333;">Event: ${event.title}</h3>
                <p><strong>Date:</strong> ${new Date(event.date).toLocaleDateString()}</p>
                ${event.location ? `<p><strong>Location:</strong> ${event.location}</p>` : ''}
              </div>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
                <h3 style="margin-top: 0; color: #333;">Message</h3>
                <div style="color: #666; line-height: 1.6;">
                  ${scheduledEmail.content.replace(/\n/g, '<br>')}
                </div>
              </div>
              
              <div style="text-align: center; margin-top: 30px;">
                <p style="color: #999; font-size: 14px;">Best regards,<br>The Event Flow Team</p>
              </div>
            </div>
          </div>
        `,
      });
    });

    try {
      const emailIds = await Promise.all(emailPromises);
      
      // Mark as sent
      await ctx.db.patch(args.emailId, {
        status: "sent",
        sentAt: Date.now(),
        emailIds: emailIds,
      });
    } catch (error) {
      // Mark as failed
      await ctx.db.patch(args.emailId, {
        status: "failed",
        error: error.message,
      });
      throw error;
    }
  },
});

// Schedule an email to be sent later
export const scheduleEmail = mutation({
  args: {
    eventId: v.id("events"),
    registrationIds: v.array(v.id("registrations")),
    subject: v.string(),
    content: v.string(),
    scheduledFor: v.string(), // ISO string
  },
  handler: async (ctx, args) => {
    // Convert the ISO string to UTC timestamp
    // The frontend now sends an ISO string which is already in UTC
    const scheduledDate = new Date(args.scheduledFor);
    const scheduledForTimestamp = scheduledDate.getTime();
    
    const scheduledEmailId = await ctx.db.insert("scheduledEmails", {
      eventId: args.eventId,
      registrationIds: args.registrationIds,
      subject: args.subject,
      content: args.content,
      scheduledFor: scheduledForTimestamp,
      status: "pending",
      createdAt: Date.now(),
    });

    return {
      success: true,
      scheduledEmailId: scheduledEmailId,
      scheduledFor: args.scheduledFor,
    };
  },
});

// Get all scheduled emails for an event
export const getScheduledEmailsForEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("scheduledEmails")
      .filter((q) => q.eq(q.field("eventId"), args.eventId))
      .order("desc")
      .collect();
  },
});

// Cancel a scheduled email
export const cancelScheduledEmail = mutation({
  args: { emailId: v.id("scheduledEmails") },
  handler: async (ctx, args) => {
    const scheduledEmail = await ctx.db.get(args.emailId);
    if (!scheduledEmail) {
      throw new Error("Scheduled email not found");
    }

    if (scheduledEmail.status !== "pending") {
      throw new Error("Cannot cancel email that has already been sent or failed");
    }

    await ctx.db.patch(args.emailId, { status: "cancelled" });
    
    return { success: true };
  },
});

// Send a test email
export const sendTestEmail = internalMutation({
  handler: async (ctx) => {
    await resend.sendEmail(ctx, {
      from: `Event Flow <${SENDER_EMAIL}>`,
      to: "test@resend.dev",
      subject: "Welcome to Event Flow!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Welcome to Event Flow!</h1>
          <p>Thank you for joining our platform. We're excited to help you manage your events.</p>
          <p>Best regards,<br>The Event Flow Team</p>
        </div>
      `,
    });
  },
});

// Send event registration confirmation email
export const sendRegistrationEmail = mutation({
  args: {
    eventId: v.id("events"),
    registrationId: v.id("registrations"),
    to: v.string(),
    name: v.string(),
    status: v.optional(v.string()),
    waitlistPosition: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get event details
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    // Get registration details
    const registration = await ctx.db.get(args.registrationId);
    if (!registration) {
      throw new Error("Registration not found");
    }

    const isWaitlisted = args.status === "waitlisted";
    const subject = isWaitlisted ? `Waitlisted: ${event.title}` : `Registration Confirmed: ${event.title}`;
    const title = isWaitlisted ? "You're on the Waitlist!" : "Registration Confirmed!";
    const message = isWaitlisted 
      ? `Your registration for <strong>${event.title}</strong> has been added to the waitlist. You are currently #${args.waitlistPosition} in line.`
      : `Your registration for <strong>${event.title}</strong> has been confirmed!`;

    const emailId = await resend.sendEmail(ctx, {
      from: `Event Flow <${SENDER_EMAIL}>`,
      to: args.to,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, ${isWaitlisted ? '#ff6b6b' : '#667eea'} 0%, ${isWaitlisted ? '#ee5a24' : '#764ba2'} 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">${title}</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Hello ${args.name},</h2>
            
            <p style="color: #666; line-height: 1.6;">${message}</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${isWaitlisted ? '#ff6b6b' : '#667eea'};">
              <h3 style="margin-top: 0; color: #333;">Event Details</h3>
              <p><strong>Date:</strong> ${new Date(event.date).toLocaleDateString()}</p>
              ${event.location ? `<p><strong>Location:</strong> ${event.location}</p>` : ''}
              ${event.description ? `<p><strong>Description:</strong> ${event.description}</p>` : ''}
              ${isWaitlisted ? `<p><strong>Waitlist Position:</strong> #${args.waitlistPosition}</p>` : ''}
            </div>
            
            <p style="color: #666;">${isWaitlisted ? 'We will notify you if a spot becomes available!' : 'We look forward to seeing you at the event!'}</p>
            
            <div style="text-align: center; margin-top: 30px;">
              <p style="color: #999; font-size: 14px;">Best regards,<br>The Event Flow Team</p>
            </div>
          </div>
        </div>
      `,
    });

    return emailId;
  },
});

// Send event reminder email
export const sendEventReminder = mutation({
  args: {
    eventId: v.id("events"),
    to: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    const emailId = await resend.sendEmail(ctx, {
      from: `Event Flow <${SENDER_EMAIL}>`,
      to: args.to,
      subject: `Reminder: ${event.title} is tomorrow!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">Event Reminder!</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Hello ${args.name},</h2>
            
            <p style="color: #666; line-height: 1.6;">This is a friendly reminder that <strong>${event.title}</strong> is happening tomorrow!</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff6b6b;">
              <h3 style="margin-top: 0; color: #333;">Event Details</h3>
              <p><strong>Date:</strong> ${new Date(event.date).toLocaleDateString()}</p>
              ${event.location ? `<p><strong>Location:</strong> ${event.location}</p>` : ''}
              ${event.description ? `<p><strong>Description:</strong> ${event.description}</p>` : ''}
            </div>
            
            <p style="color: #666;">Don't forget to mark your calendar and set a reminder!</p>
            
            <div style="text-align: center; margin-top: 30px;">
              <p style="color: #999; font-size: 14px;">Best regards,<br>The Event Flow Team</p>
            </div>
          </div>
        </div>
      `,
    });

    return emailId;
  },
});

// Get email status
export const getEmailStatus = query({
  args: { emailId: v.string() },
  handler: async (ctx, args) => {
    return await resend.status(ctx, args.emailId);
  },
});

// Cancel an email
export const cancelEmail = mutation({
  args: { emailId: v.string() },
  handler: async (ctx, args) => {
    return await resend.cancelEmail(ctx, args.emailId);
  },
});

// Send bulk email to all registrants of an event
export const sendBulkEmail = mutation({
  args: {
    eventId: v.id("events"),
    subject: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    // Get event details
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    // Get all registrations for this event
    const registrations = await ctx.db
      .query("registrations")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .collect();

    if (registrations.length === 0) {
      throw new Error("No registrations found for this event");
    }

    // Send email to each registrant (using real email addresses in production mode)
    const emailPromises = registrations.map(async (registration) => {
      const emailId = await resend.sendEmail(ctx, {
        from: `Event Flow <${SENDER_EMAIL}>`,
        to: registration.email, // Use real registration email
        subject: args.subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="margin: 0; font-size: 28px;">Event Update</h1>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333; margin-top: 0;">Hello ${registration.name},</h2>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
                <h3 style="margin-top: 0; color: #333;">Event: ${event.title}</h3>
                <p><strong>Date:</strong> ${new Date(event.date).toLocaleDateString()}</p>
                ${event.location ? `<p><strong>Location:</strong> ${event.location}</p>` : ''}
              </div>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
                <h3 style="margin-top: 0; color: #333;">Message</h3>
                <div style="color: #666; line-height: 1.6;">
                  ${args.content.replace(/\n/g, '<br>')}
                </div>
              </div>
              
              <div style="text-align: center; margin-top: 30px;">
                <p style="color: #999; font-size: 14px;">Best regards,<br>The Event Flow Team</p>
              </div>
            </div>
          </div>
        `,
      });
      return emailId;
    });

    // Wait for all emails to be sent
    const emailIds = await Promise.all(emailPromises);
    
    return {
      success: true,
      emailsSent: registrations.length,
      emailIds: emailIds,
    };
  },
});

// Send email to manually selected registrants
export const sendEmailToSelectedUsers = mutation({
  args: {
    eventId: v.id("events"),
    registrationIds: v.array(v.id("registrations")),
    subject: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    // Get event details
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    if (args.registrationIds.length === 0) {
      throw new Error("No registrations selected");
    }

    // Get selected registrations
    const registrations = await Promise.all(
      args.registrationIds.map(id => ctx.db.get(id))
    );

    // Filter out any null registrations
    const validRegistrations = registrations.filter(reg => reg !== null);

    if (validRegistrations.length === 0) {
      throw new Error("No valid registrations found");
    }

    // Send email to each selected registrant
    const emailPromises = validRegistrations.map(async (registration) => {
      const emailId = await resend.sendEmail(ctx, {
        from: `Event Flow <${SENDER_EMAIL}>`,
        to: registration.email,
        subject: args.subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="margin: 0; font-size: 28px;">Event Update</h1>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333; margin-top: 0;">Hello ${registration.name},</h2>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
                <h3 style="margin-top: 0; color: #333;">Event: ${event.title}</h3>
                <p><strong>Date:</strong> ${new Date(event.date).toLocaleDateString()}</p>
                ${event.location ? `<p><strong>Location:</strong> ${event.location}</p>` : ''}
              </div>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
                <h3 style="margin-top: 0; color: #333;">Message</h3>
                <div style="color: #666; line-height: 1.6;">
                  ${args.content.replace(/\n/g, '<br>')}
                </div>
              </div>
              
              <div style="text-align: center; margin-top: 30px;">
                <p style="color: #999; font-size: 14px;">Best regards,<br>The Event Flow Team</p>
              </div>
            </div>
          </div>
        `,
      });
      return emailId;
    });

    // Wait for all emails to be sent
    const emailIds = await Promise.all(emailPromises);
    
         return {
       success: true,
       emailsSent: validRegistrations.length,
       emailIds: emailIds,
     };
   },
 });

// Send waitlist promotion email
export const sendWaitlistPromotionEmail = internalMutation({
  args: {
    eventId: v.id("events"),
    registrationId: v.id("registrations"),
    to: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    // Get event details
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    const emailId = await resend.sendEmail(ctx, {
      from: `Event Flow <${SENDER_EMAIL}>`,
      to: args.to,
      subject: `Great News! You're In: ${event.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">You're In!</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Hello ${args.name},</h2>
            
            <p style="color: #666; line-height: 1.6;">Great news! A spot has opened up for <strong>${event.title}</strong> and you've been promoted from the waitlist!</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
              <h3 style="margin-top: 0; color: #333;">Event Details</h3>
              <p><strong>Date:</strong> ${new Date(event.date).toLocaleDateString()}</p>
              ${event.location ? `<p><strong>Location:</strong> ${event.location}</p>` : ''}
              ${event.description ? `<p><strong>Description:</strong> ${event.description}</p>` : ''}
            </div>
            
            <p style="color: #666;">Your registration is now confirmed and you're all set to attend the event!</p>
            
            <div style="text-align: center; margin-top: 30px;">
              <p style="color: #999; font-size: 14px;">Best regards,<br>The Event Flow Team</p>
            </div>
          </div>
        </div>
      `,
    });

    return emailId;
  },
});

// Send waitlist promotion email when participant limit is increased
export const sendLimitIncreasePromotionEmail = internalMutation({
  args: {
    eventId: v.id("events"),
    registrationId: v.id("registrations"),
    to: v.string(),
    name: v.string(),
    newLimit: v.number(),
  },
  handler: async (ctx, args) => {
    // Get event details
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    const emailId = await resend.sendEmail(ctx, {
      from: `Event Flow <${SENDER_EMAIL}>`,
      to: args.to,
      subject: `🎉 You're Confirmed: ${event.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">🎉 You're Confirmed!</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Hello ${args.name},</h2>
            
            <p style="color: #666; line-height: 1.6;">Excellent news! The participant limit for <strong>${event.title}</strong> has been increased, and you've been automatically promoted from the waitlist to confirmed registration!</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
              <h3 style="margin-top: 0; color: #333;">Event Details</h3>
              <p><strong>Date:</strong> ${new Date(event.date).toLocaleDateString()}</p>
              ${event.location ? `<p><strong>Location:</strong> ${event.location}</p>` : ''}
              ${event.description ? `<p><strong>Description:</strong> ${event.description}</p>` : ''}
              <p><strong>New Participant Limit:</strong> ${args.newLimit}</p>
            </div>
            
            <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
              <p style="margin: 0; color: #155724; font-weight: 500;">✅ Your registration is now confirmed and you're all set to attend the event!</p>
            </div>
            
            <p style="color: #666;">We're excited to have you join us. See you at the event!</p>
            
            <div style="text-align: center; margin-top: 30px;">
              <p style="color: #999; font-size: 14px;">Best regards,<br>The Event Flow Team</p>
            </div>
          </div>
        </div>
      `,
    });

    return emailId;
  },
});

// Send waitlist notification email when moved to waitlist
export const sendWaitlistNotificationEmail = internalMutation({
  args: {
    eventId: v.id("events"),
    registrationId: v.id("registrations"),
    to: v.string(),
    name: v.string(),
    waitlistPosition: v.number(),
  },
  handler: async (ctx, args) => {
    // Get event details
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    const emailId = await resend.sendEmail(ctx, {
      from: `Event Flow <${SENDER_EMAIL}>`,
      to: args.to,
      subject: `Moved to Waitlist: ${event.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">Moved to Waitlist</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Hello ${args.name},</h2>
            
            <p style="color: #666; line-height: 1.6;">Your registration status for <strong>${event.title}</strong> has been changed from registered to waitlist.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff6b6b;">
              <h3 style="margin-top: 0; color: #333;">Event Details</h3>
              <p><strong>Date:</strong> ${new Date(event.date).toLocaleDateString()}</p>
              ${event.location ? `<p><strong>Location:</strong> ${event.location}</p>` : ''}
              ${event.description ? `<p><strong>Description:</strong> ${event.description}</p>` : ''}
              <p><strong>Waitlist Position:</strong> #${args.waitlistPosition}</p>
            </div>
            
            <p style="color: #666;">We will notify you if a spot becomes available and you are promoted back to registered status.</p>
            
            <div style="text-align: center; margin-top: 30px;">
              <p style="color: #999; font-size: 14px;">Best regards,<br>The Event Flow Team</p>
            </div>
          </div>
        </div>
      `,
    });

    return emailId;
  },
});