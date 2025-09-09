"use client";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

// --- React Query Setup ---
const queryKeys = {
	eventDetails: (eventId: string) => ["events", eventId] as const,
	paginatedUsers: () => ["users", "paginated"] as const,
};

const fetchEventDetails = async (eventId: string): Promise<Event> => {
	const response = await apiFetch<Event>(`/events/${eventId}`, "GET");
	return response;
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

	// --- Mutations ---
	const { handleAttachUsers, isAttaching, attachError, handleDetachUsers, isDetaching, detachError } =
		useEventAttendeesMutations(eventId);

	// --- Data Fetching for Event Details ---
	const {
		data: event,
		isLoading,
		error,
	} = useQuery({
		queryKey: queryKeys.eventDetails(eventId),
		queryFn: () => fetchEventDetails(eventId),
		staleTime: 1000 * 60 * 5,
		enabled: !!eventId,
	});

	// Show loading state
	if (isLoading) {
		return <EventAttendeesPageSkeleton />;
	}

	// Show error state
	if (error) {
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
								<p className='text-sm text-red-600 mb-4'>{error.message}</p>
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
	const filteredAttendees = event.users.filter((user) => {
		const matchesSearch =
			user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			user.email.toLowerCase().includes(searchTerm.toLowerCase());
		return matchesSearch;
	});

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
		if (event.users.length === 0) {
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
		if (selectedAttendeesForDeletion.size === filteredAttendees.length && filteredAttendees.length > 0) {
			setSelectedAttendeesForDeletion(new Set()); // Deselect all
		} else {
			setSelectedAttendeesForDeletion(new Set(filteredAttendees.map((attendee) => attendee.id))); // Select all
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
						<div className='bg-white rounded-lg border p-6 mb-6'>
							<div className='flex items-start gap-4'>
								<div className='w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center'>
									<CalendarDays className='w-6 h-6 text-blue-600' />
								</div>
								<div className='flex-1'>
									<h1 className='text-2xl font-bold text-gray-900 mb-2'>{event.name}</h1>
									<p className='text-gray-600 mb-4'>{event.description}</p>
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
								<div className='text-right'>
									<div className='text-2xl font-bold text-blue-600'>{event.users.length}</div>
									<div className='text-sm text-gray-500'>Total Attendees</div>
								</div>
							</div>
						</div>
					</div>
					{/* Filters */}
					<Card className='mb-6'>
						<CardHeader>
							<div className='flex items-center justify-between'>
								<CardTitle className='text-lg flex items-center gap-2'>
									<Filter className='w-5 h-5' />
									Filter Attendees
								</CardTitle>
								<div className='flex items-center gap-2'>
									<Button onClick={handleOpenAddAttendeesDialog} className='flex items-center gap-2'>
										<UserPlus className='w-4 h-4' />
										Add Attendees
									</Button>
									<Button
										onClick={handleExportEventAttendees}
										disabled={isExporting || event.users.length === 0}
										variant='outline'
										className='flex items-center gap-2 bg-transparent'>
										<Download className='w-4 h-4' />
										{isExporting ? "Exporting..." : `Export Attendees (${event.users.length})`}
									</Button>
									{selectedAttendeesForDeletion.size > 0 && (
										<Button
											variant='destructive'
											onClick={handleDeleteSelectedAttendees}
											disabled={isDetaching}
											className='flex items-center gap-2'>
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
									<Button variant={viewMode === "grid" ? "default" : "outline"} size='sm' onClick={() => setViewMode("grid")}>
										<Grid3X3 className='w-4 h-4' />
									</Button>
									<Button variant={viewMode === "list" ? "default" : "outline"} size='sm' onClick={() => setViewMode("list")}>
										<List className='w-4 h-4' />
									</Button>
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
										checked={selectedAttendeesForDeletion.size === filteredAttendees.length && filteredAttendees.length > 0}
										onCheckedChange={handleSelectAllAttendees}
										disabled={filteredAttendees.length === 0}
									/>
									<label htmlFor='select-all-attendees' className='text-sm font-medium'>
										Select All ({filteredAttendees.length})
									</label>
								</div>
								<p className='text-sm text-gray-600'>
									Showing {filteredAttendees.length} of {event.users.length} attendees
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
					{filteredAttendees.length > 0 ? (
						<div
							className={cn(
								viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" : "space-y-3"
							)}>
							{filteredAttendees.map((attendee) => (
								<Card
									key={attendee.id}
									className={cn("hover:shadow-md transition-shadow cursor-pointer py-4", viewMode === "list" ? "p-0" : "")}
									onClick={(e) => handleUserCardClick(attendee.id, e)}>
									{viewMode === "grid" ? (
										<CardContent className='px-4'>
											<div className='flex items-start justify-between mb-3'>
												<Checkbox
													className='w-6 h-6'
													id={`delete-attendee-${attendee.id}`}
													checked={selectedAttendeesForDeletion.has(attendee.id)}
													onCheckedChange={(checked) => handleToggleAttendeeForDeletion(attendee.id, !!checked)}
												/>
											</div>
											<div className='flex flex-col items-center text-center space-y-3'>
												{filteredAttendees && <UserAvatar user={attendee} avatarSize='w-16 h-16 border-1' fallbackStyle='text-lg' />}
												<div className='w-full'>
													<h3 className='font-semibold text-gray-900 truncate' title={`${attendee.first_name} ${attendee.last_name}`}>
														{attendee.first_name} {attendee.last_name}
													</h3>
													<p className='text-sm text-gray-600 truncate' title={attendee.email}>
														{attendee.email}
													</p>
													{attendee.contact_number && <p className='text-xs text-gray-500 mt-1'>{attendee.contact_number}</p>}
												</div>
											</div>
										</CardContent>
									) : (
										<CardContent className='p-4'>
											<div className='flex items-center gap-4'>
												<Checkbox
													id={`delete-attendee-${attendee.id}`}
													checked={selectedAttendeesForDeletion.has(attendee.id)}
													onCheckedChange={(checked) => handleToggleAttendeeForDeletion(attendee.id, !!checked)}
												/>
												<Avatar className='w-12 h-12'>
													<AvatarImage src={attendee.profile_image || "/placeholder.svg"} />
													<AvatarFallback>
														{attendee.first_name
															.split(" ")
															.map((n) => n[0])
															.join("")}
													</AvatarFallback>
												</Avatar>
												<div className='flex-1 min-w-0'>
													<h3 className='font-semibold text-gray-900 truncate'>
														{attendee.first_name} {attendee.last_name}
													</h3>
													<div className='flex items-center gap-4 mt-1'>
														<div className='flex items-center gap-1 text-sm text-gray-600'>
															<Mail className='w-3 h-3' />
															<span className='truncate'>{attendee.email}</span>
														</div>
														{attendee.contact_number && (
															<div className='flex items-center gap-1 text-sm text-gray-600'>
																<Phone className='w-3 h-3' />
																<span>{attendee.contact_number}</span>
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
						currentAttendeeIds={event.users.map((user) => user.id)}
						onAddUsers={handleAddUsersToEvent}
						isAttaching={isAttaching}
						attachError={attachError}
					/>
				</div>
			</div>
		</div>
	);
}
