
export interface TiltEvent {
    type: string;
    data: {
        reason: string;
        userId: string;
        severity: number;
        signals?: { type: string }[];
    };
}
