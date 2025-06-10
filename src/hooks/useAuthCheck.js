import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { checkTokenValidity } from '../store/slices/authSlice';

const useAuthCheck = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(checkTokenValidity());
  }, [dispatch]);
};

export default useAuthCheck; 