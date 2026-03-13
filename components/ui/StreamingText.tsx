import React, { useState, useEffect } from 'react';

interface StreamingTextProps {
    text: string;
    speed?: number; // Prędkość pojawiania się słów w ms
    onComplete?: () => void;
    className?: string;
    active?: boolean;
}

/**
 * Komponent symulujący efekt strumieniowania tekstu AI
 * Nawet jeśli tekst jest dostępny w całości, renderuje go słowo po słowie
 * z efektem blur-in, aby nadać aplikacji charakter Premium.
 */
export const StreamingText: React.FC<StreamingTextProps> = ({
    text,
    speed = 40,
    onComplete,
    className = "",
    active = true
}) => {
    const [displayedText, setDisplayedText] = useState<string[]>([]);
    const words = text.split(' ');

    useEffect(() => {
        if (!active) {
            setDisplayedText(words);
            return;
        }

        setDisplayedText([]);
        let currentIndex = 0;

        const interval = setInterval(() => {
            if (currentIndex < words.length) {
                setDisplayedText(prev => [...prev, words[currentIndex]]);
                currentIndex++;
            } else {
                clearInterval(interval);
                if (onComplete) onComplete();
            }
        }, speed);

        return () => clearInterval(interval);
    }, [text, speed, active]);

    return (
        <div className={`whitespace-pre-wrap ${className}`}>
            {displayedText.map((word, index) => (
                <span
                    key={index}
                    className="inline-block animate-blur-in opacity-0"
                    style={{
                        animationDelay: '0ms',
                        marginRight: '0.25rem'
                    }}
                >
                    {word}
                </span>
            ))}
            {active && displayedText.length < words.length && (
                <span className="inline-block w-2 h-5 ml-1 bg-blue-500 animate-pulse align-middle" />
            )}
        </div>
    );
};
