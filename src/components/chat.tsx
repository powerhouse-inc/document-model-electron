import * as sdk from 'matrix-js-sdk';
import { useEffect, useRef, useState } from 'react';
import { Input } from 'react-aria-components';
import { MatrixMessage } from 'src/services/matrix';
import { useMatrix } from 'src/store/matrix';
import Button from './button';

interface IProps {
    roomId: string;
}

function senderText(sender: string) {
    const user = sender.replace(':powerhouse.matrix', '');
    return user.length < 20 ? user : `${user.slice(0, 5)}...${user.slice(-4)}`;
}

export default ({ roomId }: IProps) => {
    const matrix = useMatrix();
    const [messages, setMessages] = useState<MatrixMessage[]>([]);
    const [room, setRoom] = useState<sdk.Room>();
    const input = useRef<HTMLInputElement>(null);

    async function joinChat(roomId: string) {
        const room = await matrix.joinRoom(roomId);
        if (!room) {
            throw new Error('Room does not exist.');
        }
        setRoom(room);
        const messages = await matrix.getMessages(room);
        setMessages(messages);

        return matrix.onMessage(room, newMessage => {
            setMessages(messages => [...messages, newMessage]);
        });
    }

    useEffect(() => {
        const leaveChat = joinChat(roomId);
        return () => {
            leaveChat.then(leave => leave?.());
        };
    }, [roomId]);

    async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.target as HTMLFormElement;
        const formData = new FormData(form);
        const message = formData.get('message');

        if (!room) {
            throw new Error('Room does not exist.');
        }

        await matrix.sendMessage(room.roomId, message);
        if (input.current) {
            input.current.value = '';
        }
    }

    return (
        <div className="flex w-full flex-1 flex-col overflow-hidden px-4 pb-4">
            <div className="min-h-[20vh] flex-shrink overflow-auto">
                {messages.map((message, index) => (
                    <p key={index} className="first:pt-2">
                        <b className="font-medium text-neutral-4">
                            {senderText(message.sender ?? '-')}:
                        </b>
                        <span className="ml-2 text-text/90">
                            {message.content?.body}
                        </span>
                    </p>
                ))}
            </div>
            <form className="mt-2 flex items-end" onSubmit={sendMessage}>
                <Input
                    ref={input}
                    className="w-full border-neutral-3 py-2 outline-none focus:border-text active:border-text"
                    name="message"
                    placeholder="Send message..."
                />
                <Button className="-mb-[2px] ml-4 h-9 bg-action px-4 py-0 leading-8 text-white hover:bg-action/75">
                    Send
                </Button>
            </form>
        </div>
    );
};
