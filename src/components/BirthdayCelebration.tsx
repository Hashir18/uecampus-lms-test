import { useEffect, useState, useRef } from "react";
import Confetti from "react-confetti";
import { useBirthdayMode } from "@/hooks/useBirthdayMode";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BirthdayCelebration() {
  const { birthdayMode } = useBirthdayMode();
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (birthdayMode) {
      setShowConfetti(true);
      
      // Create audio element for birthday music
      // Using a simple melody with Web Audio API
      if (!audioRef.current) {
        initBirthdayMusic();
      }
    } else {
      setShowConfetti(false);
      if (audioRef.current) {
        audioRef.current.pause();
        setIsMusicPlaying(false);
      }
    }
  }, [birthdayMode]);

  const initBirthdayMusic = () => {
    // Create a simple birthday tune using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const notes = [
      { freq: 261.63, duration: 0.5 }, // C
      { freq: 261.63, duration: 0.5 }, // C
      { freq: 293.66, duration: 1 },   // D
      { freq: 261.63, duration: 1 },   // C
      { freq: 349.23, duration: 1 },   // F
      { freq: 329.63, duration: 2 },   // E
      { freq: 261.63, duration: 0.5 }, // C
      { freq: 261.63, duration: 0.5 }, // C
      { freq: 293.66, duration: 1 },   // D
      { freq: 261.63, duration: 1 },   // C
      { freq: 392.00, duration: 1 },   // G
      { freq: 349.23, duration: 2 },   // F
    ];

    let currentTime = audioContext.currentTime;

    const playNote = (frequency: number, duration: number, startTime: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = "sine";

      gainNode.gain.setValueAtTime(0.3, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };

    const playBirthdaySong = () => {
      currentTime = audioContext.currentTime;
      notes.forEach((note) => {
        playNote(note.freq, note.duration, currentTime);
        currentTime += note.duration;
      });
      
      // Loop the song
      setTimeout(() => {
        if (isMusicPlaying && birthdayMode) {
          playBirthdaySong();
        }
      }, currentTime * 1000);
    };

    // Store play function
    audioRef.current = {
      play: () => {
        setIsMusicPlaying(true);
        playBirthdaySong();
      },
      pause: () => {
        setIsMusicPlaying(false);
        audioContext.close();
      },
    } as any;
  };

  const toggleMusic = () => {
    if (isMusicPlaying) {
      audioRef.current?.pause();
      setIsMusicPlaying(false);
    } else {
      audioRef.current?.play();
      setIsMusicPlaying(true);
    }
  };

  if (!birthdayMode) return null;

  return (
    <>
      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={true}
          numberOfPieces={200}
          gravity={0.3}
          colors={['#FFD700', '#FF69B4', '#87CEEB', '#98FB98', '#DDA0DD', '#F0E68C']}
        />
      )}
      
      {/* Music Control Button */}
      <Button
        onClick={toggleMusic}
        variant="outline"
        size="icon"
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
        aria-label={isMusicPlaying ? "Pause birthday music" : "Play birthday music"}
      >
        {isMusicPlaying ? (
          <VolumeX className="h-6 w-6 text-white" />
        ) : (
          <Volume2 className="h-6 w-6 text-white" />
        )}
      </Button>

      {/* Birthday Celebration Message */}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 animate-bounce">
        <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-yellow-500 text-white px-6 py-3 rounded-full shadow-lg font-bold text-lg">
          🎉 Birthday Mode Activated! 🎂
        </div>
      </div>
    </>
  );
}
