"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	useReactTable,
	type ColumnDef,
	type SortingState,
	type PaginationState,
} from "@tanstack/react-table";
import { ApiError, apiFetch } from "@/lib/api";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
	Search,
	Plus,
	Loader2,
	ArrowUpDown,
	ArrowUp,
	ArrowDown,
	Eye,
	Trash2,
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
} from "lucide-react";
import { User } from "@/types/index";
import UserAvatar from "./user-avatar";

// Laravel pagination response type
interface LaravelPaginationResponse {
	current_page: number;
	data: User[];
	first_page_url: string;
	from: number;
	last_page: number;
	last_page_url: string;
	links: Array<{
		url: string | null;
		label: string;
		active: boolean;
	}>;
	next_page_url: string | null;
	path: string;
	per_page: number;
	prev_page_url: string | null;
	to: number;
	total: number;
}

const fetchAdmins = async (
	filters: { search: string; gender: string; religion: string },
	pagination: { pageIndex: number; pageSize: number },
	sorting: SortingState
): Promise<LaravelPaginationResponse> => {
	const params = new URLSearchParams();

	// Add filters
	if (filters.search) params.append("search", filters.search);
	if (filters.gender && filters.gender !== "all") params.append("gender", filters.gender);
	if (filters.religion && filters.religion !== "all") params.append("religion", filters.religion);

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
	const response = await apiFetch<LaravelPaginationResponse>(`/admins?${queryString}`);
	return response;
};

const deleteAdmin = (adminId: string) => {
	return apiFetch(`/admins/${adminId}`, "DELETE");
};

// --- Custom Hooks ---
function useDebounce<T>(value: T, delay: number): T {
	const [debouncedValue, setDebouncedValue] = useState<T>(value);
	useEffect(() => {
		const handler = setTimeout(() => {
			setDebouncedValue(value);
		}, delay);
		return () => {
			clearTimeout(handler);
		};
	}, [value, delay]);
	return debouncedValue;
}

// --- Column Helper ---
const columnHelper = createColumnHelper<User>();

// --- Component Definition ---
interface UsersTableProps {
	currentUser: User;
}

