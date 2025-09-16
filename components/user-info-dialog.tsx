"use client";

import type React from "react";

import { Button } from "@/components/ui/button";
import { User as UserIcon, Info, Phone, Mail } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { User } from "@/types";
import UserAvatar from "@/components/user-avatar";

interface UserInfoDialogProps {
	user: User;
	trigger?: React.ReactNode;
}

export default function UserInfoDialog({ user, trigger }: UserInfoDialogProps) {
	const defaultTrigger = (
		<Button variant='outline' size='sm' className='flex items-center gap-1'>
			<UserIcon className='w-4 h-4' />
			Info
		</Button>
	);

	return (
		<Dialog>
			<DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
			<DialogContent className='max-w-2xl max-h-[80vh] overflow-y-auto'>
				<DialogHeader>
					<DialogTitle className='flex items-center gap-2'>
						<Info className='w-5 h-5' />
						User Information
					</DialogTitle>
					<DialogDescription>
						Detailed information for {user.first_name} {user.last_name}
					</DialogDescription>
				</DialogHeader>

				<div className='space-y-6'>
					{/* Profile Section */}
					<div className='flex items-center gap-4 p-4 bg-muted/50 rounded-lg'>
						<UserAvatar user={user} avatarSize='w-16 h-16' fallbackStyle='text-lg' />
						<div className='flex-1'>
							<h3 className='text-xl font-semibold'>{`${user.first_name} ${user.last_name}`}</h3>
							<p className='text-sm text-muted-foreground'>ID: {user.id}</p>
						</div>
					</div>

					{/* Contact Information */}
					<div className='grid gap-4'>
						<h4 className='text-lg font-medium border-b pb-2'>Contact Information</h4>

						<div className='grid gap-3'>
							<div className='flex items-center gap-3'>
								<Mail className='w-4 h-4 text-muted-foreground' />
								<div>
									<p className='text-sm font-medium'>Email</p>
									<p className='text-sm text-muted-foreground'>{user.email ? user.email : "N/A"}</p>
								</div>
							</div>

							<div className='flex items-center gap-3'>
								<Phone className='w-4 h-4 text-muted-foreground' />
								<div>
									<p className='text-sm font-medium'>Contact Number</p>
									<p className='text-sm text-muted-foreground'>{user.mobile_number}</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
