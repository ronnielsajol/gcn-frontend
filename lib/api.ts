export interface ApiError extends Error {
	status?: number;
	error?: string;
}

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
	if (token) {
		localStorage.setItem("auth_token", token);
		authToken = token;
	} else {
		localStorage.removeItem("auth_token");
		authToken = null;
	}
};

export const getAuthToken = () => {
	if (!authToken && typeof window !== "undefined") {
		authToken = localStorage.getItem("auth_token");
	}
	return authToken;
};

export const clearAuthToken = () => {
	localStorage.removeItem("auth_token");
	authToken = null;
};

export async function apiFetch<T>(
	url: string,
	method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET",
	body?: Record<string, unknown> | FormData,
	options?: { responseType?: "json" | "blob" }
): Promise<T> {
	const headers: HeadersInit = {
		Accept: options?.responseType === "blob" ? "*/*" : "application/json",
	};

	// Add Authorization header with bearer token
	if (authToken) {
		headers["Authorization"] = `Bearer ${authToken}`;
	}

	const config: RequestInit = {
		method,
		headers,
	};

	if (body) {
		if (body instanceof FormData) {
			config.body = body;
		} else {
			headers["Content-Type"] = "application/json";
			config.body = JSON.stringify(body);
		}
	}

	const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
	const res = await fetch(`${baseUrl}${url}`, config);

	if (!res.ok) {
		const errorBody = await res.json();
		const error: ApiError = new Error(errorBody.message || "An unknown API error occurred");
		error.status = res.status;
		error.error = errorBody.error;
		throw error;
	}

	if (options?.responseType === "blob") {
		return res.blob() as T;
	}

	const contentType = res.headers.get("content-type");
	if (contentType && contentType.indexOf("application/json") !== -1) {
		return res.json();
	}

	return null as T;
}

export async function downloadUserFile(userId: number, fileId: number, fileName: string): Promise<void> {
	try {
		const blob = await apiFetch<Blob>(`/users/${userId}/files/${fileId}/download`, "GET", undefined, {
			responseType: "blob",
		});

		// Create download link
		const url = window.URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = fileName;
		document.body.appendChild(link);
		link.click();

		// Cleanup
		document.body.removeChild(link);
		window.URL.revokeObjectURL(url);
	} catch (error) {
		console.error("Download failed:", error);
		throw error;
	}
}

// Helper function to extract filename from Content-Disposition header
function getFilenameFromResponse(response: Response): string {
	const contentDisposition = response.headers.get("content-disposition");
	if (contentDisposition) {
		const matches = /filename="([^"]+)"/.exec(contentDisposition);
		if (matches && matches[1]) {
			return matches[1];
		}
	}
	return `export_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.csv`;
}

// Generic function for CSV downloads
async function downloadCSV(url: string, fallbackFilename: string): Promise<void> {
	try {
		const headers: HeadersInit = {
			Accept: "text/csv",
		};

		if (authToken) {
			headers["Authorization"] = `Bearer ${authToken}`;
		}

		const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
		const response = await fetch(`${baseUrl}${url}`, {
			method: "GET",
			headers,
		});

		if (!response.ok) {
			const errorBody = await response.json();
			const error: ApiError = new Error(errorBody.message || "CSV export failed");
			error.status = response.status;
			error.error = errorBody.error;
			throw error;
		}

		const blob = await response.blob();
		const filename = getFilenameFromResponse(response) || fallbackFilename;

		// Create download link
		const url_obj = window.URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url_obj;
		link.download = filename;
		document.body.appendChild(link);
		link.click();

		// Cleanup
		document.body.removeChild(link);
		window.URL.revokeObjectURL(url_obj);
	} catch (error) {
		console.error("CSV download failed:", error);
		throw error;
	}
}

/**
 * Export all users with their event attendance count to CSV
 */
export async function exportUsersWithEventCount(): Promise<void> {
	return downloadCSV(
		"/users/export/csv/with-event-count",
		`users_event_attendance_${new Date().toISOString().slice(0, 10)}.csv`
	);
}

/**
 * Export a specific user's detailed information to CSV
 */
export async function exportUserInfo(userId: number): Promise<void> {
	return downloadCSV(`/users/${userId}/export/csv`, `user_${userId}_info_${new Date().toISOString().slice(0, 10)}.csv`);
}

/**
 * Export attendees of a specific event to CSV
 */
export async function exportEventAttendees(eventId: number): Promise<void> {
	return downloadCSV(
		`/events/${eventId}/export/csv/attendees`,
		`event_${eventId}_attendees_${new Date().toISOString().slice(0, 10)}.csv`
	);
}