export default function AdminsTable({ currentUser }: UsersTableProps) {
	const queryClient = useQueryClient();

	// --- State Management ---
	const [searchTerm, setSearchTerm] = useState("");
	const [genderFilter, setGenderFilter] = useState("all");
	const [religionFilter, setReligionFilter] = useState("all");
	const [selectedUser, setSelectedUser] = useState<User | null>(null);
	const [sorting, setSorting] = useState<SortingState>([]);
	const [availableReligions, setAvailableReligions] = useState<string[]>([]);
	const [pagination, setPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: 15,
	});
	const debouncedSearchTerm = useDebounce(searchTerm, 500);

	// Reset to first page when filters change
	useEffect(() => {
		setPagination((prev) => ({ ...prev, pageIndex: 0 }));
	}, [debouncedSearchTerm, genderFilter, religionFilter]);

	// --- React Query Hooks ---
	const {
		data: paginationData,
		isLoading,
		isError,
	} = useQuery({
		queryKey: [
			"admins",
			{
				search: debouncedSearchTerm,
				gender: genderFilter,
				religion: religionFilter,
			},
			pagination,
			sorting,
		],
		queryFn: () =>
			fetchAdmins({ search: debouncedSearchTerm, gender: genderFilter, religion: religionFilter }, pagination, sorting),
	});

	console.log("Pagination Data:", paginationData);
	const deleteMutation = useMutation({
		mutationFn: deleteAdmin,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admins"] });
		},
		onError: (error: ApiError) => {
			console.error("Failed to delete user:", error.message);
			// You can add a toast notification here
		},
	});

	// Extract data from pagination response
	const admins = paginationData?.data || [];
	const pageCount = paginationData?.last_page || 0;
	const totalRecords = paginationData?.total || 0;

	// --- Event Handlers & Formatters ---
	const handleDelete = (userId: string) => {
		if (window.confirm("Are you sure you want to delete this admin? This action cannot be undone.")) {
			deleteMutation.mutate(userId);
		}
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString();
	};

	const columns = useMemo<ColumnDef<User>[]>(
		() => [
			{
				accessorKey: "name",
				header: ({ column }) => {
					return (
						<Button
							variant='ghost'
							onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
							className='h-8 p-0 font-semibold'>
							User
							{column.getIsSorted() === "asc" ? (
								<ArrowUp className='ml-2 h-4 w-4' />
							) : column.getIsSorted() === "desc" ? (
								<ArrowDown className='ml-2 h-4 w-4' />
							) : (
								<ArrowUpDown className='ml-2 h-4 w-4' />
							)}
						</Button>
					);
				},
				cell: ({ row }) => {
					const user = row.original;
					return (
						<div className='flex items-center space-x-3'>
							<div className='flex-shrink-0 w-10 h-10'>
								{user.profile_image ?? <UserAvatar user={user} avatarSize={"w-10 h-10"} fallbackStyle={"font-semibold"} />}
							</div>
							<div>
								<div className='font-medium text-gray-900'>{`${user.first_name} ${user.last_name}`}</div>
							</div>
						</div>
					);
				},
			},
			{
				accessorKey: "email",
				header: ({ column }) => {
					return (
						<Button
							variant='ghost'
							onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
							className='h-8 p-0 font-semibold'>
							Contact Info
							{column.getIsSorted() === "asc" ? (
								<ArrowUp className='ml-2 h-4 w-4' />
							) : column.getIsSorted() === "desc" ? (
								<ArrowDown className='ml-2 h-4 w-4' />
							) : (
								<ArrowUpDown className='ml-2 h-4 w-4' />
							)}
						</Button>
					);
				},
				cell: ({ row }) => {
					const user = row.original;
					return (
						<div>
							<div className='text-sm text-gray-900 flex items-center gap-2'>{user.email}</div>
							<div className='text-sm text-gray-500'>{user.contact_number}</div>
						</div>
					);
				},
			},

			{
				accessorKey: "created_at",
				header: ({ column }) => {
					return (
						<Button
							variant='ghost'
							onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
							className='h-8 p-0 font-semibold'>
							Created
							{column.getIsSorted() === "asc" ? (
								<ArrowUp className='ml-2 h-4 w-4' />
							) : column.getIsSorted() === "desc" ? (
								<ArrowDown className='ml-2 h-4 w-4' />
							) : (
								<ArrowUpDown className='ml-2 h-4 w-4' />
							)}
						</Button>
					);
				},
				cell: ({ getValue }) => formatDate(getValue() as string),
			},
			{
				id: "actions",
				header: "Actions",
				cell: ({ row }) => {
					const user = row.original;
					const isCurrentUser = currentUser.id === user.id;
					const isDeleting = deleteMutation.isPending && deleteMutation.variables === user.id;

					return (
						<div className='flex items-center gap-2'>
							<Button variant='outline' size='sm' onClick={() => setSelectedUser(user)} className='flex items-center gap-1'>
								<Eye className='w-4 h-4' />
								View
							</Button>
							<Link href={`/admins/${user.id}/edit`}>
								<Button variant='outline' size='sm' className='flex items-center gap-1'>
									Edit
								</Button>
							</Link>
							{!isCurrentUser && (
								<Button
									variant='outline'
									size='sm'
									onClick={() => handleDelete(user.id)}
									disabled={isDeleting || !user.is_active}
									className='flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50'>
									{isDeleting ? <Loader2 className='w-4 h-4 animate-spin' /> : <Trash2 className='w-4 h-4' />}
									{isDeleting ? "Deleting..." : "Delete"}
								</Button>
							)}
						</div>
					);
				},
			},
		],
		[currentUser.id, deleteMutation.isPending, deleteMutation.variables]
	);

	// --- Table Instance ---
	const table = useReactTable({
		data: admins,
		columns,
		pageCount, // Server-side page count
		state: {
			sorting,
			pagination,
		},
		onSortingChange: setSorting,
		onPaginationChange: setPagination,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		manualPagination: true,
		manualSorting: true,
	});

	return (
		<div className='space-y-6'>
			{/* Header */}

			{/* Filters */}
			<Card>
				<CardContent className='flex justify-between'>
					<div className='flex flex-col sm:flex-row gap-4'>
						<div className='flex grow'>
							<div className='relative'>
								<Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
								<Input
									placeholder='Search by name, email, or phone...'
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className='pl-10'
								/>
							</div>
						</div>
					</div>
					<Link href='/admins/new'>
						<Button className='flex items-center gap-2'>
							<Plus className='w-4 h-4' />
							Add Admin
						</Button>
					</Link>
				</CardContent>
			</Card>

			{/* Admins Table */}
			<Card>
				<CardContent className='p-0'>
					<div className='overflow-x-auto'>
						<Table>
							<TableHeader>
								{table.getHeaderGroups().map((headerGroup) => (
									<TableRow key={headerGroup.id}>
										{headerGroup.headers.map((header) => (
											<TableHead key={header.id}>
												{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
											</TableHead>
										))}
									</TableRow>
								))}
							</TableHeader>
							<TableBody>
								{isLoading && (
									<TableRow>
										<TableCell colSpan={columns.length} className='text-center py-8'>
											<div className='flex justify-center items-center gap-2'>
												<Loader2 className='w-6 h-6 animate-spin text-gray-500' />
												<span className='text-gray-500'>Loading admins...</span>
											</div>
										</TableCell>
									</TableRow>
								)}
								{isError && (
									<TableRow>
										<TableCell colSpan={columns.length} className='text-center text-red-500 py-8'>
											Failed to load admins. Please try again later.
										</TableCell>
									</TableRow>
								)}
								{table.getRowModel().rows.length === 0 && !isLoading && !isError && (
									<TableRow>
										<TableCell colSpan={columns.length} className='text-center text-gray-500 py-8'>
											No admins found matching your criteria.
										</TableCell>
									</TableRow>
								)}
								{table.getRowModel().rows.map((row) => (
									<TableRow key={row.id}>
										{row.getVisibleCells().map((cell) => (
											<TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
										))}
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>

					{/* Pagination Controls */}
					{!isLoading && !isError && admins.length > 0 && (
						<div className='flex flex-col sm:flex-row justify-between items-center gap-4 p-4 border-t'>
							{/* Results info */}
							<div className='text-sm text-gray-600'>
								Showing {paginationData?.from || 0} to {paginationData?.to || 0} of {totalRecords} results
							</div>

							{/* Pagination controls */}
							<div className='flex items-center gap-2'>
								<Button variant='outline' size='sm' onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>
									<ChevronsLeft className='h-4 w-4' />
								</Button>
								<Button variant='outline' size='sm' onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
									<ChevronLeft className='h-4 w-4' />
								</Button>

								<span className='text-sm text-gray-600 mx-2'>
									Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
								</span>

								<Button variant='outline' size='sm' onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
									<ChevronRight className='h-4 w-4' />
								</Button>
								<Button
									variant='outline'
									size='sm'
									onClick={() => table.setPageIndex(table.getPageCount() - 1)}
									disabled={!table.getCanNextPage()}>
									<ChevronsRight className='h-4 w-4' />
								</Button>

								<Select
									value={table.getState().pagination.pageSize.toString()}
									onValueChange={(value) => table.setPageSize(Number(value))}>
									<SelectTrigger className='w-[70px]'>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{[10, 15, 20, 30, 50].map((pageSize) => (
											<SelectItem key={pageSize} value={pageSize.toString()}>
												{pageSize}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
