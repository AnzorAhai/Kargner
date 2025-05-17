'use client';

import React, { useState, useEffect } from 'react';

interface CountdownTimerProps {
  createdAt: string | Date;
  onTimerEnd?: () => void; // Optional callback when timer ends
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ createdAt, onTimerEnd }) => {
  const calculateTargetDate = () => {
    const date = new Date(createdAt);
    date.setHours(date.getHours() + 24);
    return date;
  };

  const [targetDateState, setTargetDateState] = useState(calculateTargetDate());

  useEffect(() => {
    setTargetDateState(calculateTargetDate());
  }, [createdAt]);

  const calculateTimeLeft = () => {
    const difference = +new Date(targetDateState) - +new Date();
    let timeLeft = {};

    if (difference > 0) {
      timeLeft = {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    } else {
      if (onTimerEnd && typeof window !== 'undefined') {
        // Ensure onTimerEnd is called only once
        if (!(window as any).__timerEnded) {
          (window as any).__timerEnded = true;
          onTimerEnd();
        }
      }
    }
    return timeLeft;
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
  const [hasEnded, setHasEnded] = useState(+new Date(targetDateState) - +new Date() <= 0);

  useEffect(() => {
    if (hasEnded) return; // Stop timer if it has already ended

    const timer = setTimeout(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);
      if (Object.keys(newTimeLeft).length === 0) {
        setHasEnded(true);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }); // No dependency array, runs on every render to update timeLeft

  useEffect(() => {
    // Reset a global flag if targetDate changes, to allow onTimerEnd to be called again for a new timer
    (window as any).__timerEnded = false;
    setHasEnded(+new Date(targetDateState) - +new Date() <= 0);
    setTimeLeft(calculateTimeLeft()); // Recalculate on targetDate change
  }, [targetDateState]); // Depend on targetDateState

  const timerComponents: React.ReactElement[] = [];

  Object.keys(timeLeft).forEach((interval) => {
    if (!(timeLeft as any)[interval] && interval !== 'seconds' && interval !== 'minutes' && interval !== 'hours') {
      // Do not push component if time is 0, unless it is seconds, minutes or hours for initial display
      if((timeLeft as any).days > 0 || (timeLeft as any).hours > 0 || (timeLeft as any).minutes > 0 || (timeLeft as any).seconds > 0 ){
        // Only return if there are other values, otherwise show 00:00:00
      } else {
         return;
      }
    }
    timerComponents.push(
      <span key={interval} className="mx-1">
        {(timeLeft as any)[interval] < 10 ? `0${(timeLeft as any)[interval]}` : (timeLeft as any)[interval]}
        {interval === 'days' ? 'д ' : interval === 'hours' ? 'ч ' : interval === 'minutes' ? 'м ' : interval === 'seconds' ? 'с' : ''}
      </span>
    );
  });

  if (hasEnded) {
    return <span className="text-red-500 font-semibold">Время истекло</span>;
  }
  
  // Ensure we always show HH:MM:SS format even if days are present or some initial values are zero
  const hours = (timeLeft as any).hours !== undefined ? ((timeLeft as any).hours < 10 ? `0${(timeLeft as any).hours}` : (timeLeft as any).hours) : '00';
  const minutes = (timeLeft as any).minutes !== undefined ? ((timeLeft as any).minutes < 10 ? `0${(timeLeft as any).minutes}` : (timeLeft as any).minutes) : '00';
  const seconds = (timeLeft as any).seconds !== undefined ? ((timeLeft as any).seconds < 10 ? `0${(timeLeft as any).seconds}` : (timeLeft as any).seconds) : '00';
  const days = (timeLeft as any).days > 0 ? `${(timeLeft as any).days}д ` : '';

  return (
    <div className="text-sm font-medium">
      {days}{hours}:{minutes}:{seconds}
    </div>
  );
};

export default CountdownTimer; 