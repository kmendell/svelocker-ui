// THIS IS STILL A WORK IN PROGRESS

import axios, { AxiosError } from 'axios';
import { env } from '$env/dynamic/private';
import { Logger } from '$lib/services/logger';

const logger = Logger.getInstance('DockerService');

// Docker configuration with HTTP API support
export const DOCKER_CONFIG = {
	apiVersion: env.PRIVATE_DOCKER_API_VERSION || 'v1.41',
	registryContainer: env.PRIVATE_DOCKER_REGISTRY_CONTAINER || 'registry',
	httpHost: env.PRIVATE_DOCKER_HTTP_HOST || 'localhost',
	httpPort: env.PRIVATE_DOCKER_HTTP_PORT || '2375'
} as const;

interface DockerExecConfig {
	containerName: string;
	command: string[];
	workingDir?: string;
}

interface DockerExecCreateResponse {
	Id: string;
	message?: string;
}

interface DockerExecInspectResponse {
	ExitCode: number;
	Running: boolean;
	Pid: number;
}

interface ExecStreamResponse {
	output: string;
	error: string;
}

export class DockerService {
	private readonly baseUrl: string;

	constructor() {
		this.baseUrl = `http://${DOCKER_CONFIG.httpHost}:${DOCKER_CONFIG.httpPort}/${DOCKER_CONFIG.apiVersion}`;
		logger.info(`Initialized DockerService with HTTP API: ${this.baseUrl}`);
	}

	private getAxiosConfig(headers: Record<string, string> = {}) {
		return {
			headers: {
				'Content-Type': 'application/json',
				...headers
			}
		};
	}

	private async createExec({ containerName, command, workingDir }: DockerExecConfig): Promise<string> {
		try {
			const response = await axios.post<DockerExecCreateResponse>(
				`${this.baseUrl}/containers/${containerName}/exec`,
				{
					AttachStdout: true,
					AttachStderr: true,
					Tty: false,
					WorkingDir: workingDir,
					Cmd: command
				},
				this.getAxiosConfig()
			);
			return response.data.Id;
		} catch (error) {
			if (error instanceof AxiosError) {
				throw new Error(`Docker API Error: ${error.response?.data?.message || error.message}`);
			}
			throw error;
		}
	}

	private async startExec(execId: string): Promise<void> {
		try {
			await axios.post(
				`${this.baseUrl}/exec/${execId}/start`,
				{
					Detach: false,
					Tty: false
				},
				{
					headers: { 'Content-Type': 'application/json' }
				}
			);
		} catch (error) {
			if (error instanceof AxiosError) {
				throw new Error(`Failed to start exec instance: ${error.response?.data?.message || error.message}`);
			}
			throw error;
		}
	}

	private async inspectExec(execId: string): Promise<DockerExecInspectResponse> {
		try {
			const response = await axios.get<DockerExecInspectResponse>(`${this.baseUrl}/exec/${execId}/json`);
			return response.data;
		} catch (error) {
			if (error instanceof AxiosError) {
				throw new Error(`Failed to inspect exec instance: ${error.response?.data?.message || error.message}`);
			}
			throw error;
		}
	}

	private async getExecStream(execId: string): Promise<ExecStreamResponse> {
		try {
			const response = await axios.post(
				`${this.baseUrl}/exec/${execId}/start`,
				{
					Detach: false,
					Tty: false
				},
				{
					...this.getAxiosConfig(),
					responseType: 'stream'
				}
			);

			return new Promise((resolve, reject) => {
				let output = '';
				let error = '';

				response.data.on('data', (chunk: Buffer) => {
					output += chunk.toString();
				});

				response.data.on('end', () => {
					resolve({ output, error });
				});

				response.data.on('error', (err: Error) => {
					error += err.message;
					reject(err);
				});
			});
		} catch (error) {
			logger.error('Failed to get exec stream:', error);
			throw error;
		}
	}

	public async runGarbageCollection(): Promise<boolean> {
		try {
			logger.info('Starting garbage collection...');
			const execId = await this.createExec({
				containerName: DOCKER_CONFIG.registryContainer,
				command: ['registry', 'garbage-collect', '-m', '/etc/docker/registry/config.yml']
			});

			logger.info(`Created exec instance with ID: ${execId}`);

			// Get command output
			const stream = await this.getExecStream(execId);

			// Wait for command to complete
			const result = await this.inspectExec(execId);

			if (result.ExitCode === 0) {
				logger.info('Garbage collection completed successfully', {
					output: stream.output
				});
				return true;
			} else {
				logger.error('Garbage collection failed', {
					exitCode: result.ExitCode,
					output: stream.output,
					error: stream.error
				});
				return false;
			}
		} catch (error) {
			logger.error('Garbage collection failed:', error);
			return false;
		}
	}
}
