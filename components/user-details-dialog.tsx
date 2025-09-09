import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, UserIcon, MessageSquare, Mail, Phone, Building, MapPin } from "lucide-react";
import { useUser } from "@/hooks/use-users";
import UserAvatar from "@/components/user-avatar";

interface UserDetailsDialogProps {
	isOpen: boolean;
	onClose: () => void;
	userId: string | null;
}

export const UserDetailsDialog = ({ isOpen, onClose, userId }: UserDetailsDialogProps) => {
	const { data: userData, error: userError, isLoading: isLoadingUser } = useUser(userId || "");

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className='max-w-md'>
				<DialogHeader>
					<DialogTitle className='flex items-center gap-2'>
						<UserIcon className='w-5 h-5' />
						User Details
					</DialogTitle>
					<DialogDescription>View detailed information about this attendee</DialogDescription>
				</DialogHeader>

				{isLoadingUser && <Loader2 className='w-6 h-6 animate-spin mx-auto my-4' />}

				{userData && (
					<div className='space-y-6'>
						{/* Profile Section */}
						<div className='flex flex-col items-center text-center space-y-4'>
							<UserAvatar user={userData} avatarSize='w-20 h-20 border-2 border-gray-200' fallbackStyle='text-2xl' />
							<div>
								<h3 className='text-xl font-semibold text-gray-900'>
									{userData.first_name} {userData.last_name}
								</h3>
								<p className='text-gray-600'>{userData.email}</p>
							</div>
						</div>

						{/* Contact Information */}
						<div className='space-y-3'>
							<h4 className='font-semibold text-gray-900 flex items-center gap-2'>
								<MessageSquare className='w-4 h-4' />
								Contact Information
							</h4>
							<div className='space-y-2 pl-6'>
								<div className='flex items-center gap-2 text-sm'>
									<Mail className='w-4 h-4 text-gray-400' />
									<span className='text-gray-600'>{userData.email}</span>
								</div>
								{userData.contact_number && (
									<div className='flex items-center gap-2 text-sm'>
										<Phone className='w-4 h-4 text-gray-400' />
										<span className='text-gray-600'>{userData.contact_number}</span>
									</div>
								)}
							</div>
						</div>

						{userData.address && (
							<div className='space-y-3'>
								<h4 className='font-semibold text-gray-900 flex items-center gap-2'>
									<Building className='w-4 h-4' />
									Additional Information
								</h4>
								<div className='space-y-2 pl-6'>
									<div className='flex items-center gap-2 text-sm'>
										<MapPin className='w-4 h-4 text-gray-400' />
										<span className='text-gray-600'>{userData.address}</span>
									</div>
								</div>
							</div>
						)}
					</div>
				)}

				{userError && (
					<div className='p-3 bg-red-50 border border-red-200 rounded-lg'>
						<p className='text-sm text-red-600'>Failed to load user details: {userError.message}</p>
					</div>
				)}

				<div className='flex justify-end pt-4 border-t'>
					<Button variant='outline' onClick={onClose} className='bg-transparent'>
						Close
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
};
