import React, { useState, useRef, useEffect } from 'react';
import { PlayIcon } from './icons/PlayIcon';
import { PauseIcon } from './icons/PauseIcon';
import { VolumeUpIcon } from './icons/VolumeUpIcon';
import { VolumeOffIcon } from './icons/VolumeOffIcon';

interface VideoPlayerProps {
    src: string;
    className?: string;
}

const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, className }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const progressRef = useRef<HTMLDivElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [volume, setVolume] = useState(1);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [showControls, setShowControls] = useState(false);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleLoadedMetadata = () => {
            setDuration(video.duration);
        };
        const handleTimeUpdate = () => {
            if (video.duration > 0) {
                setProgress((video.currentTime / video.duration) * 100);
            }
            setCurrentTime(video.currentTime);
        };
        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        const handleVolumeChange = () => {
            setIsMuted(video.muted);
            setVolume(video.volume);
        };
        
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);
        video.addEventListener('volumechange', handleVolumeChange);
        
        // Sync state on mount and src change
        setIsPlaying(!video.paused);
        setIsMuted(video.muted);

        return () => {
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
            video.removeEventListener('volumechange', handleVolumeChange);
        };
    }, [src]);

    const togglePlayPause = (e: React.MouseEvent) => {
        e.stopPropagation();
        const video = videoRef.current;
        if (video) {
            if (video.paused) {
                video.play();
            } else {
                video.pause();
            }
        }
    };

    const toggleMute = (e: React.MouseEvent) => {
        e.stopPropagation();
        const video = videoRef.current;
        if (video) {
            video.muted = !video.muted;
            if (!video.muted && video.volume === 0) {
              video.volume = 0.5;
            }
        }
    };
    
    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const video = videoRef.current;
        const newVolume = parseFloat(e.target.value);
        if (video) {
            video.volume = newVolume;
            video.muted = newVolume === 0;
        }
    };
    
    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        const video = videoRef.current;
        const progressContainer = progressRef.current;
        if (video && video.duration > 0 && progressContainer) {
            const rect = progressContainer.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            video.currentTime = pos * video.duration;
        }
    };

    // Show controls on hover or if the video is paused
    const areControlsVisible = showControls || !isPlaying;

    return (
        <div 
            className="relative group/player overflow-hidden h-full bg-black"
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
        >
            <video 
                ref={videoRef} 
                src={src} 
                loop 
                muted 
                className={className} 
                onClick={togglePlayPause} 
                playsInline 
                preload="metadata"
            />
            
            {/* Darkening Overlay */}
            <div className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ease-in-out pointer-events-none ${areControlsVisible ? 'opacity-100' : 'opacity-0'}`} />

            {/* Center Play/Pause Button */}
            <div 
                className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ease-in-out ${!isPlaying ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none group-hover/player:opacity-100 group-hover/player:scale-100 group-hover/player:pointer-events-auto'}`}
            >
                <button 
                    onClick={togglePlayPause} 
                    className="p-3 bg-black/60 backdrop-blur-sm rounded-full text-white transform transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75"
                    aria-label={isPlaying ? "Pauza" : "Odtwarzaj"}
                >
                    {isPlaying ? <PauseIcon className="w-10 h-10" /> : <PlayIcon className="w-10 h-10 pl-1" />}
                </button>
            </div>
            
            {/* Bottom Controls Bar */}
            <div 
                className={`absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent transition-transform duration-300 ease-in-out ${areControlsVisible ? 'translate-y-0' : 'translate-y-full'}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div 
                    ref={progressRef}
                    onClick={handleSeek}
                    className="w-full h-1.5 bg-white/30 cursor-pointer mb-2 rounded-full group/progress"
                >
                    <div 
                        className="h-full bg-blue-500 rounded-full relative"
                        style={{ width: `${progress}%` }}
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-500 rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity"/>
                    </div>
                </div>
                
                <div className="flex justify-between items-center text-white">
                    <div className="flex items-center gap-3">
                        <button onClick={togglePlayPause} className="focus:outline-none focus:ring-1 focus:ring-white rounded-full">
                            {isPlaying ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
                        </button>
                        <span className="text-xs font-mono select-none">{formatTime(currentTime)} / {formatTime(duration)}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 group/volume">
                        <button onClick={toggleMute} className="focus:outline-none focus:ring-1 focus:ring-white rounded-full">
                            {isMuted || volume === 0 ? <VolumeOffIcon className="w-5 h-5" /> : <VolumeUpIcon className="w-5 h-5" />}
                        </button>
                        <input 
                            type="range" 
                            min="0" max="1" step="0.05" 
                            value={isMuted ? 0 : volume} 
                            onChange={handleVolumeChange}
                            aria-label="Regulacja głośności"
                            className="w-0 group-hover/volume:w-20 transition-all duration-300 h-1 accent-blue-500 cursor-pointer"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
