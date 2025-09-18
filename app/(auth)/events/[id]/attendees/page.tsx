"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
// Reusable avatar component
import { Checkbox } from "@/components/ui/checkbox";
import {
	ArrowLeft,
	Search,
	Users,
	Mail,
	Phone,
	MapPin,
	Calendar,
	Clock,
	CalendarDays,
	Filter,
	Grid3X3,
	List,
	UserPlus,
	Loader2,
	Trash2,
	Download,
	TrendingUp,
} from "lucide-react";
import { apiFetch, exportEventAttendees } from "@/lib/api";
import type { Event } from "@/types";
import { useEventAttendeesMutations } from "@/hooks/useEventAttendeesMutations";
import { toast } from "sonner";
import UserAvatar from "@/components/user-avatar";
import { cn } from "@/lib/utils";
import EventAttendeesPageSkeleton from "@/components/skeletons/event-attendees-page-skeleton";
import { UserDetailsDialog } from "@/components/user-details-dialog";
import { AddAttendeesDialog } from "@/components/add-attendees-dialog";
import { fetchStatsForEventSpheres } from "@/lib/api/stats";
import { PaginationParams } from "@/lib/api/user";
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
	PaginationEllipsis,
} from "@/components/ui/pagination";

// --- React Query Setup ---
const queryKeys = {
	eventDetails: (eventId: string, page: number, perPage: number, search: string) =>
		["events", eventId, "attendees", page, perPage, search] as const,
	paginatedUsers: () => ["users", "paginated"] as const,
};

