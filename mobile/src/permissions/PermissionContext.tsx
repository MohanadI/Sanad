import React, { createContext, useContext, useState, useEffect } from 'react';
import { CapabilityId, PermissionId, PermissionStatus, TierEvaluationResult } from './types';
import { permissionManager, PermissionManager } from './PermissionManager';

export interface PermissionContextValue {
  manager: PermissionManager;
  statuses: Partial<Record<PermissionId, PermissionStatus>>;
  userGrants: Set<string>;
  requestConsent: (permissionId: PermissionId) => Promise<boolean>;
  revokeConsent: (permissionId: PermissionId) => void;
  evaluateCapability: (capabilityId: CapabilityId, isConditionalOverwrite?: boolean) => TierEvaluationResult;
  refresh: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextValue | null>(null);

export const PermissionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [statuses, setStatuses] = useState<Partial<Record<PermissionId, PermissionStatus>>>({});
  const [userGrants, setUserGrants] = useState<Set<string>>(permissionManager.getUserGrants());

  const refresh = async () => {
    const all = await permissionManager.getAllStatuses();
    setStatuses(all);
    setUserGrants(permissionManager.getUserGrants());
  };

  useEffect(() => {
    refresh();
  }, []);

  const requestConsent = async (permissionId: PermissionId): Promise<boolean> => {
    const granted = await permissionManager.requestUserConsent(permissionId);
    await refresh();
    return granted;
  };

  const revokeConsent = (permissionId: PermissionId) => {
    permissionManager.revokeUserConsent(permissionId);
    setUserGrants(permissionManager.getUserGrants());
  };

  const evaluateCapability = (
    capabilityId: CapabilityId,
    isConditionalOverwrite: boolean = false
  ): TierEvaluationResult => {
    return permissionManager.evaluateCapability(capabilityId, isConditionalOverwrite);
  };

  const value: PermissionContextValue = {
    manager: permissionManager,
    statuses,
    userGrants,
    requestConsent,
    revokeConsent,
    evaluateCapability,
    refresh,
  };

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
};

export const usePermissions = (): PermissionContextValue => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
};
