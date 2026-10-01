import React from 'react';
import { CinematicHero } from './CinematicHero';

interface HeroProps {
  onNavigateApp?: () => void;
  onExploreSolution?: () => void;
}

export const Hero: React.FC<HeroProps> = (props) => {
  return <CinematicHero {...props} />;
};
