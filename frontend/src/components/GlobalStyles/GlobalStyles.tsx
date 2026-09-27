import type { ReactNode } from 'react';
import './GlobalStyles.css';

type Props = {
    children: ReactNode;
};

export default function GlobalStyles({ children }: Props) {
    return <>{children}</>;
}
