"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import UserAvatar from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
	Search,
	Eye,
	Filter,
	Calendar,
	User,
	FileText,
	Trash2,
	Upload,
	Edit,
	Shield,
	Clock,
	Monitor,
	MapPin,
} from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ActivityLog, ActivityLogApiResponse, ActivityLogValues } from "@/types";
import { apiFetch } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

const queryKeys = {
	activityLogs: (page: number) => ["activityLogs", page] as const,
};

const fetchActivityLogs = async (page: number): Promise<ActivityLogApiResponse> => {
	const response = await apiFetch<ActivityLogApiResponse>(`/activity-logs?page=${page}`, "GET");
	return response;
};

export default function ActivityLogsPage() {
	const [currentPage, setCurrentPage] = useState(1);
	const [searchTerm, setSearchTerm] = useState("");
	const [actionFilter, setActionFilter] = useState("all");
	const [modelFilter, setModelFilter] = useState("all");
	const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);

	const {
		data: activityLogs,
		isLoading,
		error,
	} = useQuery({
		queryKey: queryKeys.activityLogs(currentPage),
		queryFn: () => fetchActivityLogs(currentPage),
		staleTime: 5 * 60 * 1000,
		refetchOnWindowFocus: true,
	});

	// Reset to page 1 when filters change
	useEffect(() => {
		setCurrentPage(1);
	}, [searchTerm, actionFilter, modelFilter]);

	const filteredLogs =
		activityLogs?.data?.filter((log) => {
			const matchesSearch =
				log.admin?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
				log.admin?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
				log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
				log.ip_address.includes(searchTerm);

			const matchesAction = actionFilter === "all" || log.action === actionFilter;
			const matchesModel = modelFilter === "all" || log.model_type.includes(modelFilter);

			return matchesSearch && matchesAction && matchesModel;
		}) || [];

	const getActionIcon = (action: string) => {
		switch (action) {
			case "created":
				return <User className='w-4 h-4 text-green-600' />;
			case "updated":
				return <Edit className='w-4 h-4 text-blue-600' />;
			case "deleted":
				return <Trash2 className='w-4 h-4 text-red-600' />;
			case "file_upload":
				return <Upload className='w-4 h-4 text-purple-600' />;
			case "bulk_file_delete":
				return <Trash2 className='w-4 h-4 text-red-600' />;
			default:
				return <FileText className='w-4 h-4 text-gray-600' />;
		}
	};

	const getActionBadge = (action: string) => {
		const variants: Record<string, string> = {
			created: "bg-green-100 text-green-800",
			updated: "bg-blue-100 text-blue-800",
			deleted: "bg-red-100 text-red-800",
			file_upload: "bg-purple-100 text-purple-800",
			bulk_file_delete: "bg-red-100 text-red-800",
		};
		return variants[action] || "bg-gray-100 text-gray-800";
	};

	const getModelName = (modelType: string) => {
		if (modelType.includes("User")) return "User";
		if (modelType.includes("UserFile")) return "File";
		if (modelType.includes("Admin")) return "Admin";
		return modelType.split("\\").pop() || modelType;
	};

	const formatDateTime = (dateString: string) => {
		const date = new Date(dateString);
		return {
			date: date.toLocaleDateString(),
			time: date.toLocaleTimeString(),
		};
	};

	const getBrowserInfo = (userAgent: string) => {
		if (userAgent.includes("Chrome")) return "Chrome";
		if (userAgent.includes("Firefox")) return "Firefox";
		if (userAgent.includes("Safari")) return "Safari";
		if (userAgent.includes("Edge")) return "Edge";
		return "Unknown";
	};

	const getChangedFields = (oldValues: ActivityLogValues | null, newValues: ActivityLogValues | null) => {
		if (!oldValues || !newValues) return [];

		const changes: Array<{ field: string; oldValue: unknown; newValue: unknown }> = [];

		// Type-safe comparison of objects by first converting to unknown, then to Record
		const oldObj = oldValues as unknown as Record<string, unknown>;
		const newObj = newValues as unknown as Record<string, unknown>;

		Object.keys(newObj).forEach((key) => {
			if (oldObj[key] !== newObj[key] && key !== "updated_at") {
				changes.push({
					field: key,
					oldValue: oldObj[key],
					newValue: newObj[key],
				});
			}
		});

		return changes;
	};

	const getFileInfo = (values: ActivityLogValues | null) => {
		if (!values) return null;

		// Type guard to check if it's file-related data
		if ("file_name" in values) {
			return values.file_name;
		}
		return null;
	};

	const handlePreviousPage = () => {
		if (activityLogs?.prev_page_url) {
			setCurrentPage((prev) => prev - 1);
		}
	};

	const handleNextPage = () => {
		if (activityLogs?.next_page_url) {
			setCurrentPage((prev) => prev + 1);
		}
	};

	const actions = Array.from(new Set(activityLogs?.data?.map((log) => log.action) || []));
	const models = Array.from(new Set(activityLogs?.data?.map((log) => getModelName(log.model_type)) || []));

	// Show loading state
	if (isLoading) {
		return (
			<div className='min-h-screen bg-gray-50 flex items-center justify-center'>
				<div className='text-center'>
					<Shield className='w-16 h-16 text-gray-400 mx-auto mb-4 animate-pulse' />
					<p className='text-gray-500'>Loading activity logs...</p>
				</div>
			</div>
		);
	}

	// Show error state
	if (error) {
		return (
			<div className='min-h-screen bg-gray-50 flex items-center justify-center'>
				<div className='text-center'>
					<Shield className='w-16 h-16 text-red-400 mx-auto mb-4' />
					<p className='text-red-500'>Error loading activity logs</p>
					<p className='text-gray-500 text-sm mt-2'>Please try refreshing the page</p>
				</div>
			</div>
		);
	}

	return (
		<div className='min-h-screen bg-gray-50'>
			<div className='py-8 px-4'>
				<div className='max-w-7xl mx-auto'>
					{/* Header */}
					<div className='mb-6'>
						<div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
							<div>
								<h1 className='text-2xl font-bold text-gray-900 flex items-center gap-2'>
									<Shield className='w-6 h-6' />
									Activity Logs
								</h1>
								<p className='text-gray-600'>Monitor all admin activities and system changes</p>
							</div>
							<div className='flex items-center gap-2 text-sm text-gray-500'>
								<Clock className='w-4 h-4' />
								Total: {activityLogs?.total || 0} activities
							</div>
						</div>
					</div>

					{/* Filters */}
					<Card className='mb-6'>
						<CardHeader>
							<CardTitle className='text-lg flex items-center gap-2'>
								<Filter className='w-5 h-5' />
								Filters & Search
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className='flex flex-col lg:flex-row gap-4'>
								<div className='flex-1'>
									<div className='relative'>
										<Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
										<Input
											placeholder='Search by admin name, email, action, or IP address...'
											value={searchTerm}
											onChange={(e) => setSearchTerm(e.target.value)}
											className='pl-10'
										/>
									</div>
								</div>
								<Select value={actionFilter} onValueChange={setActionFilter}>
									<SelectTrigger className='w-full lg:w-[180px]'>
										<SelectValue placeholder='All Actions' />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value='all'>All Actions</SelectItem>
										{actions.map((action) => (
											<SelectItem key={action} value={action}>
												{action.replace("_", " ").toUpperCase()}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<Select value={modelFilter} onValueChange={setModelFilter}>
									<SelectTrigger className='w-full lg:w-[180px]'>
										<SelectValue placeholder='All Models' />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value='all'>All Models</SelectItem>
										{models.map((model) => (
											<SelectItem key={model} value={model}>
												{model}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className='flex items-center justify-between mt-4 pt-4 border-t'>
								<p className='text-sm text-gray-600'>
									Showing {filteredLogs.length} of {activityLogs?.total || 0} activities
								</p>
								<div className='text-sm text-gray-500'>
									Page {activityLogs?.current_page || 1} of {activityLogs?.last_page || 1}
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Activity Logs */}
					<div className='space-y-4'>
						{filteredLogs.map((log) => {
							const dateTime = formatDateTime(log.created_at);
							const changes = getChangedFields(log.old_values, log.new_values);
							const fileName = getFileInfo(log.new_values) || getFileInfo(log.old_values);

							return (
								<Card key={log.id} className='hover:shadow-md transition-shadow'>
									<CardContent className='p-6'>
										<div className='flex items-start justify-between'>
											<div className='flex items-start gap-4 flex-1'>
												<div className='flex-shrink-0 mt-1'>{getActionIcon(log.action)}</div>

												<div className='flex-1 min-w-0'>
													<div className='flex items-center gap-3 mb-2'>
														<Badge className={`text-xs ${getActionBadge(log.action)}`}>{log.action.replace("_", " ").toUpperCase()}</Badge>
														<Badge variant='outline' className='text-xs'>
															{getModelName(log.model_type)} #{log.model_id}
														</Badge>
													</div>

													<div className='flex items-center gap-4 mb-3'>
														<div className='flex items-center gap-2'>
														<UserAvatar user={{ name: log.admin?.name || null }} avatarSize='w-6 h-6' fallbackStyle='text-xs' />
															<div>
																<p className='text-sm font-medium text-gray-900'>{log.admin?.name || "Unknown Admin"}</p>
																<p className='text-xs text-gray-500'>{log.admin?.email || "No email"}</p>
															</div>
														</div>
													</div>

													<div className='flex items-center gap-6 text-xs text-gray-500'>
														<div className='flex items-center gap-1'>
															<Calendar className='w-3 h-3' />
															{dateTime.date} at {dateTime.time}
														</div>
														<div className='flex items-center gap-1'>
															<MapPin className='w-3 h-3' />
															{log.ip_address}
														</div>
														<div className='flex items-center gap-1'>
															<Monitor className='w-3 h-3' />
															{getBrowserInfo(log.user_agent)}
														</div>
													</div>

													{/* Show changes preview for updates */}
													{log.action === "updated" && changes.length > 0 && (
														<div className='mt-3 p-3 bg-blue-50 rounded-lg'>
															<p className='text-xs font-medium text-blue-800 mb-2'>
																Changed {changes.length} field{changes.length > 1 ? "s" : ""}:
															</p>
															<div className='space-y-1'>
																{changes.slice(0, 3).map((change, index) => (
																	<div key={index} className='text-xs text-blue-700'>
																		<span className='font-medium'>{change.field}:</span>{" "}
																		<span className='text-red-600'>&quot;{String(change.oldValue)}&quot;</span> →{" "}
																		<span className='text-green-600'>&quot;{String(change.newValue)}&quot;</span>
																	</div>
																))}
																{changes.length > 3 && <p className='text-xs text-blue-600'>+{changes.length - 3} more changes</p>}
															</div>
														</div>
													)}

													{/* Show file info for file operations */}
													{(log.action === "file_upload" || log.action === "bulk_file_delete") && fileName && (
														<div className='mt-3 p-3 bg-purple-50 rounded-lg'>
															<p className='text-xs font-medium text-purple-800'>File: {fileName}</p>
														</div>
													)}
												</div>
											</div>

											<Dialog>
												<DialogTrigger asChild>
													<Button variant='ghost' size='sm' onClick={() => setSelectedLog(log)}>
														<Eye className='w-4 h-4' />
													</Button>
												</DialogTrigger>
												<DialogContent className='max-w-4xl max-h-[80vh]'>
													<DialogHeader>
														<DialogTitle className='flex items-center gap-2'>
															{getActionIcon(selectedLog?.action || "")}
															Activity Details - {selectedLog?.action?.replace("_", " ").toUpperCase()}
														</DialogTitle>
														<DialogDescription>Detailed information about this activity log entry</DialogDescription>
													</DialogHeader>

													{selectedLog && (
														<ScrollArea className='max-h-[60vh]'>
															<div className='space-y-6'>
																{/* Basic Info */}
																<div className='grid grid-cols-2 gap-4'>
																	<div>
																		<label className='text-sm font-medium text-gray-500'>Admin</label>
																		<p className='text-sm'>{selectedLog.admin?.name || "Unknown"}</p>
																	</div>
																	<div>
																		<label className='text-sm font-medium text-gray-500'>Email</label>
																		<p className='text-sm'>{selectedLog.admin?.email || "N/A"}</p>
																	</div>
																	<div>
																		<label className='text-sm font-medium text-gray-500'>Action</label>
																		<Badge className={`text-xs ${getActionBadge(selectedLog.action)}`}>
																			{selectedLog.action.replace("_", " ").toUpperCase()}
																		</Badge>
																	</div>
																	<div>
																		<label className='text-sm font-medium text-gray-500'>Model</label>
																		<p className='text-sm'>
																			{getModelName(selectedLog.model_type)} #{selectedLog.model_id}
																		</p>
																	</div>
																	<div>
																		<label className='text-sm font-medium text-gray-500'>IP Address</label>
																		<p className='text-sm'>{selectedLog.ip_address}</p>
																	</div>
																	<div>
																		<label className='text-sm font-medium text-gray-500'>Date & Time</label>
																		<p className='text-sm'>
																			{formatDateTime(selectedLog.created_at).date} {formatDateTime(selectedLog.created_at).time}
																		</p>
																	</div>
																</div>

																{/* User Agent */}
																<div>
																	<label className='text-sm font-medium text-gray-500'>User Agent</label>
																	<p className='text-sm text-gray-700 bg-gray-50 p-2 rounded mt-1'>{selectedLog.user_agent}</p>
																</div>

																{/* Old Values */}
																{selectedLog.old_values && (
																	<div>
																		<label className='text-sm font-medium text-gray-500'>Previous Values</label>
																		<pre className='text-xs bg-red-50 p-3 rounded mt-1 overflow-auto'>
																			{JSON.stringify(selectedLog.old_values, null, 2)}
																		</pre>
																	</div>
																)}

																{/* New Values */}
																{selectedLog.new_values && (
																	<div>
																		<label className='text-sm font-medium text-gray-500'>New Values</label>
																		<pre className='text-xs bg-green-50 p-3 rounded mt-1 overflow-auto'>
																			{JSON.stringify(selectedLog.new_values, null, 2)}
																		</pre>
																	</div>
																)}
															</div>
														</ScrollArea>
													)}
												</DialogContent>
											</Dialog>
										</div>
									</CardContent>
								</Card>
							);
						})}
					</div>

					{filteredLogs.length === 0 && (
						<Card>
							<CardContent className='text-center py-12'>
								<Shield className='w-16 h-16 text-gray-400 mx-auto mb-4' />
								<p className='text-gray-500'>No activity logs found matching your criteria</p>
								<Button variant='outline' className='mt-4 bg-transparent' onClick={() => setSearchTerm("")}>
									Clear Filters
								</Button>
							</CardContent>
						</Card>
					)}

					{/* Pagination */}
					{activityLogs && activityLogs.last_page > 1 && (
						<div className='flex justify-center mt-8'>
							<div className='flex items-center gap-2'>
								<Button
									variant='outline'
									disabled={!activityLogs.prev_page_url || isLoading}
									className='bg-transparent'
									onClick={handlePreviousPage}>
									Previous
								</Button>
								<span className='px-4 py-2 text-sm'>
									Page {activityLogs.current_page} of {activityLogs.last_page}
								</span>
								<Button
									variant='outline'
									disabled={!activityLogs.next_page_url || isLoading}
									className='bg-transparent'
									onClick={handleNextPage}>
									Next
								</Button>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
