import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Event, User } from "@/types";

// Types for mutation inputs
interface AttachUsersInput extends Record<string, unknown> {
	user_id?: number;
	user_ids?: number[];
}

interface DetachUsersInput extends Record<string, unknown> {
	user_id?: number;
	user_ids?: number[];
}

interface AttachUsersResponse {
	message: string;
	event: Event;
	stats: {
		total_attempted: number;
		newly_attached: number;
		already_attached: number;
		total_attendees: number;
	};
}

interface DetachUsersResponse {
	message: string;
	event: Event;
	stats: {
		total_attempted: number;
		actually_detached: number;
		not_attached: number;
		total_attendees: number;
	};
}

// API functions
const attachUsers = async ({
	eventId,
	data,
}: {
	eventId: string;
	data: AttachUsersInput;
}): Promise<AttachUsersResponse> => {
	const response = await apiFetch<AttachUsersResponse>(`/events/${eventId}/users`, "POST", data);
	return response;
};

const detachUsers = async ({
	eventId,
	data,
}: {
	eventId: string;
	data: DetachUsersInput;
}): Promise<DetachUsersResponse> => {
	const response = await apiFetch<DetachUsersResponse>(`/events/${eventId}/users`, "DELETE", data);
	return response;
};

// Custom hooks for mutations
export const useAttachUsers = (eventId: string) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: AttachUsersInput) => attachUsers({ eventId, data }),
		onSuccess: (response) => {
			// Update the specific event details in cache
			queryClient.setQueryData(["events", eventId], response.event);

			// Invalidate events list to refresh it as well
			queryClient.invalidateQueries({ queryKey: ["events"] });
		},
		onError: (error) => {
			console.error("Error attaching users:", error);
		},
	});
};

export const useDetachUsers = (eventId: string) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: DetachUsersInput) => detachUsers({ eventId, data }),
		onSuccess: (response) => {
			// Update the specific event details in cache
			queryClient.setQueryData(["events", eventId], response.event);

			// Invalidate events list to refresh it as well
			queryClient.invalidateQueries({ queryKey: ["events"] });
		},
		onError: (error) => {
			console.error("Error detaching users:", error);
		},
	});
};

// Combined hook for easier usage
export const useEventAttendeesMutations = (eventId: string) => {
	const attachUsersMutation = useAttachUsers(eventId);
	const detachUsersMutation = useDetachUsers(eventId);

	const handleAttachUsers = async (userIds: number[]) => {
		try {
			const data = userIds.length === 1 ? { user_id: userIds[0] } : { user_ids: userIds };

			const response = await attachUsersMutation.mutateAsync(data);
			return response;
		} catch (error) {
			throw error;
		}
	};

	const handleDetachUsers = async (userIds: number[]) => {
		try {
			const data = userIds.length === 1 ? { user_id: userIds[0] } : { user_ids: userIds };

			const response = await detachUsersMutation.mutateAsync(data);
			return response;
		} catch (error) {
			throw error;
		}
	};

	return {
		handleAttachUsers,
		handleDetachUsers,
		isAttaching: attachUsersMutation.isPending,
		isDetaching: detachUsersMutation.isPending,
		attachError: attachUsersMutation.error,
		detachError: detachUsersMutation.error,
	};
};
