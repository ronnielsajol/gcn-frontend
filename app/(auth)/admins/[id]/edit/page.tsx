"use client";

import type React from "react";
import { useState, useRef, useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiFetch, ApiError } from "@/lib/api";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	Upload,
	X,
	FileText,
	User as UserIcon,
	Mail,
	Phone,
	MapPin,
	Users,
	Heart,
	ArrowLeft,
	Loader2,
	AlertCircle,
	Camera,
	RotateCcw,
	SwitchCamera,
	Maximize2,
	Save,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { User, UserFile } from "@/types";

// --- API Functions ---
const fetchUser = async (userId: string): Promise<User> => {
	const response = await apiFetch(`/admins/${userId}`, "GET");
	return response as User;
};

const updateUser = ({ userId, formData }: { userId: string; formData: FormData }) => {
	formData.append("_method", "PUT");
	return apiFetch(`/admins/${userId}`, "POST", formData);
};

const deleteUserFile = ({ userId, fileId }: { userId: string; fileId: string }) => {
	return apiFetch(`/admins/${userId}/files/${fileId}`, "DELETE");
};

export default function EditUserPage() {
	const router = useRouter();
	const params = useParams();
	const userId = params.id as string;
	const queryClient = useQueryClient();
	const videoRef = useRef<HTMLVideoElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);

	// State
	const [error, setError] = useState<string | null>(null);
	const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
	const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
	const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
	const [existingFiles, setExistingFiles] = useState<UserFile[]>([]);
	const [filesToDelete, setFilesToDelete] = useState<string[]>([]);
	const [showCamera, setShowCamera] = useState(false);
	const [stream, setStream] = useState<MediaStream | null>(null);
	const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
	const [selectedCameraId, setSelectedCameraId] = useState<string>("");
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [cameraError, setCameraError] = useState<string | null>(null);
	const [formData, setFormData] = useState({
		first_name: "",
		last_name: "",
		address: "",
		gender: "",
		religion: "",
		contact_number: "",
		email: "",
		role: "admin",
	});

	// Fetch admin data
	const {
		data: adminData,
		isLoading: userLoading,
		error: userError,
	} = useQuery<User>({
		queryKey: ["admin", userId],
		queryFn: () => fetchUser(userId),
		enabled: !!userId,
	});

	// React Query Mutation for updating user
	const updateMutation = useMutation({
		mutationFn: updateUser,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admins"] });
			queryClient.invalidateQueries({ queryKey: ["admin", userId] });
			router.push("/admins");
		},
		onError: (err) => {
			const apiError = err as ApiError;
			setError(apiError.message || "An unexpected error occurred.");
		},
	});

	// React Query Mutation for deleting files
	const deleteFileMutation = useMutation({
		mutationFn: deleteUserFile,
		onSuccess: (_, variables) => {
			setExistingFiles((prev) => prev?.filter((file) => file.id !== Number(variables.fileId)) || []);
			setFilesToDelete((prev) => prev.filter((id) => id !== variables.fileId));
		},
		onError: (err) => {
			const apiError = err as ApiError;
			setError(apiError.message || "Failed to delete file.");
		},
	});

	// Populate form with user data
	useEffect(() => {
		if (adminData) {
			setFormData({
				first_name: adminData.first_name || "",
				last_name: adminData.last_name || "",
				address: adminData.address || "",
				gender: adminData.gender || "",
				religion: adminData.religion || "",
				contact_number: adminData.contact_number || "",
				email: adminData.email || "",
				role: adminData.role || "admin",
			});

			if (adminData.profile_image) {
				setProfileImagePreview(adminData.profile_image);
			}

			if (adminData.user_files) {
				setExistingFiles(adminData.user_files);
			}
		}
	}, [adminData]);

	// Get available cameras
	const getAvailableCameras = useCallback(async () => {
		try {
			const devices = await navigator.mediaDevices.enumerateDevices();
			const videoDevices = devices.filter((device) => device.kind === "videoinput");
			setCameras(videoDevices);

			if (videoDevices.length > 0 && !selectedCameraId) {
				// Prefer front camera if available, otherwise use first camera
				const frontCamera = videoDevices.find(
					(device) => device.label.toLowerCase().includes("front") || device.label.toLowerCase().includes("user")
				);
				setSelectedCameraId(frontCamera?.deviceId || videoDevices[0].deviceId);
			}
		} catch (err) {
			console.error("Error getting cameras:", err);
			setCameraError("Unable to access camera devices");
		}
	}, [selectedCameraId]);

	// Start camera with specific device
	const startCamera = useCallback(
		async (deviceId?: string) => {
			try {
				setCameraError(null);

				// Stop existing stream if any
				if (stream) {
					stream.getTracks().forEach((track) => track.stop());
				}

				const constraints: MediaStreamConstraints = {
					video: {
						deviceId: deviceId ? { exact: deviceId } : undefined,
						width: { ideal: 1280, max: 1920 },
						height: { ideal: 720, max: 1080 },
						facingMode: !deviceId ? "user" : undefined,
					},
					audio: false,
				};

				const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
				setStream(mediaStream);
				setShowCamera(true);

				if (videoRef.current) {
					videoRef.current.srcObject = mediaStream;
					// Ensure video plays
					videoRef.current.onloadedmetadata = () => {
						videoRef.current?.play();
					};
				}
			} catch (err: unknown) {
				console.error("Camera error:", err);
				let errorMessage = "Unable to access camera. ";

				if (err instanceof Error) {
					errorMessage += err.message;
				} else {
					errorMessage += "Unknown error occurred.";
				}

				setCameraError(errorMessage);
			}
		},
		[stream]
	);

	// Stop camera
	const stopCamera = useCallback(() => {
		if (stream) {
			stream.getTracks().forEach((track) => track.stop());
			setStream(null);
		}
		setShowCamera(false);
		setIsFullscreen(false);
		setCameraError(null);
	}, [stream]);

	// Switch camera
	const switchCamera = useCallback(() => {
		if (cameras.length > 1) {
			const currentIndex = cameras.findIndex((camera) => camera.deviceId === selectedCameraId);
			const nextIndex = (currentIndex + 1) % cameras.length;
			const nextCameraId = cameras[nextIndex].deviceId;
			setSelectedCameraId(nextCameraId);
			startCamera(nextCameraId);
		}
	}, [cameras, selectedCameraId, startCamera]);

	// Capture photo
	const capturePhoto = useCallback(() => {
		if (videoRef.current && canvasRef.current) {
			const video = videoRef.current;
			const canvas = canvasRef.current;
			const context = canvas.getContext("2d");

			if (context && video.videoWidth && video.videoHeight) {
				// Set canvas dimensions to match video
				canvas.width = video.videoWidth;
				canvas.height = video.videoHeight;

				// Draw the video frame to canvas
				context.drawImage(video, 0, 0, canvas.width, canvas.height);

				// Convert canvas to blob and create file
				canvas.toBlob(
					(blob) => {
						if (blob) {
							const file = new File([blob], `photo_${Date.now()}.jpg`, { type: "image/jpeg" });
							setProfileImageFile(file);
							setProfileImagePreview(canvas.toDataURL("image/jpeg", 0.9));
							stopCamera();
						}
					},
					"image/jpeg",
					0.9
				);
			} else {
				setCameraError("Unable to capture photo. Please try again.");
			}
		}
	}, [stopCamera]);

	// Toggle fullscreen camera
	const toggleFullscreen = () => {
		setIsFullscreen(!isFullscreen);
	};

	// Initialize cameras on component mount
	useEffect(() => {
		getAvailableCameras();

		// Cleanup on unmount
		return () => {
			if (stream) {
				stream.getTracks().forEach((track) => track.stop());
			}
		};
	}, [getAvailableCameras, stream]);

	// Handlers
	const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (file) {
			setProfileImageFile(file);
			const reader = new FileReader();
			reader.onload = (e) => setProfileImagePreview(e.target?.result as string);
			reader.readAsDataURL(file);
		}
	};

	const retakePhoto = () => {
		setProfileImagePreview(adminData?.profile_image || null);
		setProfileImageFile(null);
		startCamera(selectedCameraId);
	};

	const removeProfileImage = () => {
		setProfileImagePreview(null);
		setProfileImageFile(null);
	};

	const handleAdditionalFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(event.target.files || []);
		setAdditionalFiles((prev) => [...prev, ...files]);
	};

	const removeFile = (index: number) => {
		setAdditionalFiles((prev) => prev.filter((_, i) => i !== index));
	};

	const removeExistingFile = (fileId: string) => {
		if (window.confirm("Are you sure you want to delete this file?")) {
			deleteFileMutation.mutate({ userId, fileId });
		}
	};

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

		if (profileImageFile) {
			submissionData.append("profile_image", profileImageFile);
		}

		additionalFiles.forEach((file) => {
			submissionData.append("files[]", file);
		});

		// Include files to delete
		filesToDelete.forEach((fileId) => {
			submissionData.append("delete_files[]", fileId);
		});

		updateMutation.mutate({ userId, formData: submissionData });
	};

	if (userLoading) {
		return (
			<div className='min-h-screen bg-gray-50 py-8 px-4 flex items-center justify-center'>
				<div className='text-center'>
					<Loader2 className='w-8 h-8 animate-spin mx-auto mb-4' />
					<p>Loading admin data...</p>
				</div>
			</div>
		);
	}

	if (userError) {
		return (
			<div className='min-h-screen bg-gray-50 py-8 px-4 flex items-center justify-center'>
				<Alert variant='destructive' className='max-w-md'>
					<AlertCircle className='h-4 w-4' />
					<AlertDescription>Failed to load admin data. Please try again.</AlertDescription>
				</Alert>
			</div>
		);
	}

	return (
		<div className='min-h-screen bg-gray-50 py-8 px-4'>
			<div className='max-w-2xl mx-auto'>
				<div className='mb-6'>
					<Button variant='ghost' onClick={() => router.push("/admins")} className='flex items-center gap-2'>
						<ArrowLeft className='w-4 h-4' />
						Back to Admins Table
					</Button>
				</div>

				<Card>
					<CardHeader className='text-center'>
						<CardTitle className='text-2xl font-bold text-gray-900'>Edit Admin</CardTitle>
						<CardDescription>Update the admin&apos;s information below</CardDescription>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleSubmit} className='space-y-6'>
							{error && (
								<Alert variant='destructive'>
									<AlertCircle className='h-4 w-4' />
									<AlertDescription>{error}</AlertDescription>
								</Alert>
							)}

							{cameraError && (
								<Alert variant='destructive'>
									<AlertCircle className='h-4 w-4' />
									<AlertDescription>{cameraError}</AlertDescription>
								</Alert>
							)}

							{/* Profile Picture Section */}
							<div className='flex flex-col items-center space-y-4'>
								<div className='relative'>
									<Avatar className='w-24 h-24'>
										<AvatarImage src={profileImagePreview || undefined} className='object-cover' />
										<AvatarFallback className='text-lg'>
											<UserIcon className='w-8 h-8' />
										</AvatarFallback>
									</Avatar>
									{profileImagePreview && (
										<Button
											type='button'
											variant='destructive'
											size='sm'
											className='absolute -top-2 -right-2 rounded-full p-1 h-6 w-6'
											onClick={removeProfileImage}>
											<X className='w-3 h-3' />
										</Button>
									)}
								</div>

								{/* Camera View */}
								{showCamera && (
									<div
										className={`relative bg-black rounded-lg overflow-hidden transition-all duration-300 ${
											isFullscreen ? "fixed inset-4 z-50 w-auto h-auto" : "w-80 h-60"
										}`}>
										<video ref={videoRef} autoPlay playsInline muted className='w-full h-full object-cover' />
										<canvas ref={canvasRef} className='hidden' />

										{/* Camera Controls */}
										<div className='absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2'>
											<Button
												type='button'
												onClick={capturePhoto}
												className='bg-white text-black hover:bg-gray-200 rounded-full p-3'
												size='sm'
												disabled={!stream}>
												<Camera className='w-5 h-5' />
											</Button>

											{cameras.length > 1 && (
												<Button
													type='button'
													onClick={switchCamera}
													variant='outline'
													className='rounded-full p-3 bg-white/10 hover:bg-white/20 text-white border-white/30'
													size='sm'>
													<SwitchCamera className='w-5 h-5' />
												</Button>
											)}

											<Button
												type='button'
												onClick={toggleFullscreen}
												variant='outline'
												className='rounded-full p-3 bg-white/10 hover:bg-white/20 text-white border-white/30'
												size='sm'>
												<Maximize2 className='w-5 h-5' />
											</Button>

											<Button type='button' variant='destructive' onClick={stopCamera} className='rounded-full p-3' size='sm'>
												<X className='w-5 h-5' />
											</Button>
										</div>

										{/* Camera Info */}
										{cameras.length > 1 && (
											<div className='absolute top-4 left-4 bg-black/50 text-white px-2 py-1 rounded text-xs'>
												{cameras.find((c) => c.deviceId === selectedCameraId)?.label || "Camera"}(
												{cameras.findIndex((c) => c.deviceId === selectedCameraId) + 1}/{cameras.length})
											</div>
										)}
									</div>
								)}

								{/* Upload Options */}
								{!showCamera && (
									<div className='flex w-full gap-2 justify-center'>
										<div className='w-full'>
											<input id='profile-image' type='file' accept='image/*' onChange={handleImageUpload} className='hidden' />
											<label
												htmlFor='profile-image'
												className='flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-blue-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer group'>
												<div className='flex items-center space-x-3 text-blue-600 group-hover:text-blue-700'>
													<div className='w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center'>
														<Upload className='w-5 h-5' />
													</div>
													<div className='text-left'>
														<p className='text-sm font-medium'>Upload from device</p>
														<p className='text-xs text-gray-500'>PNG, JPG up to 5MB</p>
													</div>
												</div>
											</label>
										</div>

										<div
											onClick={profileImageFile ? retakePhoto : () => startCamera(selectedCameraId)}
											className='flex items-center justify-center w-full px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors cursor-pointer group'>
											<div className='flex items-center space-x-3 text-gray-600 group-hover:text-gray-700'>
												<div className='w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center'>
													{profileImageFile ? <RotateCcw className='w-4 h-4' /> : <Camera className='w-4 h-4' />}
												</div>
												<div className='text-left'>
													<p className='text-sm font-medium'>{profileImageFile ? "Retake photo" : "Take new photo"}</p>
													<p className='text-xs text-gray-500'>Use your camera</p>
												</div>
											</div>
										</div>
									</div>
								)}

								<p className='text-xs text-gray-600 text-center'>
									{showCamera
										? `Position yourself in the frame and click capture. ${
												cameras.length > 1 ? "Use the switch button to change cameras." : ""
										  }`
										: "For best results, use a square image at least 200x200 pixels"}
								</p>
							</div>

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

								<div className='space-y-2 md:col-span-2'>
									<Label htmlFor='religion' className='flex items-center gap-2'>
										<Heart className='w-4 h-4' />
										Religion
									</Label>
									<Select value={formData.religion} onValueChange={(value) => handleInputChange("religion", value)}>
										<SelectTrigger>
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

							{/* Files Section */}
							<div className='space-y-4'>
								<Label className='flex items-center gap-2'>
									<FileText className='w-4 h-4' />
									Files
								</Label>

								{/* Existing Files */}
								{existingFiles && existingFiles.length > 0 && (
									<div className='space-y-2'>
										<p className='text-sm font-medium text-gray-700'>Existing Files:</p>
										<div className='space-y-2'>
											{existingFiles.map((file) => (
												<div key={file.id} className='flex items-center justify-between bg-blue-50 p-2 rounded border'>
													<div className='flex items-center gap-2'>
														<FileText className='w-4 h-4 text-blue-500' />
														<a href={file.file_path} target='_blank' rel='noopener noreferrer' className='text-sm text-blue-700 hover:underline'>
															{file.file_name}
														</a>
														<Badge variant='secondary' className='text-xs'>
															{(file.file_size / 1024 / 1024).toFixed(2)} MB
														</Badge>
													</div>
													<Button
														type='button'
														variant='ghost'
														size='sm'
														onClick={() => removeExistingFile(String(file.id))}
														disabled={deleteFileMutation.isPending}
														className='text-red-500 hover:text-red-700'>
														{deleteFileMutation.isPending ? <Loader2 className='w-4 h-4 animate-spin' /> : <X className='w-4 h-4' />}
													</Button>
												</div>
											))}
										</div>
									</div>
								)}

								{/* Upload New Files */}
								<div className='border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors'>
									<input type='file' multiple onChange={handleAdditionalFiles} className='hidden' id='additional-files' />
									<label htmlFor='additional-files' className='cursor-pointer'>
										<Upload className='w-8 h-8 mx-auto mb-2 text-gray-400' />
										<p className='text-sm text-gray-600'>Click to upload additional files</p>
										<p className='text-xs text-gray-500 mt-1'>Up to 10MB each</p>
									</label>
								</div>

								{/* New Files to Upload */}
								{additionalFiles.length > 0 && (
									<div className='space-y-2'>
										<p className='text-sm font-medium text-gray-700'>New Files to Upload:</p>
										<div className='space-y-2'>
											{additionalFiles.map((file, index) => (
												<div key={index} className='flex items-center justify-between bg-green-50 p-2 rounded border'>
													<div className='flex items-center gap-2'>
														<FileText className='w-4 h-4 text-green-500' />
														<span className='text-sm text-green-700'>{file.name}</span>
														<Badge variant='secondary' className='text-xs'>
															{(file.size / 1024 / 1024).toFixed(2)} MB
														</Badge>
													</div>
													<Button
														type='button'
														variant='ghost'
														size='sm'
														onClick={() => removeFile(index)}
														className='text-red-500 hover:text-red-700'>
														<X className='w-4 h-4' />
													</Button>
												</div>
											))}
										</div>
									</div>
								)}
							</div>

							{/* Submit Button */}
							<div className='pt-4'>
								<Button type='submit' className='w-full bg-blue-600 hover:bg-blue-700' disabled={updateMutation.isPending}>
									{updateMutation.isPending ? (
										<>
											<Loader2 className='mr-2 h-4 w-4 animate-spin' />
										</>
									) : (
										<>
											<Save className='mr-2 h-4 w-4' />
											Update Admin Information
										</>
									)}
								</Button>
							</div>
						</form>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
