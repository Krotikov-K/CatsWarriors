import { Button } from "@/components/ui/button";

export default function NavigationMenu() {
  const menuItems = [
    { id: "map", icon: "fas fa-map", label: "Карта территорий", active: true },
    { id: "inventory", icon: "fas fa-backpack", label: "Инвентарь" },
    { id: "clan", icon: "fas fa-users", label: "Племя" },
    { id: "quests", icon: "fas fa-scroll", label: "Задания" },
  ];

  const handleMenuClick = (id: string) => {
    // Handle navigation - in a real app this would use router
    console.log(`Navigating to ${id}`);
  };

  return (
    <div className="flex-1 p-4">
      <h4 className="font-gaming font-semibold mb-3 text-forest">Действия</h4>
      <nav className="space-y-2">
        {menuItems.map((item) => (
          <Button
            key={item.id}
            onClick={() => handleMenuClick(item.id)}
            variant="ghost"
            className={`w-full justify-start p-3 h-auto transition-colors ${
              item.active 
                ? "bg-forest bg-opacity-20 border border-forest text-forest hover:bg-opacity-30" 
                : "text-gray-300 hover:bg-gray-700 hover:text-white"
            }`}
          >
            <i className={`${item.icon} mr-3`}></i>
            {item.label}
          </Button>
        ))}
      </nav>
    </div>
  );
}
