'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase'; // Adjust this import path to match where you saved the config file

interface Meal {
  id: string;
  food_name: string;
  calories: number;
  consumed_date: string;
}

export default function Dashboard() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const itemsPerPage = 10;

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

  // ==========================================
  // DATABASE OPERATIONS (READ & WRITE)
  // ==========================================

  // 1. Fetch meals corresponding to the active calendar date filter
  const fetchMealsForDate = async (dateString: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('meals')
        .select('id, food_name, calories, consumed_date')
        .eq('consumed_date', dateString)
        .order('created_at', { ascending: false }); // Show newest entries first

      if (error) throw error;
      setMeals(data || []);
      setCurrentPage(1); // Reset to page 1 on date filter adjustment
    } catch (err) {
      console.error('Error fetching data from Supabase:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Automatically trigger a database re-fetch whenever the calendar selector targets a new day
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
      const data = await response.json();
      if (response.ok) {
        setCalculatedCalories(data.calories);
      } else {
        console.error(data.error);
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
      // Get the currently authenticated session profile info from Supabase Auth
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        alert("Authentication Required: Please sign in to log nutritional data entries.");
        return;
      }

      const { data, error } = await supabase
        .from('meals')
        .insert([
          {
            user_id: user.id, // Direct foreign-key compliance link
            food_name: foodInput,
            calories: calculatedCalories,
            consumed_date: selectedDate
          }
        ])
        .select();

      if (error) throw error;

      // Optimistically push the newly returned database record straight into local state arrays
      if (data) {
        setMeals([data[0], ...meals]);
      }

      // Reset popup context and clear input states
      setFoodInput('');
      setCalculatedCalories(null);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error attempting insertion process:', err);
      alert('Failed to log record safely. Verify Row Level Security policies.');
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
            Hello, <span className="text-teal-400 font-semibold">Active User</span>
          </span>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-teal-500 hover:bg-teal-600 text-slate-900 font-bold w-10 h-10 rounded-full flex items-center justify-center transition shadow-sm cursor-pointer"
          >
            <span className="material-icons text-xl font-black">add</span>
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
                Limit Exceeded
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
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="px-6 py-12 text-center text-slate-400 font-medium">
                      No meals registered for this target timeline date.
                    </td>
                  </tr>
                )}
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-100 transform transition-all overflow-hidden animate-in fade-in zoom-in-95 duration-200">
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
    </div>
  );
}