export interface InterventionMessage {
  id: string;
  interventionId: string;
  senderId: string;
  senderRole: 'technician' | 'client';
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface IMessagesService {
  sendMessage(params: {
    interventionId: string;
    senderId: string;
    senderRole: 'technician' | 'client';
    message: string;
  }): Promise<InterventionMessage>;
  getMessages(interventionId: string): Promise<InterventionMessage[]>;
  markAsRead(interventionId: string, userId: string): Promise<void>;
  getUnreadCount(interventionId: string, userId: string): Promise<number>;
}
