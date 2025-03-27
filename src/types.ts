export interface User {
    id: string;
    username: string;
    roomCode: string;
    progress?: number;
}

export interface RoomState {
    roomCode: string;
    admin: string;
    users: User[];
    started: boolean;
}

export interface WSMessage {
    type: 'join' | 'leave' | 'update_progress' | 'start_game';
    payload: any;
}