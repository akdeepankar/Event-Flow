import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Action to call Razorpay API
export const callRazorpayAPI = action({
  args: {
    productName: v.string(),
    customerName: v.string(),
    customerEmail: v.string(),
    amountInPaise: v.number(),
    razorpayKeyId: v.string(),
    razorpayKeySecret: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const authHeader = btoa(args.razorpayKeyId + ":" + args.razorpayKeySecret);

      const payload = {
        amount: args.amountInPaise,
        currency: "INR",
        description: `Purchase: ${args.productName}`,
        customer: {
          name: args.customerName,
          email: args.customerEmail
        },
        notify: { sms: false, email: true },
        reminder_enable: true
      };

      const response = await fetch("https://api.razorpay.com/v1/payment_links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${authHeader}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Razorpay API error: ${response.status}`);
      }

      const responseData = await response.json();
      return {
        success: true,
        paymentLinkId: responseData.id,
        paymentLinkUrl: responseData.short_url,
      };

    } catch (error) {
      console.error("Error calling Razorpay API:", error);
      return {
        success: false,
        error: error.message
      };
    }
  },
});

// Action to generate payment link (combines API call and database operations)
export const generatePaymentLink = action({
  args: {
    productId: v.id("digitalProducts"),
    customerName: v.string(),
    customerEmail: v.string(),
    amount: v.number(),
    userClerkId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Get product details
      const product = await ctx.runQuery(api.digitalProducts.getDigitalProductById, {
        id: args.productId
      });
      
      if (!product) {
        throw new Error("Product not found");
      }

      // Get user's Razorpay credentials
      const user = await ctx.runQuery(api.users.getUserByClerkId, {
        clerkId: args.userClerkId
      });

      if (!user) {
        throw new Error("User not found. Please try refreshing the page and try again.");
      }

      if (!user.razorpayKeyId || !user.razorpayKeySecret) {
        throw new Error("Razorpay credentials not configured. Please add your Razorpay API keys in settings.");
      }

      const amountInPaise = Math.round(args.amount * 0.01 * 100);

      // Call Razorpay API
      const authHeader = btoa(user.razorpayKeyId + ":" + user.razorpayKeySecret);

      const payload = {
        amount: amountInPaise,
        currency: "INR",
        description: `Purchase: ${product.name}`,
        customer: {
          name: args.customerName,
          email: args.customerEmail
        },
        notify: { sms: false, email: true },
        reminder_enable: true
      };

      const response = await fetch("https://api.razorpay.com/v1/payment_links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${authHeader}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Razorpay API error: ${response.status}`);
      }

      const responseData = await response.json();

      // Store payment record in database
      const paymentId = await ctx.runMutation(api.payments.createPaymentRecord, {
        productId: args.productId,
        eventId: product.eventId,
        customerName: args.customerName,
        customerEmail: args.customerEmail,
        amount: args.amount,
        paymentLinkId: responseData.id,
        paymentLinkUrl: responseData.short_url,
      });

      return {
        success: true,
        paymentId,
        paymentLinkUrl: responseData.short_url,
        message: "Payment link generated successfully"
      };

    } catch (error) {
      console.error("Error generating payment link:", error);
      return {
        success: false,
        error: error.message
      };
    }
  },
});

// Action to send email via Resend
export const callResendAPI = action({
  args: {
    customerEmail: v.string(),
    customerName: v.string(),
    productName: v.string(),
    fileUrl: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const resendApiKey = process.env.RESEND_API_KEY;
      
      if (!resendApiKey) {
        throw new Error("Resend API key not configured");
      }

      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Thank you for your purchase!</h2>
          <p>Dear ${args.customerName},</p>
          <p>Your payment has been successfully processed. Here's your digital product:</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #495057;">${args.productName}</h3>
            <p style="margin-bottom: 15px;">Click the button below to download your file:</p>
            <a href="${args.fileUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Download File
            </a>
          </div>
          
          <p style="color: #6c757d; font-size: 14px;">
            If you have any questions, please don't hesitate to contact us.
          </p>
        </div>
      `;

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: "onboarding@resend.dev",
          to: args.customerEmail,
          subject: `Your Digital Product: ${args.productName}`,
          html: emailContent
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Resend API error: ${errorData.message || response.status}`);
      }

      return {
        success: true,
        message: "Email sent successfully"
      };

    } catch (error) {
      console.error("Error calling Resend API:", error);
      return {
        success: false,
        error: error.message
      };
    }
  },
});

