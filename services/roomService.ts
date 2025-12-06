
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

// The Drawing Logic (Remains Client Side, result is saved via saveRoom)
export const drawNames = (participants: Participant[]): Assignment[] | null => {
  const ids = participants.map(p => p.id);
  
  // Create a map for fast lookup of exclusions
  const exclusionMap: Record<string, Set<string>> = {};
  participants.forEach(p => {
    exclusionMap[p.id] = new Set(p.exclusions);
    exclusionMap[p.id].add(p.id); // Cannot draw self
  });

  const solve = (
    currentGiverIndex: number, 
    usedReceivers: Set<string>, 
    assignments: Assignment[]
  ): boolean => {
    if (currentGiverIndex >= ids.length) {
      return true; // All assigned
    }

    const giverId = ids[currentGiverIndex];
    const invalidReceivers = exclusionMap[giverId];

    // Shuffle potential receivers to ensure randomness
    const potentialReceivers = ids.filter(id => !usedReceivers.has(id) && !invalidReceivers.has(id));
    
    // Fisher-Yates shuffle
    for (let i = potentialReceivers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [potentialReceivers[i], potentialReceivers[j]] = [potentialReceivers[j], potentialReceivers[i]];
    }

    for (const receiverId of potentialReceivers) {
      assignments.push({ giverId, receiverId });
      usedReceivers.add(receiverId);
      
      if (solve(currentGiverIndex + 1, usedReceivers, assignments)) {
        return true;
      }
      
      // Backtrack
      assignments.pop();
      usedReceivers.delete(receiverId);
    }

    return false;
  };

  const results: Assignment[] = [];
  const success = solve(0, new Set(), results);
  
  return success ? results : null;
};
