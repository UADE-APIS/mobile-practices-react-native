import { useCallback, useEffect, useMemo, useState } from 'react';
import * as Network from 'expo-network';
import { getDefaultServerUrl } from '../config/api';

export default function useRecommendedServerUrl() {
  const networkState = Network.useNetworkState();
  const [recommendedUrl, setRecommendedUrl] = useState(getDefaultServerUrl());

  const refreshRecommendedUrl = useCallback(() => {
    const nextRecommendedUrl = getDefaultServerUrl();
    setRecommendedUrl(nextRecommendedUrl);
    return nextRecommendedUrl;
  }, []);

  useEffect(() => {
    refreshRecommendedUrl();
  }, [
    refreshRecommendedUrl,
    networkState.type,
    networkState.isConnected,
    networkState.isInternetReachable,
  ]);

  useEffect(() => {
    const subscription = Network.addNetworkStateListener(() => {
      refreshRecommendedUrl();
    });

    return () => subscription.remove();
  }, [refreshRecommendedUrl]);

  return useMemo(() => ({
    recommendedUrl,
    networkState,
    refreshRecommendedUrl,
  }), [networkState, recommendedUrl, refreshRecommendedUrl]);
}
