import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MapPin, Calendar, Clock, Users } from "lucide-react";

export const EventCardSkeleton = () => {
	return (
		<Card className='animate-pulse'>
			<CardHeader className='pb-3'>
				<div className='flex items-start justify-between'>
					<div className='flex-1 space-y-2'>
						<div className='h-6 bg-gray-200 rounded w-3/4'></div>
						<div className='h-4 bg-gray-200 rounded w-1/4'></div>
					</div>
					<div className='w-8 h-8 bg-gray-200 rounded-md'></div>
				</div>
			</CardHeader>
			<CardContent className='space-y-4'>
				<div className='space-y-2'>
					<div className='h-4 bg-gray-200 rounded'></div>
					<div className='h-4 bg-gray-200 rounded'></div>
					<div className='h-4 bg-gray-200 rounded w-5/6'></div>
				</div>

				<div className='space-y-2 pt-2'>
					<div className='flex items-center gap-2'>
						<MapPin className='w-4 h-4 text-gray-300' />
						<div className='h-4 bg-gray-200 rounded w-1/2'></div>
					</div>
					<div className='flex items-center gap-2'>
						<Calendar className='w-4 h-4 text-gray-300' />
						<div className='h-4 bg-gray-200 rounded w-1/3'></div>
					</div>
					<div className='flex items-center gap-2'>
						<Clock className='w-4 h-4 text-gray-300' />
						<div className='h-4 bg-gray-200 rounded w-2/3'></div>
					</div>
					<div className='flex items-center gap-2'>
						<Calendar className='w-4 h-4 text-gray-300' />
						<div className='h-4 bg-gray-200 rounded w-1/2'></div>
					</div>
				</div>

				<div className='flex items-center justify-between pt-3 border-t'>
					<div className='flex items-center gap-2'>
						<Users className='w-4 h-4 text-gray-300' />
						<div className='h-4 bg-gray-200 rounded w-20'></div>
					</div>
					<div className='flex items-center gap-1'>
						<div className='w-8 h-8 bg-gray-200 rounded-md'></div>
						<div className='w-8 h-8 bg-gray-200 rounded-md'></div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
};
