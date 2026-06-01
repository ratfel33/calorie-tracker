'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
const getLocalNicaraguaDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`; // Returns exactly "2026-05-31" 
};


interface Meal {
  id: string;
  food_name: string;
  calories: number;
  consumed_date: string;
}

export default function Dashboard() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const itemsPerPage = 10;
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [selectedDate, setSelectedDate] = useState(getLocalNicaraguaDateString());


  // Form State
  const [foodInput, setFoodInput] = useState('');
  const [calculatedCalories, setCalculatedCalories] = useState<number | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const totalCalories = meals.reduce((sum, meal) => sum + meal.calories, 0);
  const calorieLimit = 1500;
  const progressPercentage = Math.min((totalCalories / calorieLimit) * 100, 100);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentMeals = meals.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(meals.length / itemsPerPage);
  const triggerDeleteConfirmation = (mealId: string) => {
  setPendingDeleteId(mealId);
};
  
  const showToast = (message: string, type: 'success' | 'error') => {
  setToast({ message, type });
  setTimeout(() => setToast(null), 3500); // Automatically disappears after 3.5 seconds
};

  // Sync session profile user info safely on load without breaking DOM rendering
useEffect(() => {
  const getActiveUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // 1. Look for full_name or display_name inside metadata
      const nameFromMetadata = user.user_metadata?.full_name || user.user_metadata?.display_name;
      
      // 2. Fall back to the email prefix if no metadata name is found
      // (e.g., if email is "juan@gmail.com", split('@')[0] gives "juan")
      const fallbackName = user.email ? user.email.split('@')[0] : 'Guest';

      // 3. Set your state variable
      setUserName(nameFromMetadata || fallbackName);
    } else {
      setUserName('Guest Account');
    }
  };

  getActiveUser();
}, []);

  // 1. Fetch meals corresponding to the active calendar date filter
  const fetchMealsForDate = async (dateString: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('meals')
        .select('id, food_name, calories, consumed_date')
        .eq('consumed_date', dateString)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMeals(data || []);
      setCurrentPage(1); 
    } catch (err) {
      console.error('Error fetching data from Supabase:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMealsForDate(selectedDate);
  }, [selectedDate]);

  // 2. Analyze raw description input via secure serverless proxy route
  const handleAnalyzeFood = async () => {
    if (!foodInput.trim()) return;
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/analyze-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foodQuery: foodInput }),
      });

      const result = await response.json(); // Fixed: changed 'res' to 'response'

      if (response.ok) {
        setCalculatedCalories(result.calories); // Saves the number to state
      } else {
        console.error(result.error); // Fixed: reads error from result payload
      }
    } catch (err) {
      console.error('Error hitting your backend route:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 3. Persist the record safely inside the Cloud Database
  const handleSaveMeal = async () => {
    if (!foodInput || calculatedCalories === null) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        alert("Authentication Required: Please sign in using the Secure Access tab to log nutritional entries.");
        return;
      }

      const { data, error } = await supabase
        .from('meals')
        .insert([
          {
            user_id: user.id, 
            food_name: foodInput,
            // Point this to your state variable! It is fully updated by the time you click save.
            calories: calculatedCalories, 
            consumed_date: selectedDate
          }
        ])
        .select();

      if (error) {
        console.error("Database error:", error.message);
      } else {
        setIsModalOpen(false); // 1. Closes your popup instantly
        showToast("Meal saved successfully!", "success"); // 2. Fires the toast banner
        setTimeout(() => {
        window.location.reload(); // 3. Refreshes the page/table after 1 second
      }, 1500);
      }

    } catch (err) {
      console.error('Error saving meal:', err);
    }
  };

const handleConfirmDelete = async () => {
  if (!pendingDeleteId) return;

  try {
    // 🟢 DELETE DIRECTLY VIA SUPABASE CLIENT (Just like handleSaveMeal does!)
    const { data, error } = await supabase
      .from('meals')
      .delete()
      .eq('id', pendingDeleteId)
      .select();

    // Reset the confirmation UI state variable right away
    setPendingDeleteId(null);

    if (error) {
      console.error("Database deletion error:", error.message);
      showToast(`Database error: ${error.message}`, "error");
      return;
    }

    // Check if a row was actually removed
    if (!data || data.length === 0) {
      showToast("Could not find that meal entry to delete.", "error");
      return;
    }

    // Success tracker
    showToast("Meal deleted successfully!", "success");
    
    setTimeout(() => {
      window.location.reload();
    }, 1000);

  } catch (error) {
    console.error("Unexpected error during delete execution:", error);
    setPendingDeleteId(null);
    showToast("An unexpected error occurred.", "error");
  }
};
  

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* Navigation Bar */}
      <nav className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center shadow-md">
        <div className="flex items-center space-x-2">
          <span className="text-xl font-bold tracking-tight">CalorieCore</span>
          <span className="text-xs bg-teal-500 text-slate-900 font-bold px-2 py-0.5 rounded">v1.0</span>
        </div>
        <div className="flex items-center space-x-6">
          <span className="text-slate-300 font-medium hidden sm:inline">
            Hello, <span className="text-teal-400 font-semibold">{userName || 'Guest Account'}</span>
          </span>
          {!userEmail ? (
            <a 
              href="/login" 
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg transition font-bold"
            >
              Secure Access
            </a>
          ) : (
            <button 
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href="/";
              }}
              className="text-xs bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-200 border border-slate-700 px-3 py-1.5 rounded-lg transition font-bold cursor-pointer"
            >
              Sign Out
            </button>
          )}
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-teal-500 hover:bg-teal-600 text-slate-900 font-bold w-10 h-10 rounded-full flex items-center justify-center transition shadow-sm cursor-pointer"
          >
            <span className="font-black text-xl">+</span>
          </button>
        </div>
      </nav>

      {/* Main Workspace Container */}
      <main className="max-w-5xl mx-auto p-4 sm:p-8 space-y-8">
        
        {/* Dynamic Gradient Progress Metric */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Daily Intake Limit</h2>
              <p className="text-3xl font-black text-slate-900 mt-1">
                {totalCalories} <span className="text-lg font-normal text-slate-500">/ {calorieLimit} kcal</span>
              </p>
            </div>
            {totalCalories > calorieLimit && (
              <span className="bg-rose-100 text-rose-700 text-xs font-bold px-3 py-1 rounded-full border border-rose-200">
                Por eso estas gordo
              </span>
            )}
          </div>
          
          <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden border border-slate-200">
            <div 
              style={{ 
                width: `${progressPercentage}%`,
                backgroundImage: 'linear-gradient(to right, #2dd4bf, #f43f5e)'
              }}
              className="h-full rounded-full transition-all duration-500 ease-out"
            />
          </div>
        </section>

        {/* Data Filtration Matrix */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
            <div>
              <h3 className="font-bold text-lg text-slate-900">Meal Entries</h3>
              <p className="text-xs text-slate-500">Track and log individual ingredient balances</p>
            </div>
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm text-sm font-medium focus:outline-none focus:border-teal-500 text-slate-700 cursor-pointer"
            />
          </div>

          {/* Paginated Data Grid */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/70 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="px-6 py-3">Food / Ingredient</th>
                  <th className="px-6 py-3 text-right">Energy Profile</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {isLoading ? (
                  <tr>
                    <td colSpan={2} className="px-6 py-12 text-center text-slate-400 font-medium animate-pulse">
                      Syncing with live database...
                    </td>
                  </tr>
                ) : currentMeals.length > 0 ? (
                  currentMeals.map((meal) => (
                    
                     <tr key={meal.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">{meal.food_name}</td>
                      <td className="px-6 py-4 text-right font-bold text-slate-700">{meal.calories} kcal</td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                      <button
                        onClick={() => triggerDeleteConfirmation(meal.id)}
                        className="text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors duration-200"
                        title="Delete entry"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-16v1a3 3 0 003 3h10M4 7h16" />
                        </svg>
                      </button>
                    </td>
                    </tr>
                      
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="px-6 py-12 text-center text-slate-400 font-medium">
                      No meals registered for this target timeline date.
                    </td>
                  </tr>
                )
                }
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
              <span className="text-xs font-medium text-slate-500">
                Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, meals.length)} of {meals.length} items
              </span>
              <div className="flex space-x-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold shadow-sm disabled:opacity-50 transition cursor-pointer"
                >
                  Previous
                </button>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold shadow-sm disabled:opacity-50 transition cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Popup Form Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-100 transform transition-all overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-lg">Log New Intake</h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Food Description</label>
                <input 
                  type="text"
                  placeholder="e.g., 2 large eggs, 100g grilled chicken breast"
                  value={foodInput}
                  onChange={(e) => setFoodInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAnalyzeFood()}
                  onBlur={handleAnalyzeFood}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500 text-slate-800 placeholder-slate-400 transition"
                />
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 min-h-[4.5rem] flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">Calculated Energy Profile:</span>
                {isAnalyzing ? (
                  <span className="text-xs text-teal-600 font-bold animate-pulse">Running Secure API Parse...</span>
                ) : calculatedCalories !== null ? (
                  <span className="text-xl font-black text-slate-900">{calculatedCalories} kcal</span>
                ) : (
                  <span className="text-xs text-slate-400 italic">Awaiting calculation input</span>
                )}
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end space-x-3">
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  setFoodInput('');
                  setCalculatedCalories(null);
                }}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button 
                disabled={calculatedCalories === null}
                onClick={handleSaveMeal}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold shadow hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              >
                Save Entry
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Floating Smooth Toast Notification */}
        {toast && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center px-5 py-3 rounded-xl shadow-xl border text-sm font-semibold tracking-wide backdrop-blur-md transition-all duration-950 transform ease-out animate-down
          ${toast.type === 'success' 
            ? 'bg-emerald-50/95 border-emerald-200 text-emerald-800 dark:bg-emerald-950/90 dark:border-emerald-800 dark:text-emerald-200' 
            : 'bg-rose-50/90 border-rose-200 text-rose-800 dark:bg-rose-950/90 dark:border-rose-800 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? (
              <span className="text-base text-emerald-500">✨</span>
            ) : (
              <span className="text-base text-rose-500">⚠️</span>
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
      {/* Top Dropping Custom Confirmation Banner */}
{pendingDeleteId && (
  <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex flex-col sm:flex-row items-center gap-4 px-6 py-4 rounded-xl shadow-2xl border bg-slate-900/95 border-slate-800 text-white backdrop-blur-md transition-all duration-300 transform scale-100 ease-out animate-down max-w-md w-[90vw]">
    <div className="flex items-center gap-3 text-center sm:text-left">
      <span className="text-xl text-rose-500">🗑️</span>
      <p className="text-sm font-medium tracking-wide">
        Are you sure you want to delete this meal entry? This action cannot be undone.
      </p>
    </div>
    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
      <button
        onClick={() => setPendingDeleteId(null)}
        className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors duration-200"
      >
        Cancel
      </button>
      <button
        onClick={handleConfirmDelete}
        className="px-4 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-lg shadow-md hover:shadow-rose-900/20 transition-all duration-200"
      >
        Delete
      </button>
    </div>
  </div>
)}
    </div>
  );
}