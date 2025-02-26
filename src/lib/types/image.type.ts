// src/lib/models/image.ts
import type { Tag } from './tag.type';

export type Image = {
	/**
	 * Simple name of the image without namespace
	 */
	name: string;

	/**
	 * Full name of the image with namespace (e.g., "library/alpine")
	 */
	fullName: string;

	/**
	 * All tags for this image
	 */
	tags: Tag[];

	/**
	 * Metadata about the image
	 */
	metadata?: ImageMetadata;
};

export type ImageMetadata = {
	/**
	 * Last updated date
	 */
	lastUpdated?: Date;

	/**
	 * Total pull count
	 */
	pullCount?: number;

	/**
	 * Whether this is an official image
	 */
	isOfficial?: boolean;

	/**
	 * Star count (if applicable)
	 */
	starCount?: number;
};
