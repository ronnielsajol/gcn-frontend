import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Event } from "@/types";

// Types for mutation inputs
interface CreateEventInput extends Record<string, unknown> {
	name: string;
	description: string;
	location: string;
	start_time: string;
	end_time: string;
}

interface UpdateEventInput extends Record<string, unknown> {
	name: string;
	description: string;
	location: string;
	start_time: string;
	end_time: string;
}

// API functions
const createEvent = async (data: CreateEventInput): Promise<Event> => {
	const response = await apiFetch<Event>("/events", "POST", data);
	return response;
};

const updateEvent = async ({ id, data }: { id: number; data: UpdateEventInput }): Promise<Event> => {
	const response = await apiFetch<Event>(`/events/${id}`, "PUT", data);
	return response;
};

const deleteEvent = async (id: number): Promise<void> => {
	await apiFetch(`/events/${id}`, "DELETE");
};

// Custom hooks for mutations
export const useCreateEvent = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: createEvent,
		onSuccess: () => {
			// Invalidate and refetch events data to update the UI
			queryClient.invalidateQueries({ queryKey: ["events"] });
		},
		onError: (error) => {
			console.error("Error creating event:", error);
		},
	});
};

export const useUpdateEvent = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updateEvent,
		onSuccess: () => {
			// Invalidate and refetch events data to update the UI
			queryClient.invalidateQueries({ queryKey: ["events"] });
		},
		onError: (error) => {
			console.error("Error updating event:", error);
		},
	});
};

export const useDeleteEvent = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: deleteEvent,
		onSuccess: () => {
			// Invalidate and refetch events data to update the UI
			queryClient.invalidateQueries({ queryKey: ["events"] });
		},
		onError: (error) => {
			console.error("Error deleting event:", error);
		},
	});
};

// Usage in your component:
// Replace the existing placeholder functions with these:

export const useEventMutations = () => {
	const createEventMutation = useCreateEvent();
	const updateEventMutation = useUpdateEvent();
	const deleteEventMutation = useDeleteEvent();

	const handleCreateEvent = async (formData: CreateEventInput) => {
		try {
			await createEventMutation.mutateAsync(formData);
			// Success handled by onSuccess callback
		} catch (error) {
			// Error handled by onError callback
			throw error;
		}
	};

	const handleUpdateEvent = async (id: number, formData: UpdateEventInput) => {
		try {
			await updateEventMutation.mutateAsync({ id, data: formData });
			// Success handled by onSuccess callback
		} catch (error) {
			// Error handled by onError callback
			throw error;
		}
	};

	const handleDeleteEvent = async (id: number) => {
		try {
			await deleteEventMutation.mutateAsync(id);
			// Success handled by onSuccess callback
		} catch (error) {
			// Error handled by onError callback
			throw error;
		}
	};

	return {
		handleCreateEvent,
		handleUpdateEvent,
		handleDeleteEvent,
		isCreating: createEventMutation.isPending,
		isUpdating: updateEventMutation.isPending,
		isDeleting: deleteEventMutation.isPending,
	};
};
