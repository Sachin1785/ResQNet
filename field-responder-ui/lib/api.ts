const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Fetch wrapper with error handling
async function fetchAPI(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE_URL}${endpoint}`;

    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true',
                ...options.headers,
            },
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Incidents API
export const incidentsAPI = {
    getAll: async (filters?: { status?: string; severity?: string; type?: string }) => {
        const params = new URLSearchParams();
        if (filters?.status) params.append('status', filters.status);
        if (filters?.severity) params.append('severity', filters.severity);
        if (filters?.type) params.append('type', filters.type);

        const query = params.toString() ? `?${params.toString()}` : '';
        return fetchAPI(`/incidents${query}`);
    },

    getById: async (id: number) => {
        return fetchAPI(`/incidents/${id}`);
    },

    create: async (data: any) => {
        return fetchAPI('/incidents', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    update: async (id: number, data: any) => {
        return fetchAPI(`/incidents/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    resolve: async (id: number, confirm: boolean = false) => {
        return fetchAPI(`/incidents/${id}/resolve`, {
            method: 'POST',
            body: JSON.stringify({ confirm }),
        });
    },

    uploadFile: async (id: number, file: File) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_BASE_URL}/incidents/${id}/upload`, {
            method: 'POST',
            headers: {
                'ngrok-skip-browser-warning': 'true',
            },
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
        }

        return await response.json();
    },
};

// Alerts API
export const alertsAPI = {
    getNearby: async (lat: number, lng: number, radius?: number) => {
        const params = new URLSearchParams({ lat: lat.toString(), lng: lng.toString() });
        if (radius) params.append('radius', radius.toString());
        return fetchAPI(`/alerts/nearby?${params.toString()}`);
    },

    checkGeofence: async (lat: number, lng: number) => {
        return fetchAPI('/alerts/geofence/check', {
            method: 'POST',
            body: JSON.stringify({ lat, lng }),
        });
    },

    getZones: async (activeOnly = true) => {
        return fetchAPI(`/alerts/geofence?active_only=${activeOnly}`);
    },
};

// Personnel API
export const personnelAPI = {
    getAll: async (filters?: { status?: string; role?: string; incident_id?: number }) => {
        const params = new URLSearchParams();
        if (filters?.status) params.append('status', filters.status);
        if (filters?.role) params.append('role', filters.role);
        if (filters?.incident_id) params.append('incident_id', filters.incident_id.toString());

        const query = params.toString() ? `?${params.toString()}` : '';
        return fetchAPI(`/personnel${query}`);
    },

    getById: async (id: number) => {
        return fetchAPI(`/personnel/${id}`);
    },

    getByUserId: async (userId: number) => {
        return fetchAPI(`/personnel/user/${userId}`);
    },

    getAvailable: async () => {
        return fetchAPI('/personnel/available');
    },

    updateLocation: async (id: number, lat: number, lng: number) => {
        return fetchAPI(`/personnel/${id}/location`, {
            method: 'PUT',
            body: JSON.stringify({ lat, lng }),
        });
    },

    updateStatus: async (id: number, status: string) => {
        return fetchAPI(`/personnel/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status }),
        });
    },

    assign: async (personnelId: number, incidentId: number) => {
        return fetchAPI(`/personnel/${personnelId}/assign`, {
            method: 'POST',
            body: JSON.stringify({ incident_id: incidentId })
        });
    },
};

// Communications API
export const commsAPI = {
    getIncidentMessages: async (incidentId: number, limit = 100) => {
        return fetchAPI(`/comms/incident/${incidentId}?limit=${limit}`);
    },

    sendMessage: async (data: { incident_id: number; message: string; sender_name?: string }) => {
        return fetchAPI('/comms', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },
};

// Notifications API
export const notificationsAPI = {
    getAll: async (userId?: number, limit = 50) => {
        const params = new URLSearchParams({ limit: limit.toString() });
        if (userId) params.append('user_id', userId.toString());
        return fetchAPI(`/notifications?${params.toString()}`);
    },

    markAsRead: async (id: number) => {
        return fetchAPI(`/notifications/${id}/read`, {
            method: 'PUT',
        });
    },
};

// Resources API
export const resourcesAPI = {
    getPublic: async () => {
        return fetchAPI('/resources/public');
    },

    getAll: async (filters?: { status?: string; type?: string; is_public?: boolean }) => {
        const params = new URLSearchParams();
        if (filters?.status) params.append('status', filters.status);
        if (filters?.type) params.append('type', filters.type);
        if (filters?.is_public !== undefined) params.append('is_public', filters.is_public.toString());

        const query = params.toString() ? `?${params.toString()}` : '';
        return fetchAPI(`/resources${query}`);
    }
};

export default {
    incidents: incidentsAPI,
    alerts: alertsAPI,
    personnel: personnelAPI,
    comms: commsAPI,
    notifications: notificationsAPI,
    resources: resourcesAPI,
};
