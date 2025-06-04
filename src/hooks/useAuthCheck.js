import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { checkTokenValidity, logout, selectIsAuthenticated, selectTokens } from '../store/slices/authSlice';

const useAuthCheck = () => {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const tokens = useSelector(selectTokens);

  const checkAuth = useCallback(() => {
    if (isAuthenticated && tokens?.access_token) {
      dispatch(checkTokenValidity());
    }
  }, [dispatch, isAuthenticated, tokens]);

  useEffect(() => {
    // Check auth status on mount
    if (isAuthenticated) {
      checkAuth();
    }

    // Set up interval to check token validity every 5 minutes
    const interval = setInterval(() => {
      if (isAuthenticated && tokens?.access_token) {
        checkAuth();
      }
    }, 5 * 60 * 1000); // 5 minutes

    // Check before user interactions (focus, click, etc.)
    const handleUserActivity = () => {
      if (isAuthenticated && tokens?.access_token) {
        checkAuth();
      }
    };

    // Add event listeners for user activity
    window.addEventListener('focus', handleUserActivity);
    window.addEventListener('click', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
    };
  }, [isAuthenticated, tokens, checkAuth]);

  return {
    checkAuth,
    isAuthenticated,
  };
};

export default useAuthCheck; 