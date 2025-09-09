"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	useReactTable,
	type ColumnDef,
	type SortingState,
	type PaginationState,
} from "@tanstack/react-table";
import { ApiError, apiFetch, exportUsersWithEventCount } from "@/lib/api";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Search,
	Plus,
	Loader2,
	ArrowUpDown,
	ArrowUp,
	ArrowDown,
	Trash2,
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
	CalendarDays,
	Files,
	Download,
} from "lucide-react";
import { EventForUserResponse, User } from "@/types/index";
import { toast } from "sonner";
import { motion } from "motion/react";
import { TableRowSkeleton } from "./skeletons/table-row-skeleton";
import UserInfoDialog from "./user-info-dialog";
import EventInfoDialog from "./user-events-dialog";
import useDebounce from "@/hooks/use-debounce";
import Image from "next/image";
import { useUsers } from "@/hooks/use-users";
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

const fetchUsers = async (
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
	const response = await apiFetch<LaravelPaginationResponse>(`/users?${queryString}`);
	return response;
};

const fetchEventsForUser = async (userId: string): Promise<EventForUserResponse> => {
	const response = await apiFetch<EventForUserResponse>(`/users/${userId}/events`);
	return response;
};

const deleteUser = (userId: string) => {
	return apiFetch(`/users/${userId}`, "DELETE");
};

// --- Component Definition ---
interface UsersTableProps {
	currentUser: User;
}

