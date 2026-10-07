"use client";

import { SkeletonPage } from "@cap/ui";

export default function Loading() {
	return (
		<SkeletonPage
			customSkeleton={(Skeleton) => (
				<div className="flex flex-col gap-6">
					{[0, 1, 2].map((card) => (
						<div
							key={card}
							className="p-5 space-y-4 rounded-2xl border bg-gray-3 border-gray-4"
						>
							<div className="space-y-1">
								<Skeleton
									baseColor="var(--gray-4)"
									highlightColor="var(--gray-5)"
									className="w-44 h-7"
								/>
								<Skeleton
									baseColor="var(--gray-4)"
									highlightColor="var(--gray-5)"
									className="mt-1 h-4 max-w-md"
								/>
							</div>
							<Skeleton
								baseColor="var(--gray-4)"
								highlightColor="var(--gray-5)"
								className="w-full h-12 rounded-xl"
							/>
						</div>
					))}
				</div>
			)}
		/>
	);
}
