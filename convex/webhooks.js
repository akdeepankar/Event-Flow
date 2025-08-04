import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Webhook handler for Razorpay payment notifications
export const handleRazorpayWebhook = mutation({
  args: {
    event: v.string(),
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    try {
      // Verify webhook signature (you should implement this for security)
      // const signature = args.signature;
      // const expectedSignature = crypto
      //   .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      //   .update(JSON.stringify(args.payload))
      //   .digest('hex');
      
      // if (signature !== expectedSignature) {
      //   throw new Error('Invalid webhook signature');
      // }

      if (args.event === 'payment_link.paid') {
        const paymentData = args.payload.payload.payment_link.entity;
        const payment = args.payload.payload.payment.entity;

        // Find the payment record by payment link ID
        const payments = await ctx.db
          .query("payments")
          .filter((q) => q.eq(q.field("paymentLinkId"), paymentData.id))
          .collect();

        if (payments.length === 0) {
          throw new Error('Payment record not found');
        }

        const paymentRecord = payments[0];

        // Update payment status
        await ctx.db.patch(paymentRecord._id, {
          status: "completed",
          updatedAt: Date.now(),
        });

        // Get product details
        const product = await ctx.db.get(paymentRecord.productId);
        if (!product) {
          throw new Error('Product not found');
        }

        // Get event details to find the user (product owner)
        const event = await ctx.db.get(product.eventId);
        if (!event) {
          throw new Error('Event not found');
        }

        // Get user details (product owner)
        const user = await ctx.db
          .query("users")
          .withIndex("by_clerkId", (q) => q.eq("clerkId", event.userId))
          .first();

        if (!user) {
          throw new Error('Product owner not found');
        }

        // Get file URL
        const fileUrl = await ctx.storage.getUrl(product.fileStorageId);

        // Send email directly in webhook (since ctx.runAction is not available in mutations)
        const resendApiKey = process.env.RESEND_API_KEY;
        
        if (resendApiKey) {
          const emailContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Thank you for your purchase!</h2>
              <p>Dear ${paymentRecord.customerName},</p>
              <p>Your payment has been successfully processed. Here's your digital product:</p>
              
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #495057;">${product.name}</h3>
                <p style="margin-bottom: 15px;">Click the button below to download your file:</p>
                <a href="${fileUrl}" 
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
              to: paymentRecord.customerEmail,
              subject: `Your Digital Product: ${product.name}`,
              html: emailContent
            })
          });

          if (response.ok) {
            // Update payment record with email sent status
            await ctx.db.patch(paymentRecord._id, {
              emailSent: true,
              emailSentAt: Date.now(),
              updatedAt: Date.now(),
            });

            // Increment product download count
            await ctx.db.patch(product._id, {
              downloads: (product.downloads || 0) + 1,
              updatedAt: Date.now(),
            });

            // Update sales analytics
            await ctx.runMutation(api.salesAnalytics.updateSalesAnalytics, {
              paymentId: paymentRecord._id,
            });

            console.log("Email sent successfully via webhook");
          } else {
            console.error("Failed to send email via webhook:", response.status);
          }
        }

        return {
          success: true,
          message: "Payment processed successfully"
        };
      }

      return {
        success: true,
        message: "Webhook processed"
      };

    } catch (error) {
      console.error("Webhook processing error:", error);
      return {
        success: false,
        error: error.message
      };
    }
  },
}); 