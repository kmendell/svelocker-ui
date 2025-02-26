// src/lib/services/db.ts
import Database from 'better-sqlite3';
import type { RegistryRepo } from '$lib/types/repo';
import { env } from '$env/dynamic/private';
import type { Namespace } from '$lib/types/namespace.type';
import { convertToNewModel } from '$lib/types/utils/type-migration';

const dbPath = env.DB_PATH || 'data/svelockerui.db';
const db = new Database(dbPath);

// Initialize tables with new tag_metadata table
db.exec(`
  CREATE TABLE IF NOT EXISTS repositories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    last_synced DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repository_id INTEGER,
    name TEXT NOT NULL,
    fullName TEXT NOT NULL,
    FOREIGN KEY(repository_id) REFERENCES repositories(id)
  );

  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    image_id INTEGER,
    name TEXT NOT NULL,
    digest TEXT NOT NULL,
    FOREIGN KEY(image_id) REFERENCES images(id)
  );

  CREATE TABLE IF NOT EXISTS tag_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tag_id INTEGER,
    created_at DATETIME,
    os TEXT,
    architecture TEXT,
    author TEXT,
    dockerFile TEXT,
    exposedPorts TEXT,
    totalSize INTEGER,
    workDir TEXT,
    command TEXT,
    description TEXT,
    contentDigest TEXT,
    entrypoint TEXT,
    isOCI BOOLEAN,
    indexDigest TEXT,
    FOREIGN KEY(tag_id) REFERENCES tags(id)
  );

  CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY
  );
`);

export class RegistryCache {
	private static migrated = false;

	private static migrateSchema() {
		if (RegistryCache.migrated) return;

		try {
			// Create schema version table if it doesn't exist
			db.exec(`CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY);`);
			const currentVersion = (db.prepare('SELECT version FROM schema_version').get() as { version: number })?.version || 0;

			// Check if columns exist before adding them
			const columnCheck = (tableName: string, columnName: string): boolean => {
				const result = db.prepare(`PRAGMA table_info(${tableName})`).all() as any[];
				return result.some((col) => col.name === columnName);
			};

			if (currentVersion < 2) {
				// Wrap each ALTER TABLE in a transaction and check if the column exists
				const hasPathColumn = columnCheck('repositories', 'path');
				if (!hasPathColumn) {
					db.exec(`ALTER TABLE repositories ADD COLUMN path TEXT DEFAULT NULL;`);
				}

				// Create namespace metadata table
				db.exec(`
								CREATE TABLE IF NOT EXISTS namespace_metadata (
										id INTEGER PRIMARY KEY AUTOINCREMENT,
										namespace_id INTEGER,
										image_count INTEGER DEFAULT 0,
										total_size TEXT DEFAULT NULL,
										description TEXT DEFAULT NULL,
										FOREIGN KEY(namespace_id) REFERENCES repositories(id)
								);
								
								-- Add image metadata table if it doesn't exist
								CREATE TABLE IF NOT EXISTS image_metadata (
										id INTEGER PRIMARY KEY AUTOINCREMENT,
										image_id INTEGER,
										last_updated DATETIME,
										pull_count INTEGER DEFAULT 0,
										is_official BOOLEAN DEFAULT 0,
										star_count INTEGER DEFAULT 0,
										FOREIGN KEY(image_id) REFERENCES images(id)
								);
								
								-- Update schema version
								INSERT OR REPLACE INTO schema_version (version) VALUES (2);
						`);
			}

			RegistryCache.migrated = true;
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			throw new Error(`Failed to migrate database schema: ${errorMessage}`);
		}
	}

