/**
 * Operational State Service
 * Replaces HEARTBEAT.md with structured database state
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface OperationalState {
  workspaceId: string;
  systemHealth: 'healthy' | 'degraded' | 'critical';
  activeTasks: unknown[];
  blockedTasks: unknown[];
  pendingApprovals: unknown[];
  currentContextTokens: number;
  contextPressureLevel: 'low' | 'medium' | 'high' | 'critical';
  currentModel: string;
  dailySpendUsd: number;
  monthlySpendUsd: number;
  activeAlertsCount: number;
  criticalAlerts: unknown[];
  lastHeartbeatAt: Date;
}

export interface OperationalEvent {
  workspaceId: string;
  eventType: string;
  eventData: Record<string, any>;
  severity: 'info' | 'warning' | 'error' | 'critical';
  agentId?: string;
  taskId?: string;
}

export class OperationalStateService {
  
  /**
   * Get current operational state
   * Call this instead of reading HEARTBEAT.md
   */
  async getState(workspaceId: string = 'business'): Promise<OperationalState> {
    let state = await prisma.operationalState.findUnique({
      where: { workspaceId },
    });
    
    if (!state) {
      // Initialize default state
      state = await prisma.operationalState.create({
        data: {
          workspaceId,
          systemHealth: 'healthy',
          activeTasks: [],
          blockedTasks: [],
          pendingApprovals: [],
          currentContextTokens: 0,
          contextPressureLevel: 'low',
          currentModel: 'kimi-k2.5',
          dailySpendUsd: 0,
          monthlySpendUsd: 0,
          activeAlertsCount: 0,
          criticalAlerts: [],
          lastHeartbeatAt: new Date(),
        },
      });
    }
    
    return {
      workspaceId: state.workspaceId,
      systemHealth: state.systemHealth as any,
      activeTasks: state.activeTasks as any[],
      blockedTasks: state.blockedTasks as any[],
      pendingApprovals: state.pendingApprovals as any[],
      currentContextTokens: state.currentContextTokens,
      contextPressureLevel: state.contextPressureLevel as any,
      currentModel: state.currentModel,
      dailySpendUsd: Number(state.dailySpendUsd),
      monthlySpendUsd: Number(state.monthlySpendUsd),
      activeAlertsCount: state.activeAlertsCount,
      criticalAlerts: state.criticalAlerts as any[],
      lastHeartbeatAt: state.lastHeartbeatAt,
    };
  }
  
  /**
   * Update operational state
   * Call on any significant state change
   */
  async updateState(
    workspaceId: string,
    updates: Partial<OperationalState>
  ): Promise<void> {
    await prisma.operationalState.upsert({
      where: { workspaceId },
      create: {
        workspaceId,
        ...updates,
      } as any,
      update: {
        ...updates,
        lastHeartbeatAt: new Date(),
      },
    });
  }
  
  /**
   * Log an operational event
   * Immutable event log
   */
  async logEvent(event: OperationalEvent): Promise<void> {
    await prisma.operationalEvent.create({
      data: {
        workspaceId: event.workspaceId,
        eventType: event.eventType,
        eventData: event.eventData,
        severity: event.severity,
        agentId: event.agentId,
        taskId: event.taskId,
      },
    });
  }
  
  /**
   * Get recent events
   * For display in Mission Control
   */
  async getRecentEvents(
    workspaceId: string,
    limit: number = 50
  ): Promise<any[]> {
    return prisma.operationalEvent.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
  
  /**
   * Update context pressure
   * Call after each request
   */
  async updateContextPressure(
    workspaceId: string,
    tokens: number
  ): Promise<void> {
    const level = this.calculatePressureLevel(tokens);
    
    await this.updateState(workspaceId, {
      currentContextTokens: tokens,
      contextPressureLevel: level,
    });
    
    // Log if high pressure
    if (level === 'high' || level === 'critical') {
      await this.logEvent({
        workspaceId,
        eventType: 'context_pressure',
        eventData: { tokens, level },
        severity: level === 'critical' ? 'error' : 'warning',
      });
    }
  }
  
  /**
   * Calculate pressure level from token count
   */
  private calculatePressureLevel(tokens: number): OperationalState['contextPressureLevel'] {
    if (tokens < 50000) return 'low';
    if (tokens < 80000) return 'medium';
    if (tokens < 100000) return 'high';
    return 'critical';
  }
  
  /**
   * Update spend tracking
   * Call after each model request
   */
  async addSpend(
    workspaceId: string,
    costUsd: number,
    tokens: number
  ): Promise<void> {
    const state = await this.getState(workspaceId);
    
    await this.updateState(workspaceId, {
      dailySpendUsd: state.dailySpendUsd + costUsd,
      monthlySpendUsd: state.monthlySpendUsd + costUsd,
    });
  }
  
  /**
   * Add a blocker
   */
  async addBlocker(
    workspaceId: string,
    taskId: string,
    reason: string
  ): Promise<void> {
    const state = await this.getState(workspaceId);
    
    await this.updateState(workspaceId, {
      blockedTasks: [...state.blockedTasks, { taskId, reason, addedAt: new Date() }],
    });
    
    await this.logEvent({
      workspaceId,
      eventType: 'blocker_added',
      eventData: { taskId, reason },
      severity: 'warning',
      taskId,
    });
  }
  
  /**
   * Remove a blocker
   */
  async removeBlocker(workspaceId: string, taskId: string): Promise<void> {
    const state = await this.getState(workspaceId);
    
    await this.updateState(workspaceId, {
      blockedTasks: state.blockedTasks.filter((b: Task) => b.taskId !== taskId),
    });
  }
  
  /**
   * Generate human-readable summary
   * For Mission Control display
   */
  async generateSummary(workspaceId: string): Promise<string> {
    const state = await this.getState(workspaceId);
    
    const lines: string[] = [];
    
    lines.push(`System Health: ${state.systemHealth.toUpperCase()}`);
    lines.push(`Active Tasks: ${state.activeTasks.length}`);
    lines.push(`Blocked Tasks: ${state.blockedTasks.length}`);
    lines.push(`Context Pressure: ${state.contextPressureLevel} (${state.currentContextTokens} tokens)`);
    lines.push(`Current Model: ${state.currentModel}`);
    lines.push(`Daily Spend: $${state.dailySpendUsd.toFixed(2)}`);
    
    if (state.criticalAlerts.length > 0) {
      lines.push(`⚠️ ${state.criticalAlerts.length} critical alerts`);
    }
    
    return lines.join('\n');
  }
}

// Singleton
export const operationalStateService = new OperationalStateService();