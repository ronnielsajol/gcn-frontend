"use client";

import { useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
	ArrowLeft,
	Search,
	Download,
	Trash2,
	Upload,
	FileText,
	Filter,
	Grid3X3,
	List,
	Calendar,
	FolderOpen,
	FileImage,
	Loader2,
	AlertCircle,
	X,
} from "lucide-react";
import { apiFetch, downloadUserFile } from "@/lib/api";
import { User, UserFile } from "@/types";
import { toast } from "sonner";

interface PaginatedResponse {
	current_page: number;
	data: UserFile[];
	first_page_url: string;
	from: number;
	last_page: number;
	last_page_url: string;
	links: Array<{
		url: string | null;
		label: string;
		active: boolean;
	}>;
	next_page_url: string | null;
	path: string;
	per_page: number;
	prev_page_url: string | null;
	to: number;
	total: number;
}

// Query keys for better type safety and cache management
const queryKeys = {
	user: (userId: string) => ["user", userId] as const,
	userFiles: (userId: string) => ["user", userId, "files"] as const,
};

// API functions with proper typing
const fetchUser = async (userId: string): Promise<User> => {
	const response = await apiFetch(`/users/${userId}`, "GET");
	if (!response) {
		throw new Error("User not found.");
	}
	return response as User;
};

const fetchUserFiles = async (userId: string): Promise<UserFile[]> => {
	const response = await apiFetch(`/users/${userId}/files`, "GET");
	// Handle paginated response - extract the data array
	if (response && typeof response === "object" && "data" in response) {
		return (response as PaginatedResponse).data || [];
	}
	// Fallback in case the response is already an array
	return (response || []) as UserFile[];
};

const uploadFiles = async (userId: string, files: FileList): Promise<void> => {
	const formData = new FormData();

	// Append each file to FormData
	Array.from(files).forEach((file, index) => {
		formData.append(`files[${index}]`, file);
	});

	return await apiFetch(`/users/${userId}/files/upload`, "POST", formData);
};

const deleteFiles = async (userId: string, fileIds: number[]): Promise<void> => {
	await apiFetch(`/users/${userId}/files/bulk-delete`, "DELETE", { file_ids: fileIds });
};

const deleteSingleFile = async (userId: string, fileId: number): Promise<void> => {
	await apiFetch(`/users/${userId}/files/${fileId}`, "DELETE");
};

