# Email Setup Guide for Event Flow

This guide will help you set up the advanced email sending and scheduling features using Resend and Convex.

## Prerequisites

1. A Resend account (sign up at [resend.com](https://resend.com))
2. Your Convex project deployed

## Step 1: Get Resend API Key

1. Log in to your Resend dashboard
2. Go to the API Keys section
3. Create a new API key
4. Copy the API key (you'll need this for the next step)

## Step 2: Configure Environment Variables

Add the following environment variables to your Convex deployment:

```bash
RESEND_API_KEY=re_Ntz8EJfR_5JeNjgL1F3JGFQj5N7Z4ZMXt
RESEND_WEBHOOK_SECRET=your_webhook_secret_here  # Optional, for webhook functionality
```

### How to set environment variables in Convex:

1. Go to your Convex dashboard
2. Navigate to Settings > Environment Variables
3. Add the variables above

## Step 3: Set Up Webhook (Optional but Recommended)

1. Deploy your Convex project if you haven't already
2. Your webhook URL will be: `https://your-project-name.convex.site/resend-webhook`
3. In your Resend dashboard, go to Webhooks
4. Create a new webhook with the URL above
5. Enable all `email.*` events
6. Copy the webhook secret and add it to your environment variables

## Step 4: Configure Email Settings

### Update Email Configuration

In `convex/emails.js`, you can customize:

1. **From Address**: Update the `from` field in email functions
2. **Test Mode**: Set `testMode: false` for production
3. **Email Templates**: Customize the HTML templates

### Example Configuration:

```javascript
export const resend = new Resend(components.resend, {
  testMode: false, // Set to false for production
  // Add your webhook secret here if not using environment variable
  // webhookSecret: "your_webhook_secret"
});
```

## Step 5: Test the Setup

1. Deploy your Convex project
2. Go to your app and use the "Send Test Email" button
3. Check your Resend dashboard to see if the email was sent
4. Verify webhook events are being received (if configured)

## Features Included

### 1. Automatic Email Sending
- **Registration Confirmations**: Sent automatically when users register for events
- **Event Reminders**: Sent 24 hours before events (via cron job)

### 2. Email Management
- **Test Emails**: Send test emails to verify configuration
- **Status Tracking**: Check email delivery status
- **Email Cancellation**: Cancel emails that haven't been sent yet

### 3. Advanced Features
- **Queueing**: Handles large volumes of emails efficiently
- **Batching**: Automatically batches emails for optimal delivery
- **Rate Limiting**: Respects Resend's API limits
- **Idempotency**: Prevents duplicate emails
- **Automatic Cleanup**: Removes old emails after 7 days

## Email Templates

The system includes two main email templates:

### 1. Registration Confirmation
- Beautiful gradient design
- Event details included
- Professional branding

### 2. Event Reminder
- Attention-grabbing design
- Event details and timing
- Friendly reminder tone

## Cron Jobs

The system includes automated cron jobs:

1. **Email Cleanup**: Runs every hour to remove old emails
2. **Event Reminders**: Runs daily to send reminders for tomorrow's events

## Troubleshooting

### Common Issues:

1. **"testMode is true" error**: Set `testMode: false` in your Resend configuration
2. **Webhook not working**: Verify the webhook URL and secret
3. **Emails not sending**: Check your Resend API key and account status
4. **Rate limiting**: The system automatically handles rate limits

### Debug Steps:

1. Check Convex function logs in the dashboard
2. Verify environment variables are set correctly
3. Test with the "Send Test Email" button
4. Check Resend dashboard for delivery status

## Production Considerations

1. **Domain Verification**: Verify your domain in Resend for better deliverability
2. **SPF/DKIM**: Set up proper email authentication
3. **Monitoring**: Monitor email delivery rates and bounces
4. **Compliance**: Ensure compliance with email regulations (CAN-SPAM, GDPR)

## Support

If you encounter issues:

1. Check the Convex function logs
2. Verify your Resend account status
3. Review the webhook configuration
4. Test with the provided email management interface

## Next Steps

Once setup is complete, you can:

1. Customize email templates in `convex/emails.js`
2. Add more email types (welcome emails, follow-ups, etc.)
3. Implement email preferences for users
4. Add email analytics and tracking 