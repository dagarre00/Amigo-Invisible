
import { Room, Participant, Assignment } from '../types';
import { supabase } from './supabaseClient';

// Helper to generate 4-digit code
export const generateRoomCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, 1, O, 0 for clarity
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// --- DATA PERSISTENCE ---

export const getRoom = async (id: string): Promise<Room | null> => {
  // Fallback to LocalStorage if Supabase is not configured
  if (!supabase) {
    try {
      const stored = localStorage.getItem(`room_${id}`);
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      console.warn("LocalStorage read error:", e);
      return null;
    }
  }

  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('content')
      .eq('id', id)
      .single();

    if (error) {
      // If code PGRST116, it means no rows found (not necessarily an error in logic)
      if (error.code !== 'PGRST116') {
        console.error("Error fetching room:", error);
      }
      return null;
    }

    return data?.content as Room;
  } catch (e) {
    console.error("Unexpected error fetching room:", e);
    return null;
  }
};

export const saveRoom = async (room: Room): Promise<boolean> => {
  // Fallback to LocalStorage if Supabase is not configured
  if (!supabase) {
    try {
      localStorage.setItem(`room_${room.id}`, JSON.stringify(room));
      return true;
    } catch (e) {
      console.error("LocalStorage save error:", e);
      return false;
    }
  }

  try {
    const { error } = await supabase
      .from('rooms')
      .upsert({ 
        id: room.id, 
        content: room,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) {
      console.error("Error saving room:", error);
      return false;
    }
    return true;
  } catch (e) {
    console.error("Unexpected error saving room:", e);
    return false;
  }
};

// The Drawing Logic
// Enforces: No Self Draw, Exclusions Applied, 1-to-1 Mapping (Bijection)
export const drawNames = (participants: Participant[]): Assignment[] | null => {
  // Need at least 2 people to exchange gifts
  if (!participants || participants.length < 2) return null;

  const ids = participants.map(p => p.id);
  
  // 1. Prepare Exclusion Constraints Map
  const constraints = new Map<string, Set<string>>();
  participants.forEach(p => {
    const pExclusions = new Set(p.exclusions);
    pExclusions.add(p.id); // RULE: Users cannot draw themselves
    constraints.set(p.id, pExclusions);
  });

  // 2. Sort Givers by 'Most Constrained First' (Heuristic)
  // Process people with more exclusions first to reduce backtracking.
  // This helps significantly when the exclusion graph is dense.
  const sortedGiverIds = [...ids].sort((a, b) => {
    const countA = constraints.get(a)?.size || 0;
    const countB = constraints.get(b)?.size || 0;
    return countB - countA;
  });

  const assignments: Assignment[] = [];
  const assignedReceivers = new Set<string>();

  // 3. Recursive Backtracking Solver
  const solve = (index: number): boolean => {
    // Base Case: All givers have successfully been assigned a receiver
    if (index >= sortedGiverIds.length) {
      return true;
    }

    const currentGiverId = sortedGiverIds[index];
    const invalidForGiver = constraints.get(currentGiverId)!;

    // Find all valid candidates for this specific giver
    // - Must be a valid participant ID
    // - Must not be already assigned (One-to-One / Bijective property)
    // - Must not be in exclusion list (Exclusions applied & No Self Draw)
    const candidates = ids.filter(candidateId => 
      !assignedReceivers.has(candidateId) && 
      !invalidForGiver.has(candidateId)
    );

    // Shuffle candidates to ensure fair/random outcomes every time
    // Fisher-Yates shuffle
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    // Try each candidate via Depth First Search
    for (const receiverId of candidates) {
      assignments.push({ giverId: currentGiverId, receiverId });
      assignedReceivers.add(receiverId);

      if (solve(index + 1)) {
        return true;
      }

      // Backtrack: This path didn't work, undo assignment
      assignments.pop();
      assignedReceivers.delete(receiverId);
    }

    return false; // Dead end: No valid candidates allowed us to complete the chain
  };

  if (solve(0)) {
    return assignments;
  } else {
    return null; // No solution possible with current constraints
  }
};