	static async syncFromRegistry(registryData: RegistryRepo[]) {
		// Run migrations first
		this.migrateSchema();

		const stmt = db.prepare('INSERT INTO repositories (name) VALUES (?)');
		const insertImage = db.prepare('INSERT INTO images (repository_id, name, fullName) VALUES (?, ?, ?)');
		const insertTag = db.prepare('INSERT INTO tags (image_id, name, digest) VALUES (?, ?, ?)');

		// Fix: Store boolean and JSON data properly
		const insertMetadata = db.prepare(`
			INSERT INTO tag_metadata (
				tag_id, created_at, os, architecture, author, 
				dockerFile, exposedPorts, totalSize, workDir, 
				command, description, contentDigest, entrypoint, isOCI, indexDigest
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`);

		const transaction = db.transaction((repos: RegistryRepo[]) => {
			// Clear existing data
			db.prepare('DELETE FROM tag_metadata').run();
			db.prepare('DELETE FROM tags').run();
			db.prepare('DELETE FROM images').run();
			db.prepare('DELETE FROM repositories').run();

			for (const repo of repos) {
				// Use 'library' for root-level images
				const repoName = repo.name || 'library';
				const { lastInsertRowid: repoId } = stmt.run(repoName);

				for (const image of repo.images) {
					const imageName = image.name || image.fullName.split('/').pop() || '';
					const { lastInsertRowid: imageId } = insertImage.run(repoId, imageName, image.fullName);

					for (const tag of image.tags) {
						const { lastInsertRowid: tagId } = insertTag.run(imageId, tag.name, tag.metadata?.configDigest || null);

						// Fix: Convert arrays/objects to JSON strings, booleans to 0/1
						const exposedPorts = Array.isArray(tag.metadata?.exposedPorts) ? JSON.stringify(tag.metadata.exposedPorts) : '[]';

						const command = typeof tag.metadata?.command === 'string' ? tag.metadata.command : JSON.stringify(tag.metadata?.command || null);

						const entrypoint = typeof tag.metadata?.entrypoint === 'string' ? tag.metadata.entrypoint : JSON.stringify(tag.metadata?.entrypoint || null);

						// Convert boolean to number (SQLite doesn't have a true boolean type)
						const isOCI = tag.metadata?.isOCI === true ? 1 : 0;

						// Insert metadata with proper type conversions
						insertMetadata.run(tagId, tag.metadata?.created || null, tag.metadata?.os || null, tag.metadata?.architecture || null, tag.metadata?.author || null, tag.metadata?.dockerFile || null, exposedPorts, tag.metadata?.totalSize || null, tag.metadata?.workDir || null, command, tag.metadata?.description || null, tag.metadata?.contentDigest || null, entrypoint, isOCI, tag.metadata?.indexDigest || null);
					}
				}
			}
		});

		transaction(registryData);
	}

	static getRepositories(): RegistryRepo[] {
		// Run migrations first
		this.migrateSchema();

		return db
			.prepare(
				`
					SELECT 
						r.name as repoName,
						json_group_array(
							json_object(
								'name', i.name,
								'fullName', i.fullName,
								'tags', (
									SELECT json_group_array(
										json_object(
											'name', t.name,
											'digest', t.digest,
											'metadata', (
												SELECT json_object(
													'created', tm.created_at,
													'os', tm.os,
													'architecture', tm.architecture,
													'author', tm.author,
													'dockerFile', tm.dockerFile,
													'exposedPorts', json(CASE WHEN tm.exposedPorts IS NULL THEN '[]' ELSE tm.exposedPorts END),
													'totalSize', tm.totalSize,
													'workDir', tm.workDir,
													'command', tm.command,
													'description', tm.description,
													'contentDigest', tm.contentDigest,
													'entrypoint', tm.entrypoint,
													'isOCI', CASE WHEN tm.isOCI = 1 THEN 'true' ELSE 'false' END,
													'indexDigest', tm.indexDigest
												)
												FROM tag_metadata tm
												WHERE tm.tag_id = t.id
											)
										)
									)
									FROM tags t
									WHERE t.image_id = i.id
								)
							)
						) as images
					FROM repositories r
					LEFT JOIN images i ON i.repository_id = r.id
					GROUP BY r.id
					`
			)
			.all()
			.map((row) => ({
				name: row.repoName,
				images: JSON.parse(row.images)
			}));
	}

