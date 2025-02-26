// file: tests/e2e/mocks.ts

import type { RegistryRepo } from '$lib/types/repo';
import type { Namespace } from '$lib/types/namespace.type';


export const mockHealthStatus = {
	isHealthy: true,
	supportsV2: true,
	needsAuth: false,
	message: 'Registry is healthy'
};

export const unhealthyStatus = {
	isHealthy: false,
	supportsV2: false,
	needsAuth: true,
	message: 'Registry unavailable'
};

export const basicMock = {
	namespaces: [
		{
			name: 'namespace1',
			path: 'namespace1',
			lastSynced: new Date('2025-02-01T12:00:00Z'),
			metadata: {
				imageCount: 2,
				totalSize: '476.3 MB'
			},
			images: [
				{
					name: 'frontend-app',
					fullName: 'namespace1/frontend-app',
					tags: [
						{
							name: 'latest',
							metadata: {
								created: '2025-02-01T12:00:00Z',
								os: 'linux',
								architecture: 'amd64',
								author: 'Developer Name',
								dockerFile: 'FROM node:18\nWORKDIR /app\nCOPY . .\nRUN npm install\nCMD ["npm", "start"]',
								configDigest: 'sha256:abc123',
								exposedPorts: ['3000/tcp', '8080/tcp'],
								totalSize: '245.8 MB',
								workDir: '/app',
								command: 'npm start',
								description: 'Frontend application',
								contentDigest: 'sha256:def456',
								entrypoint: 'docker-entrypoint.sh',
								indexDigest: 'sha256:ghi789',
								isOCI: true
							}
						},
						{
							name: 'v1.0.0',
							metadata: {
								created: '2025-01-15T10:30:00Z',
								os: 'linux',
								architecture: 'amd64',
								author: 'Developer Name',
								dockerFile: 'FROM node:16\nWORKDIR /app\nCOPY . .\nRUN npm install\nCMD ["npm", "start"]',
								configDigest: 'sha256:xyz987',
								exposedPorts: ['3000/tcp'],
								totalSize: '230.5 MB',
								workDir: '/app',
								command: 'npm start',
								description: 'Frontend application v1.0.0',
								contentDigest: 'sha256:uvw654',
								entrypoint: 'docker-entrypoint.sh',
								indexDigest: 'sha256:rst321',
								isOCI: false
							}
						}
					]
				},
				{
					name: 'backend-api',
					fullName: 'namespace1/backend-api',
					tags: [
						{
							name: 'latest',
							metadata: {
								created: '2025-02-05T15:45:00Z',
								os: 'linux',
								architecture: 'amd64',
								author: 'Unknown',
								dockerFile: 'FROM golang:1.19\nWORKDIR /go/src/app\nCOPY . .\nRUN go build\nCMD ["./app"]',
								configDigest: 'sha256:123abc',
								exposedPorts: ['8000/tcp'],
								totalSize: '156.2 MB',
								workDir: '/go/src/app',
								command: './app',
								description: 'Backend API service',
								contentDigest: 'sha256:456def',
								entrypoint: 'Unknown Entrypoint',
								indexDigest: 'sha256:789ghi',
								isOCI: false
							}
						}
					]
				}
			]
		}
	],

	error: null,
	healthStatus: mockHealthStatus
};

export const searchMock = {
	repos: {
		repositories: [
			{
				name: 'namespace1',
				images: [
					{
						name: 'frontend-app',
						fullName: 'namespace1/frontend-app',
						tags: [{ name: 'latest' }, { name: 'v1.0.0' }]
					}
				]
			},
			{
				name: 'namespace2',
				images: [
					{
						name: 'backend-api',
						fullName: 'namespace2/backend-api',
						tags: [{ name: 'latest' }]
					}
				]
			},
			{
				name: 'namespace3',
				images: [
					{
						name: 'database',
						fullName: 'namespace3/database',
						tags: [{ name: 'latest' }, { name: 'v2.1' }]
					}
				]
			}
		]
	},
	error: null,
	healthStatus: mockHealthStatus
};

export const paginationMock = {
	repos: {
		repositories: Array.from({ length: 12 }, (_, i) => ({
			name: `namespace${i + 1}`,
			images: [
				{
					name: `repo-${i + 1}`,
					fullName: `namespace${i + 1}/repo-${i + 1}`,
					tags: [{ name: 'latest' }]
				}
			]
		}))
	},
	error: null,
	healthStatus: mockHealthStatus
};

export const errorMock = {
	repos: { repositories: [] },
	error: 'Failed to connect to registry',
	healthStatus: {
		isHealthy: false,
		supportsV2: false,
		needsAuth: false,
		message: 'Failed to connect to registry'
	}
};

export const emptyMock = {
	repos: { repositories: [] },
	error: null,
	healthStatus: mockHealthStatus
};

export const tagDetailsMock = {
	repo: 'namespace1',
	imageName: 'frontend-app',
	imageFullName: 'namespace1/frontend-app',
	tag: {
		name: 'frontend-app',
		fullName: 'namespace1/frontend-app',
		tags: [
			{
				name: 'latest',
				metadata: {
					created: '2025-02-01T12:00:00Z',
					os: 'linux',
					architecture: 'amd64',
					author: 'Developer Name',
					dockerFile: 'FROM node:18\nWORKDIR /app\nCOPY package*.json ./\nRUN npm install\nCOPY . .\nEXPOSE 3000\nCMD ["npm", "start"]',
					configDigest: 'sha256:abc123',
					exposedPorts: ['3000/tcp'],
					totalSize: '245.8 MB',
					workDir: '/app',
					command: 'npm start',
					description: 'Frontend application',
					contentDigest: 'sha256:def456',
					entrypoint: 'docker-entrypoint.sh',
					indexDigest: 'sha256:ghi789',
					isOCI: true
				}
			}
		]
	},
	tagIndex: 0,
	isLatest: true
};

export const basicNamespaceMock = {
	namespaces: [
		{
			name: 'namespace1',
			path: 'namespace1',
			lastSynced: new Date('2025-02-01T12:00:00Z'),
			metadata: {
				imageCount: 2,
				totalSize: '476.3 MB'
			},
			images: [
				{
					name: 'frontend-app',
					fullName: 'namespace1/frontend-app',
					metadata: {
						lastUpdated: new Date('2025-02-01T12:00:00Z')
					},
					tags: [
						{
							name: 'latest',
							metadata: {
								created: '2025-02-01T12:00:00Z',
								os: 'linux',
								architecture: 'amd64'
							}
						}
					]
				}
			]
		}
	],
	error: null,
	healthStatus: mockHealthStatus
};
