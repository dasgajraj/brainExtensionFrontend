import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Onboarding1 from './Onboarding1';
import Onboarding2 from './Onboarding2';
import Onboarding3 from './Onboarding3';

interface OnboardingContainerProps {
  onComplete: () => void;
  theme?: 'light' | 'dark';
}

const OnboardingContainer: React.FC<OnboardingContainerProps> = ({ 
  onComplete, 
  theme = 'dark' 
}) => {
  const [currentScreen, setCurrentScreen] = useState(1);

  const handleNext = () => {
    if (currentScreen < 3) {
      console.log(`➡️ [Onboarding] handleNext → screen ${currentScreen} → ${currentScreen + 1}`);
      setCurrentScreen(currentScreen + 1);
    } else {
      console.log('✅ [Onboarding] handleNext → all screens done, completing onboarding');
      onComplete();
    }
  };

  const handleSkip = () => {
    console.log(`⏭️ [Onboarding] handleSkip → skipped from screen ${currentScreen}, completing onboarding`);
    onComplete();
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 1:
        return (
          <Onboarding1 
            onNext={handleNext} 
            onSkip={handleSkip} 
            theme={theme}
          />
        );
      case 2:
        return (
          <Onboarding2 
            onNext={handleNext} 
            onSkip={handleSkip} 
            theme={theme}
          />
        );
      case 3:
        return (
          <Onboarding3 
            onGetStarted={onComplete} 
            theme={theme}
          />
        );
      default:
        return null;
    }
  };

  return <View style={styles.container}>{renderScreen()}</View>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default OnboardingContainer;
