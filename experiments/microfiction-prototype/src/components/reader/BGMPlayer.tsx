import { useEffect, useRef, useState } from 'react';

interface Props {
  src: string | undefined;
  unlocked: boolean;
}

export default function BGMPlayer({ src, unlocked }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!src) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      return;
    }
    if (audio.src !== new URL(src, window.location.origin).href) {
      audio.src = src;
    }
    if (unlocked && !muted) {
      audio.volume = 0;
      audio.play().catch(() => {
        // autoplay blocked; user needs to gesture again
      });
      const id = setInterval(() => {
        if (audio.volume < 0.55) audio.volume = Math.min(0.6, audio.volume + 0.05);
        else clearInterval(id);
      }, 80);
      return () => clearInterval(id);
    } else {
      audio.pause();
    }
  }, [src, unlocked, muted]);

  return (
    <>
      <audio ref={audioRef} loop preload="auto" />
      {src && (
        <button
          onClick={() => setMuted((m) => !m)}
          className="fixed top-16 right-5 z-30 size-9 rounded-full bg-black/50 backdrop-blur border border-white/15 text-white/80 hover:text-white transition flex items-center justify-center"
          aria-label={muted ? '开启声音' : '静音'}
          title={muted ? '开启声音' : '静音'}
        >
          {muted ? '🔇' : '🔊'}
        </button>
      )}
    </>
  );
}
