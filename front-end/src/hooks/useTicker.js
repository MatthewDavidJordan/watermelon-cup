import { useState, useEffect } from 'react';

export const useTicker = (futureDate) => {
    const calculateTimeLeft = () => {
        const now = new Date();
        const timeDifferenceMs = futureDate - now;
        
        const seconds = Math.floor((timeDifferenceMs / 1000) % 60);
        const minutes = Math.floor((timeDifferenceMs / 1000 / 60) % 60);
        const hours = Math.floor((timeDifferenceMs / (1000 * 60 * 60)) % 24);
        const days = Math.floor(timeDifferenceMs / (1000 * 60 * 60 * 24));

        return {
            total: timeDifferenceMs,
            days,
            hours,
            minutes,
            seconds
        };
    };

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearInterval(timer);
    }, [futureDate]);

    return {
        ...timeLeft,
        isTimeUp: timeLeft.total <= 0
    };
};
