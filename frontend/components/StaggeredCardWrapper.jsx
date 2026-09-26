import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

/**
 * StaggeredCardWrapper
 *
 * Provides subtle opacity and translateY entrance animation for cards
 * with index-based staggered delay.
 */
export default function StaggeredCardWrapper({ index = 0, children, style }) {
  const anim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Subtle quick polish entrance without blank delay
    anim.setValue(1);
  }, [index]);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
  });

  const scale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.98, 1],
  });

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: anim,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
