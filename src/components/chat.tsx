import * as sdk from 'matrix-js-sdk';
import { useEffect, useRef, useState } from 'react';
import { Input } from 'react-aria-components';
import { MatrixMessage, useMatrix } from 'src/store/matrix';
import Button from './button';

interface IProps {
    roomId: string;
}

function senderText(sender: string) {
    const user = sender.replace(':powerhouse.matrix', '');
    return user.length < 20 ? user : `${user.slice(0, 5)}...${user.slice(-4)}`;
}

export default ({ roomId }: IProps) => {
    const [matrix] = useMatrix();
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
        matrix.onMessage(room, newMessage =>
            setMessages(messages => [...messages, newMessage])
        );
    }

    useEffect(() => {
        joinChat(roomId);
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
        <div className="flex flex-1 flex-col">
            <div className="flex-1">
                {messages.map((message, index) => (
                    <p key={index}>
                        <b>{senderText(message.sender ?? '-')}:</b>
                        <span className="ml-2">{message.content?.body}</span>
                    </p>
                ))}
            </div>
            <form className="flex items-stretch" onSubmit={sendMessage}>
                <Input
                    ref={input}
                    className="w-full py-2"
                    name="message"
                    placeholder="Send message..."
                />
                <Button className="-mb-1 ml-8 px-8 text-text">Send</Button>
            </form>
        </div>
    );
};
