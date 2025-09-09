import React, { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User } from "@/types";
import {
	AlertCircle,
	Camera,
	FileText,
	Heart,
	Loader2,
	Mail,
	MapPin,
	Maximize2,
	Phone,
	RotateCcw,
	SwitchCamera,
	Upload,
	User as UserIcon,
	Users,
	X,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "./ui/alert";
import { ApiError, apiFetch } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "./ui/badge";

interface CreateUserDialogProps {
	isOpen: boolean;
	onClose: () => void;
	onUserCreated: (user: User) => void;
}

const createUser = (formData: FormData) => {
	return apiFetch<User>("/users", "POST", formData);
};

export const CreateUserDialog = ({ isOpen, onClose, onUserCreated }: CreateUserDialogProps) => {
	const queryClient = useQueryClient();

	const [error, setError] = useState<string | null>(null);
	const [formData, setFormData] = useState({
		first_name: "",
		last_name: "",
		address: "",
		gender: "",
		religion: "",
		contact_number: "",
		email: "",
		role: "user",
	});

	const mutation = useMutation({
		onMutate: () => {
			return toast.loading("Creating user...");
		},
		mutationFn: createUser,
		onSuccess: (data, variables, context) => {
			toast.success("User created successfully!", { id: context });
			queryClient.invalidateQueries({ queryKey: ["users"] });
			onUserCreated(data);
		},
		onError: (err) => {
			const apiError = err as ApiError;
			setError(apiError.message || "An unexpected error occurred.");
		},
	});

	// Handlers
	const handleInputChange = (field: string, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		if (error) setError(null);
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!formData.gender) {
			setError("Please select a gender.");
			return;
		}

		// Build the FormData object for submission
		const submissionData = new FormData();
		Object.entries(formData).forEach(([key, value]) => {
			submissionData.append(key, value);
		});

		mutation.mutate(submissionData);
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className='max-w-md'>
				<DialogHeader>
					<DialogTitle>Create User</DialogTitle>
					<DialogDescription>Fill in the details to create a new user.</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className='space-y-6'>
					{error && (
						<Alert variant='destructive'>
							<AlertCircle className='h-4 w-4' />
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}

					{/* Personal Information */}
					<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
						<div className='space-y-2'>
							<Label htmlFor='first_name' className='flex items-center gap-2'>
								<UserIcon className='w-4 h-4' />
								First Name *
							</Label>
							<Input
								id='first_name'
								placeholder='Enter first name'
								value={formData.first_name}
								onChange={(e) => handleInputChange("first_name", e.target.value)}
								required
							/>
						</div>
						<div className='space-y-2'>
							<Label htmlFor='last_name' className='flex items-center gap-2'>
								<UserIcon className='w-4 h-4' />
								Last Name *
							</Label>
							<Input
								id='last_name'
								placeholder='Enter last name'
								value={formData.last_name}
								onChange={(e) => handleInputChange("last_name", e.target.value)}
								required
							/>
						</div>
						<div className='space-y-2'>
							<Label htmlFor='email' className='flex items-center gap-2'>
								<Mail className='w-4 h-4' />
								Email Address *
							</Label>
							<Input
								id='email'
								type='email'
								placeholder='Enter email'
								value={formData.email}
								onChange={(e) => handleInputChange("email", e.target.value)}
								required
							/>
						</div>
						<div className='space-y-2'>
							<Label htmlFor='contact' className='flex items-center gap-2'>
								<Phone className='w-4 h-4' />
								Contact Number *
							</Label>
							<Input
								id='contact'
								placeholder='Enter phone number'
								value={formData.contact_number}
								onChange={(e) => handleInputChange("contact_number", e.target.value)}
								required
							/>
						</div>
						<div className='space-y-2'>
							<Label htmlFor='gender' className='flex items-center gap-2'>
								<Users className='w-4 h-4' />
								Gender *
							</Label>
							<Select value={formData.gender} onValueChange={(value) => handleInputChange("gender", value)}>
								<SelectTrigger className='w-full'>
									<SelectValue placeholder='Select gender' />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='male'>Male</SelectItem>
									<SelectItem value='female'>Female</SelectItem>
									<SelectItem value='other'>Other</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className='space-y-2'>
							<Label htmlFor='religion' className='flex items-center gap-2'>
								<Heart className='w-4 h-4' />
								Religion
							</Label>
							<Select value={formData.religion} onValueChange={(value) => handleInputChange("religion", value)}>
								<SelectTrigger className='w-full'>
									<SelectValue placeholder='Select religion (optional)' />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='Roman Catholic'>Roman Catholic</SelectItem>
									<SelectItem value='Muslim'>Muslim</SelectItem>
									<SelectItem value='Iglesia ni Cristo'>Iglesia ni Cristo</SelectItem>
									<SelectItem value='Christian'>Christian</SelectItem>
									<SelectItem value='Other'>Other</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					{/* Address */}
					<div className='space-y-2'>
						<Label htmlFor='address' className='flex items-center gap-2'>
							<MapPin className='w-4 h-4' />
							Address *
						</Label>
						<Textarea
							id='address'
							placeholder='Enter complete address'
							value={formData.address}
							onChange={(e) => handleInputChange("address", e.target.value)}
							className='min-h-[80px]'
							required
						/>
					</div>

					{/* Submit Button */}
					<div className='pt-4'>
						<Button type='submit' className='w-full bg-blue-600 hover:bg-blue-700' disabled={mutation.isPending}>
							{mutation.isPending ? (
								<>
									<Loader2 className='mr-2 h-4 w-4 animate-spin' />
									Saving...
								</>
							) : (
								"Save User Information"
							)}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
};
