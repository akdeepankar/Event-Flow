import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Resend } from "@convex-dev/resend";
import { components } from "./_generated/api";

export const resend = new Resend(components.resend, {
  testMode: false, // Set to false for production
});

// Use a verified sender address for test mode
const SENDER_EMAIL = "onboarding@resend.dev";

// Generate a unique 6-digit alphanumeric pass code
function generatePassCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Generate a pass for a specific registration
export const generatePass = mutation({
  args: {
    eventId: v.id("events"),
    registrationId: v.id("registrations"),
    attendeeName: v.string(),
    attendeeEmail: v.string(),
    generatedBy: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if a pass already exists for this registration
    const existingPass = await ctx.db
      .query("passes")
      .withIndex("by_registrationId", (q) => q.eq("registrationId", args.registrationId))
      .first();

    if (existingPass) {
      throw new Error("A pass already exists for this registration");
    }

    // Generate a unique pass code
    let passCode;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      passCode = generatePassCode();
      const existingPassWithCode = await ctx.db
        .query("passes")
        .withIndex("by_passCode", (q) => q.eq("passCode", passCode))
        .first();
      
      if (!existingPassWithCode) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      throw new Error("Unable to generate unique pass code");
    }

    // Create the pass
    const passId = await ctx.db.insert("passes", {
      eventId: args.eventId,
      registrationId: args.registrationId,
      passCode: passCode,
      attendeeName: args.attendeeName,
      attendeeEmail: args.attendeeEmail,
      status: "active",
      generatedAt: Date.now(),
      generatedBy: args.generatedBy,
    });

    return { passId, passCode };
  },
});

// Generate passes for all registered users of an event
export const generatePassesForAllRegistered = mutation({
  args: {
    eventId: v.id("events"),
    generatedBy: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all registered users for this event
    const registrations = await ctx.db
      .query("registrations")
      .withIndex("by_eventId_status", (q) => 
        q.eq("eventId", args.eventId).eq("status", "registered")
      )
      .collect();

    const results = [];
    const errors = [];

    for (const registration of registrations) {
      try {
        // Check if pass already exists
        const existingPass = await ctx.db
          .query("passes")
          .withIndex("by_registrationId", (q) => q.eq("registrationId", registration._id))
          .first();

        if (existingPass) {
          results.push({
            registrationId: registration._id,
            attendeeName: registration.name,
            attendeeEmail: registration.email,
            status: "already_exists",
            passCode: existingPass.passCode,
          });
          continue;
        }

        // Generate unique pass code
        let passCode;
        let isUnique = false;
        let attempts = 0;
        const maxAttempts = 10;

        while (!isUnique && attempts < maxAttempts) {
          passCode = generatePassCode();
          const existingPassWithCode = await ctx.db
            .query("passes")
            .withIndex("by_passCode", (q) => q.eq("passCode", passCode))
            .first();
          
          if (!existingPassWithCode) {
            isUnique = true;
          }
          attempts++;
        }

        if (!isUnique) {
          errors.push({
            registrationId: registration._id,
            attendeeName: registration.name,
            attendeeEmail: registration.email,
            error: "Unable to generate unique pass code",
          });
          continue;
        }

        // Create the pass
        const passId = await ctx.db.insert("passes", {
          eventId: args.eventId,
          registrationId: registration._id,
          passCode: passCode,
          attendeeName: registration.name,
          attendeeEmail: registration.email,
          status: "active",
          generatedAt: Date.now(),
          generatedBy: args.generatedBy,
        });

        results.push({
          registrationId: registration._id,
          attendeeName: registration.name,
          attendeeEmail: registration.email,
          status: "generated",
          passCode: passCode,
          passId: passId,
        });
      } catch (error) {
        errors.push({
          registrationId: registration._id,
          attendeeName: registration.name,
          attendeeEmail: registration.email,
          error: error.message,
        });
      }
    }

         return {
       totalRegistrations: registrations.length,
       generated: results.filter(r => r.status === "generated").length,
       alreadyExists: results.filter(r => r.status === "already_exists").length,
       errorCount: errors.length,
       results,
       errors,
     };
  },
});

// Get passes for an event
export const getEventPasses = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const passes = await ctx.db
      .query("passes")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .collect();

    return passes;
  },
});