// Action to verify payment with Razorpay
export const verifyPaymentWithRazorpay = action({
  args: {
    paymentLinkId: v.string(),
    userClerkId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Get user's Razorpay credentials
      const user = await ctx.runQuery(api.users.getUserByClerkId, {
        clerkId: args.userClerkId
      });

      if (!user) {
        throw new Error("User not found");
      }

      if (!user.razorpayKeyId || !user.razorpayKeySecret) {
        throw new Error("Razorpay credentials not configured");
      }

      // Base64 encode API key and secret
      const authHeader = btoa(user.razorpayKeyId + ":" + user.razorpayKeySecret);

      // Call Razorpay API to verify payment status
      const response = await fetch(`https://api.razorpay.com/v1/payment_links/${args.paymentLinkId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${authHeader}`
        }
      });

      if (!response.ok) {
        throw new Error(`Razorpay API error: ${response.status}`);
      }

      const paymentData = await response.json();
      
      // Check if payment is captured
      if (paymentData.status === "paid") {
        return {
          success: true,
          isPaid: true,
          paymentData: paymentData
        };
      } else {
        return {
          success: true,
          isPaid: false,
          status: paymentData.status,
          paymentData: paymentData
        };
      }

    } catch (error) {
      console.error("Error verifying payment with Razorpay:", error);
      return {
        success: false,
        error: error.message
      };
    }
  },
});

// Action to send file email (combines API call and database operations)
export const sendFileEmail = action({
  args: {
    paymentId: v.id("payments"),
    customerEmail: v.string(),
    customerName: v.string(),
    productName: v.string(),
    fileUrl: v.string(),
    fileName: v.string(),
    userClerkId: v.string(), // Added userClerkId for payment verification
  },
  handler: async (ctx, args) => {
    try {
      const resendApiKey = process.env.RESEND_API_KEY;
      
      if (!resendApiKey) {
        throw new Error("Resend API key not configured");
      }

      // Get payment record to get paymentLinkId
      const payment = await ctx.runQuery(api.payments.getPaymentById, {
        paymentId: args.paymentId
      });

      if (!payment) {
        throw new Error("Payment record not found");
      }

      // Verify payment with Razorpay before sending email
      const verificationResult = await ctx.runAction(api.payments.verifyPaymentWithRazorpay, {
        paymentLinkId: payment.paymentLinkId,
        userClerkId: args.userClerkId
      });

      if (!verificationResult.success) {
        throw new Error(`Payment verification failed: ${verificationResult.error}`);
      }

      if (!verificationResult.isPaid) {
        throw new Error(`Payment not completed. Status: ${verificationResult.status}`);
      }

      console.log("Payment verified successfully with Razorpay:", verificationResult.paymentData);

      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Thank you for your purchase!</h2>
          <p>Dear ${args.customerName},</p>
          <p>Your payment has been successfully processed. Here's your digital product:</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #495057;">${args.productName}</h3>
            <p style="margin-bottom: 15px;">Click the button below to download your file:</p>
            <a href="${args.fileUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Download File
            </a>
          </div>
          
          <p style="color: #6c757d; font-size: 14px;">
            If you have any questions, please don't hesitate to contact us.
          </p>
        </div>
      `;

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: "onboarding@resend.dev",
          to: args.customerEmail,
          subject: `Your Digital Product: ${args.productName}`,
          html: emailContent
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Resend API error: ${errorData.message || response.status}`);
      }

             // Update payment status in database
       await ctx.runMutation(api.payments.updatePaymentStatus, {
         paymentId: args.paymentId,
         status: "completed",
         emailSent: true,
       });

       // Update sales analytics
       await ctx.runMutation(api.salesAnalytics.updateSalesAnalytics, {
         paymentId: args.paymentId,
       });

       // Get payment and update product download count
       const paymentRecord = await ctx.runQuery(api.payments.getPaymentById, {
         paymentId: args.paymentId
       });
      
      if (paymentRecord) {
        const product = await ctx.runQuery(api.digitalProducts.getDigitalProductById, {
          id: paymentRecord.productId
        });
        
        if (product) {
          await ctx.runMutation(api.digitalProducts.updateProductDownloads, {
            productId: paymentRecord.productId,
            downloads: (product.downloads || 0) + 1,
          });
        }
      }

      return {
        success: true,
        message: "File sent successfully via email"
      };

    } catch (error) {
      console.error("Error sending file email:", error);
      return {
        success: false,
        error: error.message
      };
    }
  },
});