	// Add new methods for working with the new model
	/**
	 * Retrieves namespaces directly from the database using the new model structure
	 * @returns Array of namespaces with their images and tags
	 */
	static getNamespaces(): Namespace[] {
		// Run migrations first
		this.migrateSchema();

		// Query repositories with namespace metadata
		const namespaces = db
			.prepare(
				`
			SELECT 
				r.id as id,
				r.name as name,
				r.path as path,
				r.last_synced as lastSynced,
				nm.image_count as imageCount,
				nm.total_size as totalSize,
				nm.description as description
			FROM repositories r
			LEFT JOIN namespace_metadata nm ON nm.namespace_id = r.id
		`
			)
			.all();

		const result: Namespace[] = [];

		for (const namespace of namespaces) {
			// Query images for this namespace
			const images = db
				.prepare(
					`
				SELECT 
					i.id as id,
					i.name as name,
					i.fullName as fullName,
					im.last_updated as lastUpdated,
					im.pull_count as pullCount,
					im.is_official as isOfficial,
					im.star_count as starCount
				FROM images i
				LEFT JOIN image_metadata im ON im.image_id = i.id
				WHERE i.repository_id = ?
			`
				)
				.all(namespace.id);

			const namespaceObj: Namespace = {
				name: namespace.name,
				path: namespace.path || namespace.name,
				lastSynced: namespace.lastSynced ? new Date(namespace.lastSynced) : new Date(),
				images: [],
				metadata: {
					imageCount: namespace.imageCount || 0,
					totalSize: namespace.totalSize || 'Unknown',
					description: namespace.description || undefined
				}
			};

			// Process each image
			for (const image of images) {
				// Query tags for this image
				const tags = db
					.prepare(
						`
					SELECT 
						t.id as id,
						t.name as name,
						t.digest as digest,
						tm.created_at as created,
						tm.os,
						tm.architecture,
						tm.author,
						tm.dockerFile,
						tm.exposedPorts,
						tm.totalSize,
						tm.workDir,
						tm.command,
						tm.description,
						tm.contentDigest,
						tm.entrypoint,
						tm.isOCI,
						tm.indexDigest
					FROM tags t
					LEFT JOIN tag_metadata tm ON tm.tag_id = t.id
					WHERE t.image_id = ?
				`
					)
					.all(image.id);

				const tagsList = tags.map((tag) => {
					// Parse JSON fields
					let exposedPorts;
					try {
						exposedPorts = JSON.parse(tag.exposedPorts || '[]');
					} catch (e) {
						exposedPorts = [];
					}

					return {
						name: tag.name,
						metadata: {
							created: tag.created,
							os: tag.os,
							architecture: tag.architecture,
							author: tag.author,
							dockerFile: tag.dockerFile,
							exposedPorts,
							totalSize: tag.totalSize,
							workDir: tag.workDir,
							command: tag.command,
							description: tag.description,
							contentDigest: tag.contentDigest,
							entrypoint: tag.entrypoint,
							isOCI: tag.isOCI === 1,
							indexDigest: tag.indexDigest,
							configDigest: tag.digest // Map digest to configDigest
						}
					};
				});

				// Build the image object
				namespaceObj.images.push({
					name: image.name,
					fullName: image.fullName,
					tags: tagsList,
					metadata: {
						lastUpdated: image.lastUpdated ? new Date(image.lastUpdated) : undefined,
						pullCount: image.pullCount,
						isOfficial: image.isOfficial === 1,
						starCount: image.starCount
					}
				});
			}

			result.push(namespaceObj);
		}

		return result;
	}

