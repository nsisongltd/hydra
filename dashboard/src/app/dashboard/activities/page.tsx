'use client';

import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import Navigation from '@/components/Navigation';

interface Activity {
  id: string;
  type: string;
  details: any;
  deviceId: string;
  createdAt: string;
  device: {
    name: string;
    model: string;
  };
}

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadActivities();
  }, [page]);

  const loadActivities = async () => {
    try {
      const response = await api.getActivityLogs({ page, limit: 20 });
      if (response.data) {
        if (page === 1) {
          setActivities(response.data.activities);
        } else {
          setActivities(prev => [...prev, ...response.data.activities]);
        }
        setHasMore(response.data.activities.length === 20);
      }
    } catch (err) {
      setError('Failed to load activities');
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'DEVICE_ENROLLED':
        return '📱';
      case 'DEVICE_CONNECTED':
        return '🟢';
      case 'DEVICE_DISCONNECTED':
        return '🔴';
      case 'DEVICE_LOCKED':
        return '🔒';
      case 'DEVICE_UNLOCKED':
        return '🔓';
      case 'SETTINGS_CHANGED':
        return '⚙️';
      case 'POLICY_UPDATED':
        return '📋';
      default:
        return '❓';
    }
  };

  const formatActivityDetails = (type: string, details: any) => {
    switch (type) {
      case 'SETTINGS_CHANGED':
        return `Settings updated: ${Object.keys(details.settings).join(', ')}`;
      case 'DEVICE_LOCKED':
        return `Device locked by ${details.triggeredBy}`;
      default:
        return JSON.stringify(details);
    }
  };

  if (loading && page === 1) {
    return (
      <div>
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">Loading activities...</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-xl font-semibold text-gray-900">Activity Logs</h1>
            <p className="mt-2 text-sm text-gray-700">
              A list of all device activities and system events.
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 text-red-600 text-sm">{error}</div>
        )}

        <div className="mt-8 flow-root">
          <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                <div className="min-w-full divide-y divide-gray-300">
                  {activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="bg-white px-4 py-5 sm:px-6 hover:bg-gray-50"
                    >
                      <div className="flex space-x-3">
                        <div className="flex-shrink-0 text-2xl">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {activity.device.name} ({activity.device.model})
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatActivityDetails(activity.type, activity.details)}
                          </p>
                          <p className="mt-1 text-xs text-gray-400">
                            {new Date(activity.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {hasMore && (
          <div className="mt-4 text-center">
            <button
              onClick={() => setPage(p => p + 1)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Load More
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 