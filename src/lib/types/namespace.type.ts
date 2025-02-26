// src/lib/models/namespace.ts
import type { Image } from './image.type';

export type Namespace = {
	/**
	 * Namespace name (e.g., "library", "ofkm")
	 */
	name: string;

	/**
	 * Full path of the namespace in the registry
	 */
	path: string;

	/**
	 * Images contained in this namespace
	 */
	images: Image[];

	/**
	 * Last time this namespace was synced from the registry
	 */
	lastSynced?: Date;

	/**
	 * Optional metadata for the namespace
	 */
	metadata?: NamespaceMetadata;
};

export type NamespaceMetadata = {
	/**
	 * Number of images in the namespace
	 */
	imageCount: number;

	/**
	 * Total storage used by all images in this namespace
	 */
	totalSize?: string;

	/**
	 * Description of the namespace (if available)
	 */
	description?: string;
};
