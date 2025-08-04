"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function SalesAnalytics({ eventId }) {
  const salesReport = useQuery(api.salesAnalytics.getEventSalesReport, { 
    eventId: eventId 
  });

  if (!salesReport) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Analytics</h3>
        <div className="text-gray-500 text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
          Loading sales data...
        </div>
      </div>
    );
  }

  if (salesReport.products.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Analytics</h3>
        <div className="text-gray-500 text-center py-8">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p>No sales data available yet.</p>
          <p className="text-sm">Sales will appear here once customers purchase your digital products.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Analytics</h3>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">Total Revenue</p>
              <p className="text-lg font-semibold text-green-900">
                ₹{(salesReport.summary.totalRevenue / 100).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-800">Units Sold</p>
              <p className="text-lg font-semibold text-blue-900">{salesReport.summary.totalUnits}</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-purple-800">Customers</p>
              <p className="text-lg font-semibold text-purple-900">{salesReport.summary.totalCustomers}</p>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-orange-800">Products</p>
              <p className="text-lg font-semibold text-orange-900">{salesReport.summary.productCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Product-wise Sales */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-gray-900">Product-wise Sales</h4>
        {salesReport.products.map((product) => (
          <div key={product._id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h5 className="text-lg font-medium text-gray-900">{product.productName}</h5>
              <div className="text-right">
                <p className="text-lg font-semibold text-green-600">
                  ₹{(product.totalSales / 100).toFixed(2)}
                </p>
                <p className="text-sm text-gray-500">{product.totalUnits} units sold</p>
              </div>
            </div>

            {/* Customer List */}
            <div className="mt-4">
              <h6 className="text-sm font-medium text-gray-700 mb-2">
                Customers ({product.customerCount})
              </h6>
              <div className="bg-gray-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                {product.customers.map((customer, index) => (
                  <div key={index} className="flex items-center justify-between py-1 border-b border-gray-100 last:border-b-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{customer.customerName}</p>
                      <p className="text-xs text-gray-500">{customer.customerEmail}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        ₹{(customer.amount / 100).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(customer.purchaseDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Product Stats */}
            <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
              <span>Last sale: {product.lastSaleDate ? new Date(product.lastSaleDate).toLocaleDateString() : 'N/A'}</span>
              <span>Avg. price: ₹{((product.totalSales / product.totalUnits) / 100).toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 