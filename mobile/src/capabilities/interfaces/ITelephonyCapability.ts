export interface CallInitiateParams {
  contactId: string;
  contactName: string;
}

export interface CallInitiateResult {
  callPlaced: boolean;
  timestamp: string;
}

export interface ITelephonyCapability {
  initiateCall(params: CallInitiateParams): Promise<CallInitiateResult>;
}
