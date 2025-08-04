import { NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

export async function POST(request) {
  try {
    const { event, registrations, digitalProducts, userEmail, eventId } = await request.json();

    // Get additional data from Convex
    const eventRegistrationCount = await convex.query(api.registrations.getEventRegistrationCount, {
      eventId: eventId
    });

    // Use digital products data passed from frontend, or fetch from Convex if not provided
    const digitalProductsData = digitalProducts || await convex.query(api.digitalProducts.getEventDigitalProducts, {
      eventId: eventId
    });

    // Calculate statistics
    const totalRegistrations = registrations.length;
    const waitlistedCount = registrations.filter(reg => reg.status === 'waitlisted').length;
    const confirmedRegistrations = registrations.filter(reg => reg.status === 'registered').length;
    const availableSpots = event.participantLimit ? Math.max(0, event.participantLimit - confirmedRegistrations) : 'No Limit';

    // Prepare email content
    const emailContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Event Export - ${event.title}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px; }
          .section { margin: 30px 0; padding: 20px; background: #f8f9fa; border-radius: 8px; }
          .section h2 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
          .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin: 20px 0; }
          .stat-card { background: white; padding: 15px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .stat-number { font-size: 24px; font-weight: bold; color: #3498db; }
          .stat-label { font-size: 12px; color: #7f8c8d; text-transform: uppercase; }
          .product-card { background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #3498db; }
          .registration-item { background: white; padding: 10px; margin: 5px 0; border-radius: 5px; border-left: 3px solid #27ae60; }
          .footer { text-align: center; margin-top: 30px; padding: 20px; background: #ecf0f1; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Event Export Report</h1>
            <h2>${event.title}</h2>
            <p>Generated on ${new Date().toLocaleDateString()}</p>
          </div>

          <div class="section">
            <h2>📋 Event Details</h2>
            <p><strong>Title:</strong> ${event.title}</p>
            <p><strong>Date:</strong> ${event.date}</p>
            <p><strong>Location:</strong> ${event.location || 'No location specified'}</p>
            <p><strong>Description:</strong> ${event.description || 'No description provided'}</p>
            <p><strong>Participant Limit:</strong> ${event.participantLimit || 'No limit'}</p>
            <p><strong>Registration Status:</strong> ${event.registrationClosed ? 'Closed' : 'Open'}</p>
          </div>

          <div class="section">
            <h2>📈 Registration Statistics</h2>
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-number">${totalRegistrations}</div>
                <div class="stat-label">Total Registrations</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">${confirmedRegistrations}</div>
                <div class="stat-label">Confirmed</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">${waitlistedCount}</div>
                <div class="stat-label">Waitlisted</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">${availableSpots}</div>
                <div class="stat-label">Available Spots</div>
              </div>
            </div>
          </div>

          <div class="section">
            <h2>👥 Registration Details</h2>
            ${registrations.length > 0 ? 
              registrations.map(reg => `
                <div class="registration-item">
                  <p><strong>Name:</strong> ${reg.name}</p>
                  <p><strong>Email:</strong> ${reg.email}</p>
                  <p><strong>Status:</strong> ${reg.status}</p>
                  <p><strong>Registered:</strong> ${new Date(reg.createdAt).toLocaleDateString()}</p>
                  ${reg.status === 'waitlisted' ? `<p><strong>Waitlist Position:</strong> ${reg.waitlistPosition}</p>` : ''}
                </div>
              `).join('') : 
              '<p>No registrations found.</p>'
            }
          </div>

          ${digitalProductsData && digitalProductsData.length > 0 ? `
            <div class="section">
              <h2>🛒 Digital Store</h2>
              <p><strong>Total Products:</strong> ${digitalProductsData.length}</p>
              ${digitalProductsData.map(product => `
                <div class="product-card">
                  <h3>${product.name}</h3>
                  <p><strong>Price:</strong> ₹${(product.price / 100).toFixed(2)}</p>
                  <p><strong>Description:</strong> ${product.description || 'No description'}</p>
                  <p><strong>File:</strong> ${product.fileName} (${(product.fileSize / 1024 / 1024).toFixed(2)} MB)</p>
                </div>
              `).join('')}
            </div>
          ` : ''}

          <div class="footer">
            <p>This report was generated automatically by Event Flow</p>
            <p>For any questions, please contact support</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email using your email service (you'll need to implement this)
    // For now, we'll just return success
    // You can integrate with services like Resend, SendGrid, or your existing email setup

    console.log('Export email content generated for:', userEmail);
    console.log('Event:', event.title);
    console.log('Total registrations:', totalRegistrations);

    // TODO: Implement actual email sending
    // Example with Resend:
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // await resend.emails.send({
    //   from: 'Event Flow <noreply@yourapp.com>',
    //   to: userEmail,
    //   subject: `Event Export: ${event.title}`,
    //   html: emailContent,
    // });

    return NextResponse.json({ 
      success: true, 
      message: 'Event data exported successfully',
      data: {
        eventTitle: event.title,
        totalRegistrations,
        digitalProductsCount: digitalProductsData?.length || 0
      }
    });

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to export event data' },
      { status: 500 }
    );
  }
} 