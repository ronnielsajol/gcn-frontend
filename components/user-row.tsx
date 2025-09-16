// components/UserRow.tsx
import React from "react";
import { User } from "@/types/index";
import { Edit, Trash2, Loader2, Eye } from "lucide-react";
import { TableCell, TableRow } from "./ui/table";
import { Button } from "./ui/button";
import UserAvatar from "./user-avatar";

interface UserRowProps {
	user: User;
	currentUser: User;
	isDeleting: boolean;
	onDelete: (userId: string) => void;
	onView: (user: User) => void;
	formatGender: (gender: string) => string;
}

const UserRow = ({ user, currentUser, isDeleting, onDelete, onView }: UserRowProps) => {
	return (
		<TableRow>
			<TableCell>
				<div className='flex items-center gap-3'>
					<UserAvatar user={user} avatarSize='h-10 w-10' />
					<div>
						<p className='font-medium'>
							{user.first_name} {user.middle_initial} {user.last_name}
						</p>
						<p className='text-sm text-gray-500'>{user.email}</p>
					</div>
				</div>
			</TableCell>
			<TableCell>
				<p className='text-sm'>{user.contact_number}</p>
			</TableCell>

			<TableCell>
				<p className='text-sm text-gray-600'>{new Date(user.created_at).toLocaleDateString()}</p>
			</TableCell>
			<TableCell>
				<div className='flex items-center gap-1'>
					{/* View Button */}
					<Button variant='ghost' size='icon' onClick={() => onView(user)}>
						<Eye className='w-4 h-4' />
					</Button>

					{/* Edit Button */}
					<a href={`/users/${user.id}/edit`}>
						<Button variant='ghost' size='icon'>
							<Edit className='w-4 h-4' />
						</Button>
					</a>

					{/* Delete Button */}
					{currentUser.role === "super_admin" && (
						<Button
							variant='ghost'
							size='icon'
							className='h-8 w-8 text-red-600 hover:text-red-700'
							onClick={() => onDelete(user.id)}
							disabled={isDeleting}>
							{isDeleting ? <Loader2 className='w-4 h-4 animate-spin' /> : <Trash2 className='w-4 h-4' />}
						</Button>
					)}
				</div>
			</TableCell>
		</TableRow>
	);
};

export default React.memo(UserRow);
