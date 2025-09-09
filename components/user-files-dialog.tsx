"use client";

import type React from "react";

import { Button } from "@/components/ui/button";
import { FileText, Eye, FileImage, Loader2, Files } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { User } from "@/types"; // Assuming User type has user_files: { file_name, file_type, created_at, file_url }[]
import { useState } from "react";
import { downloadUserFile } from "@/lib/api";
import { useRouter } from "next/navigation";

interface UserFilesDialogProps {
	user: User;
	trigger?: React.ReactNode;
}

export default function UserFilesDialog({ user, trigger }: UserFilesDialogProps) {
	const [downloadingFiles, setDownloadingFiles] = useState<Set<number>>(new Set());
	const [isDownloading, setIsDownloading] = useState(false);
	const router = useRouter();

	/**
	 * Triggers a download for the given file URL.
	 * @param fileUrl - The direct URL of the file to download.
	 * @param fileName - The desired name for the downloaded file.
	 */
	const handleDownload = async (fileId: number, fileName: string) => {
		try {
			setDownloadingFiles((prev) => new Set(prev).add(fileId));
			setIsDownloading(true);
			await downloadUserFile(Number(user.id), fileId, fileName);
		} catch (error) {
			console.error("Download failed:", error);
			// You could add a toast notification here
		} finally {
			setDownloadingFiles((prev) => {
				const newSet = new Set(prev);
				newSet.delete(fileId);
				return newSet;
			});
			setIsDownloading(false);
		}
	};

	/**
	 * Returns a styled icon based on the file's MIME type.
	 * @param fileType - The MIME type of the file (e.g., "image/png", "application/pdf").
	 */
	const getFileIcon = (fileType: string) => {
		const mainType = fileType.split("/")[0]?.toLowerCase();
		const subType = fileType.split("/")[1]?.toLowerCase();

		if (mainType === "image") {
			return (
				<div className='w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center'>
					<FileImage className='w-5 h-5 text-green-600' />
				</div>
			);
		}

		if (subType === "pdf") {
			return (
				<div className='w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center'>
					<FileText className='w-5 h-5 text-red-600' />
				</div>
			);
		}

		if (
			mainType === "application" &&
			(subType === "msword" || subType === "vnd.openxmlformats-officedocument.wordprocessingml.document")
		) {
			return (
				<div className='w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center'>
					<FileText className='w-5 h-5 text-blue-600' />
				</div>
			);
		}

		// Default icon for other file types
		return (
			<div className='w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center'>
				<FileText className='w-5 h-5 text-gray-600' />
			</div>
		);
	};

	const defaultTrigger = (
		<Button variant='outline' size='sm' className='flex items-center gap-1'>
			<Files className='w-4 h-4' />
			Files
		</Button>
	);

	return (
		<Dialog>
			<DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
			<DialogContent className='max-w-4xl max-h-[80vh] overflow-hidden'>
				<DialogHeader>
					<DialogTitle className='flex items-center gap-2'>
						<FileText className='w-5 h-5' />
						Files for {user.first_name} {user.last_name}
					</DialogTitle>
					<DialogDescription>View and download files uploaded by this user.</DialogDescription>
				</DialogHeader>

				<div className='space-y-4'>
					{user.user_files?.length > 0 ? (
						<>
							<div className='grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto pr-2'>
								{user.user_files.slice(0, 10).map((file, index) => (
									<div key={index} className='border rounded-lg p-4 hover:shadow-md transition-shadow'>
										<div className='flex items-start justify-between mb-3'>
											<div className='flex items-center gap-3 flex-1 min-w-0'>
												<div className='flex-shrink-0'>{getFileIcon(file.file_type)}</div>
												<div className='flex-1 min-w-0'>
													<p className='text-sm font-medium text-gray-900 truncate' title={file.file_name}>
														{file.file_name}
													</p>
													<p className='text-xs text-gray-500 uppercase'>{file.file_type} file</p>
												</div>
											</div>
											<Button
												variant='outline'
												size='sm'
												className='ml-2 flex-shrink-0 bg-transparent flex justify-center items-center'
												onClick={() => handleDownload(file.id, file.file_name)}
												disabled={isDownloading}>
												{isDownloading ? <Loader2 className=' h-4 w-4 animate-spin' /> : "Download"}
											</Button>
										</div>
										<div className='text-xs text-gray-400'>Uploaded on {new Date(file.created_at).toLocaleDateString()}</div>
									</div>
								))}
							</div>

							{user.user_files.length > 10 && (
								<div className='text-center py-2'>
									<p className='text-sm text-gray-500 mb-3'>Showing 10 of {user.user_files.length} files</p>
								</div>
							)}

							<div className='flex justify-between items-center pt-4 border-t'>
								<div className='text-sm text-gray-600'>Total files: {user.user_files.length}</div>
								<Button className='flex items-center gap-2' onClick={() => router.push(`/users/${user.id}/files`)}>
									<FileText className='w-4 h-4' />
									Manage All Files
								</Button>
							</div>
						</>
					) : (
						<div className='text-center py-8 flex flex-col items-center gap-4'>
							<div className='w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4'>
								<FileText className='w-8 h-8 text-gray-400' />
							</div>
							<p className='text-gray-500 text-sm'>No files uploaded for this user.</p>
							<Button className='flex items-center gap-2' onClick={() => router.push(`/users/${user.id}/files`)}>
								<FileText className='w-4 h-4' />
								Upload Files
							</Button>
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
