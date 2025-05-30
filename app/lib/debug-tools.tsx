'use client';

import { useState } from 'react';
import { supabase } from '@/app/services/supabaseService';

// Run a SQL query directly from the frontend for debugging purposes
export async function runDebugQuery(sql: string) {
  try {
    const { data, error } = await supabase.rpc('exec_query', { sql });
    
    if (error) {
      console.error('Error running debug query:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
    
    return {
      success: true,
      error: null,
      data
    };
  } catch (err: any) {
    console.error('Exception in debug query:', err);
    return {
      success: false,
      error: err.message || 'Unknown error',
      data: null
    };
  }
}

// Debug a table's existence and permissions
export async function checkTableExists(tableName: string) {
  const results = {
    exists: false,
    canSelect: false,
    canInsert: false,
    canUpdate: false,
    canDelete: false,
    columns: [] as {name: string, type: string}[],
    error: null as string | null,
    rowCount: 0
  };
  
  try {
    // Check if table exists by attempting a count
    const { error: countError, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
      
    if (countError) {
      results.error = countError.message;
      return results;
    }
    
    results.exists = true;
    results.rowCount = count || 0;
    
    // Check if we can select
    const { error: selectError } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
      
    results.canSelect = !selectError;
    
    // Get column information with a raw query
    try {
      const { data: columnsData, error: columnsError } = await supabase.rpc(
        'exec_query',
        { 
          sql: `
            SELECT 
              column_name as name, 
              data_type as type
            FROM 
              information_schema.columns
            WHERE 
              table_schema = 'public' 
              AND table_name = '${tableName}'
            ORDER BY
              ordinal_position
          `
        }
      );
      
      if (!columnsError && columnsData) {
        results.columns = columnsData;
      }
    } catch (columnErr) {
      console.warn('Could not fetch column info:', columnErr);
    }
    
    return results;
  } catch (err: any) {
    results.error = err.message || 'Unknown error';
    return results;
  }
}

export function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAddingCoins, setIsAddingCoins] = useState(false);
  const [isRemovingCoins, setIsRemovingCoins] = useState(false);
  const [isResettingInventory, setIsResettingInventory] = useState(false);
  const [debugMsg, setDebugMsg] = useState<string[]>([]);
  
  const addDebugMessage = (msg: string) => {
    setDebugMsg(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  };
  
  const checkDatabase = async () => {
    setIsChecking(true);
    setResults(null);
    addDebugMessage('Starting database check...');
    
    try {
      // Check connection
      addDebugMessage('Checking Supabase connection...');
      const { data: connData, error: connError } = await supabase.from('postgres_connections').select('*');
      
      if (connError) {
        if (connError.message.includes('does not exist')) {
          addDebugMessage('✅ Connected to Supabase but postgres_connections table doesn\'t exist (expected)');
        } else {
          addDebugMessage(`❌ Connection error: ${connError.message}`);
        }
      } else {
        addDebugMessage('✅ Connected to Supabase successfully');
      }
      
      // Check posts table
      addDebugMessage('Checking posts table...');
      const postsResults = await checkTableExists('posts');
      
      if (postsResults.error) {
        addDebugMessage(`❌ Posts table error: ${postsResults.error}`);
      } else {
        addDebugMessage(`✅ Posts table exists with ${postsResults.rowCount} rows`);
        addDebugMessage(`   Can select: ${postsResults.canSelect ? 'Yes' : 'No'}`);
      }
      
      // Check user_profiles table
      addDebugMessage('Checking user_profiles table...');
      const profilesResults = await checkTableExists('user_profiles');
      
      if (profilesResults.error) {
        addDebugMessage(`❌ User profiles table error: ${profilesResults.error}`);
      } else {
        addDebugMessage(`✅ User profiles table exists with ${profilesResults.rowCount} rows`);
        addDebugMessage(`   Can select: ${profilesResults.canSelect ? 'Yes' : 'No'}`);
        addDebugMessage(`   Columns: ${profilesResults.columns.map(c => c.name).join(', ')}`);
      }
      
      // Check stored procedures
      addDebugMessage('Checking stored procedures...');
      try {
        const { data: funcData, error: funcError } = await supabase.rpc(
          'exec_query',
          { 
            sql: `
              SELECT routine_name, routine_type
              FROM information_schema.routines
              WHERE routine_schema = 'public'
              AND routine_type = 'FUNCTION'
            `
          }
        );
        
        if (funcError) {
          addDebugMessage(`❌ Cannot check functions: ${funcError.message}`);
        } else {
          const functionNames = funcData.map((f: any) => f.routine_name).join(', ');
          addDebugMessage(`✅ Found ${funcData.length} functions: ${functionNames}`);
        }
      } catch (funcErr: any) {
        addDebugMessage(`❌ Error checking functions: ${funcErr.message}`);
      }
      
      // Final results
      setResults({
        posts: postsResults,
        profiles: profilesResults
      });
      
    } catch (err: any) {
      addDebugMessage(`❌ Error during check: ${err.message}`);
    } finally {
      setIsChecking(false);
      addDebugMessage('Database check complete');
    }
  };
  
  const syncAllLevels = async () => {
    setIsSyncing(true);
    addDebugMessage('Starting level synchronization for all users...');
    
    try {
      const response = await fetch('/api/auth/sync-level', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          syncAll: true
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        addDebugMessage(`✅ ${data.message}`);
        if (data.results) {
          addDebugMessage(`Total: ${data.results.total}, Synchronized: ${data.results.synchronized}, Failed: ${data.results.failed}`);
        }
      } else {
        addDebugMessage(`❌ Failed to sync levels: ${data.message}`);
      }
    } catch (err: any) {
      addDebugMessage(`❌ Error syncing levels: ${err.message}`);
    } finally {
      setIsSyncing(false);
      addDebugMessage('Level synchronization complete');
    }
  };
  
  const addCoins = async () => {
    try {
      setIsAddingCoins(true);
      addDebugMessage('Adding 1000 coins...');
      const response = await fetch('/api/debug/add-coins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 1000 })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        addDebugMessage(`✅ Added 1000 coins. New balance: ${data.newBalance}`);
        addDebugMessage('🔄 Refreshing page...');
        // Refresh the page to update coin display
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        addDebugMessage(`❌ Failed to add coins: ${data.error}`);
      }
    } catch (err: any) {
      addDebugMessage(`❌ Error adding coins: ${err.message}`);
    } finally {
      setIsAddingCoins(false);
    }
  };
  
  const removeCoins = async () => {
    try {
      setIsRemovingCoins(true);
      addDebugMessage('Removing 1000 coins...');
      const response = await fetch('/api/debug/add-coins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: -1000 })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        addDebugMessage(`✅ Removed 1000 coins. New balance: ${data.newBalance}`);
        addDebugMessage('🔄 Refreshing page...');
        // Refresh the page to update coin display
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        addDebugMessage(`❌ Failed to remove coins: ${data.error}`);
      }
    } catch (err: any) {
      addDebugMessage(`❌ Error removing coins: ${err.message}`);
    } finally {
      setIsRemovingCoins(false);
    }
  };
  
  const resetInventory = async () => {
    setIsResettingInventory(true);
    const startTime = Date.now();
    addDebugMessage('Resetting player inventory...');
    
    try {
      const response = await fetch('/api/debug/reset-inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        const timeTaken = Date.now() - startTime;
        addDebugMessage(`✅ Successfully reset inventory in ${timeTaken}ms - ${data.message}`);
        addDebugMessage('🔄 Refreshing page...');
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        addDebugMessage(`❌ Failed to reset inventory: ${data.error}`);
        if (data.details) {
          addDebugMessage(`   Details: ${data.details}`);
        }
      }
    } catch (error) {
      addDebugMessage(`❌ Failed to reset inventory: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsResettingInventory(false);
    }
  };
  
  const resetInventorySimple = async () => {
    setIsResettingInventory(true);
    const startTime = Date.now();
    addDebugMessage('Resetting inventory with admin privileges...');
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        addDebugMessage(`❌ No active session found`);
        setIsResettingInventory(false);
        return;
      }
      
      const response = await fetch('/api/debug/reset-inventory-simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        const timeTaken = Date.now() - startTime;
        addDebugMessage(`✅ Successfully reset inventory with admin privileges in ${timeTaken}ms - ${data.message}`);
        addDebugMessage('🔄 Refreshing page...');
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        addDebugMessage(`❌ Failed to reset inventory (admin): ${data.error}`);
        if (data.details) {
          addDebugMessage(`   Details: ${data.details}`);
        }
      }
    } catch (error) {
      addDebugMessage(`❌ Failed to reset inventory (admin): ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsResettingInventory(false);
    }
  };
  
  if (!isOpen) {
    return (
      <button 
        className="fixed bottom-4 right-4 bg-blue-600 text-white p-2 rounded-full shadow-lg z-50"
        onClick={() => setIsOpen(true)}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 8V4"></path>
          <rect width="16" height="12" x="4" y="8" rx="2"></rect>
          <path d="M2 14h2"></path>
          <path d="M20 14h2"></path>
          <path d="M15 13v2"></path>
          <path d="M9 13v2"></path>
        </svg>
      </button>
    );
  }
  
  return (
    <div className="fixed bottom-4 right-4 w-96 bg-charcoal-800 border border-charcoal-600 rounded-lg shadow-lg z-50 overflow-hidden">
      <div className="flex justify-between items-center p-3 bg-charcoal-700 border-b border-charcoal-600">
        <h3 className="text-white font-medium">Database Debug</h3>
        <button 
          className="text-grey-400 hover:text-white"
          onClick={() => setIsOpen(false)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18"></path>
            <path d="m6 6 12 12"></path>
          </svg>
        </button>
      </div>
      
      <div className="p-4">
        <button
          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50 mb-2"
          onClick={checkDatabase}
          disabled={isChecking || isSyncing}
        >
          {isChecking ? 'Checking...' : 'Check Database'}
        </button>
        
        <button
          className="w-full py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded disabled:opacity-50"
          onClick={syncAllLevels}
          disabled={isChecking || isSyncing}
        >
          {isSyncing ? 'Fixing Levels...' : 'Fix All User Levels'}
        </button>
        
        <div className="mt-3 space-y-2">
          <button
            className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded disabled:opacity-50"
            onClick={addCoins}
            disabled={isChecking || isSyncing || isAddingCoins || isRemovingCoins || isResettingInventory}
          >
            {isAddingCoins ? 'Adding Coins...' : 'Add 1000 Coins'}
          </button>
          
          <button
            className="w-full py-2 bg-orange-600 hover:bg-orange-700 text-white rounded disabled:opacity-50"
            onClick={removeCoins}
            disabled={isChecking || isSyncing || isAddingCoins || isRemovingCoins || isResettingInventory}
          >
            {isRemovingCoins ? 'Removing Coins...' : 'Remove 1000 Coins'}
          </button>
          
          <button
            className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-50"
            onClick={resetInventory}
            disabled={isChecking || isSyncing || isAddingCoins || isRemovingCoins || isResettingInventory}
          >
            {isResettingInventory ? 'Resetting...' : 'Reset Inventory'}
          </button>
          
          <button
            className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded disabled:opacity-50"
            onClick={resetInventorySimple}
            disabled={isChecking || isSyncing || isAddingCoins || isRemovingCoins || isResettingInventory}
          >
            {isResettingInventory ? 'Resetting...' : 'Reset Inventory (Admin)'}
          </button>
        </div>
        
        <div className="mt-4 h-60 overflow-y-auto bg-charcoal-900 p-2 rounded text-xs font-mono">
          {debugMsg.length > 0 ? (
            debugMsg.map((msg, i) => (
              <div key={i} className="text-grey-400">{msg}</div>
            ))
          ) : (
            <div className="text-grey-600 italic">Click "Check Database" to start diagnostic</div>
          )}
        </div>
      </div>
    </div>
  );
} 