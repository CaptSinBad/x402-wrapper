'use client';

import { useEffect } from 'react';

export default function Snowfall() {
    useEffect(() => {
        const createSnowflake = () => {
            const snowflake = document.createElement('div');
            snowflake.className = 'snowflake';
            snowflake.innerHTML = '❄';
            snowflake.style.left = Math.random() * 100 + 'vw';
            snowflake.style.animationDuration = Math.random() * 3 + 5 + 's';
            snowflake.style.fontSize = Math.random() * 10 + 10 + 'px';
            document.body.appendChild(snowflake);

            setTimeout(() => {
                snowflake.remove();
            }, 8000);
        };

        const interval = setInterval(createSnowflake, 300);
        return () => clearInterval(interval);
    }, []);

    return null;
}
