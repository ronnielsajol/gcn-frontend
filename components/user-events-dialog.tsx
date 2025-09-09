import { EventForUserResponse, User } from "@/types";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Card } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { CalendarDays, MapPin, Calendar, Clock, Users, Loader2 } from "lucide-react";
import { Button } from "./ui/button";

// --- Helper Functions ---
const formatDateTime = (dateString: string) => {
	const date = new Date(dateString);
	if (isNaN(date.getTime())) {
		return { date: "Invalid Date", time: "Invalid Time" };
	}
	const dateOptions: Intl.DateTimeFormatOptions = {
		year: "numeric",
		month: "long",
		day: "numeric",
		timeZone: "Asia/Manila",
	};
	const timeOptions: Intl.DateTimeFormatOptions = {
		hour: "2-digit",
		minute: "2-digit",
		hour12: true,
		timeZone: "Asia/Manila",
	};
	return {
		date: date.toLocaleDateString("en-US", dateOptions),
		time: date.toLocaleTimeString("en-US", timeOptions),
	};
};

const getDuration = (startTime: string, endTime: string) => {
	const start = new Date(startTime);
	const end = new Date(endTime);
	if (isNaN(start.getTime()) || isNaN(end.getTime())) {
		return "N/A";
	}
	const diffMs = end.getTime() - start.getTime();
	const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
	const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
	if (diffHours > 0) {
		return `${diffHours}h ${diffMinutes}m`;
	}
	return `${diffMinutes}m`;
};

interface EventInfoDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	events?: EventForUserResponse | null;
	user: User | null;
	isLoading: boolean;
}

export default function EventInfoDialog({ open, onOpenChange, events, user, isLoading }: EventInfoDialogProps) {
	if (!user) return null;

	const userEvents = events?.events?.data || [];

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='max-w-4xl max-h-[80vh]'>
				<DialogHeader>
					<DialogTitle className='flex items-center gap-2'>
						<CalendarDays className='w-5 h-5' />
						Events for {user.first_name}
					</DialogTitle>
					<DialogDescription>All events that {user.first_name} is currently attending.</DialogDescription>
				</DialogHeader>
				{isLoading ? (
					<div className='flex justify-center items-center h-64'>
						<Loader2 className='w-8 h-8 animate-spin text-gray-500' />
					</div>
				) : userEvents.length > 0 ? (
					<ScrollArea className='max-h-[60vh] pr-4'>
						<div className='space-y-4'>
							{userEvents.map((event) => {
								const start = formatDateTime(event.start_time);
								const end = formatDateTime(event.end_time);
								const duration = getDuration(event.start_time, event.end_time);
								return (
									<Card key={event.id} className='p-4'>
										<h3 className='font-semibold text-gray-900 text-lg mb-1'>{event.name}</h3>
										<p className='text-sm text-gray-600 mb-2'>{event.description}</p>
										<div className='grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600'>
											<div className='flex items-center gap-2'>
												<MapPin className='w-4 h-4' />
												<span>{event.location}</span>
											</div>
											<div className='flex items-center gap-2'>
												<Calendar className='w-4 h-4' />
												<span>
													{start.date} - {end.date}
												</span>
											</div>
											<div className='flex items-center gap-2'>
												<Clock className='w-4 h-4' />
												<span>
													{start.time} - {end.time} ({duration})
												</span>
											</div>
										</div>
									</Card>
								);
							})}
						</div>
					</ScrollArea>
				) : (
					<div className='text-center py-8'>
						<CalendarDays className='w-16 h-16 text-gray-400 mx-auto mb-4' />
						<p className='text-gray-500'>{user.first_name} is not currently attending any events.</p>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
