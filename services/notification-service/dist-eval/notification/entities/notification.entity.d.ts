export declare class Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    metadata: Record<string, unknown> | null;
    isRead: boolean;
    createdAt: Date;
}
