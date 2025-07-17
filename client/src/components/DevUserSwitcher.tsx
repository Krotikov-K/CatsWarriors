import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";

export function DevUserSwitcher() {
  const [currentUserId, setCurrentUserId] = useState<string>('1');

  useEffect(() => {
    const stored = localStorage.getItem('devUserId') || '1';
    setCurrentUserId(stored);
  }, []);

  const handleUserChange = (userId: string) => {
    localStorage.setItem('devUserId', userId);
    setCurrentUserId(userId);
    // Reload page to apply new userId
    window.location.reload();
  };

  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <div className="fixed top-2 right-2 z-50 bg-yellow-100 border border-yellow-400 rounded p-2 text-xs">
      <div className="text-yellow-800 mb-1">DEV MODE - Switch User:</div>
      <Select value={currentUserId} onValueChange={handleUserChange}>
        <SelectTrigger className="w-[120px] h-6 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">Кисяо (userId=1)</SelectItem>
          <SelectItem value="3">Админ (userId=3)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}