export default function UsersTable({ currentUser }: UsersTableProps) {
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
	// State for delete confirmation dialog
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [userToDelete, setUserToDelete] = useState<User | null>(null);
	const [isEventsForUserDialogOpen, setIsEventsForUserDialogOpen] = useState(false);
	const [isExporting, setIsExporting] = useState(false);

	useEffect(() => {
		setPagination((prev) => ({ ...prev, pageIndex: 0 }));
	}, [searchTerm, genderFilter, religionFilter]);

	const {
		data: paginationData,
		isLoading,
		isError,
	} = useUsers({ search: searchTerm, gender: genderFilter, religion: religionFilter }, pagination, sorting);

	const { data: userEvents, isLoading: isEventsLoading } = useQuery({
		queryKey: ["userEvents", selectedUser?.id],
		queryFn: () => (selectedUser ? fetchEventsForUser(selectedUser.id) : Promise.resolve(null)),
		enabled: !!selectedUser && isEventsForUserDialogOpen,
	});

	const deleteMutation = useMutation({
		mutationFn: deleteUser,
		onSuccess: () => {
			toast.success("User deleted successfully!");
			queryClient.invalidateQueries({ queryKey: ["users"] });
		},
		onError: (error: ApiError) => {
			console.error("Failed to delete user:", error.message);
		},
	});

	// Extract data from pagination response
	const users = paginationData?.data || [];
	const pageCount = paginationData?.last_page || 0;
	const totalRecords = paginationData?.total || 0;

	// --- Event Handlers & Formatters ---
	const handleOpenDeleteDialog = (user: User) => {
		setUserToDelete(user);
		setIsDeleteDialogOpen(true);
	};

	const handleExportUsersWithEventCount = async () => {
		setIsExporting(true);
		try {
			await exportUsersWithEventCount();
			// Optional: Show success message
			console.log("Users exported successfully");
		} catch (error) {
			console.error("Export failed:", error);
			// Handle error (show toast, etc.)
		} finally {
			setIsExporting(false);
		}
	};

	const handleConfirmDelete = () => {
		if (!userToDelete) return;
		deleteMutation.mutate(userToDelete.id, {
			onSuccess: () => {
				setIsDeleteDialogOpen(false);
				setUserToDelete(null);
			},
		});
	};
	const handleOpenEventsDialog = (user: User) => {
		setSelectedUser(user);
		setIsEventsForUserDialogOpen(true);
	};

	const formatGender = (gender: string) => gender.charAt(0).toUpperCase() + gender.slice(1);

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString();
	};

	useEffect(() => {
		if (paginationData?.data) {
			const religions = [
				...new Set(paginationData.data.map((user) => user.religion).filter((religion) => religion && religion.trim() !== "")),
			].sort();
			setAvailableReligions(religions);
		}
	}, [paginationData]);

	const formatOptionLabel = (value: string) => {
		return value
			.split("_")
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(" ");
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
								{user.profile_image ? (
									<Image
										src={user.profile_image}
										alt={`${user.first_name} ${user.last_name}`}
										className='w-10 h-10 rounded-full object-cover'
										width={100}
										height={100}
									/>
								) : (
									<UserAvatar user={user} avatarSize='h-10 w-10 bg-gray-200' />
								)}
							</div>
							<div>
								<div className='font-medium text-gray-900'>{`${user.first_name} ${user.last_name}`}</div>
								<div className='text-sm text-gray-500 flex items-center gap-2'>
									{user.religion}
									<span className='text-xs'>•</span>
								</div>
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
							<div className='text-xs text-gray-400 truncate max-w-[200px]'>{user.address}</div>
						</div>
					);
				},
			},
			{
				accessorKey: "gender",
				header: ({ column }) => {
					return (
						<Button
							variant='ghost'
							onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
							className='h-8 p-0 font-semibold'>
							Gender
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
				cell: ({ getValue }) => formatGender(getValue() as string),
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
					// const isCurrentUser = currentUser.id === user.id;

					return (
						<div className='flex items-center gap-2'>
							<Button variant='outline' size='sm' onClick={() => handleOpenEventsDialog(user)}>
								<CalendarDays className='w-4 h-4' />
								Events
							</Button>
							<UserInfoDialog user={user} />
							<Link href={`/users/${user.id}/files`}>
								<Button variant='outline' size='sm' className='flex items-center gap-1'>
									<Files className='w-4 h-4' />
									Files
								</Button>
							</Link>
							<Link href={`/users/${user.id}/edit`}>
								<Button variant='outline' size='sm' className='flex items-center gap-1'>
									Edit
								</Button>
							</Link>
							{user.role == "super_admin" && (
								<Button
									variant='outline'
									size='sm'
									onClick={() => handleOpenDeleteDialog(user)}
									disabled={!user.is_active}
									className='flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50'>
									<Trash2 className='w-4 h-4' />
									Delete
								</Button>
							)}
						</div>
					);
				},
			},
		],
		[currentUser.id]
	);

	const table = useReactTable({
		data: users,
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
			<Card>
				<CardContent className='flex justify-between'>
					<div className='flex flex-col sm:flex-row gap-4'>
						<div className='flex grow'>
							<div className='relative'>
								<Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
								<Input
									placeholder='Search by first name, last name, email, or phone...'
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className='pl-10'
								/>
							</div>
						</div>
						<Select value={genderFilter} onValueChange={setGenderFilter}>
							<SelectTrigger className='w-full sm:w-[180px]'>
								<SelectValue placeholder='Filter by gender' />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value='all'>All Genders</SelectItem>
								<SelectItem value='male'>Male</SelectItem>
								<SelectItem value='female'>Female</SelectItem>
								<SelectItem value='other'>Other</SelectItem>
							</SelectContent>
						</Select>
						<Select value={religionFilter} onValueChange={setReligionFilter}>
							<SelectTrigger className='w-full sm:w-[180px]'>
								<SelectValue placeholder='Filter by religion' />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value='all'>All Religions</SelectItem>
								{availableReligions.map((religion) => (
									<SelectItem key={religion} value={religion}>
										{formatOptionLabel(religion)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className='flex gap-2'>
						<Link href='/users/new'>
							<Button className='flex items-center gap-2 cursor-pointer'>
								<Plus className='w-4 h-4' />
								Add User
							</Button>
						</Link>
						<Button onClick={handleExportUsersWithEventCount} variant='outline' className='flex items-center gap-2 bg-transparent'>
							<Download className='w-4 h-4' />
							Export CSV
						</Button>
					</div>
				</CardContent>
			</Card>

			<Card className='py-2'>
				<CardContent className='p-0'>
					<div className='overflow-x-auto'>
						<Table>
							<colgroup>
								<col style={{ width: "20%" }} />
								<col style={{ width: "25%" }} />
								<col style={{ width: "10%" }} />
								<col style={{ width: "15%" }} />
								<col style={{ width: "30%" }} />
							</colgroup>
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
								{isLoading && Array.from({ length: 10 }).map((_, i) => <TableRowSkeleton key={i} columns={columns.length} />)}
								{isError && (
									<TableRow>
										<TableCell colSpan={columns.length} className='text-center text-red-500 py-8'>
											Failed to load users. Please try again later.
										</TableCell>
									</TableRow>
								)}
								{table.getRowModel().rows.length === 0 && !isLoading && !isError && (
									<TableRow>
										<TableCell colSpan={columns.length} className='text-center text-gray-500 py-8'>
											No users found matching your criteria.
										</TableCell>
									</TableRow>
								)}
								{table.getRowModel().rows.map((row) => (
									<motion.tr key={row.id} transition={{ duration: 0.3 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} layout>
										{row.getVisibleCells().map((cell) => (
											<TableCell key={cell.id} className='px-4'>
												{flexRender(cell.column.columnDef.cell, cell.getContext())}
											</TableCell>
										))}
									</motion.tr>
								))}
							</TableBody>
						</Table>
					</div>

					{!isLoading && !isError && users.length > 0 && (
						<div className='flex flex-col sm:flex-row justify-between items-center gap-4 p-4 border-t'>
							<div className='text-sm text-gray-600'>
								Showing {paginationData?.from || 0} to {paginationData?.to || 0} of {totalRecords} results
							</div>
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

			{/* --- Delete Confirmation Dialog --- */}
			<Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Are you absolutely sure?</DialogTitle>
						<DialogDescription>
							This action cannot be undone. This will permanently delete the user{" "}
							<span className='font-semibold'>
								{userToDelete?.first_name} {userToDelete?.last_name}
							</span>{" "}
							and remove their data.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant='outline' onClick={() => setIsDeleteDialogOpen(false)} disabled={deleteMutation.isPending}>
							Cancel
						</Button>
						<Button variant='destructive' onClick={handleConfirmDelete} disabled={deleteMutation.isPending}>
							{deleteMutation.isPending ? (
								<>
									<Loader2 className='mr-2 h-4 w-4 animate-spin' />
									Deleting...
								</>
							) : (
								"Delete"
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{selectedUser && (
				<EventInfoDialog
					open={isEventsForUserDialogOpen}
					onOpenChange={setIsEventsForUserDialogOpen}
					user={selectedUser}
					events={userEvents}
					isLoading={isEventsLoading}
				/>
			)}
		</div>
	);
}