	// When you're ready to fully migrate:
	/**
	 * Syncs namespaces data from the registry using the new model structure
	 * @param namespaces Array of namespaces to sync
	 */
	static async syncFromRegistryWithNewModel(namespaces: Namespace[]) {
		// Run migrations first
		this.migrateSchema();

		// Prepare statements for all tables
		const insertNamespace = db.prepare(`
			INSERT INTO repositories (name, path, last_synced) 
			VALUES (?, ?, datetime('now'))
		`);

		const insertNamespaceMetadata = db.prepare(`
			INSERT INTO namespace_metadata (namespace_id, image_count, total_size, description)
			VALUES (?, ?, ?, ?)
		`);

		const insertImage = db.prepare(`
			INSERT INTO images (repository_id, name, fullName)
			VALUES (?, ?, ?)
		`);

		const insertImageMetadata = db.prepare(`
			INSERT INTO image_metadata (image_id, last_updated, pull_count, is_official, star_count)
			VALUES (?, ?, ?, ?, ?)
		`);

		const insertTag = db.prepare(`
			INSERT INTO tags (image_id, name, digest)
			VALUES (?, ?, ?)
		`);

		const insertTagMetadata = db.prepare(`
			INSERT INTO tag_metadata (
				tag_id, created_at, os, architecture, author, dockerFile, exposedPorts, 
				totalSize, workDir, command, description, contentDigest, 
				entrypoint, isOCI, indexDigest
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`);

		// Run everything in a transaction
		const transaction = db.transaction((namespacesList: Namespace[]) => {
			// Clear existing data
			db.prepare('DELETE FROM namespace_metadata').run();
			db.prepare('DELETE FROM image_metadata').run();
			db.prepare('DELETE FROM tag_metadata').run();
			db.prepare('DELETE FROM tags').run();
			db.prepare('DELETE FROM images').run();
			db.prepare('DELETE FROM repositories').run();

			for (const namespace of namespacesList) {
				// Insert namespace
				const { lastInsertRowid: namespaceId } = insertNamespace.run(namespace.name || 'unknown', namespace.path || namespace.name || 'unknown');

				// Insert namespace metadata
				if (namespace.metadata) {
					insertNamespaceMetadata.run(namespaceId, namespace.metadata.imageCount || 0, namespace.metadata.totalSize || null, namespace.metadata.description || null);
				}

				// Insert images
				if (Array.isArray(namespace.images)) {
					for (const image of namespace.images) {
						const { lastInsertRowid: imageId } = insertImage.run(namespaceId, image.name || 'unknown', image.fullName || `${namespace.name}/${image.name}` || 'unknown');

						// Insert image metadata
						if (image.metadata) {
							insertImageMetadata.run(imageId, image.metadata.lastUpdated ? new Date(image.metadata.lastUpdated).toISOString() : null, image.metadata.pullCount || 0, image.metadata.isOfficial ? 1 : 0, image.metadata.starCount || 0);
						}

						// Insert tags
						if (Array.isArray(image.tags)) {
							for (const tag of image.tags) {
								if (!tag || !tag.name) continue;

								const { lastInsertRowid: tagId } = insertTag.run(imageId, tag.name, tag.metadata?.configDigest || null);

								// Insert tag metadata
								if (tag.metadata) {
									// Process arrays and special types for SQLite
									const exposedPorts = Array.isArray(tag.metadata.exposedPorts) ? JSON.stringify(tag.metadata.exposedPorts) : '[]';

									const command = typeof tag.metadata.command === 'string' ? tag.metadata.command : JSON.stringify(tag.metadata.command || null);

									const entrypoint = typeof tag.metadata.entrypoint === 'string' ? tag.metadata.entrypoint : JSON.stringify(tag.metadata.entrypoint || null);

									const isOCI = tag.metadata.isOCI === true ? 1 : 0;

									insertTagMetadata.run(tagId, tag.metadata.created || null, tag.metadata.os || null, tag.metadata.architecture || null, tag.metadata.author || null, tag.metadata.dockerFile || null, exposedPorts, tag.metadata.totalSize || null, tag.metadata.workDir || null, command, tag.metadata.description || null, tag.metadata.contentDigest || null, entrypoint, isOCI, tag.metadata.indexDigest || null);
								}
							}
						}
					}
				}
			}
		});

		// Execute the transaction
		transaction(namespaces);
	}
}
