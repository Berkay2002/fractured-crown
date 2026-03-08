import HowToPlayTutorial from '@/components/game/HowToPlayTutorial';
import { usePageTitle } from '@/hooks/usePageTitle';

const HowToPlay = () => {
  usePageTitle('How to Play');
  return <HowToPlayTutorial />;
};

export default HowToPlay;
