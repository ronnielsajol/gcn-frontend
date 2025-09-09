"use client";

import type React from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext"; // Import the useAuth hook
import { ApiError } from "@/lib/api"; // Import the custom error type

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function LoginPage() {
	const { user, login, isLoading: authLoading } = useAuth();
	const [isLoading, setIsLoading] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const [formData, setFormData] = useState({
		email: "",
		password: "",
	});
	const router = useRouter();

	const handleInputChange = (field: string, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		const toastId = toast.loading("Signing in...");

		try {
			await login({
				email: formData.email,
				password: formData.password,
			});

			toast.success("Login successful! Redirecting...", { id: toastId });
		} catch (err) {
			const apiError = err as ApiError;
			toast.error(apiError.message || "An unexpected error occurred. Please try again.", { id: toastId });
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		if (authLoading) {
			return;
		}
		if (user) {
			router.push("/users");
		}
	}, [authLoading, user, router]);

	return (
		<div className='min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12'>
			<div className='w-full max-w-md'>
				<div className='text-center mb-8'>
					<h1 className='text-3xl font-bold text-gray-900'>User Management</h1>
					<p className='text-gray-600 mt-2'>Sign in to access your dashboard</p>
				</div>

				<Card className='border-0 shadow-lg'>
					<CardHeader>
						<CardTitle className='text-xl'>Sign In</CardTitle>
						<CardDescription>Enter your credentials to continue</CardDescription>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleSubmit} className='space-y-4'>
							<div className='space-y-2'>
								<Label htmlFor='email'>Email Address</Label>
								<Input
									id='email'
									type='email'
									placeholder='name@example.com'
									value={formData.email}
									onChange={(e) => handleInputChange("email", e.target.value)}
									required
									autoComplete='email'
								/>
							</div>

							<div className='space-y-2'>
								<div className='flex items-center justify-between'>
									<Label htmlFor='password'>Password</Label>
								</div>
								<div className='relative'>
									<Input
										id='password'
										type={showPassword ? "text" : "password"}
										placeholder='••••••••'
										value={formData.password}
										onChange={(e) => handleInputChange("password", e.target.value)}
										required
										autoComplete='current-password'
										className='pr-10'
									/>
									<button
										type='button'
										onClick={() => setShowPassword(!showPassword)}
										className='absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600'
										tabIndex={-1}>
										{showPassword ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
									</button>
								</div>
							</div>

							<Button type='submit' className='w-full bg-blue-600 hover:bg-blue-700' disabled={isLoading}>
								{isLoading ? (
									<>
										<Loader2 className='mr-2 h-4 w-4 animate-spin' />
									</>
								) : (
									"Sign In"
								)}
							</Button>
						</form>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