export default function UserFilesPage() {
	const router = useRouter();
	const params = useParams();
	const queryClient = useQueryClient();
	const userId = params.id as string;
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [searchTerm, setSearchTerm] = useState("");
	const [typeFilter, setTypeFilter] = useState("all");
	const [sortBy, setSortBy] = useState("date");
	const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
	const [selectedFiles, setSelectedFiles] = useState<number[]>([]);
	const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);

	// React Query for fetching user data
	const {
		data: user,
		isLoading: userLoading,
		error: userError,
	} = useQuery({
		queryKey: queryKeys.user(userId),
		queryFn: () => fetchUser(userId),
		enabled: !!userId,
		staleTime: 5 * 60 * 1000, // 5 minutes
	});

	// React Query for fetching user files
	const {
		data: files = [],
		isLoading: filesLoading,
		error: filesError,
	} = useQuery({
		queryKey: queryKeys.userFiles(userId),
		queryFn: () => fetchUserFiles(userId),
		enabled: !!userId,
		staleTime: 1 * 60 * 1000, // 1 minute
	});

	// Upload files mutation
	const uploadFilesMutation = useMutation({
		mutationFn: ({ userId, files }: { userId: string; files: FileList }) => uploadFiles(userId, files),
		onMutate: ({ files }) => {
			// Show uploading files immediately
			setUploadingFiles(Array.from(files));
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.userFiles(userId) });
			setUploadingFiles([]);
			toast.success("Files uploaded successfully");
			// Reset file input
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
		},
		onError: (error: Error) => {
			console.error("Failed to upload files:", error);
			setUploadingFiles([]);
			toast.error(error.message || "Failed to upload files");
		},
	});

	// Bulk delete files mutation
	const deleteFilesMutation = useMutation({
		mutationFn: ({ userId, fileIds }: { userId: string; fileIds: number[] }) => deleteFiles(userId, fileIds),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.userFiles(userId) });
			setSelectedFiles([]);
			toast.success("Files deleted successfully");
		},
		onError: (error: Error) => {
			console.error("Failed to delete files:", error);
			toast.error(error.message || "Failed to delete files");
		},
	});

	// Single file delete mutation
	const deleteSingleFileMutation = useMutation({
		mutationFn: ({ userId, fileId }: { userId: string; fileId: number }) => deleteSingleFile(userId, fileId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.userFiles(userId) });
			toast.success("File deleted successfully");
		},
		onError: (error: Error) => {
			console.error("Failed to delete file:", error);
			toast.error(error.message || "Failed to delete file");
		},
	});

	const isLoading = userLoading || filesLoading;
	const error = userError || filesError;

	// Ensure files is an array before filtering
	const filteredFiles = Array.isArray(files)
		? files
				.filter((file) => {
					const matchesSearch = file.file_name.toLowerCase().includes(searchTerm.toLowerCase());
					const matchesType = typeFilter === "all" || file.file_type.startsWith(typeFilter);
					return matchesSearch && matchesType;
				})
				.sort((a, b) => {
					switch (sortBy) {
						case "name":
							return a.file_name.localeCompare(b.file_name);
						case "size":
							return b.file_size - a.file_size;
						case "type":
							return a.file_type.localeCompare(b.file_type);
						case "date":
						default:
							return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
					}
				})
		: [];

	const fileTypes = Array.isArray(files) ? Array.from(new Set(files.map((file) => file.file_type.split("/")[0]))) : [];

	const handleFileSelect = (fileId: number) => {
		setSelectedFiles((prev) => (prev.includes(fileId) ? prev.filter((id) => id !== fileId) : [...prev, fileId]));
	};

	const handleSelectAll = () => {
		if (selectedFiles.length === filteredFiles.length) {
			setSelectedFiles([]);
		} else {
			setSelectedFiles(filteredFiles.map((file) => file.id));
		}
	};

	const handleDownload = async (fileId: number, fileName: string) => {
		try {
			await downloadUserFile(Number(userId), fileId, fileName);
		} catch (error) {
			console.error("Download failed:", error);
			toast.error("Failed to download file");
		}
	};

	const handleBulkDownload = () => {
		selectedFiles.forEach((fileId) => {
			const fileToDownload = files.find((f) => f.id === fileId);
			if (fileToDownload) {
				setTimeout(() => handleDownload(fileToDownload.id, fileToDownload.file_name), 100);
			}
		});
	};

	const handleBulkDelete = () => {
		if (selectedFiles.length > 0) {
			deleteFilesMutation.mutate({ userId, fileIds: selectedFiles });
		}
	};

	const handleSingleFileDelete = (fileId: number) => {
		deleteSingleFileMutation.mutate({ userId, fileId });
	};

	const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
		const files = event.target.files;
		if (files && files.length > 0) {
			uploadFilesMutation.mutate({ userId, files });
		}
	};

	const handleUploadClick = () => {
		fileInputRef.current?.click();
	};

	const removeUploadingFile = (index: number) => {
		setUploadingFiles((prev) => prev.filter((_, i) => i !== index));
	};

	const getFileIcon = (fileType: string) => {
		const mainType = fileType.split("/")[0];
		if (mainType === "image") {
			return (
				<div className='w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center'>
					<FileImage className='w-6 h-6 text-green-600' />
				</div>
			);
		}
		if (mainType === "application" && fileType.includes("pdf")) {
			return (
				<div className='w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center'>
					<FileText className='w-6 h-6 text-red-600' />
				</div>
			);
		}
		return (
			<div className='w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center'>
				<FileText className='w-6 h-6 text-gray-600' />
			</div>
		);
	};

	// Helper function to determine what empty state to show
	const getEmptyStateContent = () => {
		const hasNoFiles = !Array.isArray(files) || files.length === 0;
		const hasFilesButFiltered = Array.isArray(files) && files.length > 0 && filteredFiles.length === 0;
		const hasSearchOrFilter = searchTerm.trim() !== "" || typeFilter !== "all";

		if (hasNoFiles) {
			return {
				message: "No files found.",
				showClearButton: false,
			};
		}

		if (hasFilesButFiltered && hasSearchOrFilter) {
			return {
				message: "No files found matching your criteria.",
				showClearButton: true,
			};
		}

		return {
			message: "No files found.",
			showClearButton: false,
		};
	};

	if (isLoading) {
		return (
			<div className='min-h-screen flex items-center justify-center bg-gray-50'>
				<Loader2 className='w-12 h-12 animate-spin text-gray-500' />
			</div>
		);
	}

	if (error) {
		const errorMessage = error instanceof Error ? error.message : "Failed to fetch data.";
		return (
			<div className='min-h-screen flex items-center justify-center bg-gray-50'>
				<Card className='p-8 text-center'>
					<AlertCircle className='w-12 h-12 text-red-500 mx-auto mb-4' />
					<h2 className='text-xl font-semibold text-red-600'>An Error Occurred</h2>
					<p className='text-gray-600 mt-2'>{errorMessage}</p>
					<Button onClick={() => router.back()} className='mt-6'>
						Go Back
					</Button>
				</Card>
			</div>
		);
	}

	if (!user) {
		return null; // Should be handled by error state, return null for safety
	}

	const emptyState = getEmptyStateContent();

	return (
		<div className='min-h-screen bg-gray-50'>
			<div className='py-8 px-4'>
				<div className='max-w-7xl mx-auto'>
					{/* Header */}
					<div className='mb-6'>
						<Button variant='ghost' onClick={() => router.back()} className='flex items-center gap-2 mb-4'>
							<ArrowLeft className='w-4 h-4' />
							Back to Users
						</Button>
						<div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
							<div className='flex items-center gap-4'>
								<Avatar className='w-16 h-16'>
									<AvatarImage src={user.profile_image || "/placeholder.svg"} className='object-cover' />
									<AvatarFallback className='text-lg'>
										{user.first_name
											.split(" ")
											.map((n) => n[0])
											.join("")}
									</AvatarFallback>
								</Avatar>
								<div>
									<h1 className='text-2xl font-bold text-gray-900'>{user.first_name}&apos;s Files</h1>
									<p className='text-gray-600'>{user.email}</p>
									<p className='text-sm text-gray-500'>{files.length} files total</p>
								</div>
							</div>

							<div className='flex gap-2'>
								<input type='file' ref={fileInputRef} onChange={handleFileUpload} className='hidden' multiple />
								<Button
									variant='outline'
									className='flex items-center gap-2 bg-transparent'
									onClick={handleUploadClick}
									disabled={uploadFilesMutation.isPending}>
									{uploadFilesMutation.isPending ? <Loader2 className='w-4 h-4 animate-spin' /> : <Upload className='w-4 h-4' />}
									{uploadFilesMutation.isPending ? "Uploading..." : "Upload Files"}
								</Button>
								{selectedFiles.length > 0 && (
									<>
										<Button onClick={handleBulkDownload} className='flex items-center gap-2'>
											<Download className='w-4 h-4' />
											Download ({selectedFiles.length})
										</Button>
										<Button
											variant='destructive'
											onClick={handleBulkDelete}
											className='flex items-center gap-2'
											disabled={deleteFilesMutation.isPending}>
											{deleteFilesMutation.isPending ? <Loader2 className='w-4 h-4 animate-spin' /> : <Trash2 className='w-4 h-4' />}
											Delete ({selectedFiles.length})
										</Button>
									</>
								)}
							</div>
						</div>
					</div>

					{/* Upload Progress */}
					{uploadingFiles.length > 0 && (
						<Card className='mb-6'>
							<CardHeader>
								<CardTitle className='text-sm'>Uploading Files</CardTitle>
							</CardHeader>
							<CardContent>
								<div className='space-y-2'>
									{uploadingFiles.map((file, index) => (
										<div key={index} className='flex items-center justify-between p-2 bg-gray-50 rounded'>
											<div className='flex items-center gap-2'>
												<FileText className='w-4 h-4' />
												<span className='text-sm'>{file.name}</span>
												<span className='text-xs text-gray-500'>({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
											</div>
											<div className='flex items-center gap-2'>
												{uploadFilesMutation.isPending ? (
													<Loader2 className='w-4 h-4 animate-spin' />
												) : (
													<Button variant='ghost' size='sm' onClick={() => removeUploadingFile(index)}>
														<X className='w-4 h-4' />
													</Button>
												)}
											</div>
										</div>
									))}
								</div>
							</CardContent>
						</Card>
					)}

					{/* Filters and Controls */}
					<Card className='mb-6'>
						<CardHeader>
							<div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
								<div className='flex items-center gap-2'>
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
											placeholder='Search files...'
											value={searchTerm}
											onChange={(e) => setSearchTerm(e.target.value)}
											className='pl-10'
										/>
									</div>
								</div>

								<Select value={typeFilter} onValueChange={setTypeFilter}>
									<SelectTrigger className='w-full lg:w-[180px]'>
										<SelectValue placeholder='All Types' />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value='all'>All Types</SelectItem>
										{fileTypes.map((type) => (
											<SelectItem key={type} value={type}>
												{type.charAt(0).toUpperCase() + type.slice(1)}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<Select value={sortBy} onValueChange={setSortBy}>
									<SelectTrigger className='w-full lg:w-[180px]'>
										<SelectValue placeholder='Sort by' />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value='date'>Date</SelectItem>
										<SelectItem value='name'>Name</SelectItem>
										<SelectItem value='size'>Size</SelectItem>
										<SelectItem value='type'>Type</SelectItem>
									</SelectContent>
								</Select>
							</div>

							{files.length > 0 && (
								<div className='flex items-center gap-4 mt-4 pt-4 border-t'>
									<div className='flex items-center space-x-2'>
										<Checkbox
											id='select-all'
											checked={filteredFiles.length > 0 && selectedFiles.length === filteredFiles.length}
											onCheckedChange={handleSelectAll}
										/>
										<label htmlFor='select-all' className='text-sm font-medium'>
											Select All ({filteredFiles.length})
										</label>
									</div>
									{searchTerm && (
										<p className='text-sm text-gray-600'>
											Showing {filteredFiles.length} of {files.length} files
										</p>
									)}
								</div>
							)}
						</CardContent>
					</Card>

					{/* Files Display or Empty State */}
					{filteredFiles.length > 0 ? (
						<div
							className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" : "space-y-2"}>
							{filteredFiles.map((file) => (
								<Card
									key={file.id}
									className={`p-4 hover:shadow-md transition-shadow ${selectedFiles.includes(file.id) ? "ring-2 ring-blue-500" : ""} ${
										viewMode === "list" ? "p-0" : ""
									}`}>
									{viewMode === "grid" ? (
										<CardContent className='px-0'>
											<div className='flex items-center justify-between mb-3'>
												<Checkbox
													className='w-6 h-6 rounded-lg'
													checked={selectedFiles.includes(file.id)}
													onCheckedChange={() => handleFileSelect(file.id)}
												/>
												<div
													className={`flex gap-1 transition-opacity duration-200 ${
														selectedFiles.includes(file.id) ? "opacity-0 pointer-events-none" : "opacity-100"
													}`}>
													<Button variant='ghost' size='sm' onClick={() => handleDownload(file.id, file.file_name)} className='h-8 w-8 p-0'>
														<Download className='w-4 h-4' />
													</Button>
													<Button
														variant='ghost'
														size='sm'
														onClick={() => handleSingleFileDelete(file.id)}
														className='h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600'
														disabled={deleteSingleFileMutation.isPending}>
														{deleteSingleFileMutation.isPending ? <Loader2 className='w-3 h-3 animate-spin' /> : <Trash2 className='w-4 h-4' />}
													</Button>
												</div>
											</div>

											<div className='flex flex-col items-center text-center space-y-3'>
												{getFileIcon(file.file_type)}
												<div className='w-full'>
													<p className='text-sm font-medium text-gray-900 truncate' title={file.file_name}>
														{file.file_name}
													</p>
													<p className='text-xs text-gray-500'>{(file.file_size / (1024 * 1024)).toFixed(2)} MB</p>
												</div>
												<div className='flex flex-col gap-2 w-full'>
													<div className='flex items-center justify-center gap-1 text-xs text-gray-400'>
														<Calendar className='w-3 h-3' />
														{new Date(file.created_at).toLocaleDateString()}
													</div>
												</div>
											</div>
										</CardContent>
									) : (
										<CardContent className='p-4'>
											<div className='flex items-center gap-4'>
												<Checkbox checked={selectedFiles.includes(file.id)} onCheckedChange={() => handleFileSelect(file.id)} />
												<div className='flex-shrink-0'>{getFileIcon(file.file_type)}</div>
												<div className='flex-1 min-w-0'>
													<p className='text-sm font-medium text-gray-900 truncate'>{file.file_name}</p>
													<div className='flex items-center gap-4 mt-1'>
														<span className='text-xs text-gray-500'>{(file.file_size / (1024 * 1024)).toFixed(2)} MB</span>
														<span className='text-xs text-gray-500'>{new Date(file.created_at).toLocaleDateString()}</span>
													</div>
												</div>
												<div
													className={`flex gap-2 transition-opacity duration-200 ${
														selectedFiles.includes(file.id) ? "opacity-0 pointer-events-none" : "opacity-100"
													}`}>
													<Button
														variant='outline'
														size='sm'
														onClick={() => handleDownload(Number(file.id), file.file_name)}
														className='bg-transparent'>
														<Download className='w-4 h-4' />
													</Button>
													<Button
														variant='outline'
														size='sm'
														onClick={() => handleSingleFileDelete(file.id)}
														className='bg-transparent hover:bg-red-50 hover:text-red-600 hover:border-red-200'
														disabled={deleteSingleFileMutation.isPending}>
														{deleteSingleFileMutation.isPending ? <Loader2 className='w-4 h-4 animate-spin' /> : <Trash2 className='w-4 h-4' />}
													</Button>
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
								<div className='w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4'>
									<FolderOpen className='w-8 h-8 text-gray-400' />
								</div>
								<p className='text-gray-500'>{emptyState.message}</p>
								{emptyState.showClearButton && (
									<Button
										variant='outline'
										className='mt-4 bg-transparent'
										onClick={() => {
											setSearchTerm("");
											setTypeFilter("all");
										}}>
										Clear Search
									</Button>
								)}
							</CardContent>
						</Card>
					)}
				</div>
			</div>
		</div>
	);
}
