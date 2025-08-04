import { NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../../convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

export async function GET(request, { params }) {
  try {
    const { eventId } = params;

    if (!eventId) {
      return NextResponse.json(
        { success: false, message: 'Event ID is required' },
        { status: 400 }
      );
    }

    // Get digital products for this event from Convex
    const digitalProducts = await convex.query(api.digitalProducts.getEventDigitalProducts, {
      eventId: eventId
    });

    return NextResponse.json({
      success: true,
      data: digitalProducts || []
    });

  } catch (error) {
    console.error('Error fetching event products:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch event products' },
      { status: 500 }
    );
  }
} 