// Helper mutation to create payment record
export const createPaymentRecord = mutation({
  args: {
    productId: v.id("digitalProducts"),
    eventId: v.id("events"),
    customerName: v.string(),
    customerEmail: v.string(),
    amount: v.number(),
    paymentLinkId: v.string(),
    paymentLinkUrl: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("payments", {
      productId: args.productId,
      eventId: args.eventId,
      customerName: args.customerName,
      customerEmail: args.customerEmail,
      amount: args.amount,
      currency: "INR",
      paymentLinkId: args.paymentLinkId,
      paymentLinkUrl: args.paymentLinkUrl,
      status: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Helper mutation to update payment status
export const updatePaymentStatus = mutation({
  args: {
    paymentId: v.id("payments"),
    status: v.string(),
    emailSent: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.paymentId, {
      status: args.status,
      emailSent: args.emailSent,
      emailSentAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Get payment by ID
export const getPaymentById = query({
  args: { paymentId: v.id("payments") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.paymentId);
  },
});

// Action to manually check payment status and send email
export const manualPaymentCheck = action({
  args: {
    paymentId: v.id("payments"),
  },
  handler: async (ctx, args) => {
    try {
      // Get payment record
      const payment = await ctx.runQuery(api.payments.getPaymentById, {
        paymentId: args.paymentId
      });

      if (!payment) {
        throw new Error("Payment record not found");
      }

      // Get product details
      const product = await ctx.runQuery(api.digitalProducts.getDigitalProductById, {
        id: payment.productId
      });

      if (!product) {
        throw new Error("Product not found");
      }

             // Get event details to find the user (product owner)
       const event = await ctx.runQuery(api.events.getEventById, {
         id: product.eventId
       });

      if (!event) {
        throw new Error("Event not found");
      }

             // Get user details (product owner)
       const user = await ctx.runQuery(api.users.getUserByClerkId, {
         clerkId: event.createdBy
       });

      if (!user) {
        throw new Error("Product owner not found");
      }

      // Get file URL
      const fileUrl = await ctx.runQuery(api.files.getFileUrl, {
        storageId: product.fileStorageId
      });

      if (!fileUrl) {
        throw new Error("File URL not found");
      }

      // Verify payment with Razorpay
      const verificationResult = await ctx.runAction(api.payments.verifyPaymentWithRazorpay, {
        paymentLinkId: payment.paymentLinkId,
        userClerkId: user.clerkId
      });

      if (!verificationResult.success) {
        throw new Error(`Payment verification failed: ${verificationResult.error}`);
      }

      if (!verificationResult.isPaid) {
        return {
          success: false,
          message: `Payment not completed. Status: ${verificationResult.status}`,
          paymentStatus: verificationResult.status
        };
      }

      // Send email
      const emailResult = await ctx.runAction(api.payments.sendFileEmail, {
        paymentId: payment._id,
        customerEmail: payment.customerEmail,
        customerName: payment.customerName,
        productName: product.name,
        fileUrl: fileUrl,
        fileName: product.fileName,
        userClerkId: user.clerkId,
      });

      if (!emailResult.success) {
        throw new Error(`Email sending failed: ${emailResult.error}`);
      }

      return {
        success: true,
        message: "Payment verified and email sent successfully",
        paymentStatus: "paid"
      };

    } catch (error) {
      console.error("Manual payment check error:", error);
      return {
        success: false,
        error: error.message
      };
    }
  },
}); 