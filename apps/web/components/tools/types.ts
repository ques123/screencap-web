export interface ToolImage {
	src: string;
	alt: string;
}

export interface ToolRelatedLink {
	title: string;
	href: string;
	description?: string;
}

export interface ToolExtraSection {
	title: string;
	body: string;
	image?: ToolImage;
}

export interface ToolPageContent {
	byline?: string;
	updated?: string;
	privacyBadge?: string;
	heroImage?: ToolImage;
	relatedTools?: ToolRelatedLink[];
	relatedTitle?: string;
	sections?: ToolExtraSection[];
	slug?: string;
	title: string;
	description: string;
	publishedAt?: string;
	category?: string;
	author?: string;
	tags?: string[];

	cta: {
		title: string;
		description: string;
		buttonText: string;
		buttonHref?: string;
		secondaryButtonText?: string;
		secondaryButtonHref?: string;
	};

	featuresTitle: string;
	featuresDescription: string;
	features: Array<{
		title: string;
		description: string;
	}>;

	faqs?: Array<{
		question: string;
		answer: string;
	}>;
}
