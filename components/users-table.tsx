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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
	TrendingUp,
} from "lucide-react";
import { EventForUserResponse, User } from "@/types/index";
import { toast } from "sonner";
import { motion } from "motion/react";
import { TableRowSkeleton } from "./skeletons/table-row-skeleton";
import UserInfoDialog from "./user-info-dialog";
import EventInfoDialog from "./user-events-dialog";
import Image from "next/image";
import { useUsers } from "@/hooks/use-users";
import UserAvatar from "./user-avatar";

// Sphere mapping constant
const SPHERE_MAP: { [key: string]: string } = {
	"1": "Church/Ministry",
	"2": "Family/Community",
	"3": "Government/Law",
	"4": "Education/Sports",
	"5": "Business/Economics",
	"6": "Media/Arts/Entertainment",
	"7": "Medicine/Science/Technology",
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
	const [sphereFilter, setSphereFilter] = useState("all");
	const [selectedUser, setSelectedUser] = useState<User | null>(null);
	const [sorting, setSorting] = useState<SortingState>([]);
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
	}, [searchTerm, sphereFilter]);

	const {
		data: paginationData,
		isLoading,
		isError,
	} = useUsers({ search: searchTerm, sphere: sphereFilter }, pagination, sorting);

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
							Email
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
							<div className='text-sm text-gray-900 flex items-center gap-2'>{user.email ? user.email : "N/A"}</div>
							<div className='text-sm text-gray-500'>{user.mobile_number}</div>
						</div>
					);
				},
			},

			{
				accessorKey: "spheres",
				header: () => {
					return <span className='font-semibold'>Spheres</span>;
				},
				cell: ({ row }) => {
					const spheres = row.original.vocation_work_sphere;

					// Mapping function to convert sphere IDs to names
					const getSphereNames = (sphereData: string | number | string[] | number[] | object[] | object | null): string => {
						if (!sphereData) return "";

						// Handle array of sphere data
						if (Array.isArray(sphereData)) {
							return sphereData
								.map((item) => {
									let id: string;

									// Handle different data structures:
									if (typeof item === "object" && item !== null) {
										// If sphere is an object with id property
										const obj = item as Record<string, unknown>;
										id = String(obj.id || obj.sphere_id || obj.value || item);
									} else {
										// If sphere is a primitive value
										id = String(item);
									}

									const mappedName = SPHERE_MAP[id];
									return mappedName || id;
								})
								.join(", ");
						}

						// Handle comma-separated string of sphere IDs
						if (typeof sphereData === "string" && sphereData.includes(",")) {
							return sphereData
								.split(",")
								.map((id) => id.trim()) // Remove whitespace
								.filter((id) => id) // Remove empty strings
								.map((id) => {
									const mappedName = SPHERE_MAP[id];
									return mappedName || id;
								})
								.join(", ");
						}

						// Handle single sphere (object or primitive)
						let id: string;
						if (typeof sphereData === "object" && sphereData !== null) {
							const obj = sphereData as Record<string, unknown>;
							id = String(obj.id || obj.sphere_id || obj.value || sphereData);
						} else {
							id = String(sphereData);
						}

						const mappedName = SPHERE_MAP[id];
						return mappedName || id;
					};

					return spheres ? getSphereNames(spheres) : "N/A";
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
				header: () => {
					return <span className='font-semibold'>Actions</span>;
				},
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
						<div className='flex gap-2'>
							<Select value={sphereFilter} onValueChange={setSphereFilter}>
								<SelectTrigger className='w-[220px]'>
									<SelectValue placeholder='Filter by sphere' />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='all'>All Spheres</SelectItem>
									<SelectItem value='1'>Church/Ministry</SelectItem>
									<SelectItem value='2'>Family/Community</SelectItem>
									<SelectItem value='3'>Government/Law</SelectItem>
									<SelectItem value='4'>Education/Sports</SelectItem>
									<SelectItem value='5'>Business/Economics</SelectItem>
									<SelectItem value='6'>Media/Arts/Entertainment</SelectItem>
									<SelectItem value='7'>Medicine/Science/Technology</SelectItem>
									<SelectItem value='0'>None</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
					<div className='flex gap-2'>
						<Link href='/users/new'>
							<Button className='flex items-center gap-2 cursor-pointer'>
								<Plus className='w-4 h-4' />
								Add User
							</Button>
						</Link>
						<Button
							onClick={handleExportUsersWithEventCount}
							variant='outline'
							className='flex items-center gap-2 bg-transparent'
							disabled={isExporting}>
							{isExporting ? <Loader2 className='w-4 h-4 animate-spin' /> : <Download className='w-4 h-4' />}
							{isExporting ? "Exporting..." : "Export CSV"}
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
