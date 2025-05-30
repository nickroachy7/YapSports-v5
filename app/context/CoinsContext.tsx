"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/app/components/auth/AuthProvider';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface CoinsContextType {
  coins: number;
  setCoins: (coins: number) => void;
  refreshCoins: () => Promise<void>;
  updateCoins: (amount: number) => void; // Add or subtract coins
  isLoading: boolean;
}

const CoinsContext = createContext<CoinsContextType | undefined>(undefined);

export function useCoins() {
  const context = useContext(CoinsContext);
  if (context === undefined) {
    throw new Error('useCoins must be used within a CoinsProvider');
  }
  return context;
}

interface CoinsProviderProps {
  children: React.ReactNode;
}

export function CoinsProvider({ children }: CoinsProviderProps) {
  const [coins, setCoinsState] = useState<number>(0); // Start with 0, will load real balance
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { user, isLoading: authLoading } = useAuth();

  // Safe coins setter that ensures only valid numbers
  const setCoins = (value: number) => {
    const safeValue = Number(value) || 0;
    console.log(`💰 CoinsContext: Setting coins to ${safeValue} (input was: ${value})`);
    setCoinsState(safeValue);
  };

  const refreshCoins = async () => {
    console.log('🔄 CoinsContext: refreshCoins called');
    console.log('   Auth loading:', authLoading);
    console.log('   User exists:', !!user);
    console.log('   User ID:', user?.id);
    
    // Don't fetch until auth is complete
    if (authLoading) {
      console.log('CoinsContext: Waiting for auth to complete...');
      return;
    }
    
    setIsLoading(true);
    
    // ALWAYS fetch real user balance from database - no demo/fake values
    if (!user) {
      console.log('CoinsContext: No authenticated user, setting coins to 0');
      setCoins(0); // Show 0 if not authenticated
      setIsLoading(false);
      return;
    }

    try {
      console.log('🔍 CoinsContext: FETCHING REAL COIN BALANCE');
      console.log('   User object:', user);
      console.log('   User ID:', user.id);
      console.log('   User email:', user.email);
      
      // Always fetch the real coin balance from users table (NOT user_profiles)
      console.log('📊 CoinsContext: Executing Supabase query...');
      console.log('   Query: SELECT coins FROM users WHERE id =', user.id);
      
      const { data, error } = await supabase
        .from('users')  // ← CHANGED: Use 'users' table instead of 'user_profiles'
        .select('coins')
        .eq('id', user.id)
        .single();

      console.log('📋 CoinsContext: Supabase query results:');
      console.log('   Data:', data);
      console.log('   Error:', error);
      console.log('   Raw response:', { data, error });

      if (error) {
        console.error('❌ CoinsContext: Error fetching real coins:', error);
        console.log('   Error code:', error.code);
        console.log('   Error message:', error.message);
        console.log('   Error details:', error.details);
        setCoins(0); // Ensure we always set a valid number
      } else {
        const userCoins = Number(data?.coins) || 0; // Ensure it's always a number
        console.log('✅ CoinsContext: Successfully fetched coin balance');
        console.log('   Raw coins value from DB:', data?.coins);
        console.log('   Processed coins value:', userCoins);
        console.log('   Setting coins state to:', userCoins);
        setCoins(userCoins);
      }
    } catch (error) {
      console.error('💥 CoinsContext: Exception during coin fetch:', error);
      setCoins(0); // Ensure we always set a valid number
    } finally {
      setIsLoading(false);
    }
  };

  const updateCoins = (amount: number) => {
    const newBalance = Math.max(0, coins + amount);
    console.log(`💰 CoinsContext: Updating coins by ${amount}, new balance: ${newBalance}`);
    setCoins(newBalance);
  };

  // CRITICAL: Always refresh coins when user changes or auth completes
  useEffect(() => {
    console.log('🔄 CoinsContext: useEffect triggered');
    console.log('   Auth loading:', authLoading);
    console.log('   User exists:', !!user);
    console.log('   User ID:', user?.id);
    
    // Always refresh when auth is complete (whether user exists or not)
    if (!authLoading) {
      console.log('🚀 CoinsContext: Auth complete, refreshing coins');
      refreshCoins();
    }
  }, [user, authLoading]); // Remove hasInitialized dependency to always refresh

  // Force refresh on mount to handle page refreshes
  useEffect(() => {
    console.log('🔄 CoinsContext: Component mounted, forcing initial refresh');
    if (!authLoading && user) {
      refreshCoins();
    }
  }, []); // Empty dependency to run only on mount

  const value = {
    coins,
    setCoins,
    refreshCoins,
    updateCoins,
    isLoading
  };

  return (
    <CoinsContext.Provider value={value}>
      {children}
    </CoinsContext.Provider>
  );
} 