export default function EventAttendeesPage() {
	const router = useRouter();
	const params = useParams();
	const eventId = params.id as string;

	const [searchTerm, setSearchTerm] = useState("");
	const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
	const [isAddAttendeesDialogOpen, setIsAddAttendeesDialogOpen] = useState(false);
	const [selectedAttendeesForDeletion, setSelectedAttendeesForDeletion] = useState<Set<string>>(new Set()); // For deleting attendees

	// New state for user details dialog
	const [selectedUser, setSelectedUser] = useState<string | null>(null);
	const [isUserDetailsDialogOpen, setIsUserDetailsDialogOpen] = useState(false);

	const [isExporting, setIsExporting] = useState(false);

	//Pagination
	const [pagination, setPagination] = useState<PaginationParams>({
		pageIndex: 0,
		pageSize: 20,
	});

	// Reset pagination when search changes
	useEffect(() => {
		setPagination((prev) => ({ ...prev, pageIndex: 0 }));
	}, [searchTerm]);

	// --- Mutations ---
	const { handleAttachUsers, isAttaching, attachError, handleDetachUsers, isDetaching } =
		useEventAttendeesMutations(eventId);

	const fetchEventDetails = async (eventId: string, page = 1, perPage = 20, search = ""): Promise<Event> => {
		const params = new URLSearchParams();
		params.append("page", page.toString());
		params.append("per_page", perPage.toString());
		if (search) {
			params.append("search", search);
		}
		const response = await apiFetch<Event>(`/events/${eventId}?${params.toString()}`, "GET");
		return response;
	};

	// --- Data Fetching for Event Details ---
	const {
		data: event,
		isLoading: eventLoading,
		error: eventError,
	} = useQuery({
		queryKey: queryKeys.eventDetails(eventId, pagination.pageIndex + 1, pagination.pageSize, searchTerm),
		queryFn: () => fetchEventDetails(eventId, pagination.pageIndex + 1, pagination.pageSize, searchTerm),
		staleTime: 1000 * 60 * 5,
		enabled: !!eventId,
	});

	const {
		data: stats,
		isLoading: statsLoading,
		error: statsError,
	} = useQuery({
		queryKey: ["stats"],
		queryFn: () => fetchStatsForEventSpheres(eventId),
		staleTime: 1000 * 60 * 5,
	});

	// Show loading state
	if (eventLoading) {
		return <EventAttendeesPageSkeleton />;
	}

	// Show error state
	if (eventError) {
		return (
			<div className='min-h-screen bg-gray-50'>
				<div className='py-8 px-4'>
					<div className='max-w-7xl mx-auto'>
						<Button variant='ghost' onClick={() => router.back()} className='flex items-center gap-2 mb-4'>
							<ArrowLeft className='w-4 h-4' />
							Back to Events
						</Button>
						<Card>
							<CardContent className='text-center py-12'>
								<div className='text-red-500 mb-4'>
									<CalendarDays className='w-16 h-16 mx-auto mb-4' />
								</div>
								<p className='text-gray-500 mb-4'>Failed to load event details</p>
								<p className='text-sm text-red-600 mb-4'>{eventError.message}</p>
								<Button variant='outline' onClick={() => window.location.reload()} className='bg-transparent'>
									Try Again
								</Button>
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		);
	}

	// If no event data, show not found
	if (!event) {
		return (
			<div className='min-h-screen bg-gray-50'>
				<div className='py-8 px-4'>
					<div className='max-w-7xl mx-auto'>
						<Button variant='ghost' onClick={() => router.back()} className='flex items-center gap-2 mb-4'>
							<ArrowLeft className='w-4 h-4' />
							Back to Events
						</Button>
						<Card>
							<CardContent className='text-center py-12'>
								<CalendarDays className='w-16 h-16 text-gray-400 mx-auto mb-4' />
								<p className='text-gray-500'>Event not found</p>
								<Button variant='outline' onClick={() => router.back()} className='mt-4 bg-transparent'>
									Go Back
								</Button>
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		);
	}

	// --- Helper Functions ---
	const attendees = event.users?.data;
	const formatDateTime = (dateString: string) => {
		const date = new Date(dateString);
		return {
			date: date.toLocaleDateString(),
			time: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
		};
	};

	const startDateTime = formatDateTime(event.start_time);
	const endDateTime = formatDateTime(event.end_time);

	const clearFilters = () => {
		setSearchTerm("");
	};

	const handleExportEventAttendees = async () => {
		if (event.users?.data.length === 0) {
			alert("No attendees to export");
			return;
		}

		setIsExporting(true);
		try {
			await exportEventAttendees(Number(eventId));
			console.log(`Event ${eventId} attendees exported successfully`);
		} catch (error) {
			console.error("Event attendees export failed:", error);
		} finally {
			setIsExporting(false);
		}
	};

	const handleOpenAddAttendeesDialog = () => {
		setIsAddAttendeesDialogOpen(true);
	};

	const handleToggleAttendeeForDeletion = (attendeeId: string, checked: boolean) => {
		setSelectedAttendeesForDeletion((prev) => {
			const newSet = new Set(prev);
			if (checked) {
				newSet.add(attendeeId);
			} else {
				newSet.delete(attendeeId);
			}
			return newSet;
		});
	};

	const handleSelectAllAttendees = () => {
		if (selectedAttendeesForDeletion.size === attendees?.length && attendees?.length > 0) {
			setSelectedAttendeesForDeletion(new Set()); // Deselect all
		} else {
			setSelectedAttendeesForDeletion(new Set(attendees?.map((attendee) => attendee.id))); // Select all
		}
	};

	const handleDeleteSelectedAttendees = async () => {
		if (selectedAttendeesForDeletion.size === 0) return;
		try {
			const userIdsToDelete = Array.from(selectedAttendeesForDeletion).map(Number);
			const response = await handleDetachUsers(userIdsToDelete);
			toast.success(`Removed ${response.stats.actually_detached} attendees successfully!`);
			setSelectedAttendeesForDeletion(new Set());
		} catch (error) {
			console.error("Failed to delete attendees:", error);
		}
	};

	const handleUserCardClick = (userId: string, event: React.MouseEvent) => {
		const target = event.target as HTMLElement;
		if (target.closest('button[role="checkbox"]') || target.closest('input[type="checkbox"]')) {
			return;
		}
		setSelectedUser(userId);
		setIsUserDetailsDialogOpen(true);
	};

	const handleAddUsersToEvent = async (userIds: number[]) => {
		const response = await handleAttachUsers(userIds);
		toast.success(`Added ${response.stats.newly_attached} attendees successfully!`);
	};

	return (
		<div className='min-h-screen bg-gray-50'>
			<div className='py-8 px-4'>
				<div className='max-w-7xl mx-auto'>
					{/* Header */}
					<div className='mb-6'>
						<Button variant='ghost' onClick={() => router.back()} className='flex items-center gap-2 mb-4'>
							<ArrowLeft className='w-4 h-4' />
							Back to Events
						</Button>
						<Card className='mb-6'>
							<CardHeader>
								<div className='grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 items-center'>
									<div className='flex gap-2 md:gap-6'>
										<div className='w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center'>
											<CalendarDays className='w-6 h-6 text-blue-600' />
										</div>
										<div className='flex flex-col items-end w-full md:items-start'>
											<h1 className='text-2xl font-bold text-gray-900'>{event.name}</h1>
											<p className='text-gray-600'>{event.description}</p>
										</div>
									</div>
									<div className='flex justify-between gap-4 md:justify-end'>
										<div className=''>
											<div className='text-sm text-gray-500'>Total Registrants</div>
											<div className='text-2xl font-bold text-blue-600'>{event.users?.total}</div>
										</div>
										<div className=''>
											<div className='text-sm text-gray-500'>Total Attendees</div>
											<div className='text-2xl font-bold text-green-600'>{event.attended_count}</div>
										</div>
									</div>
								</div>
							</CardHeader>
							<CardContent className='md:px-26'>
								<div className='flex flex-col'>
									<div className='flex-1'>
										<div className='grid grid-cols-1 md:grid-cols-3 gap-4 text-sm'>
											<div className='flex items-center gap-2 text-gray-600'>
												<MapPin className='w-4 h-4' />
												<span>{event.location}</span>
											</div>
											<div className='flex items-center gap-2 text-gray-600'>
												<Calendar className='w-4 h-4' />
												<span>{startDateTime.date}</span>
											</div>
											<div className='flex items-center gap-2 text-gray-600'>
												<Clock className='w-4 h-4' />
												<span>
													{startDateTime.time} - {endDateTime.time}
												</span>
											</div>
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
					</div>
					{/* Stats */}
					<Card className='mb-6'>
						<CardHeader>
							<div className='flex items-center gap-2'>
								<TrendingUp className='h-5 w-5 text-primary' />
								<CardTitle className='text-base sm:text-lg'>Attendees by Sphere</CardTitle>
							</div>
						</CardHeader>
						<CardContent>
							<div className='grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4'>
								{stats?.sphere_stats.map((stat) => (
									<div key={stat.sphere_id} className='text-center p-3 sm:p-4 rounded-lg transition-colors'>
										<div className='flex items-center justify-center mb-2'>
											<Users className='h-4 w-4 sm:h-5 sm:w-5 text-primary' />
										</div>
										<div className='text-lg sm:text-2xl font-bold text-primary mb-1'>{stat.user_count}</div>
										<div className='text-xs sm:text-sm text-muted-foreground leading-tight break-words'>{stat.sphere_name}</div>
										<div className='text-xs sm:text-sm text-muted-foreground font-medium mt-1'>{stat.percentage}%</div>
									</div>
								))}
							</div>
						</CardContent>
					</Card>

					{/* Filters */}
					<Card className='mb-6'>
						<CardHeader>
							<div className='flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0'>
								<CardTitle className='text-lg flex items-center gap-2'>
									<Filter className='w-5 h-5' />
									Filter Attendees
								</CardTitle>
								<div className='flex flex-wrap items-center gap-2'>
									<Button onClick={handleOpenAddAttendeesDialog} className='flex items-center gap-2 text-sm'>
										<UserPlus className='w-4 h-4' />
										<span className='hidden sm:inline'>Add Attendees</span>
										<span className='sm:hidden'>Add</span>
									</Button>
									<Button
										onClick={handleExportEventAttendees}
										disabled={isExporting || event.users?.data.length === 0}
										variant='outline'
										className='flex items-center gap-2 bg-transparent text-sm'>
										<Download className='w-4 h-4' />
										<span className='hidden md:inline'>{isExporting ? "Exporting..." : `Export Attendees (${event.users?.total})`}</span>
										<span className='md:hidden'>{isExporting ? "Exporting..." : "Export"}</span>
									</Button>
									{selectedAttendeesForDeletion.size > 0 && (
										<Button
											variant='destructive'
											onClick={handleDeleteSelectedAttendees}
											disabled={isDetaching}
											className='flex items-center gap-2 text-sm'>
											{isDetaching ? (
												<>
													<Loader2 className='w-4 h-4 animate-spin' />
													<span className='hidden sm:inline'>Deleting...</span>
													<span className='sm:hidden'>...</span>
												</>
											) : (
												<>
													<Trash2 className='w-4 h-4' />
													<span className='hidden sm:inline'>Delete Selected ({selectedAttendeesForDeletion.size})</span>
													<span className='sm:hidden'>Delete ({selectedAttendeesForDeletion.size})</span>
												</>
											)}
										</Button>
									)}
									<div className='flex items-center gap-1 ml-auto lg:ml-0'>
										<Button variant={viewMode === "grid" ? "default" : "outline"} size='sm' onClick={() => setViewMode("grid")}>
											<Grid3X3 className='w-4 h-4' />
										</Button>
										<Button variant={viewMode === "list" ? "default" : "outline"} size='sm' onClick={() => setViewMode("list")}>
											<List className='w-4 h-4' />
										</Button>
									</div>
								</div>
							</div>
						</CardHeader>
						<CardContent>
							<div className='flex flex-col space-y-4'>
								<div className='flex-1'>
									<div className='relative'>
										<Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
										<Input
											placeholder='Search attendees by name, email'
											value={searchTerm}
											onChange={(e) => setSearchTerm(e.target.value)}
											className='pl-10'
										/>
									</div>
								</div>
							</div>
							<div className='flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 mt-4 pt-4 border-t'>
								<div className='flex items-center space-x-2'>
									<Checkbox
										id='select-all-attendees'
										checked={selectedAttendeesForDeletion.size === attendees?.length && attendees?.length > 0}
										onCheckedChange={handleSelectAllAttendees}
										disabled={attendees?.length === 0}
									/>
									<label htmlFor='select-all-attendees' className='text-sm font-medium'>
										Select All ({attendees?.length})
									</label>
								</div>
								<div className='flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-gray-600'>
									<p>
										Showing {event.users?.to} of {event.users?.total} attendees
									</p>
									{searchTerm && (
										<Button variant='outline' size='sm' onClick={clearFilters} className='bg-transparent w-fit'>
											Clear Filters
										</Button>
									)}
								</div>
							</div>
						</CardContent>
					</Card>
					{/* Attendees Display */}
					{attendees && attendees.length > 0 ? (
						<div
							className={cn(
								viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" : "space-y-3"
							)}>
							{attendees?.map((attendee) => (
								<Card
									key={attendee.id}
									className={cn("hover:shadow-md transition-shadow cursor-pointer", viewMode === "list" ? "p-0" : "py-4")}
									onClick={(e) => handleUserCardClick(attendee.id, e)}>
									{viewMode === "grid" ? (
										<CardContent className='px-4'>
											<div className='flex items-start justify-between mb-3'>
												<Checkbox
													className='w-5 h-5 mt-1'
													id={`delete-attendee-${attendee.id}`}
													checked={selectedAttendeesForDeletion.has(attendee.id)}
													onCheckedChange={(checked) => handleToggleAttendeeForDeletion(attendee.id, !!checked)}
												/>
											</div>
											<div className='flex flex-col items-center text-center space-y-3'>
												{attendees && (
													<UserAvatar user={attendee} avatarSize='w-14 h-14 sm:w-16 sm:h-16 border-1' fallbackStyle='text-base sm:text-lg' />
												)}
												<div className='w-full space-y-1'>
													<h3
														className='font-semibold text-gray-900 text-sm sm:text-base line-clamp-2'
														title={`${attendee.first_name} ${attendee.last_name}`}>
														{attendee.first_name} {attendee.last_name}
													</h3>
													<p className='text-xs sm:text-sm text-gray-600 line-clamp-1' title={attendee.email ?? ""}>
														{attendee.email}
													</p>
													{attendee.contact_number && <p className='text-xs text-gray-500 line-clamp-1'>{attendee.contact_number}</p>}
												</div>
											</div>
										</CardContent>
									) : (
										<CardContent className='p-3 sm:p-4'>
											<div className='flex items-center gap-3 sm:gap-4'>
												<Checkbox
													id={`delete-attendee-${attendee.id}`}
													checked={selectedAttendeesForDeletion.has(attendee.id)}
													onCheckedChange={(checked) => handleToggleAttendeeForDeletion(attendee.id, !!checked)}
													className='flex-shrink-0'
												/>
												<UserAvatar user={attendee} avatarSize='w-10 h-10 sm:w-12 sm:h-12' />
												<div className='flex-1 min-w-0'>
													<h3 className='font-semibold text-gray-900 text-sm sm:text-base line-clamp-1'>
														{attendee.first_name} {attendee.last_name}
													</h3>
													<div className='flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-1'>
														<div className='flex items-center gap-1 text-xs sm:text-sm text-gray-600'>
															<Mail className='w-3 h-3 flex-shrink-0' />
															<span className='truncate'>{attendee.email}</span>
														</div>
														{attendee.contact_number && (
															<div className='flex items-center gap-1 text-xs sm:text-sm text-gray-600'>
																<Phone className='w-3 h-3 flex-shrink-0' />
																<span className='truncate'>{attendee.contact_number}</span>
															</div>
														)}
													</div>
												</div>
											</div>
										</CardContent>
									)}
								</Card>
							))}
						</div>
					) : (
						<Card>
							<CardContent className='text-center py-12'>
								<Users className='w-16 h-16 text-gray-400 mx-auto mb-4' />
								<p className='text-gray-500'>No attendees found matching your criteria</p>
								<Button variant='outline' className='mt-4 bg-transparent' onClick={clearFilters}>
									Clear Filters
								</Button>
							</CardContent>
						</Card>
					)}

					{/* Pagination */}
					{event?.users?.data && event?.users?.data.length > 0 && event?.users?.total > pagination.pageSize && (
						<div className='flex justify-center mt-6 px-2'>
							<Pagination>
								<PaginationContent className='gap-1'>
									{pagination.pageIndex > 0 && (
										<PaginationItem>
											<PaginationPrevious
												onClick={() => setPagination((prev) => ({ ...prev, pageIndex: prev.pageIndex - 1 }))}
												className='cursor-pointer h-9 w-9 p-0 sm:h-10 sm:w-auto sm:px-4 sm:py-2'>
												<span className='sr-only sm:not-sr-only sm:ml-2'>Previous</span>
											</PaginationPrevious>
										</PaginationItem>
									)}

									{/* Page numbers - responsive display */}
									{event?.users && (
										<>
											{/* Show fewer pages on mobile */}
											<div className='flex items-center gap-1'>
												{/* Previous pages - show 1 on mobile, 2 on desktop */}
												{Array.from(
													{
														length: Math.min(2, pagination.pageIndex),
													},
													(_, i) => (
														<PaginationItem key={pagination.pageIndex - i - 1} className={i > 0 ? "hidden sm:block" : ""}>
															<PaginationLink
																onClick={() => setPagination((prev) => ({ ...prev, pageIndex: pagination.pageIndex - i - 1 }))}
																className='cursor-pointer h-9 w-9 p-0 text-sm'>
																{pagination.pageIndex - i}
															</PaginationLink>
														</PaginationItem>
													)
												).reverse()}

												{/* Current page */}
												<PaginationItem>
													<PaginationLink isActive className='cursor-pointer h-9 w-9 p-0 text-sm'>
														{pagination.pageIndex + 1}
													</PaginationLink>
												</PaginationItem>

												{/* Next pages - show 1 on mobile, 2 on desktop */}
												{Array.from(
													{
														length: Math.min(2, Math.max(0, Math.ceil(event.users.total / pagination.pageSize) - pagination.pageIndex - 1)),
													},
													(_, i) => (
														<PaginationItem key={pagination.pageIndex + i + 1} className={i > 0 ? "hidden sm:block" : ""}>
															<PaginationLink
																onClick={() => setPagination((prev) => ({ ...prev, pageIndex: pagination.pageIndex + i + 1 }))}
																className='cursor-pointer h-9 w-9 p-0 text-sm'>
																{pagination.pageIndex + i + 2}
															</PaginationLink>
														</PaginationItem>
													)
												)}

												{/* Show ellipsis if there are more pages (only on larger screens) */}
												{Math.ceil(event.users.total / pagination.pageSize) > pagination.pageIndex + 3 && (
													<PaginationItem className='hidden sm:block'>
														<PaginationEllipsis className='h-9 w-9 p-0' />
													</PaginationItem>
												)}
											</div>
										</>
									)}

									{event?.users && pagination.pageIndex < Math.ceil(event.users.total / pagination.pageSize) - 1 && (
										<PaginationItem>
											<PaginationNext
												onClick={() => setPagination((prev) => ({ ...prev, pageIndex: prev.pageIndex + 1 }))}
												className='cursor-pointer h-9 w-9 p-0 sm:h-10 sm:w-auto sm:px-4 sm:py-2'>
												<span className='sr-only sm:not-sr-only sm:mr-2'>Next</span>
											</PaginationNext>
										</PaginationItem>
									)}
								</PaginationContent>
							</Pagination>
						</div>
					)}

					{/* User Details Dialog */}
					<UserDetailsDialog
						isOpen={isUserDetailsDialogOpen}
						onClose={() => {
							setIsUserDetailsDialogOpen(false);
							setSelectedUser(null);
						}}
						userId={selectedUser}
					/>

					{/* Add Attendees Dialog */}
					<AddAttendeesDialog
						isOpen={isAddAttendeesDialogOpen}
						onClose={() => setIsAddAttendeesDialogOpen(false)}
						currentAttendeeIds={event.users?.data.map((user) => user.id) || []}
						onAddUsers={handleAddUsersToEvent}
						isAttaching={isAttaching}
						attachError={attachError}
					/>
				</div>
			</div>
		</div>
	);
}
