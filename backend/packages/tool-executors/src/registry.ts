import {
  CAPABILITY_CONFIG,
  CapabilityDisabledError,
  TamperedParametersError,
  computeActionHash,
  type CapabilityId,
  type ExecutionAuthToken,
} from '@sanad/common';
import type { BoundedToolExecutor, ToolResult } from './types.js';

export interface ToolRegistry {
  register(tool: BoundedToolExecutor): void;
  get(toolName: string): BoundedToolExecutor | undefined;
  has(toolName: string): boolean;
  execute<TInput = unknown, TOutput = unknown>(
    toolName: string,
    input: TInput,
    authGrant: ExecutionAuthToken
  ): Promise<ToolResult<TOutput>>;
  listTools(): readonly string[];
}

export class DefaultToolRegistry implements ToolRegistry {
  private readonly tools = new Map<string, BoundedToolExecutor>();

  register(tool: BoundedToolExecutor): void {
    if (this.tools.has(tool.toolName)) {
      throw new Error(`Tool already registered: ${tool.toolName}`);
    }
    this.tools.set(tool.toolName, tool);
  }

  get(toolName: string): BoundedToolExecutor | undefined {
    return this.tools.get(toolName);
  }

  has(toolName: string): boolean {
    return this.tools.has(toolName);
  }

  listTools(): readonly string[] {
    return Array.from(this.tools.keys());
  }

  async execute<TInput = unknown, TOutput = unknown>(
    toolName: string,
    input: TInput,
    authGrant: ExecutionAuthToken
  ): Promise<ToolResult<TOutput>> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    // Capability Gate check: assert capability is enabled
    const capConfig = CAPABILITY_CONFIG[tool.requiredCapability as CapabilityId];
    if (capConfig && !capConfig.enabled) {
      throw new CapabilityDisabledError(tool.requiredCapability);
    }

    // Parameter Hash Verification (ADR-004)
    const computedHash = computeActionHash(toolName, input);
    if (authGrant.actionHash !== computedHash) {
      throw new TamperedParametersError(
        `Execution parameters do not match signed authorization grant: expected ${authGrant.actionHash}, got ${computedHash}`
      );
    }

    return tool.execute(input, authGrant) as Promise<ToolResult<TOutput>>;
  }
}
