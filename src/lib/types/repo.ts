import type { RepoImage } from '$lib/types/image';

export type RegistryRepo = {
	name: string; // namespace (e.g. "ofkm")
	images: RepoImage[]; // Array of images in this namespace
};