// Get pass for a specific registration
export const getPassForRegistration = query({
  args: {
    registrationId: v.id("registrations"),
  },
  handler: async (ctx, args) => {
    const pass = await ctx.db
      .query("passes")
      .withIndex("by_registrationId", (q) => q.eq("registrationId", args.registrationId))
      .first();

    return pass;
  },
});

// Mark a pass as used
export const markPassAsUsed = mutation({
  args: {
    passId: v.id("passes"),
  },
  handler: async (ctx, args) => {
    const pass = await ctx.db.get(args.passId);
    if (!pass) {
      throw new Error("Pass not found");
    }

    if (pass.status !== "active") {
      throw new Error("Pass is not active");
    }

    await ctx.db.patch(args.passId, {
      status: "used",
      usedAt: Date.now(),
    });

    return { success: true };
  },
});

// Validate a pass code
export const validatePassCode = query({
  args: {
    passCode: v.string(),
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const pass = await ctx.db
      .query("passes")
      .withIndex("by_passCode", (q) => q.eq("passCode", args.passCode))
      .first();

    if (!pass) {
      return { valid: false, error: "Pass not found" };
    }

    if (pass.eventId !== args.eventId) {
      return { valid: false, error: "Pass is not valid for this event" };
    }

    if (pass.status !== "active") {
      return { 
        valid: false, 
        error: pass.status === "used" ? "Pass has already been used" : "Pass has expired" 
      };
    }

    return {
      valid: true,
      pass: {
        id: pass._id,
        attendeeName: pass.attendeeName,
        attendeeEmail: pass.attendeeEmail,
        generatedAt: pass.generatedAt,
      },
    };
  },
});

// Delete a pass
export const deletePass = mutation({
  args: {
    passId: v.id("passes"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.passId);
    return { success: true };
  },
});

