import type { ImageMetadata } from '$lib/types/metadata';

export type ImageTag = {
	name: string;
	metadata?: ImageMetadata;
};
