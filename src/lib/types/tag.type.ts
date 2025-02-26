// src/lib/models/tag.ts
export type Tag = {
	/**
	 * Tag name (e.g., "latest", "1.0", "stable")
	 */
	name: string;

	/**
	 * Detailed metadata for this tag
	 */
	metadata?: TagMetadata;
};

export type TagMetadata = {
	/**
	 * Creation timestamp
	 */
	created?: string;

	/**
	 * Operating system
	 */
	os?: string;

	/**
	 * CPU architecture
	 */
	architecture?: string;

	/**
	 * Author or maintainer
	 */
	author?: string;

	/**
	 * Extracted Dockerfile contents
	 */
	dockerFile?: string;

	/**
	 * Digest of the config blob
	 */
	configDigest?: string;

	/**
	 * Ports exposed by the container
	 */
	exposedPorts?: string[];

	/**
	 * Total size of the image
	 */
	totalSize?: string;

	/**
	 * Working directory in the container
	 */
	workDir?: string;

	/**
	 * Default command
	 */
	command?: string;

	/**
	 * Image description
	 */
	description?: string;

	/**
	 * Content digest (for standard Docker manifests)
	 */
	contentDigest?: string;

	/**
	 * Container entrypoint
	 */
	entrypoint?: string;

	/**
	 * Index digest (used for deletion of both OCI and standard manifests)
	 */
	indexDigest?: string;

	/**
	 * Whether this is an OCI image
	 */
	isOCI?: boolean;

	/**
	 * Labels from the container
	 */
	labels?: Record<string, string>;

	/**
	 * Environment variables
	 */
	env?: string[];

	/**
	 * Volumes defined in the image
	 */
	volumes?: string[];

	/**
	 * Image layers information
	 */
	layers?: Layer[];
};

export type Layer = {
	/**
	 * Layer digest
	 */
	digest: string;

	/**
	 * Layer size in bytes
	 */
	size: number;

	/**
	 * Creation command for this layer
	 */
	command?: string;
};
