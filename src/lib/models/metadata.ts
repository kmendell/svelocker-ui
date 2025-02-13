export type ImageMetadata = {
	created: string;
	os: string;
	architecture: string;
	author?: string;
	dockerFile: string;
	configDigest: string;
	exposedPorts: string[];
};
