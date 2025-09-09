"use client";

import type React from "react";

import { Button } from "@/components/ui/button";
import { User as UserIcon, Info, MapPin, Phone, Mail, Users } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { User } from "@/types";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

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

	const getGenderColor = (gender: string) => {
		switch (gender) {
			case "male":
				return "bg-blue-100 text-blue-800";
			case "female":
				return "bg-pink-100 text-pink-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	};

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
						<Avatar className='w-16 h-16'>
							<AvatarImage
								className='object-cover'
								src={user.profile_image || undefined}
								alt={`${user.first_name} ${user.last_name}`}
							/>
							<AvatarFallback className='text-lg'>
								{user.first_name
									.split(" ")
									.map((n) => n[0])
									.join("")
									.toUpperCase()}
							</AvatarFallback>
						</Avatar>
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
									<p className='text-sm text-muted-foreground'>{user.email}</p>
								</div>
							</div>

							<div className='flex items-center gap-3'>
								<Phone className='w-4 h-4 text-muted-foreground' />
								<div>
									<p className='text-sm font-medium'>Contact Number</p>
									<p className='text-sm text-muted-foreground'>{user.contact_number}</p>
								</div>
							</div>

							<div className='flex items-center gap-3'>
								<MapPin className='w-4 h-4 text-muted-foreground' />
								<div>
									<p className='text-sm font-medium'>Address</p>
									<p className='text-sm text-muted-foreground'>{user.address}</p>
								</div>
							</div>
						</div>
					</div>

					{/* Personal Information */}
					<div className='grid gap-4'>
						<h4 className='text-lg font-medium border-b pb-2'>Personal Information</h4>

						<div className='grid grid-cols-2 gap-4'>
							<div className='flex items-center gap-3'>
								<Users className='w-4 h-4 text-muted-foreground' />
								<div>
									<p className='text-sm font-medium'>Gender</p>
									<Badge variant='secondary' className={getGenderColor(user.gender)}>
										{user.gender.charAt(0).toUpperCase() + user.gender.slice(1)}
									</Badge>
								</div>
							</div>

							<div>
								<p className='text-sm font-medium mb-1'>Religion</p>
								<p className='text-sm text-muted-foreground'>{user.religion}</p>
							</div>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
