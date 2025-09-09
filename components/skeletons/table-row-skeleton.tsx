// src/components/skeletons/table-row-skeleton.tsx

import { TableCell, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export function TableRowSkeleton({ columns }: { columns: number }) {
	return (
		<TableRow>
			{Array.from({ length: columns }).map((_, i) => (
				<TableCell key={i}>
					<Skeleton className='h-8 w-full rounded-xl' />
				</TableCell>
			))}
		</TableRow>
	);
}
