import { useLocation, useNavigate } from "react-router-dom";

const tabs = [
  { id: "dashboard", icon: "dashboard", label: "ראשי", path: "/" },
  { id: "exercises", icon: "fitness_center", label: "תרגילים", path: "/exercises" },
  { id: "workout", icon: "play_circle", label: "אימון", path: "/workout" },
  { id: "analytics", icon: "analytics", label: "ניתוח", path: "/analytics" },
  { id: "profile", icon: "person", label: "פרופיל", path: "/profile" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-card border-t border-border/50 rounded-none">
      <div className="flex items-center justify-around py-2 px-2 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-300 ${
                isActive
                  ? "neon-text scale-105"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className={`material-icon text-[22px] ${tab.id === "workout" ? "text-[28px]" : ""}`}>
                {tab.icon}
              </span>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
