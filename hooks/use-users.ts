import { fetchUser, fetchUsers, PaginationParams, UserFilters } from "@/lib/api/user";
import { useQuery } from "@tanstack/react-query";
import { SortingState } from "@tanstack/react-table";
import useDebounce from "./use-debounce";

export const useUsers = (filters: UserFilters, pagination: PaginationParams, sorting: SortingState) => {
	const debouncedSearchTerm = useDebounce(filters.search || "", 500);

	const stableFilters = {
		...filters,
		search: debouncedSearchTerm,
	};

	return useQuery({
		queryKey: ["users", JSON.stringify(stableFilters), JSON.stringify(pagination), JSON.stringify(sorting)],
		queryFn: () => fetchUsers(stableFilters, pagination, sorting),
		staleTime: 1000,
	});
};

export const useUser = (id: string) => {
	return useQuery({
		queryKey: ["user", id],
		queryFn: () => fetchUser(id),
		staleTime: 1000,
	});
};
