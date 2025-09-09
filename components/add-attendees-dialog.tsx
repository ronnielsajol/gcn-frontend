// components/dialogs/AddAttendeesDialog.tsx
import React, { useState, type UIEvent } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, UserPlus, Users, Loader2, Plus } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { User, PaginatedResponse } from "@/types";
import UserAvatar from "@/components/user-avatar";
import { CreateUserDialog } from "./create-user-dialog";

type UserApiResponse = PaginatedResponse<User>;

const fetchPaginatedUsers = async ({ pageParam = 1 }): Promise<UserApiResponse> => {
	const response = await apiFetch<UserApiResponse>(`/users?page=${pageParam}`, "GET");
	return response;
};

interface AddAttendeesDialogProps {
	isOpen: boolean;
	onClose: () => void;
	currentAttendeeIds: (string | number)[];
	onAddUsers: (userIds: number[]) => Promise<void>;
	isAttaching: boolean;
	attachError: Error | null;
}

export const AddAttendeesDialog = ({
	isOpen,
	onClose,
	currentAttendeeIds,
	onAddUsers,
	isAttaching,
	attachError,
}: AddAttendeesDialogProps) => {
	const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
	const [userSearchTerm, setUserSearchTerm] = useState("");
	const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);

	const {
		data: usersData,
		error: usersError,
		fetchNextPage,
		hasNextPage,
		isLoading: isLoadingUsers,
		isFetchingNextPage,
	} = useInfiniteQuery({
		queryKey: ["users", "paginated"],
		queryFn: fetchPaginatedUsers,
		getNextPageParam: (lastPage) => {
			if (lastPage.next_page_url || lastPage.current_page < lastPage.last_page) {
				return lastPage.current_page + 1;
			}
			return undefined;
		},
		initialPageParam: 1,
		enabled: isOpen,
		staleTime: 1000 * 60 * 5,
		gcTime: 1000 * 60 * 10,
	});

	const handleScroll = (event: UIEvent<HTMLDivElement>) => {
		const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
		const isNearBottom = scrollHeight - scrollTop - clientHeight < 10;
		if (isNearBottom && hasNextPage && !isFetchingNextPage) {
			fetchNextPage();
		}
	};

	const handleClose = () => {
		setSelectedUserIds([]);
		setUserSearchTerm("");
		onClose();
	};

	const handleUserSelection = (userId: number, checked: boolean) => {
		if (checked) {
			setSelectedUserIds((prev) => [...prev, userId]);
		} else {
			setSelectedUserIds((prev) => prev.filter((id) => id !== userId));
		}
	};

	const handleAddSelectedUsers = async () => {
		if (selectedUserIds.length === 0) return;
		await onAddUsers(selectedUserIds);
		handleClose();
	};

	const handleUserCreated = (newUser: User) => {
		// Handle the newly created user
		// You might want to add them to selectedUserIds automatically
		setSelectedUserIds((prev) => [...prev, Number(newUser.id)]);
		setIsCreateUserDialogOpen(false);
	};

	// Flatten pages from infinite query for display
	const allUsers = usersData?.pages.flatMap((page) => page.data) || [];
	const availableUsers = allUsers.filter(
		(user) =>
			!currentAttendeeIds.includes(user.id) &&
			(user.first_name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
				user.last_name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
				user.email.toLowerCase().includes(userSearchTerm.toLowerCase()))
	);

	return (
		<Dialog open={isOpen} onOpenChange={handleClose}>
			<DialogContent className='max-w-2xl max-h-[90vh] flex flex-col'>
				<DialogHeader>
					<DialogTitle className='flex items-center gap-2'>
						<UserPlus className='w-5 h-5' />
						Add Attendees to Event
					</DialogTitle>
					<DialogDescription>Select users to add as attendees to this event</DialogDescription>
				</DialogHeader>

				<div className='space-y-4 flex-1 flex flex-col'>
					<div className='relative flex flex-row items-center gap-2'>
						<Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
						<Input
							placeholder='Search users by name or email...'
							value={userSearchTerm}
							onChange={(e) => setUserSearchTerm(e.target.value)}
							className='pl-10'
						/>
						<Button variant='outline' onClick={() => setIsCreateUserDialogOpen(true)} className=' flex items-center gap-2'>
							<Plus className='w-4 h-4' />
							Create New User
						</Button>
					</div>

					{selectedUserIds.length > 0 && (
						<div className='p-3 bg-blue-50 rounded-lg border border-blue-200'>
							<div className='flex items-center justify-between'>
								<Badge variant='secondary' className='bg-blue-100 text-blue-800'>
									{selectedUserIds.length} selected
								</Badge>
								<Button variant='ghost' size='sm' onClick={() => setSelectedUserIds([])} className='text-blue-600 hover:text-blue-700'>
									Clear All
								</Button>
							</div>
						</div>
					)}

					<ScrollArea
						className='flex-1 min-h-0 border rounded-lg [&>[data-radix-scroll-area-viewport]]:max-h-[calc(60vh-200px)]'
						onScrollCapture={handleScroll}>
						{isLoadingUsers && !usersData ? (
							<div className='p-4 space-y-3'>
								{Array.from({ length: 5 }).map((_, index) => (
									<div key={index} className='flex items-center gap-3 p-3 animate-pulse'>
										<div className='w-4 h-4 bg-gray-200 rounded'></div>
										<div className='w-10 h-10 bg-gray-200 rounded-full'></div>
										<div className='flex-1'>
											<div className='h-4 bg-gray-200 rounded w-32 mb-1'></div>
											<div className='h-3 bg-gray-200 rounded w-48'></div>
										</div>
									</div>
								))}
							</div>
						) : availableUsers.length > 0 ? (
							<div className='p-4 space-y-2'>
								{availableUsers.map((user) => (
									<div key={user.id} className='flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors'>
										<Checkbox
											checked={selectedUserIds.includes(Number(user.id))}
											onCheckedChange={(checked) => handleUserSelection(Number(user.id), checked as boolean)}
										/>
										<UserAvatar user={user} avatarSize='w-10 h-10 border-1 border-gray-300' />
										<div className='flex-1 min-w-0'>
											<h4 className='font-medium text-gray-900 truncate'>
												{user.first_name} {user.last_name}
											</h4>
											<p className='text-sm text-gray-600 truncate'>{user.email}</p>
										</div>
									</div>
								))}
								{isFetchingNextPage && (
									<div className='flex justify-center items-center p-4'>
										<Loader2 className='w-6 h-6 animate-spin text-gray-500' />
									</div>
								)}
							</div>
						) : (
							<div className='p-8 text-center'>
								<Users className='w-12 h-12 text-gray-400 mx-auto mb-3' />
								<p className='text-gray-500 mb-2'>No available users found</p>
								<p className='text-sm text-gray-400'>
									{userSearchTerm ? "Try adjusting your search" : "All users are already attendees"}
								</p>
							</div>
						)}
					</ScrollArea>

					{usersError && (
						<div className='p-3 bg-red-50 border border-red-200 rounded-lg'>
							<p className='text-sm text-red-600'>Failed to load users: {usersError.message}</p>
						</div>
					)}

					{attachError && (
						<div className='p-3 bg-red-50 border border-red-200 rounded-lg'>
							<p className='text-sm text-red-600'>Failed to add attendees: {attachError.message}</p>
						</div>
					)}
				</div>

				<div className='flex justify-end gap-3 pt-4 border-t'>
					<Button variant='outline' onClick={handleClose} disabled={isAttaching} className='bg-transparent'>
						Cancel
					</Button>
					<Button
						onClick={handleAddSelectedUsers}
						disabled={selectedUserIds.length === 0 || isAttaching}
						className='flex items-center gap-2'>
						{isAttaching ? (
							<>
								<Loader2 className='w-4 h-4 animate-spin' />
								Adding...
							</>
						) : (
							<>
								<Plus className='w-4 h-4' />
								Add {selectedUserIds.length} Attendee{selectedUserIds.length !== 1 ? "s" : ""}
							</>
						)}
					</Button>
				</div>
			</DialogContent>

			<CreateUserDialog
				isOpen={isCreateUserDialogOpen}
				onClose={() => setIsCreateUserDialogOpen(false)}
				onUserCreated={handleUserCreated}
			/>
		</Dialog>
	);
};
