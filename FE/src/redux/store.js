import { configureStore } from '@reduxjs/toolkit';
// Import reducers here when created
// import authReducer from './slices/authSlice';

export const store = configureStore({
  reducer: {
    // auth: authReducer,
  },
});

export default store;
