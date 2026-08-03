import { defineRelations } from "drizzle-orm";
import { chatRooms, chats } from "./schema";

export const relations = defineRelations({ chatRooms, chats }, (r) => ({
	chatRooms: {
		chats: r.many.chats({
			from: r.chatRooms.id,
			to: r.chats.chatRoomId,
		}),
	},
	chats: {
		chatRoom: r.one.chatRooms({
			from: r.chats.chatRoomId,
			to: r.chatRooms.id,
		}),
	},
}));
