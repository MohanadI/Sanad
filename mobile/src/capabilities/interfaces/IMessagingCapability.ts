export interface SendMessageParams {
  contactId: string;
  contactName: string;
  messageBody: string;
}

export interface SendMessageResult {
  messageDispatched: boolean;
  timestamp: string;
}

export interface IMessagingCapability {
  sendMessage(params: SendMessageParams): Promise<SendMessageResult>;
}
