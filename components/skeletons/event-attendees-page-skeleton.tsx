import React from "react";

const EventAttendeesPageSkeleton = () => {
	return (
		<div className='min-h-screen bg-gray-50'>
			<div className='py-8 px-4'>
				<div className='max-w-7xl mx-auto'>
					<div className='animate-pulse'>
						<div className='h-4 bg-gray-200 rounded w-32 mb-6'></div>
						<div className='bg-white rounded-lg border p-6 mb-6'>
							<div className='flex items-start gap-4'>
								<div className='w-12 h-12 bg-gray-200 rounded-lg'></div>
								<div className='flex-1'>
									<div className='h-6 bg-gray-200 rounded w-64 mb-2'></div>
									<div className='h-4 bg-gray-200 rounded w-full mb-4'></div>
									<div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
										<div className='h-4 bg-gray-200 rounded w-32'></div>
										<div className='h-4 bg-gray-200 rounded w-24'></div>
										<div className='h-4 bg-gray-200 rounded w-28'></div>
									</div>
								</div>
								<div className='text-right'>
									<div className='h-8 bg-gray-200 rounded w-12 mb-1'></div>
									<div className='h-4 bg-gray-200 rounded w-20'></div>
								</div>
							</div>
						</div>
						<div className='bg-white rounded-lg border p-6 mb-6'>
							<div className='h-6 bg-gray-200 rounded w-40 mb-4'></div>
							<div className='flex gap-4'>
								<div className='flex-1 h-10 bg-gray-200 rounded'></div>
								<div className='w-48 h-10 bg-gray-200 rounded'></div>
								<div className='w-48 h-10 bg-gray-200 rounded'></div>
							</div>
						</div>
						<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
							{Array.from({ length: 8 }).map((_, index) => (
								<div key={index} className='bg-white rounded-lg border p-4'>
									<div className='flex flex-col items-center space-y-3'>
										<div className='w-16 h-16 bg-gray-200 rounded-full'></div>
										<div className='w-full'>
											<div className='h-4 bg-gray-200 rounded w-32 mx-auto mb-2'></div>
											<div className='h-3 bg-gray-200 rounded w-40 mx-auto'></div>
										</div>
										<div className='flex gap-1 w-full'>
											<div className='h-5 bg-gray-200 rounded w-16'></div>
											<div className='h-5 bg-gray-200 rounded w-20'></div>
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default EventAttendeesPageSkeleton;
