import { ReactComponent as IconPowerhouse } from '@/assets/icons/powerhouse-logo.svg';
import Header from '@/assets/images/header.jpg';
import { ReactElement } from 'react';

interface IProps {
    children: ReactElement;
    className?: string;
}

export default ({ children, className }: IProps) => {
    return (
        <div
            className={`flex max-h-[70vh] max-w-[482px] flex-col overflow-hidden rounded-3xl shadow-modal ${className}`}
        >
            <div className="relative flex-shrink-0">
                <img src={Header} className="h-[106px]" />
                <IconPowerhouse className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform" />
            </div>

            {children}
        </div>
    );
};
