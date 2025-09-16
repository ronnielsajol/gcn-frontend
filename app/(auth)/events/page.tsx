"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import {
	Search,
	Calendar,
	MapPin,
	Clock,
	Users,
	Plus,
	Eye,
	Edit,
	Trash2,
	Filter,
	CalendarDays,
	Loader2,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Event, EventApiResponse } from "@/types";
import { EventCardSkeleton } from "@/components/skeletons/event-card-skeleton";
import { useEventMutations } from "@/hooks/useEventMutations";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

// --- React Query Setup ---
const queryKeys = {
	events: (page: number) => ["events", page] as const,
};

const fetchEvents = async (page: number): Promise<EventApiResponse> => {
	const response = await apiFetch<EventApiResponse>(`/events?page=${page}`, "GET");
	return response;
};

export default function EventsPage() {
	const queryClient = useQueryClient();
	const [searchTerm, setSearchTerm] = useState("");
	const [creatorFilter, setCreatorFilter] = useState("all");
	const [statusFilter, setStatusFilter] = useState("all");

	const [currentPage, setCurrentPage] = useState(1);

	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [eventToEdit, setEventToEdit] = useState<Event | null>(null);
	const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
	const [formData, setFormData] = useState({
		name: "",
		description: "",
		location: "",
		start_time: "",
		end_time: "",
	});
	const { user } = useAuth();
	const router = useRouter();

	const resetForm = () => {
		setFormData({
			name: "",
			description: "",
			location: "",
			start_time: "",
			end_time: "",
		});
	};

	const {
		handleCreateEvent: createEvent,
		handleUpdateEvent: updateEvent,
		handleDeleteEvent: deleteEvent,
		isCreating,
		isUpdating,
		isDeleting,
	} = useEventMutations();

	const handleCreateEvent = () => {
		setIsCreateModalOpen(true);
		resetForm();
	};

	const handleEditEvent = (event: Event) => {
		setEventToEdit(event);
		setFormData({
			name: event.name,
			description: event.description,
			location: event.location,
			start_time: event.start_time.slice(0, 16),
			end_time: event.end_time.slice(0, 16),
		});
		setIsEditModalOpen(true);
	};

	const handleDeleteEvent = (event: Event) => {
		setEventToDelete(event);
		setIsDeleteDialogOpen(true);
	};

	const handleSubmitCreate = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			await createEvent(formData);
			setIsCreateModalOpen(false);
			resetForm();
			toast.success("Event created successfully");
		} catch (error) {
			toast.error("Failed to create event");
		}
	};

	const handleStatusChange = async (eventId: string, newStatus: string) => {
		const queryKey = queryKeys.events(currentPage);

		// Start with loading toast
		const loadingToastId = toast.loading("Updating event status...");

		try {
			queryClient.setQueryData(queryKey, (oldData: EventApiResponse | undefined) => {
				if (!oldData) return oldData;

				return {
					...oldData,
					data: oldData.data.map((event) => (Number(event.id) === Number(eventId) ? { ...event, status: newStatus } : event)),
				};
			});

			await apiFetch(`/events/${eventId}/status`, "PATCH", { status: newStatus });

			toast.success("Event status updated successfully", { id: loadingToastId });
		} catch (error) {
			console.error("Failed to update event status:", error);

			// Revert the optimistic update on error
			queryClient.invalidateQueries({ queryKey });

			// Update the loading toast to error
			toast.error("Failed to update event status", { id: loadingToastId });
		}
	};

	const handleSubmitEdit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!eventToEdit) return;

		try {
			await updateEvent(eventToEdit.id, formData);
			setIsEditModalOpen(false);
			setEventToEdit(null);
			resetForm();
			toast.success("Event updated successfully");
		} catch (error) {
			toast.error("Failed to update event");
		}
	};

	const handleConfirmDelete = async () => {
		if (!eventToDelete) return;

		try {
			await deleteEvent(eventToDelete.id);
			setIsDeleteDialogOpen(false);
			setEventToDelete(null);
			toast.success("Event deleted successfully");
		} catch (error) {
			console.error("Failed to delete event:", error);
		}
	};

	// --- Data Fetching ---
	const {
		data: eventsResponse,
		isLoading,
		error,
	} = useQuery({
		queryKey: queryKeys.events(currentPage),
		queryFn: () => fetchEvents(currentPage),
		staleTime: 1000 * 60 * 5, // 5 minutes
	});

	// --- Filtering Logic ---
	// Note: This filters the data on the client side after it's fetched.
	const filteredEvents = eventsResponse?.data.filter((event) => {
		const matchesSearch =
			event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			event.description.toLowerCase().includes(searchTerm.toLowerCase());

		const matchesCreator = creatorFilter === "all" || event.created_by.first_name === creatorFilter;

		const now = new Date();
		const startTime = new Date(event.start_time);
		const endTime = new Date(event.end_time);

		let matchesStatus = true;
		if (statusFilter === "upcoming") {
			matchesStatus = startTime > now;
		} else if (statusFilter === "ongoing") {
			matchesStatus = startTime <= now && endTime >= now;
		} else if (statusFilter === "completed") {
			matchesStatus = endTime < now;
		}

		return matchesSearch && matchesCreator && matchesStatus;
	});

	const allEventsForFilters = eventsResponse?.data || [];
	const creators = Array.from(new Set(allEventsForFilters.map((event) => event.created_by.first_name)));

	// --- Helper Functions ---
	const formatDateTime = (dateString: string) => {
		const date = new Date(dateString);

		// Check for invalid date
		if (isNaN(date.getTime())) {
			return { date: "Invalid Date", time: "Invalid Time" };
		}

		const dateOptions: Intl.DateTimeFormatOptions = {
			year: "numeric",
			month: "long",
			day: "numeric",
			timeZone: "UTC",
		};

		const timeOptions: Intl.DateTimeFormatOptions = {
			hour: "2-digit",
			minute: "2-digit",
			hour12: true,
			timeZone: "UTC",
		};

		return {
			date: date.toLocaleDateString("en-US", dateOptions),
			time: date.toLocaleTimeString("en-US", timeOptions),
		};
	};

	const getEventStatusStyle = (status: string) => {
		switch (status.toLowerCase()) {
			case "upcoming":
				return { style: "bg-blue-100 text-blue-800", border: "border-blue-500" };
			case "ongoing":
				return { style: "bg-yellow-100 text-yellow-800", border: "border-yellow-500" };
			case "completed":
				return { style: "bg-green-100 text-green-800", border: "border-green-500" };
			case "cancelled":
				return { style: "bg-red-100 text-red-800", border: "border-red-500" };
			default:
				return { style: "bg-gray-100 text-gray-800", border: "border-gray-500" };
		}
	};

	const getDuration = (startTime: string, endTime: string) => {
		const start = new Date(startTime);
		const end = new Date(endTime);
		const diffMs = end.getTime() - start.getTime();
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
		const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

		if (diffHours > 0) {
			return `${diffHours}h ${diffMinutes}m`;
		}
		return `${diffMinutes}m`;
	};

	if (error) {
		return (
			<div className='min-h-screen bg-gray-50 flex items-center justify-center'>
				<p>An error occurred: {error.message}</p>
			</div>
		);
	}

	const { last_page: totalPages, from, to, total } = eventsResponse || { last_page: 1, from: 0, to: 0, total: 0 };

	return (
		<div className='min-h-screen bg-gray-50'>
			<div className='py-8 px-4'>
				<div className='max-w-7xl mx-auto'>
					{/* Filters */}
					<Card className='mb-6'>
						<CardHeader>
							<div className='flex items-center justify-between'>
								<CardTitle className='text-lg flex items-center gap-2'>
									<Filter className='w-5 h-5' />
									Filters & Search
								</CardTitle>
								<Button onClick={handleCreateEvent} className='flex items-center gap-2'>
									<Plus className='w-4 h-4' />
									Create Event
								</Button>
							</div>
						</CardHeader>
						<CardContent>
							<div className='flex flex-col lg:flex-row gap-4'>
								<div className='flex-1'>
									<div className='relative'>
										<Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
										<Input
											placeholder='Search events by name, description, or location...'
											value={searchTerm}
											onChange={(e) => setSearchTerm(e.target.value)}
											className='pl-10'
										/>
									</div>
								</div>
								<Select value={statusFilter} onValueChange={setStatusFilter}>
									<SelectTrigger className='w-full lg:w-[180px]'>
										<SelectValue placeholder='All Status' />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value='all'>All Status</SelectItem>
										<SelectItem value='upcoming'>Upcoming</SelectItem>
										<SelectItem value='ongoing'>Ongoing</SelectItem>
										<SelectItem value='completed'>Completed</SelectItem>
									</SelectContent>
								</Select>

								<Select value={creatorFilter} onValueChange={setCreatorFilter}>
									<SelectTrigger className='w-full lg:w-[180px]'>
										<SelectValue placeholder='All Creators' />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value='all'>All Creators</SelectItem>
										{creators.map((creator) => (
											<SelectItem key={creator} value={creator}>
												{creator}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</CardContent>
					</Card>

					{/* Events Grid */}
					{isLoading ? (
						<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
							{Array.from({ length: 6 }).map((_, index) => (
								<EventCardSkeleton key={index} />
							))}
						</div>
					) : filteredEvents && filteredEvents.length > 0 ? (
						<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
							{filteredEvents.map((event) => {
								const startDateTime = formatDateTime(event.start_time);
								const endDateTime = formatDateTime(event.end_time);
								const eventStatus = getEventStatusStyle(event.status);
								const duration = getDuration(event.start_time, event.end_time);

								return (
									<Card key={event.id} className='hover:shadow-lg transition-shadow'>
										<CardHeader className='pb-3'>
											<div className='flex items-start justify-between'>
												<div className='flex-1'>
													<CardTitle className='text-lg font-semibold text-gray-900 mb-2'>{event.name}</CardTitle>
													<Select
														value={event.status}
														onValueChange={(newStatus) => {
															handleStatusChange(String(event.id), newStatus);
														}}>
														<SelectTrigger className={cn("w-32 pl-0 rounded-xl border-1", eventStatus.style, eventStatus.border)}>
															<SelectValue className='' />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value='upcoming' className='bg-blue-100 focus:bg-blue-300 group'>
																<span className='bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium group-focus:bg-blue-300'>
																	UPCOMING
																</span>
															</SelectItem>
															<SelectItem value='ongoing' className='bg-yellow-100 focus:bg-yellow-300 group'>
																<span className='bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium group-focus:bg-yellow-300'>
																	ONGOING
																</span>
															</SelectItem>
															<SelectItem value='completed' className='bg-green-100 focus:bg-green-300 group'>
																<span className='bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium group-focus:bg-green-300'>
																	COMPLETED
																</span>
															</SelectItem>
															<SelectItem value='cancelled' className='bg-red-100 focus:bg-red-300 group'>
																<span className='bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-medium group-focus:bg-red-300'>CANCELLED</span>
															</SelectItem>
														</SelectContent>
													</Select>{" "}
												</div>
												<Button variant='ghost' size='sm' onClick={() => router.push(`/events/${event.id}/attendees`)}>
													<Eye className='w-4 h-4' />
												</Button>
											</div>
										</CardHeader>
										<CardContent className='space-y-4'>
											<p className='text-sm text-gray-600 h-20 overflow-y-auto'>{event.description}</p>

											<div className='space-y-2'>
												<div className='flex items-center gap-2 text-sm text-gray-600'>
													<MapPin className='w-4 h-4 flex-shrink-0' />
													<span className='truncate'>{event.location}</span>
												</div>
												<div className='flex items-center gap-2 text-sm text-gray-600'>
													<Calendar className='w-4 h-4 flex-shrink-0' />
													<span>{startDateTime.date}</span>
												</div>
												<div className='flex items-center gap-2 text-sm text-gray-600'>
													<Clock className='w-4 h-4 flex-shrink-0' />
													<span>
														{startDateTime.time} - {endDateTime.time} ({duration})
													</span>
												</div>
												<div className='flex items-center gap-2 text-sm text-gray-600'>
													<Calendar className='w-4 h-4 flex-shrink-0' />
													<span>
														Created by {event.created_by.first_name} {event.created_by.last_name}
													</span>
												</div>
											</div>

											<div className='flex items-center justify-between pt-3 border-t'>
												<div className='flex items-center gap-2'>
													<Users className='w-4 h-4 text-gray-400' />
													<span className='text-sm text-gray-600'>
														{event.users_count} attendee{event.users?.total !== 1 ? "s" : ""}
													</span>
												</div>
												<div className='flex items-center gap-1'>
													<Button variant='ghost' size='sm' onClick={() => handleEditEvent(event)}>
														<Edit className='w-4 h-4' />
													</Button>

													{user?.role === "super_admin" && (
														<Button variant='ghost' size='sm' className='text-red-600 hover:text-red-700' onClick={() => handleDeleteEvent(event)}>
															<Trash2 className='w-4 h-4' />
														</Button>
													)}
												</div>
											</div>
										</CardContent>
									</Card>
								);
							})}
						</div>
					) : (
						<Card>
							<CardContent className='text-center py-12'>
								<CalendarDays className='w-16 h-16 text-gray-400 mx-auto mb-4' />
								<p className='text-gray-500'>No events found matching your criteria</p>
								<Button variant='outline' className='mt-4 bg-transparent' onClick={() => setSearchTerm("")}>
									Clear Filters
								</Button>
							</CardContent>
						</Card>
					)}

					<Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
						<DialogContent className='max-w-2xl'>
							<DialogHeader>
								<DialogTitle className='flex items-center gap-2'>
									<Plus className='w-5 h-5' />
									Create New Event
								</DialogTitle>
								<DialogDescription>Fill in the details to create a new event</DialogDescription>
							</DialogHeader>
							<form onSubmit={handleSubmitCreate} className='space-y-4'>
								<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
									<div className='md:col-span-2'>
										<label htmlFor='name' className='block text-sm font-medium text-gray-700 mb-1'>
											Event Name *
										</label>
										<Input
											id='name'
											value={formData.name}
											onChange={(e) => setFormData({ ...formData, name: e.target.value })}
											placeholder='Enter event name'
											required
										/>
									</div>
									<div className='md:col-span-2'>
										<label htmlFor='description' className='block text-sm font-medium text-gray-700 mb-1'>
											Description *
										</label>
										<textarea
											id='description'
											value={formData.description}
											onChange={(e) => setFormData({ ...formData, description: e.target.value })}
											placeholder='Enter event description'
											className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[100px]'
											required
										/>
									</div>
									<div className='md:col-span-2'>
										<label htmlFor='location' className='block text-sm font-medium text-gray-700 mb-1'>
											Location *
										</label>
										<Input
											id='location'
											value={formData.location}
											onChange={(e) => setFormData({ ...formData, location: e.target.value })}
											placeholder='Enter event location'
											required
										/>
									</div>
									<div>
										<label htmlFor='start_time' className='block text-sm font-medium text-gray-700 mb-1'>
											Start Date & Time *
										</label>
										<Input
											id='start_time'
											type='datetime-local'
											value={formData.start_time}
											onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
											required
										/>
									</div>
									<div>
										<label htmlFor='end_time' className='block text-sm font-medium text-gray-700 mb-1'>
											End Date & Time *
										</label>
										<Input
											id='end_time'
											type='datetime-local'
											value={formData.end_time}
											onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
											required
										/>
									</div>
								</div>
								<div className='flex justify-end gap-3 pt-4'>
									<Button
										type='button'
										variant='outline'
										onClick={() => setIsCreateModalOpen(false)}
										className='bg-transparent'
										disabled={isCreating}>
										Cancel
									</Button>
									<Button type='submit' disabled={isCreating}>
										{isCreating ? <Loader2 className='animate-spin' /> : "Create Event"}
									</Button>
								</div>
							</form>
						</DialogContent>
					</Dialog>

					{/* Edit Event Modal*/}
					<Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
						<DialogContent className='max-w-2xl'>
							<DialogHeader>
								<DialogTitle className='flex items-center gap-2'>
									<Edit className='w-5 h-5' />
									Edit Event
								</DialogTitle>
								<DialogDescription>Update the event details</DialogDescription>
							</DialogHeader>
							<form onSubmit={handleSubmitEdit} className='space-y-4'>
								<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
									<div className='md:col-span-2'>
										<label htmlFor='edit-name' className='block text-sm font-medium text-gray-700 mb-1'>
											Event Name *
										</label>
										<Input
											id='edit-name'
											value={formData.name}
											onChange={(e) => setFormData({ ...formData, name: e.target.value })}
											placeholder='Enter event name'
											required
										/>
									</div>
									<div className='md:col-span-2'>
										<label htmlFor='edit-description' className='block text-sm font-medium text-gray-700 mb-1'>
											Description *
										</label>
										<textarea
											id='edit-description'
											value={formData.description}
											onChange={(e) => setFormData({ ...formData, description: e.target.value })}
											placeholder='Enter event description'
											className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[100px]'
											required
										/>
									</div>
									<div className='md:col-span-2'>
										<label htmlFor='edit-location' className='block text-sm font-medium text-gray-700 mb-1'>
											Location *
										</label>
										<Input
											id='edit-location'
											value={formData.location}
											onChange={(e) => setFormData({ ...formData, location: e.target.value })}
											placeholder='Enter event location'
											required
										/>
									</div>
									<div>
										<label htmlFor='edit-start_time' className='block text-sm font-medium text-gray-700 mb-1'>
											Start Date & Time *
										</label>
										<Input
											id='edit-start_time'
											type='datetime-local'
											value={formData.start_time}
											onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
											required
										/>
									</div>
									<div>
										<label htmlFor='edit-end_time' className='block text-sm font-medium text-gray-700 mb-1'>
											End Date & Time *
										</label>
										<Input
											id='edit-end_time'
											type='datetime-local'
											value={formData.end_time}
											onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
											required
										/>
									</div>
								</div>
								<div className='flex justify-end gap-3 pt-4'>
									<Button
										type='button'
										variant='outline'
										onClick={() => setIsEditModalOpen(false)}
										className='bg-transparent'
										disabled={isUpdating}>
										Cancel
									</Button>
									<Button type='submit' disabled={isUpdating}>
										{isUpdating ? <Loader2 className='animate-spin' /> : "Update Event"}
									</Button>
								</div>
							</form>
						</DialogContent>
					</Dialog>

					{/* Delete Confirmation Dialog */}
					<Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
						<DialogContent className='max-w-md'>
							<DialogHeader>
								<DialogTitle className='flex items-center gap-2 text-red-600'>
									<Trash2 className='w-5 h-5' />
									Delete Event
								</DialogTitle>
								<DialogDescription>Are you sure you want to delete this event? This action cannot be undone.</DialogDescription>
							</DialogHeader>
							{eventToDelete && (
								<div className='py-4'>
									<div className='bg-gray-50 rounded-lg p-4'>
										<h4 className='font-medium text-gray-900 mb-2'>{eventToDelete.name}</h4>
										<p className='text-sm text-gray-600 mb-2'>{eventToDelete.description}</p>
										<div className='flex items-center gap-4 text-xs text-gray-500'>
											<span className='flex items-center gap-1'>
												<MapPin className='w-3 h-3' />
												{eventToDelete.location}
											</span>
											<span className='flex items-center gap-1'>
												<Users className='w-3 h-3' />
												{eventToDelete.users_count} attendees
											</span>
										</div>
									</div>
								</div>
							)}
							<div className='flex justify-end gap-3'>
								<Button variant='outline' onClick={() => setIsDeleteDialogOpen(false)} className='bg-transparent' disabled={isDeleting}>
									Cancel
								</Button>
								<Button variant='destructive' onClick={handleConfirmDelete} disabled={isDeleting}>
									{isDeleting ? <Loader2 className='animate-spin' /> : "Delete Event"}
								</Button>
							</div>
						</DialogContent>
					</Dialog>

					{/* Pagination Controls */}
					{totalPages > 1 && (
						<div className='flex flex-col sm:flex-row items-center justify-between gap-4 mt-8'>
							<div className='text-sm text-gray-600'>
								Showing {from} to {to} of {total} results
							</div>

							<div className='flex items-center gap-2'>
								<Button
									variant='outline'
									size='sm'
									onClick={() => setCurrentPage(1)}
									disabled={currentPage === 1}
									className='bg-transparent'>
									First
								</Button>
								<Button
									variant='outline'
									size='sm'
									onClick={() => setCurrentPage(currentPage - 1)}
									disabled={currentPage === 1}
									className='bg-transparent'>
									Previous
								</Button>

								<span className='text-sm text-gray-600'>
									Page {currentPage} of {totalPages}
								</span>

								<Button
									variant='outline'
									size='sm'
									onClick={() => setCurrentPage(currentPage + 1)}
									disabled={currentPage === totalPages}
									className='bg-transparent'>
									Next
								</Button>
								<Button
									variant='outline'
									size='sm'
									onClick={() => setCurrentPage(totalPages)}
									disabled={currentPage === totalPages}
									className='bg-transparent'>
									Last
								</Button>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
