import { PaginatedResponse, User } from "@/types";
import { SortingState } from "@tanstack/react-table";
import { apiFetch } from "../api";

export type UserFilters = {
	search?: string;
	gender?: string;
	religion?: string;
	sphere?: string;
};

export type PaginationParams = {
	pageIndex: number;
	pageSize: number;
};

export const fetchUsers = async (
	filters: UserFilters,
	pagination: PaginationParams,
	sorting: SortingState
): Promise<PaginatedResponse<User>> => {
	const params = new URLSearchParams();

	// Add filters
	if (filters.search) params.append("search", filters.search);
	if (filters.gender && filters.gender !== "all") params.append("gender", filters.gender);
	if (filters.religion && filters.religion !== "all") params.append("religion", filters.religion);
	if (filters.sphere && filters.sphere !== "all") params.append("sphere_id", filters.sphere);

	// Add pagination (Laravel uses 1-based indexing)
	params.append("page", (pagination.pageIndex + 1).toString());
	params.append("per_page", pagination.pageSize.toString());

	// Add sorting
	if (sorting.length > 0) {
		const sort = sorting[0];
		params.append("sort", sort.id);
		params.append("direction", sort.desc ? "desc" : "asc");
	}

	const queryString = params.toString();
	return apiFetch<PaginatedResponse<User>>(`/users?${queryString}`);
};

export const fetchUser = async (id: string): Promise<User> => {
	return apiFetch<User>(`/users/${id}`);
};
