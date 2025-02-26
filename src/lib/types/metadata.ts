export type ImageMetadata = {
	created: string;
	os: string;
	architecture: string;
	author?: string;
	dockerFile: string;
	configDigest: string;
	exposedPorts: string[];
	totalSize: string;
	workDir: string;
	command: string;
	description: string;
	contentDigest: string;
	entrypoint: string;
	indexDigest: string;
	isOCI: boolean;
};
