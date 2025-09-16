import { SphereStatsResponse } from "@/types";
import { apiFetch } from "../api";

export const fetchStatsForEventSpheres = async (eventId: string): Promise<SphereStatsResponse> => {
	return apiFetch<SphereStatsResponse>(`/stats/events/${eventId}/sphere-stats`);
};
