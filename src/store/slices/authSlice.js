import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Helper function to check if token is expired
const isTokenExpired = (token) => {
  if (!token) return true;
  
  try {
    // Decode JWT token to check expiration
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp < currentTime;
  } catch (error) {
    console.error('Error decoding token:', error);
    return true;
  }
};

// Helper function to get API URL
const getApiUrl = (endpoint) => {
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? 'https://blog.andrewbrowne.org'
    : 'http://localhost:4000';
  return `${baseUrl}${endpoint}`;
};

// Async thunk for user registration
export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await fetch(getApiUrl('/api/users/'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userData.email,
          password: userData.password || 'TempPass123!', // Use user's password or fallback
          username: userData.email.split('@')[0],
          first_name: userData.name?.split(' ')[0] || userData.email.split('@')[0],
          last_name: userData.name?.split(' ').slice(1).join(' ') || '',
          industry: userData.industry || '',
          content_goals: userData.contentGoals || '',
          target_audience: userData.targetAudience || '',
          tone_preference: userData.tonePreference || 'professional',
          content_length: userData.contentLength || 'medium',
          posting_frequency: userData.postingFrequency || 'weekly',
          content_types: userData.contentTypes || [],
          pain_points: userData.painPoints || [],
          success_metrics: userData.successMetrics || [],
          additional_context: userData.additionalContext || ''
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Registration failed');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Async thunk for user login
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await fetch(getApiUrl('/api/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: credentials.email || credentials.username,
          password: credentials.password || 'TempPass123!'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Login failed');
      }

      const data = await response.json();
      
      // Store tokens in localStorage
      localStorage.setItem('authTokens', JSON.stringify(data.tokens));
      localStorage.setItem('user', JSON.stringify(data.user));
      
      return {
        user: data.user,
        tokens: data.tokens
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Async thunk for saving questionnaire data
export const saveQuestionnaireData = createAsyncThunk(
  'auth/saveQuestionnaireData',
  async ({ userId, questionnaireData }, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      const token = auth.tokens?.access_token;

      if (!token || isTokenExpired(token)) {
        throw new Error('Authentication token expired');
      }

      const response = await fetch(getApiUrl(`/api/users/${userId}/questionnaire`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(questionnaireData),
        
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save questionnaire');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Async thunk for checking token validity
export const checkTokenValidity = createAsyncThunk(
  'auth/checkTokenValidity',
  async (_, { getState, dispatch, rejectWithValue }) => {
    try {
      const { auth } = getState();
      const token = auth.tokens?.access_token;

      if (!token) {
        throw new Error('No token found');
      }

      if (isTokenExpired(token)) {
        dispatch(logout());
        throw new Error('Token expired');
      }

      // Verify token with backend
      const response = await fetch(getApiUrl('/api/auth/me'), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        dispatch(logout());
        throw new Error('Token invalid');
      }

      const userData = await response.json();
      return userData;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Load initial state from localStorage
const loadInitialState = () => {
  try {
    const storedUser = localStorage.getItem('user');
    const storedTokens = localStorage.getItem('authTokens');
    
    if (storedUser && storedTokens) {
      const user = JSON.parse(storedUser);
      const tokens = JSON.parse(storedTokens);
      
      // Check if token is expired
      if (isTokenExpired(tokens.access_token)) {
        localStorage.removeItem('user');
        localStorage.removeItem('authTokens');
        return {
          user: null,
          tokens: null,
          isAuthenticated: false,
          loading: false,
          error: null,
        };
      }
      
      return {
        user,
        tokens,
        isAuthenticated: true,
        loading: false,
        error: null,
      };
    }
  } catch (error) {
    console.error('Error loading auth state from localStorage:', error);
    localStorage.removeItem('user');
    localStorage.removeItem('authTokens');
  }
  
  return {
    user: null,
    tokens: null,
    isAuthenticated: false,
    loading: false,
    error: null,
  };
};

const authSlice = createSlice({
  name: 'auth',
  initialState: loadInitialState(),
  reducers: {
    logout: (state) => {
      state.user = null;
      state.tokens = null;
      state.isAuthenticated = false;
      state.error = null;
      localStorage.removeItem('user');
      localStorage.removeItem('authTokens');
      localStorage.removeItem('completedLanding');
    },
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action) => {
      state.user = action.payload;
      localStorage.setItem('user', JSON.stringify(action.payload));
    },
  },
  extraReducers: (builder) => {
    builder
      // Register user
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        // Registration successful, but not logged in yet
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Login user
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.tokens = action.payload.tokens;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      })
      
      // Save questionnaire data
      .addCase(saveQuestionnaireData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(saveQuestionnaireData.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        // Update user data if questionnaire was saved successfully
        if (state.user) {
          state.user = { ...state.user, questionnaire_completed: true };
          localStorage.setItem('user', JSON.stringify(state.user));
        }
      })
      .addCase(saveQuestionnaireData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Check token validity
      .addCase(checkTokenValidity.fulfilled, (state, action) => {
        state.user = action.payload;
        localStorage.setItem('user', JSON.stringify(action.payload));
      })
      .addCase(checkTokenValidity.rejected, (state, action) => {
        state.user = null;
        state.tokens = null;
        state.isAuthenticated = false;
        state.error = action.payload;
      });
  },
});

export const { logout, clearError, setUser } = authSlice.actions;

// Selectors
export const selectAuth = (state) => state.auth;
export const selectUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthLoading = (state) => state.auth.loading;
export const selectAuthError = (state) => state.auth.error;
export const selectTokens = (state) => state.auth.tokens;

export default authSlice.reducer; 