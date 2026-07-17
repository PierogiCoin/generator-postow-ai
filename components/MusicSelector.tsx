import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Music, Volume2, VolumeX, Play, Pause } from 'lucide-react';

export interface MusicTrack {
  id: string;
  name: string;
  artist: string;
  duration: number;
  genre: 'energetic' | 'calm' | 'professional' | 'fun' | 'inspiring';
  url: string;
  waveform?: string;
}

interface MusicSelectorProps {
  selectedTrack: MusicTrack | null;
  onSelectTrack: (track: MusicTrack | null) => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  fadeIn: boolean;
  onFadeInChange: (enabled: boolean) => void;
  fadeOut: boolean;
  onFadeOutChange: (enabled: boolean) => void;
}

const MUSIC_LIBRARY: MusicTrack[] = [
  { id: '1', name: 'Upbeat Energy', artist: 'AudioLib', duration: 30, genre: 'energetic', url: '/music/upbeat.mp3' },
  { id: '2', name: 'Corporate Success', artist: 'AudioLib', duration: 45, genre: 'professional', url: '/music/corporate.mp3' },
  { id: '3', name: 'Calm Focus', artist: 'AudioLib', duration: 60, genre: 'calm', url: '/music/calm.mp3' },
  { id: '4', name: 'Fun Times', artist: 'AudioLib', duration: 30, genre: 'fun', url: '/music/fun.mp3' },
  { id: '5', name: 'Inspiring Journey', artist: 'AudioLib', duration: 40, genre: 'inspiring', url: '/music/inspiring.mp3' },
  { id: '6', name: 'Tech Vibes', artist: 'AudioLib', duration: 35, genre: 'energetic', url: '/music/tech.mp3' },
  { id: '7', name: 'Minimal Beat', artist: 'AudioLib', duration: 50, genre: 'professional', url: '/music/minimal.mp3' },
  { id: '8', name: 'Peaceful Mind', artist: 'AudioLib', duration: 55, genre: 'calm', url: '/music/peaceful.mp3' },
  { id: '9', name: 'Party Starter', artist: 'AudioLib', duration: 25, genre: 'fun', url: '/music/party.mp3' },
  { id: '10', name: 'Motivational', artist: 'AudioLib', duration: 45, genre: 'inspiring', url: '/music/motivational.mp3' },
];

export const MusicSelector: React.FC<MusicSelectorProps> = ({
  selectedTrack,
  onSelectTrack,
  volume,
  onVolumeChange,
  isMuted,
  onToggleMute,
  fadeIn,
  onFadeInChange,
  fadeOut,
  onFadeOutChange
}) => {
  const { t } = useTranslation();
  const [customTracks, setCustomTracks] = useState<MusicTrack[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [isPlaying, setIsPlaying] = useState(false);
  const [previewTrack, setPreviewTrack] = useState<MusicTrack | null>(null);
  const audioRef = React.useRef<HTMLAudioElement>(null);

  const genres = ['all', 'energetic', 'calm', 'professional', 'fun', 'inspiring'];

  const allTracks = [...customTracks, ...MUSIC_LIBRARY];

  const filteredTracks = selectedGenre === 'all' 
    ? allTracks 
    : allTracks.filter(t => t.genre === selectedGenre);

  const handlePreview = (track: MusicTrack) => {
    if (previewTrack?.id === track.id && isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      setPreviewTrack(track);
      setIsPlaying(true);
      if (audioRef.current) {
        audioRef.current.src = track.url;
        audioRef.current.volume = volume / 100;
        audioRef.current.play();
      }
    }
  };

  const handleSelect = (track: MusicTrack) => {
    onSelectTrack(selectedTrack?.id === track.id ? null : track);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const newTrack: MusicTrack = {
      id: `custom_${Date.now()}`,
      name: file.name.replace(/\.[^/.]+$/, ""),
      artist: t('musicSelector.customArtist', 'Własny plik'),
      duration: 30,
      genre: 'fun',
      url: url
    };
    setCustomTracks(prev => [newTrack, ...prev]);
    onSelectTrack(newTrack);
  };

  React.useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Music className="w-5 h-5 text-purple-500" />
          <h3 className="font-semibold text-slate-900 dark:text-white">
            {t('musicSelector.title', 'Background Music')}
          </h3>
        </div>
        
        {/* Volume Control */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMute}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
          >
            {isMuted ? (
              <VolumeX className="w-5 h-5 text-slate-500" />
            ) : (
              <Volume2 className="w-5 h-5 text-slate-500" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            className="w-24 accent-purple-500"
          />
          <span className="text-sm text-slate-500 w-10">{volume}%</span>
        </div>
      </div>

      {/* Genre Filter & Upload */}
      <div className="flex gap-2 flex-wrap items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {genres.map((genre) => (
            <button
              key={genre}
              type="button"
              onClick={() => setSelectedGenre(genre)}
              className={`px-3 py-1 text-sm rounded-full transition ${
                selectedGenre === genre
                  ? 'bg-purple-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {t(`musicSelector.genres.${genre}`, genre.charAt(0).toUpperCase() + genre.slice(1))}
            </button>
          ))}
        </div>
        
        {/* Audio Upload */}
        <label className="cursor-pointer px-3 py-1 text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50 rounded-full transition font-semibold flex items-center gap-1.5">
          <span>➕ Upload Audio</span>
          <input
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Track List */}
      <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
        {filteredTracks.map((track) => {
          const isSelected = selectedTrack?.id === track.id;
          const isPreviewing = previewTrack?.id === track.id && isPlaying;

          return (
            <div
              key={track.id}
              className={`p-3 rounded-lg border-2 transition cursor-pointer ${
                isSelected
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-purple-300'
              }`}
              onClick={() => handleSelect(track)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium text-slate-900 dark:text-white text-sm">
                    {track.name}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {track.artist} • {track.duration}s • {track.genre}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePreview(track);
                    }}
                    className="p-2 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg transition"
                  >
                    {isPreviewing ? (
                      <Pause className="w-4 h-4 text-purple-500" />
                    ) : (
                      <Play className="w-4 h-4 text-purple-500" />
                    )}
                  </button>
                  
                  {isSelected && (
                    <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Track Info */}
      {selectedTrack && (
        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
          <div className="flex items-center gap-2 text-sm">
            <Music className="w-4 h-4 text-purple-500" />
            <span className="text-slate-700 dark:text-slate-300">
              {t('musicSelector.selected', 'Selected')}: <strong>{selectedTrack.name}</strong>
            </span>
          </div>
        </div>
      )}

      {/* Fade Transitions */}
      <div className="flex gap-4 p-3 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-200 dark:border-slate-800">
        <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={fadeIn}
            onChange={(e) => onFadeInChange(e.target.checked)}
            className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
          />
          <span>Fade-in (stopniowe podgłaśnianie)</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={fadeOut}
            onChange={(e) => onFadeOutChange(e.target.checked)}
            className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
          />
          <span>Fade-out (stopniowe wyciszanie)</span>
        </label>
      </div>

      {/* Hidden Audio Element */}
      <audio ref={audioRef} onEnded={() => setIsPlaying(false)} />
    </div>
  );
};
