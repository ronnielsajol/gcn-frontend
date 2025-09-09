// components/skeletons/users-table-skeleton.tsx

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function UsersTableSkeleton() {
	return (
		<div className='space-y-6'>
			{/* Table Skeleton */}
			<Card>
				<CardContent className='p-0'>
					<div className='overflow-x-auto'>
						<Skeleton className='h-12 w-full' /> {/* Header */}
						<div className='space-y-2 p-4'>
							{Array.from({ length: 10 }).map((_, i) => (
								<Skeleton key={i} className='h-16 w-full' /> // 10 skeleton rows
							))}
						</div>
						<Skeleton className='h-14 w-full border-t' /> {/* Pagination */}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
