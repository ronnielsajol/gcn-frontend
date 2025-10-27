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
import { apiFetch, exportEventAttendees, exportEventAttendeesPDF } from "@/lib/api";
import type { Event, UserForEvent } from "@/types";
import { useEventAttendeesMutations } from "@/hooks/useEventAttendeesMutations";
import { toast } from "sonner";
import UserAvatar from "@/components/user-avatar";
import { cn } from "@/lib/utils";
import EventAttendeesPageSkeleton from "@/components/skeletons/event-attendees-page-skeleton";
import { UserDetailsDialog } from "@/components/user-details-dialog";
import { AddAttendeesDialog } from "@/components/add-attendees-dialog";
import { fetchStatsForEventSpheres } from "@/lib/api/stats";
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
	PaginationEllipsis,
} from "@/components/ui/pagination";
import useDebounce from "@/hooks/use-debounce";

// --- React Query Setup ---
const queryKeys = {
	eventDetails: (eventId: string) => ["events", eventId, "details"] as const,
	eventUsers: (eventId: string, page?: number, search?: string) => ["events", eventId, "users", page, search] as const,
	paginatedUsers: () => ["users", "paginated"] as const,
};

const fetchEventUsers = async (
	eventId: string,
	page: number = 1,
	search: string = "",
	perPage: number = 20
): Promise<UserForEvent> => {
	const params = new URLSearchParams();
	params.append("page", page.toString());
	params.append("per_page", perPage.toString());
	if (search.trim()) {
		params.append("search", search.trim());
	}
	const response = await apiFetch<UserForEvent>(`/events/${eventId}/users?${params.toString()}`, "GET");
	return response;
};