// Send pass via email
export const sendPassEmail = mutation({
  args: {
    passId: v.id("passes"),
    eventTitle: v.string(),
    eventDate: v.string(),
    eventLocation: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const pass = await ctx.db.get(args.passId);
    if (!pass) {
      throw new Error("Pass not found");
    }

    // Get event details
    const event = await ctx.db.get(pass.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    // Prepare email content
    const emailContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Your Event Pass - ${args.eventTitle}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px; }
          .pass-card { background: white; padding: 30px; margin: 20px 0; border-radius: 10px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border: 2px solid #667eea; }
          .pass-code { font-size: 48px; font-weight: bold; color: #667eea; font-family: monospace; letter-spacing: 4px; margin: 20px 0; }
          .event-details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; padding: 20px; background: #ecf0f1; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎫 Your Event Pass</h1>
            <h2>${args.eventTitle}</h2>
          </div>

          <div class="pass-card">
            <h3>Your Unique Pass Code</h3>
            <div class="pass-code">${pass.passCode}</div>
            <p><strong>Attendee:</strong> ${pass.attendeeName}</p>
            <p><strong>Email:</strong> ${pass.attendeeEmail}</p>
          </div>

          <div class="event-details">
            <h3>Event Details</h3>
            <p><strong>Event:</strong> ${args.eventTitle}</p>
            <p><strong>Date:</strong> ${args.eventDate}</p>
            ${args.eventLocation ? `<p><strong>Location:</strong> ${args.eventLocation}</p>` : ''}
            <p><strong>Status:</strong> <span style="color: #28a745; font-weight: bold;">✓ Active</span></p>
          </div>

          <div class="footer">
            <p><strong>Important:</strong> Please keep this pass code safe. You'll need it to enter the event.</p>
            <p>This pass is valid for one-time use only.</p>
            <p>Generated by Event Flow</p>
          </div>
        </div>
      </body>
      </html>
    `;

         // Send email using Convex Resend component
     const emailId = await resend.sendEmail(ctx, {
       from: `Event Flow <${SENDER_EMAIL}>`,
       to: pass.attendeeEmail,
       subject: `Your Event Pass - ${args.eventTitle}`,
       html: emailContent,
     });

    return { 
      success: true, 
      message: 'Pass email sent successfully',
      recipient: pass.attendeeEmail,
      passCode: pass.passCode
    };
     },
 });
 
 // Send passes to all registered users of an event
 export const sendPassesToAllRegistered = mutation({
   args: {
     eventId: v.id("events"),
     eventTitle: v.string(),
     eventDate: v.string(),
     eventLocation: v.optional(v.string()),
   },
   handler: async (ctx, args) => {
     // Get all passes for this event
     const passes = await ctx.db
       .query("passes")
       .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
       .collect();

     const results = [];
     const errors = [];

     for (const pass of passes) {
       try {
         // Prepare email content for this pass
         const emailContent = `
           <!DOCTYPE html>
           <html>
           <head>
             <meta charset="utf-8">
             <title>Your Event Pass - ${args.eventTitle}</title>
             <style>
               body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
               .container { max-width: 600px; margin: 0 auto; padding: 20px; }
               .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px; }
               .pass-card { background: white; padding: 30px; margin: 20px 0; border-radius: 10px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border: 2px solid #667eea; }
               .pass-code { font-size: 48px; font-weight: bold; color: #667eea; font-family: monospace; letter-spacing: 4px; margin: 20px 0; }
               .event-details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
               .footer { text-align: center; margin-top: 30px; padding: 20px; background: #ecf0f1; border-radius: 8px; }
             </style>
           </head>
           <body>
             <div class="container">
               <div class="header">
                 <h1>🎫 Your Event Pass</h1>
                 <h2>${args.eventTitle}</h2>
               </div>

               <div class="pass-card">
                 <h3>Your Unique Pass Code</h3>
                 <div class="pass-code">${pass.passCode}</div>
                 <p><strong>Attendee:</strong> ${pass.attendeeName}</p>
                 <p><strong>Email:</strong> ${pass.attendeeEmail}</p>
               </div>

               <div class="event-details">
                 <h3>Event Details</h3>
                 <p><strong>Event:</strong> ${args.eventTitle}</p>
                 <p><strong>Date:</strong> ${args.eventDate}</p>
                 ${args.eventLocation ? `<p><strong>Location:</strong> ${args.eventLocation}</p>` : ''}
                 <p><strong>Status:</strong> <span style="color: #28a745; font-weight: bold;">✓ Active</span></p>
               </div>

               <div class="footer">
                 <p><strong>Important:</strong> Please keep this pass code safe. You'll need it to enter the event.</p>
                 <p>This pass is valid for one-time use only.</p>
                 <p>Generated by Event Flow</p>
               </div>
             </div>
           </body>
           </html>
         `;

                   // Send email using Convex Resend component
          const emailId = await resend.sendEmail(ctx, {
            from: `Event Flow <${SENDER_EMAIL}>`,
            to: pass.attendeeEmail,
            subject: `Your Event Pass - ${args.eventTitle}`,
            html: emailContent,
          });

         results.push({
           passId: pass._id,
           attendeeName: pass.attendeeName,
           attendeeEmail: pass.attendeeEmail,
           passCode: pass.passCode,
           status: "sent",
         });
       } catch (error) {
         errors.push({
           passId: pass._id,
           attendeeName: pass.attendeeName,
           attendeeEmail: pass.attendeeEmail,
           passCode: pass.passCode,
           error: error.message,
         });
       }
     }

     return {
       totalPasses: passes.length,
       sent: results.filter(r => r.status === "sent").length,
       errorCount: errors.length,
       results,
       errors,
     };
   },
 });
 
 // Send welcome email when user attends event
 export const sendWelcomeEmail = mutation({
   args: {
     registrationId: v.id("registrations"),
     eventTitle: v.string(),
     eventDate: v.string(),
     eventLocation: v.optional(v.string()),
   },
   handler: async (ctx, args) => {
     // Get registration details
     const registration = await ctx.db.get(args.registrationId);
     if (!registration) {
       throw new Error("Registration not found");
     }

     // Get event details
     const event = await ctx.db.get(registration.eventId);
     if (!event) {
       throw new Error("Event not found");
     }

     // Prepare welcome email content
     const emailContent = `
       <!DOCTYPE html>
       <html>
       <head>
         <meta charset="utf-8">
         <title>Welcome to ${args.eventTitle}</title>
         <style>
           body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
           .container { max-width: 600px; margin: 0 auto; padding: 20px; }
           .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; border-radius: 10px; }
           .welcome-card { background: white; padding: 30px; margin: 20px 0; border-radius: 10px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border: 2px solid #28a745; }
           .event-details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
           .footer { text-align: center; margin-top: 30px; padding: 20px; background: #ecf0f1; border-radius: 8px; }
         </style>
       </head>
       <body>
         <div class="container">
           <div class="header">
             <h1>🎉 Welcome to the Event!</h1>
             <h2>${args.eventTitle}</h2>
           </div>

           <div class="welcome-card">
             <h3>Thank you for attending!</h3>
             <p><strong>Attendee:</strong> ${registration.name}</p>
             <p><strong>Email:</strong> ${registration.email}</p>
             <p style="color: #28a745; font-weight: bold; font-size: 18px;">✓ Attendance Confirmed</p>
           </div>

           <div class="event-details">
             <h3>Event Details</h3>
             <p><strong>Event:</strong> ${args.eventTitle}</p>
             <p><strong>Date:</strong> ${args.eventDate}</p>
             ${args.eventLocation ? `<p><strong>Location:</strong> ${args.eventLocation}</p>` : ''}
             <p><strong>Status:</strong> <span style="color: #28a745; font-weight: bold;">✓ Attended</span></p>
           </div>

           <div class="footer">
             <p><strong>Thank you for being part of our event!</strong></p>
             <p>We hope you had a great time and look forward to seeing you at future events.</p>
             <p>Best regards,<br>The Event Flow Team</p>
           </div>
         </div>
       </body>
       </html>
     `;

     // Send email using Convex Resend component
     const emailId = await resend.sendEmail(ctx, {
       from: `Event Flow <${SENDER_EMAIL}>`,
       to: registration.email,
       subject: `Welcome to ${args.eventTitle} - Thank you for attending!`,
       html: emailContent,
     });

     return { 
       success: true, 
       message: 'Welcome email sent successfully',
       recipient: registration.email,
       attendeeName: registration.name
     };
   },
 });
 
 // Send event export report via email
 export const sendEventExportReport = mutation({
   args: {
     eventId: v.id("events"),
     eventTitle: v.string(),
     eventDate: v.string(),
     eventLocation: v.optional(v.string()),
     adminEmail: v.string(),
     exportData: v.object({
       totalRegistrations: v.number(),
       registeredCount: v.number(),
       waitlistedCount: v.number(),
       cancelledCount: v.number(),
       totalRevenue: v.optional(v.number()),
       digitalProductsCount: v.optional(v.number()),
       passesGenerated: v.optional(v.number()),
       passesActive: v.optional(v.number()),
       passesUsed: v.optional(v.number()),
     }),
   },
   handler: async (ctx, args) => {
     // Get event details
     const event = await ctx.db.get(args.eventId);
     if (!event) {
       throw new Error("Event not found");
     }

     // Get registrations for this event
     const registrations = await ctx.db
       .query("registrations")
       .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
       .collect();

     // Get passes for this event
     const passes = await ctx.db
       .query("passes")
       .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
       .collect();

     // Get digital products for this event
     const digitalProducts = await ctx.db
       .query("digitalProducts")
       .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
       .collect();

     // Prepare email content
     const emailContent = `
       <!DOCTYPE html>
       <html>
       <head>
         <meta charset="utf-8">
         <title>Event Export Report - ${args.eventTitle}</title>
         <style>
           body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
           .container { max-width: 800px; margin: 0 auto; padding: 20px; }
           .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px; }
           .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
           .stat-card { background: white; padding: 20px; border-radius: 10px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border: 2px solid #667eea; }
           .stat-number { font-size: 32px; font-weight: bold; color: #667eea; margin-bottom: 10px; }
           .stat-label { color: #666; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }
           .section { background: #f8f9fa; padding: 25px; border-radius: 10px; margin: 20px 0; }
           .section h3 { color: #333; margin-top: 0; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
           .registration-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
           .registration-table th, .registration-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
           .registration-table th { background: #667eea; color: white; font-weight: bold; }
           .registration-table tr:nth-child(even) { background: #f9f9f9; }
           .status-badge { padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: bold; }
           .status-registered { background: #d4edda; color: #155724; }
           .status-waitlisted { background: #fff3cd; color: #856404; }
           .status-cancelled { background: #f8d7da; color: #721c24; }
           .footer { text-align: center; margin-top: 30px; padding: 20px; background: #ecf0f1; border-radius: 8px; }
         </style>
       </head>
       <body>
         <div class="container">
           <div class="header">
             <h1>📊 Event Export Report</h1>
             <h2>${args.eventTitle}</h2>
             <p>Generated on ${new Date().toLocaleDateString('en-US', { 
               year: 'numeric', 
               month: 'long', 
               day: 'numeric',
               hour: '2-digit',
               minute: '2-digit'
             })}</p>
           </div>

           <div class="stats-grid">
             <div class="stat-card">
               <div class="stat-number">${args.exportData.totalRegistrations}</div>
               <div class="stat-label">Total Registrations</div>
             </div>
             <div class="stat-card">
               <div class="stat-number">${args.exportData.registeredCount}</div>
               <div class="stat-label">Registered</div>
             </div>
             <div class="stat-card">
               <div class="stat-number">${args.exportData.waitlistedCount}</div>
               <div class="stat-label">Waitlisted</div>
             </div>
             <div class="stat-card">
               <div class="stat-number">${args.exportData.cancelledCount}</div>
               <div class="stat-label">Cancelled</div>
             </div>
             ${args.exportData.totalRevenue !== undefined ? `
             <div class="stat-card">
               <div class="stat-number">₹${args.exportData.totalRevenue.toLocaleString()}</div>
               <div class="stat-label">Total Revenue</div>
             </div>
             ` : ''}
             ${args.exportData.digitalProductsCount !== undefined ? `
             <div class="stat-card">
               <div class="stat-number">${args.exportData.digitalProductsCount}</div>
               <div class="stat-label">Digital Products</div>
             </div>
             ` : ''}
             ${args.exportData.passesGenerated !== undefined ? `
             <div class="stat-card">
               <div class="stat-number">${args.exportData.passesGenerated}</div>
               <div class="stat-label">Passes Generated</div>
             </div>
             ` : ''}
           </div>

           <div class="section">
             <h3>📅 Event Details</h3>
             <p><strong>Event Title:</strong> ${args.eventTitle}</p>
             <p><strong>Date:</strong> ${args.eventDate}</p>
             ${args.eventLocation ? `<p><strong>Location:</strong> ${args.eventLocation}</p>` : ''}
             <p><strong>Registration Status:</strong> ${event.registrationClosed ? 'Closed' : 'Open'}</p>
             ${event.description ? `<p><strong>Description:</strong> ${event.description}</p>` : ''}
           </div>

           <div class="section">
             <h3>👥 Registration Details</h3>
             <table class="registration-table">
               <thead>
                 <tr>
                   <th>Name</th>
                   <th>Email</th>
                   <th>Phone</th>
                   <th>Status</th>
                   <th>Registered On</th>
                 </tr>
               </thead>
               <tbody>
                 ${registrations.map(reg => `
                   <tr>
                     <td>${reg.name}</td>
                     <td>${reg.email}</td>
                     <td>${reg.phone || 'N/A'}</td>
                     <td><span class="status-badge status-${reg.status}">${reg.status === 'registered' ? 'Registered' : reg.status === 'waitlisted' ? 'Waitlisted' : 'Cancelled'}</span></td>
                     <td>${new Date(reg.registeredAt).toLocaleDateString('en-US', { 
                       year: 'numeric', 
                       month: 'short', 
                       day: 'numeric',
                       hour: '2-digit',
                       minute: '2-digit'
                     })}</td>
                   </tr>
                 `).join('')}
               </tbody>
             </table>
           </div>

           ${passes.length > 0 ? `
           <div class="section">
             <h3>🎫 Pass Management</h3>
             <p><strong>Total Passes Generated:</strong> ${passes.length}</p>
             <p><strong>Active Passes:</strong> ${passes.filter(p => p.status === 'active').length}</p>
             <p><strong>Used Passes:</strong> ${passes.filter(p => p.status === 'used').length}</p>
             <p><strong>Expired Passes:</strong> ${passes.filter(p => p.status === 'expired').length}</p>
           </div>
           ` : ''}

           ${digitalProducts.length > 0 ? `
           <div class="section">
             <h3>🛍️ Digital Products</h3>
             <p><strong>Total Products:</strong> ${digitalProducts.length}</p>
             ${digitalProducts.map(product => `
               <div style="background: white; padding: 15px; border-radius: 8px; margin: 10px 0; border-left: 4px solid #667eea;">
                 <p><strong>${product.name}</strong> - ₹${product.price}</p>
                 <p style="color: #666; font-size: 14px;">${product.description || 'No description'}</p>
               </div>
             `).join('')}
           </div>
           ` : ''}

           <div class="footer">
             <p><strong>Event Flow - Event Management System</strong></p>
             <p>This report was automatically generated and sent to your email.</p>
             <p>For any questions, please contact the Event Flow support team.</p>
           </div>
         </div>
       </body>
       </html>
     `;

     // Send email using Convex Resend component
     const emailId = await resend.sendEmail(ctx, {
       from: `Event Flow <${SENDER_EMAIL}>`,
       to: args.adminEmail,
       subject: `Event Export Report - ${args.eventTitle}`,
       html: emailContent,
     });

     return { 
       success: true, 
       message: 'Event export report sent successfully',
       recipient: args.adminEmail,
       eventTitle: args.eventTitle
     };
   },
 });
 
   // Mark attendance for a registration and send welcome email
  export const markAttendance = mutation({
    args: {
      registrationId: v.id("registrations"),
      markedBy: v.string(), // Clerk user ID
      eventTitle: v.string(),
      eventDate: v.string(),
      eventLocation: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
      const registration = await ctx.db.get(args.registrationId);
      if (!registration) {
        throw new Error("Registration not found");
      }

             // Check if already marked as attended
       if (registration.attendedAt) {
         return { 
           success: false, 
           message: 'Attendance already marked for this registration',
           attendeeName: registration.name,
           attendeeEmail: registration.email,
           alreadyMarked: true
         };
       }

      // Mark attendance
      await ctx.db.patch(args.registrationId, {
        attendedAt: Date.now(),
        attendedBy: args.markedBy,
      });

      // Send welcome email automatically
      const emailContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Welcome to ${args.eventTitle}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; border-radius: 10px; }
            .welcome-card { background: white; padding: 30px; margin: 20px 0; border-radius: 10px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border: 2px solid #28a745; }
            .event-details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; padding: 20px; background: #ecf0f1; border-radius: 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome to the Event!</h1>
              <h2>${args.eventTitle}</h2>
            </div>

            <div class="welcome-card">
              <h3>Thank you for attending!</h3>
              <p><strong>Attendee:</strong> ${registration.name}</p>
              <p><strong>Email:</strong> ${registration.email}</p>
              <p style="color: #28a745; font-weight: bold; font-size: 18px;">✓ Attendance Confirmed</p>
            </div>

            <div class="event-details">
              <h3>Event Details</h3>
              <p><strong>Event:</strong> ${args.eventTitle}</p>
              <p><strong>Date:</strong> ${args.eventDate}</p>
              ${args.eventLocation ? `<p><strong>Location:</strong> ${args.eventLocation}</p>` : ''}
              <p><strong>Status:</strong> <span style="color: #28a745; font-weight: bold;">✓ Attended</span></p>
            </div>

            <div class="footer">
              <p><strong>Thank you for being part of our event!</strong></p>
              <p>We hope you had a great time and look forward to seeing you at future events.</p>
              <p>Best regards,<br>The Event Flow Team</p>
            </div>
          </div>
        </body>
        </html>
      `;

      // Send welcome email using Convex Resend component
      const emailId = await resend.sendEmail(ctx, {
        from: `Event Flow <${SENDER_EMAIL}>`,
        to: registration.email,
        subject: `Welcome to ${args.eventTitle} - Thank you for attending!`,
        html: emailContent,
      });

      return { 
        success: true, 
        message: 'Attendance marked and welcome email sent successfully',
        attendeeName: registration.name,
        attendeeEmail: registration.email,
        emailSent: true
      };
    },
  });
 
 // Get pass statistics for an event
export const getEventPassStats = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const passes = await ctx.db
      .query("passes")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .collect();

    const totalPasses = passes.length;
    const activePasses = passes.filter(p => p.status === "active").length;
    const usedPasses = passes.filter(p => p.status === "used").length;
    const expiredPasses = passes.filter(p => p.status === "expired").length;

    return {
      totalPasses,
      activePasses,
      usedPasses,
      expiredPasses,
    };
  },
}); 