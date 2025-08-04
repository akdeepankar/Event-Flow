# Payment Integration Setup Guide

This guide will help you set up Razorpay and Resend for the digital product payment system.

## Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# Convex Configuration
NEXT_PUBLIC_CONVEX_URL=your_convex_url_here

# Resend Configuration (Global - for sending emails)
RESEND_API_KEY=your_resend_api_key_here

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Note:** Razorpay credentials are now stored per-user in the database, so you don't need to set them as environment variables.

## Razorpay Setup (Per User)

1. **Create a Razorpay Account**
   - Go to [Razorpay Dashboard](https://dashboard.razorpay.com/)
   - Sign up for a new account
   - Complete the verification process

2. **Get API Keys**
   - Navigate to Settings > API Keys
   - Copy your Key ID and Key Secret

3. **Add Credentials to App**
   - Go to the Settings page in your app
   - Enter your Razorpay Key ID and Key Secret
   - Click "Update Razorpay Credentials"

4. **Configure Webhooks (Required for Security)**
   - Go to Settings > Webhooks in Razorpay Dashboard
   - Add a new webhook with the following URL:
     ```
     https://yourdomain.com/api/webhooks/razorpay
     ```
   - Select the following events:
     - `payment_link.paid`
   - Copy the webhook secret for verification (recommended)
   - **Important:** Webhooks are required to automatically send files after payment

## Resend Setup

1. **Create a Resend Account**
   - Go to [Resend Dashboard](https://resend.com/)
   - Sign up for a new account
   - Verify your email

2. **Get API Key**
   - Navigate to API Keys section
   - Create a new API key
   - Copy the key and update `RESEND_API_KEY`

3. **Verify Domain (Optional but Recommended)**
   - Add your domain to Resend
   - Update the `from` email in the code to use your verified domain
   - For testing, you can use the default Resend domain: `onboarding@resend.dev`

## Testing the Integration

1. **Set Up Razorpay Credentials**
   - Go to Settings page in your app
   - Add your Razorpay API credentials
   - Use test keys for development

2. **Create a Digital Product**
   - Go to My Events page
   - Select an event
   - Add a digital product with a file and price

3. **Test Purchase Flow**
   - Go to the public event page
   - Click "Purchase" on a digital product
   - Enter customer details
   - Generate payment link
   - Complete payment using Razorpay test mode
   - **Manual Check:** If email doesn't arrive automatically, click "Check Payment Status" button

4. **Verify Email Delivery**
   - Check if the customer receives the email with download link
   - Verify the download count increases in the admin panel
   - **Security Note:** Files are only sent after double verification:
     - Razorpay webhook confirms payment
     - Razorpay API call verifies payment status before sending email

## Security Considerations

1. **Webhook Signature Verification**
   - Uncomment the signature verification code in the webhook handler
   - This ensures webhooks are coming from Razorpay

2. **API Key Security**
   - Never commit API keys to version control
   - Use environment variables for all sensitive data
   - Rotate keys regularly

3. **File Access Control**
   - Files are only sent after payment confirmation via Razorpay webhooks
   - Payment status is verified with Razorpay API before sending files
   - No manual "Payment Complete" button to prevent fraud
   - Double verification: webhook + API call to ensure payment completion
   - Manual payment check available as backup if webhook fails
   - Consider implementing additional access controls for downloaded files
   - Set appropriate expiration times for download links

## Production Deployment

1. **Update API Keys**
   - Switch from test to live Razorpay keys in Settings
   - Update webhook URLs to production domain
   - Verify Resend API key is set

2. **Domain Verification**
   - Verify your domain with Resend
   - Update the `from` email address in the code

3. **Monitoring**
   - Set up logging for payment failures
   - Monitor webhook delivery status
   - Track email delivery rates

## Troubleshooting

### Common Issues

1. **Payment Link Not Generated**
   - Check if Razorpay credentials are configured in Settings
   - Verify amount format (should be in paise)
   - Check browser console for errors

2. **Email Not Sent**
   - Verify Resend API key is set in environment variables
   - Check email address format
   - Ensure you're using a verified "from" email address (use `onboarding@resend.dev` for testing)
   - Review Resend dashboard for delivery status
   - **Payment Verification:** Email is only sent after Razorpay API confirms payment status
   - Check Convex logs for payment verification errors
   - **Manual Check:** Use the "Check Payment Status" button in the purchase modal
   - **Webhook Issues:** If webhook fails, manual check will still work

3. **Webhook Not Working**
   - Verify webhook URL is accessible
   - Check webhook secret configuration
   - Review Razorpay webhook logs

### Support

For additional help:
- Razorpay Documentation: https://razorpay.com/docs/
- Resend Documentation: https://resend.com/docs
- Convex Documentation: https://docs.convex.dev/ 