export default function EventAttendeesPage() {
	const router = useRouter();
	const params = useParams();
	const eventId = params.id as string;

	const [searchTerm, setSearchTerm] = useState("");
	const debouncedSearchTerm = useDebounce(searchTerm, 500);
	const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
	const [isAddAttendeesDialogOpen, setIsAddAttendeesDialogOpen] = useState(false);
	const [selectedAttendeesForDeletion, setSelectedAttendeesForDeletion] = useState<Set<string>>(new Set()); // For deleting attendees

	// New state for user details dialog
	const [selectedUser, setSelectedUser] = useState<string | null>(null);
	const [isUserDetailsDialogOpen, setIsUserDetailsDialogOpen] = useState(false);

	// Pagination state
	const [currentPage, setCurrentPage] = useState(1);
	const [perPage] = useState(20);

	const [isExporting, setIsExporting] = useState(false);

	// Reset page to 1 when search term changes
	useEffect(() => {
		setCurrentPage(1);
	}, [debouncedSearchTerm]);

	// --- Mutations ---
	const { handleAttachUsers, isAttaching, attachError, handleDetachUsers, isDetaching } =
		useEventAttendeesMutations(eventId);

	const fetchEventDetails = async (eventId: string): Promise<Event> => {
		const response = await apiFetch<Event>(`/events/${eventId}`, "GET");
		return response;
	};

	// --- Data Fetching for Event Details ---
	const {
		data: event,
		isLoading: eventLoading,
		error: eventError,
	} = useQuery({
		queryKey: queryKeys.eventDetails(eventId),
		queryFn: () => fetchEventDetails(eventId),
		staleTime: 1000 * 60 * 5,
		enabled: !!eventId,
	});

	// --- Data Fetching for event users ---
	const {
		data: eventUsers,
		isLoading: isUsersLoading,
		error: usersError,
	} = useQuery({
		queryKey: queryKeys.eventUsers(eventId, currentPage, debouncedSearchTerm),
		queryFn: () => fetchEventUsers(eventId, currentPage, debouncedSearchTerm, perPage),
		staleTime: 1000 * 60 * 5,
		enabled: !!eventId,
	});

	const { data: stats } = useQuery({
		queryKey: ["stats", eventId],
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

	// --- Filtering Logic ---
	const filteredAttendees = eventUsers?.users.data || [];

	// --- Helper Functions ---
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

	const handleExportEventAttendeesPDF = async () => {
		if (eventUsers?.users.total === 0) {
			alert("No attendees to export");
			return;
		}

		setIsExporting(true);
		try {
			await exportEventAttendeesPDF(Number(eventId));
			console.log(`Event ${eventId} attendees PDF exported successfully`);
			toast.success("PDF export completed successfully!");
		} catch (error) {
			console.error("Event attendees PDF export failed:", error);
			toast.error("PDF export failed. Please try again.");
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
		if (selectedAttendeesForDeletion.size === filteredAttendees?.length && filteredAttendees?.length > 0) {
			setSelectedAttendeesForDeletion(new Set()); // Deselect all
		} else {
			setSelectedAttendeesForDeletion(new Set(filteredAttendees?.map((attendee) => attendee.id))); // Select all
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

	// Pagination handlers
	const handlePageChange = (page: number) => {
		setCurrentPage(page);
		setSelectedAttendeesForDeletion(new Set());
	};

	const totalPages = eventUsers?.users.last_page || 1;
	const hasNextPage = eventUsers?.users.next_page_url !== null;
	const hasPreviousPage = eventUsers?.users.prev_page_url !== null;

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
						<CardHeader className='-mb-6'>
							<div className='flex flex-col gap-4'>
								<CardTitle className='text-lg flex items-center gap-2 w-full sm:w-auto justify-start'>
									<Filter className='w-5 h-5' />
									Filter Attendees
								</CardTitle>
								<div className='flex items-center flex-col sm:flex-row gap-2 w-full sm:w-auto'>
									<Button onClick={handleOpenAddAttendeesDialog} className='flex items-center gap-2 w-full sm:w-auto'>
										<UserPlus className='w-4 h-4' />
										Add Attendees
									</Button>
									<div className='flex flex-col w-full sm:w-auto sm:flex-row gap-2'>
										<Button
											onClick={handleExportEventAttendees}
											disabled={isExporting || eventUsers?.users.total === 0}
											variant='outline'
											className='flex items-center gap-2 bg-transparent w-full sm:w-auto'>
											<Download className='w-4 h-4' />
											{isExporting ? "Exporting..." : "Export CSV"}
										</Button>
										<Button
											onClick={handleExportEventAttendeesPDF}
											disabled={isExporting || eventUsers?.users.total === 0}
											variant='outline'
											className='flex items-center gap-2 bg-transparent w-full sm:w-auto'>
											<Download className='w-4 h-4' />
											{isExporting ? "Exporting..." : "Export PDF"}
										</Button>
									</div>
									{selectedAttendeesForDeletion.size > 0 && (
										<Button
											variant='destructive'
											onClick={handleDeleteSelectedAttendees}
											disabled={isDetaching}
											className='flex items-center gap-2 w-full sm:w-auto'>
											{isDetaching ? (
												<>
													<Loader2 className='w-4 h-4 animate-spin' />
													Deleting...
												</>
											) : (
												<>
													<Trash2 className='w-4 h-4' />
													Delete Selected ({selectedAttendeesForDeletion.size})
												</>
											)}
										</Button>
									)}
									<div className='flex gap-2 flex-row max-sm:justify-start items-start w-full sm:w-auto'>
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
							<div className='flex flex-col lg:flex-row gap-4'>
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
							<div className='flex items-center justify-between mt-4 pt-4 border-t'>
								<div className='flex items-center space-x-2'>
									<Checkbox
										id='select-all-attendees'
										checked={selectedAttendeesForDeletion.size === filteredAttendees?.length && filteredAttendees?.length > 0}
										onCheckedChange={handleSelectAllAttendees}
										disabled={filteredAttendees?.length === 0}
									/>
									<label htmlFor='select-all-attendees' className='text-sm font-medium'>
										Select All ({filteredAttendees?.length})
									</label>
								</div>
								<p className='text-sm text-gray-600'>
									Showing {filteredAttendees?.length} of {eventUsers?.users.total || 0} attendees
								</p>
								{searchTerm && (
									<Button variant='outline' size='sm' onClick={clearFilters} className='bg-transparent'>
										Clear Filters
									</Button>
								)}
							</div>
						</CardContent>
					</Card>
					{/* Attendees Display */}
					{isUsersLoading ? (
						<Card className='py-0'>
							<CardContent className='text-center py-12'>
								<div className='flex items-center justify-center gap-2'>
									<Loader2 className='w-16 h-16 animate-spin text-gray-500' />
								</div>
							</CardContent>
						</Card>
					) : usersError ? (
						<Card>
							<CardContent className='text-center py-12'>
								<Users className='w-16 h-16 text-red-400 mx-auto mb-4' />
								<p className='text-gray-500 mb-2'>Failed to load attendees</p>
								<p className='text-sm text-red-600 mb-4'>{usersError.message}</p>
								<Button variant='outline' className='bg-transparent' onClick={() => window.location.reload()}>
									Try Again
								</Button>
							</CardContent>
						</Card>
					) : filteredAttendees.length > 0 ? (
						<div
							className={cn(
								viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" : "space-y-3"
							)}>
							{filteredAttendees?.map((attendee) => (
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
												{filteredAttendees && (
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

					{/* Pagination Controls */}
					{totalPages > 1 && (
						<Card className='mt-6'>
							<CardContent className='flex items-center justify-between py-4'>
								<div className='text-sm text-gray-600'>
									Showing {eventUsers?.users.from || 0} to {eventUsers?.users.to || 0} of {eventUsers?.users.total || 0} attendees
								</div>
								<Pagination>
									<PaginationContent>
										<PaginationItem>
											<PaginationPrevious
												href='#'
												onClick={(e) => {
													e.preventDefault();
													if (hasPreviousPage) handlePageChange(currentPage - 1);
												}}
												className={!hasPreviousPage ? "pointer-events-none opacity-50" : "cursor-pointer"}
											/>
										</PaginationItem>

										{/* Page Numbers */}
										{Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
											let pageNumber;
											if (totalPages <= 7) {
												pageNumber = i + 1;
											} else {
												// Smart pagination logic
												if (currentPage <= 4) {
													pageNumber = i + 1;
												} else if (currentPage >= totalPages - 3) {
													pageNumber = totalPages - 6 + i;
												} else {
													pageNumber = currentPage - 3 + i;
												}
											}

											if (pageNumber < 1 || pageNumber > totalPages) return null;

											return (
												<PaginationItem key={pageNumber}>
													<PaginationLink
														href='#'
														onClick={(e) => {
															e.preventDefault();
															handlePageChange(pageNumber);
														}}
														isActive={currentPage === pageNumber}
														className='cursor-pointer'>
														{pageNumber}
													</PaginationLink>
												</PaginationItem>
											);
										})}

										{/* Show ellipsis if there are more pages */}
										{totalPages > 7 && currentPage < totalPages - 3 && (
											<PaginationItem>
												<PaginationEllipsis />
											</PaginationItem>
										)}

										<PaginationItem>
											<PaginationNext
												href='#'
												onClick={(e) => {
													e.preventDefault();
													if (hasNextPage) handlePageChange(currentPage + 1);
												}}
												className={!hasNextPage ? "pointer-events-none opacity-50" : "cursor-pointer"}
											/>
										</PaginationItem>
									</PaginationContent>
								</Pagination>
							</CardContent>
						</Card>
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
