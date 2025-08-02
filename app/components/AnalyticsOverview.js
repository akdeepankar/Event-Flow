"use client";

export default function AnalyticsOverview({ events, registrations, selectedEvent }) {
  // Calculate analytics
  const totalEvents = events?.length || 0;
  const totalRegistrations = registrations?.length || 0;
  const averageRegistrationsPerEvent = totalEvents > 0 ? (totalRegistrations / totalEvents).toFixed(1) : 0;

  // Get events with registration counts
  const eventsWithRegistrations = events?.map(event => {
    const eventRegistrations = registrations?.filter(reg => reg.eventId === event._id) || [];
    return {
      ...event,
      registrationCount: eventRegistrations.length,
      registrations: eventRegistrations
    };
  }).sort((a, b) => b.registrationCount - a.registrationCount) || [];

  // Get unique email domains
  const emailDomains = {};
  registrations?.forEach(registration => {
    const domain = registration.email.split('@')[1];
    emailDomains[domain] = (emailDomains[domain] || 0) + 1;
  });

  const topDomains = Object.entries(emailDomains)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  // Calculate growth metrics
  const recentRegistrations = registrations?.filter(reg => {
    const regDate = new Date(reg.registeredAt);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return regDate > weekAgo;
  }) || [];

  const weeklyGrowth = recentRegistrations.length;

  return (
    <div className="space-y-8">

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="text-right">
              <div className="text-2xl font-semibold text-gray-900">{totalEvents}</div>
              <div className="text-sm text-gray-500">Total Events</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="text-right">
              <div className="text-2xl font-semibold text-gray-900">{totalRegistrations}</div>
              <div className="text-sm text-gray-500">Registrations</div>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-600">
            +{weeklyGrowth} this week
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="text-right">
              <div className="text-2xl font-semibold text-gray-900">{averageRegistrationsPerEvent}</div>
              <div className="text-sm text-gray-500">Avg. per Event</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="text-right">
              <div className="text-2xl font-semibold text-gray-900">{topDomains.length}</div>
              <div className="text-sm text-gray-500">Email Domains</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Event Performance */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-gray-600 rounded flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Event Performance</h2>
              </div>
            </div>
          </div>
          <div className="p-6">
            {eventsWithRegistrations.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm">No events found</p>
              </div>
            ) : (
              <div className="space-y-3">
                                 {eventsWithRegistrations.slice(0, 5).map((event, index) => (
                   <div key={event._id} className="group p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors duration-200">
                     <div className="flex items-center justify-between">
                       <div className="flex items-center space-x-3">
                         <div className="w-6 h-6 bg-gray-600 rounded flex items-center justify-center text-white text-xs font-medium">
                           {index + 1}
                         </div>
                         <div>
                           <h3 className="font-medium text-gray-900 group-hover:text-gray-700 transition-colors">
                             {event.title}
                           </h3>
                           <p className="text-sm text-gray-500">{new Date(event.date).toLocaleDateString()}</p>
                         </div>
                       </div>
                       <div className="text-right">
                         <div className="text-base font-semibold text-gray-900">{event.registrationCount}</div>
                         <div className="text-xs text-gray-500">registrations</div>
                       </div>
                     </div>
                   </div>
                 ))}
              </div>
            )}
          </div>
        </div>

        {/* Audience Insights */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-gray-600 rounded flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Audience Insights</h2>
              </div>
            </div>
          </div>
          <div className="p-6">
            {topDomains.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm">No registrations yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                                 {topDomains.map(([domain, count], index) => {
                   const percentage = ((count / totalRegistrations) * 100).toFixed(1);
                   return (
                     <div key={domain} className="group p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors duration-200">
                       <div className="flex items-center justify-between">
                         <div className="flex items-center space-x-3">
                           <div className="w-6 h-6 bg-gray-600 rounded flex items-center justify-center text-white text-xs font-medium">
                             {index + 1}
                           </div>
                           <div>
                             <p className="font-medium text-gray-900">@{domain}</p>
                             <p className="text-sm text-gray-500">{count} registrations</p>
                           </div>
                         </div>
                         <div className="text-right">
                           <div className="text-base font-semibold text-gray-900">{percentage}%</div>
                           <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                             <div 
                               className="h-full bg-gray-600 rounded-full transition-all duration-200"
                               style={{ width: `${percentage}%` }}
                             ></div>
                           </div>
                         </div>
                       </div>
                     </div>
                   );
                 })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 